import type {
  ActionProposalRecord,
  IntegrationStatus,
  RunStatus,
  SecurityDecision,
  WorkflowRun,
} from "@/lib/domain";
import { getScenario } from "@/lib/scenarios";
import type { AiProvider } from "@/lib/server/ai";
import { createAiProvider } from "@/lib/server/ai";
import type { DemoRepository } from "@/lib/server/repository";
import { getRepository } from "@/lib/server/repository";
import type { SecurityProvider } from "@/lib/server/security";
import { createSecurityProvider } from "@/lib/server/security";
import { authorizeAction, executeReadOnlyAction } from "@/lib/server/tools";

export interface WorkflowDependencies {
  repo: DemoRepository;
  security: SecurityProvider;
  ai: AiProvider;
}

export interface RunScenarioInput {
  scenarioId: string;
  message?: string;
}

const STOP_MESSAGES = {
  input: "The support workflow stopped before the message reached the model.",
  context: "The support workflow stopped before private context reached the model.",
  action: "The proposed action was stopped before the sandbox tool could run.",
} as const;

function riskForAction(action: SecurityDecision): ActionProposalRecord["risk"] {
  return action.severity === "none" ? "low" : action.severity;
}

export async function runScenario(
  input: RunScenarioInput,
  dependencies: WorkflowDependencies = {
    repo: getRepository(),
    security: createSecurityProvider(),
    ai: createAiProvider(),
  },
): Promise<WorkflowRun> {
  const scenario = getScenario(input.scenarioId);
  if (!scenario) throw new Error("Unknown demo scenario.");
  const tenant = dependencies.repo.getDefaultTenant();
  const conversation = dependencies.repo.getConversation();
  const message = input.message?.trim() || scenario.message;
  const runId = dependencies.repo.startRun({
    scenarioId: scenario.id,
    tenantId: tenant.id,
    conversationId: conversation.id,
    message,
  });

  try {
    const inputDecision = await dependencies.security.scanInput(message);
    dependencies.repo.addSecurityEvent(runId, inputDecision);
    if (inputDecision.blocked) {
      return finish(dependencies, runId, "blocked_input", STOP_MESSAGES.input, "not_reached");
    }

    const documents = dependencies.repo.getKnowledge(tenant.id, scenario.contextDocumentIds ?? []);
    const contextDecision = await dependencies.security.scanContext(message, documents);
    dependencies.repo.addSecurityEvent(runId, contextDecision);
    if (contextDecision.blocked) {
      return finish(dependencies, runId, "blocked_context", STOP_MESSAGES.context, "not_reached");
    }

    const orders = dependencies.repo.getOrders(tenant.id, conversation.customerId);
    const outcome = await dependencies.ai.generate({
      scenario,
      message,
      customerName: conversation.customer.name,
      tenantName: tenant.name,
      orders,
      documents,
    });

    let status: RunStatus = "completed";
    let response = outcome.response;
    for (const proposal of outcome.proposals) {
      const orderNumber = typeof proposal.args.order_number === "string" ? proposal.args.order_number : null;
      const targetOrder = orderNumber ? dependencies.repo.getOrderByNumber(orderNumber) : null;
      const actionDecision = await dependencies.security.scanAction(proposal, {
        tenantId: tenant.id,
        orderTenantId: targetOrder?.tenantId ?? tenant.id,
        authorizationLimitMinor: 15_000_000,
        humanApproved: false,
      });
      dependencies.repo.addSecurityEvent(runId, actionDecision);
      const authorization = authorizeAction(
        {
          toolName: proposal.toolName,
          args: proposal.args,
          tenantId: tenant.id,
        },
        dependencies.repo,
      );

      if (actionDecision.blocked || !authorization.allowed) {
        dependencies.repo.addAction({
          runId,
          tenantId: tenant.id,
          conversationId: conversation.id,
          ...proposal,
          risk: riskForAction(actionDecision),
          decision: "block",
          status: "blocked",
          result: {
            reason: actionDecision.blocked ? actionDecision.summary : authorization.reason,
          },
        });
        status = "blocked_action";
        response = STOP_MESSAGES.action;
        continue;
      }

      if (authorization.approvalRequired) {
        dependencies.repo.addAction({
          runId,
          tenantId: tenant.id,
          conversationId: conversation.id,
          ...proposal,
          risk: riskForAction(actionDecision),
          decision: "approval",
          status: "awaiting_approval",
          result: null,
        });
        status = "awaiting_approval";
        continue;
      }

      const result = executeReadOnlyAction(
        proposal.toolName,
        proposal.args,
        tenant.id,
        dependencies.repo,
      );
      dependencies.repo.addAction({
        runId,
        tenantId: tenant.id,
        conversationId: conversation.id,
        ...proposal,
        risk: riskForAction(actionDecision),
        decision: "allow",
        status: "executed",
        result,
      });
    }
    return finish(dependencies, runId, status, response, outcome.provider);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Unknown workflow failure.";
    return finish(
      dependencies,
      runId,
      "failed",
      `Workflow failed safely: ${messageText}`,
      "not_reached",
    );
  }
}

function finish(
  dependencies: WorkflowDependencies,
  id: WorkflowRun["id"],
  status: RunStatus,
  response: string,
  aiProvider: "simulator" | "openai" | "not_reached",
): WorkflowRun {
  dependencies.repo.finishRun(id, status, response, aiProvider);
  const run = dependencies.repo.listRuns().find((candidate) => candidate.id === id);
  if (!run) throw new Error("Completed workflow run could not be read back.");
  return run;
}

export function integrationStatus(): IntegrationStatus {
  const liveAi = process.env.DEMO_AI_PROVIDER === "openai" && Boolean(process.env.OPENAI_API_KEY);
  const liveSecurity =
    process.env.DEMO_SECURITY_PROVIDER === "koreshield" &&
    Boolean(process.env.KORESHIELD_API_KEY) &&
    Boolean(process.env.KORESHIELD_API_URL);
  return {
    ai: {
      provider: liveAi ? "openai" : "simulator",
      configured: liveAi,
      model: liveAi ? (process.env.OPENAI_MODEL ?? "gpt-4o-mini") : "deterministic-commerce-v1",
    },
    security: {
      provider: liveSecurity ? "koreshield" : "simulator",
      configured: liveSecurity,
      mode: process.env.KORESHIELD_MODE === "detect" ? "detect" : "enforce",
      apiOrigin: liveSecurity ? (process.env.KORESHIELD_API_URL ?? null) : null,
    },
    data: { provider: "sqlite", syntheticOnly: true },
  };
}

export function getDashboardSnapshot(
  repo = getRepository(),
): import("@/lib/domain").DashboardSnapshot {
  const tenant = repo.getDefaultTenant();
  const conversation = repo.getConversation();
  return {
    tenant,
    conversation,
    orders: repo.getOrders(tenant.id, conversation.customerId),
    runs: repo.listRuns(),
    integration: integrationStatus(),
  };
}
