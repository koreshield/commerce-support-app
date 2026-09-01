import { randomUUID } from "node:crypto";

import { z } from "zod";

import type {
  Boundary,
  KnowledgeDocument,
  SecurityDecision,
  TenantId,
  ToolProposal,
} from "@/lib/domain";

const remoteDecisionSchema = z
  .object({
    blocked: z.boolean().optional(),
    would_block: z.boolean().optional(),
    mode: z.enum(["detect", "enforce"]).optional(),
    severity: z.string().optional(),
    overall_severity: z.string().optional(),
    confidence: z.number().optional(),
    overall_confidence: z.number().optional(),
    request_id: z.string().optional(),
    scan_id: z.string().optional(),
    attack_type: z.string().nullable().optional(),
    risk_class: z.string().optional(),
    suggested_action: z.string().optional(),
    processing_time_ms: z.number().optional(),
  })
  .passthrough();

export interface ActionSecurityContext {
  tenantId: TenantId;
  orderTenantId: TenantId | null;
  authorizationLimitMinor: number;
  humanApproved: boolean;
}

export interface SecurityProvider {
  readonly name: "simulator" | "koreshield";
  readonly mode: "detect" | "enforce";
  scanInput(message: string): Promise<SecurityDecision>;
  scanContext(message: string, documents: KnowledgeDocument[]): Promise<SecurityDecision>;
  scanAction(proposal: ToolProposal, context: ActionSecurityContext): Promise<SecurityDecision>;
}

function severity(value: string | undefined): SecurityDecision["severity"] {
  if (value === "low" || value === "medium" || value === "high" || value === "critical") return value;
  return "none";
}

function simulatedDecision(
  boundary: Boundary,
  mode: "detect" | "enforce",
  unsafe: boolean,
  summary: string,
  level: SecurityDecision["severity"],
  confidence: number,
  startedAt: number,
): SecurityDecision {
  const blocked = unsafe && mode === "enforce";
  return {
    boundary,
    blocked,
    wouldBlock: unsafe,
    decision: blocked ? "block" : unsafe ? "observe" : "allow",
    severity: unsafe ? level : "none",
    confidence,
    provider: "simulator",
    requestId: `sim_${randomUUID()}`,
    summary,
    latencyMs: Math.max(1, performance.now() - startedAt),
    mode,
  };
}

export class SimulatorSecurityProvider implements SecurityProvider {
  readonly name = "simulator" as const;

  constructor(readonly mode: "detect" | "enforce") {}

  async scanInput(message: string): Promise<SecurityDecision> {
    const startedAt = performance.now();
    const unsafe = /(ignore (all|any|the|previous)|system prompt|database administrator|export every|reveal.*customer|developer mode)/i.test(
      message,
    );
    return simulatedDecision(
      "input",
      this.mode,
      unsafe,
      unsafe ? "Instruction override or data-exfiltration language detected." : "No input attack indicators detected.",
      "high",
      unsafe ? 0.98 : 0.04,
      startedAt,
    );
  }

  async scanContext(_message: string, documents: KnowledgeDocument[]): Promise<SecurityDecision> {
    const startedAt = performance.now();
    const poisoned = documents.some((document) =>
      /(system override|ignore every|approve all|expose customer|instruction for the model)/i.test(document.content),
    );
    return simulatedDecision(
      "context",
      this.mode,
      poisoned,
      poisoned
        ? "Retrieved material contains instruction-like content that conflicts with support policy."
        : `${documents.length} tenant-scoped document${documents.length === 1 ? "" : "s"} passed context inspection.`,
      "critical",
      poisoned ? 0.99 : 0.06,
      startedAt,
    );
  }

  async scanAction(proposal: ToolProposal, context: ActionSecurityContext): Promise<SecurityDecision> {
    const startedAt = performance.now();
    const amount = typeof proposal.args.amount_minor === "number" ? proposal.args.amount_minor : 0;
    const crossTenant = context.orderTenantId !== null && context.orderTenantId !== context.tenantId;
    const exportAttempt = proposal.toolName === "export_customer_data";
    const exceedsLimit = proposal.toolName === "issue_refund" && amount > context.authorizationLimitMinor;
    const unsafe = crossTenant || exportAttempt || exceedsLimit;
    const summary = crossTenant
      ? "Proposed action targets an order owned by another tenant."
      : exportAttempt
        ? "Bulk customer-data export is not an allowed support tool."
        : exceedsLimit
          ? "Refund proposal exceeds the sandbox operator authorization limit."
          : `Proposed ${proposal.toolName.replaceAll("_", " ")} action passed security inspection.`;
    return simulatedDecision(
      "action",
      this.mode,
      unsafe,
      summary,
      crossTenant || exportAttempt ? "critical" : "high",
      unsafe ? 0.99 : 0.08,
      startedAt,
    );
  }
}

export class KoreshieldSecurityProvider implements SecurityProvider {
  readonly name = "koreshield" as const;
  readonly mode: "detect" | "enforce";

  constructor(
    private readonly apiUrl: string,
    private readonly apiKey: string,
    fallbackMode: "detect" | "enforce",
  ) {
    this.mode = fallbackMode;
  }

  async scanInput(message: string): Promise<SecurityDecision> {
    return this.request("input", "/v1/scan", {
      prompt: message,
      context: { source: "synthetic_support_message", channel: "whatsapp" },
    });
  }

  async scanContext(message: string, documents: KnowledgeDocument[]): Promise<SecurityDecision> {
    return this.request("context", "/v1/rag/scan", {
      user_query: message,
      documents: documents.map((document) => ({
        id: document.id,
        content: document.content,
        metadata: {
          source: "synthetic_knowledge_base",
          trust_level: document.trustLevel,
          tenant_id: document.tenantId,
        },
      })),
    });
  }

  async scanAction(proposal: ToolProposal, context: ActionSecurityContext): Promise<SecurityDecision> {
    return this.request("action", "/v1/tools/scan", {
      tool_name: proposal.toolName,
      args: proposal.args,
      context: {
        trust_level: "model_proposed",
        tenant_id: context.tenantId,
        target_order_tenant_id: context.orderTenantId,
        authorization_limit: context.authorizationLimitMinor,
        user_approved: context.humanApproved,
      },
    });
  }

  private async request(
    boundary: Boundary,
    path: string,
    body: Record<string, unknown>,
  ): Promise<SecurityDecision> {
    const startedAt = performance.now();
    const response = await fetch(`${this.apiUrl.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": this.apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    const payload = remoteDecisionSchema.parse(await response.json());
    if (!response.ok && response.status !== 403) {
      throw new Error(`Koreshield returned HTTP ${response.status}.`);
    }
    const blocked = payload.blocked ?? response.status === 403;
    const wouldBlock = payload.would_block ?? blocked;
    const mode = payload.mode ?? this.mode;
    return {
      boundary,
      blocked,
      wouldBlock,
      decision: blocked ? "block" : wouldBlock ? "observe" : "allow",
      severity: severity(payload.severity ?? payload.overall_severity ?? payload.risk_class),
      confidence: payload.confidence ?? payload.overall_confidence ?? 0,
      provider: "koreshield",
      requestId: payload.request_id ?? payload.scan_id ?? `ks_${randomUUID()}`,
      summary:
        payload.attack_type ??
        payload.suggested_action ??
        (wouldBlock ? "Koreshield identified a risky boundary." : "Koreshield allowed this boundary."),
      latencyMs: payload.processing_time_ms ?? performance.now() - startedAt,
      mode,
    };
  }
}

export function createSecurityProvider(): SecurityProvider {
  const mode = process.env.KORESHIELD_MODE === "detect" ? "detect" : "enforce";
  const wantsLive = process.env.DEMO_SECURITY_PROVIDER === "koreshield";
  const url = process.env.KORESHIELD_API_URL;
  const key = process.env.KORESHIELD_API_KEY;
  if (wantsLive && url && key) return new KoreshieldSecurityProvider(url, key, mode);
  return new SimulatorSecurityProvider(mode);
}
