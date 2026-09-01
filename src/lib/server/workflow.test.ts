import { afterEach, describe, expect, it } from "vitest";

import { SimulatorAiProvider } from "@/lib/server/ai";
import { DemoRepository } from "@/lib/server/repository";
import { SimulatorSecurityProvider } from "@/lib/server/security";
import { approveSandboxAction } from "@/lib/server/tools";
import { runScenario } from "@/lib/server/workflow";

const repositories: DemoRepository[] = [];

function dependencies(mode: "detect" | "enforce" = "enforce") {
  const repo = new DemoRepository(":memory:");
  repositories.push(repo);
  return {
    repo,
    security: new SimulatorSecurityProvider(mode),
    ai: new SimulatorAiProvider(),
  };
}

afterEach(() => {
  for (const repository of repositories.splice(0)) repository.close();
});

describe("protected commerce-support workflow", () => {
  it("allows a clean lookup through all three boundaries", async () => {
    const deps = dependencies();
    const run = await runScenario({ scenarioId: "clean-order-status" }, deps);

    expect(run.status).toBe("completed");
    expect(run.events.map((event) => event.boundary)).toEqual(["input", "context", "action"]);
    expect(run.events.every((event) => !event.wouldBlock)).toBe(true);
    expect(run.actions[0]?.status).toBe("executed");
    expect(run.actions[0]?.result).toMatchObject({ found: true, order_number: "AC-1042" });
  });

  it("stops direct prompt injection before retrieval or AI", async () => {
    const deps = dependencies();
    const run = await runScenario({ scenarioId: "direct-prompt-injection" }, deps);

    expect(run.status).toBe("blocked_input");
    expect(run.aiProvider).toBe("not_reached");
    expect(run.events).toHaveLength(1);
    expect(run.events[0]).toMatchObject({ boundary: "input", blocked: true, wouldBlock: true });
    expect(run.actions).toHaveLength(0);
  });

  it("stops poisoned private context before AI generation", async () => {
    const deps = dependencies();
    const run = await runScenario({ scenarioId: "poisoned-policy" }, deps);

    expect(run.status).toBe("blocked_context");
    expect(run.aiProvider).toBe("not_reached");
    expect(run.events).toHaveLength(2);
    expect(run.events[1]).toMatchObject({ boundary: "context", severity: "critical", blocked: true });
  });

  it("blocks an excessive refund before tool execution", async () => {
    const deps = dependencies();
    const run = await runScenario({ scenarioId: "excessive-refund" }, deps);

    expect(run.status).toBe("blocked_action");
    expect(run.events).toHaveLength(3);
    expect(run.actions[0]).toMatchObject({
      toolName: "issue_refund",
      status: "blocked",
      decision: "block",
    });
  });

  it("keeps host tenancy authorization effective in detect mode", async () => {
    const deps = dependencies("detect");
    const run = await runScenario({ scenarioId: "cross-tenant-order" }, deps);

    expect(run.events[2]).toMatchObject({
      boundary: "action",
      blocked: false,
      wouldBlock: true,
      decision: "observe",
    });
    expect(run.status).toBe("blocked_action");
    expect(run.actions[0]?.result).toMatchObject({
      reason: "Application tenancy authorization rejected this order.",
    });
    expect((await deps.repo.getOrderByNumber("CIR-8841"))?.shippingAddress).toBe(
      "22 Allen Avenue, Ikeja",
    );
  });

  it("holds a legitimate mutation for approval and applies it only after approval", async () => {
    const deps = dependencies();
    const run = await runScenario({ scenarioId: "safe-address-change" }, deps);
    const action = run.actions[0];

    expect(run.status).toBe("awaiting_approval");
    expect(action?.status).toBe("awaiting_approval");
    expect((await deps.repo.getOrderByNumber("AC-1042"))?.shippingAddress).toBe(
      "14 Admiralty Way, Lekki",
    );
    if (!action) throw new Error("Expected an action proposal.");

    const result = await approveSandboxAction(action, deps.repo);
    await deps.repo.completeAction(action.id, "executed", result);

    expect((await deps.repo.getOrderByNumber("AC-1042"))?.shippingAddress).toBe(
      "8 Bourdillon Road, Ikoyi",
    );
    expect((await deps.repo.getAction(action.id))?.status).toBe("executed");
  });

  it("restores the seeded baseline on reset", async () => {
    const deps = dependencies();
    const run = await runScenario({ scenarioId: "safe-address-change" }, deps);
    const action = run.actions[0];
    if (!action) throw new Error("Expected an action proposal.");
    const result = await approveSandboxAction(action, deps.repo);
    await deps.repo.completeAction(action.id, "executed", result);

    await deps.repo.reset();

    expect(await deps.repo.listRuns()).toHaveLength(0);
    expect((await deps.repo.getOrderByNumber("AC-1042"))?.shippingAddress).toBe(
      "14 Admiralty Way, Lekki",
    );
  });

  it("never returns another tenant's order from a tenant-scoped list", async () => {
    const deps = dependencies();
    const tenant = await deps.repo.getDefaultTenant();
    const numbers = (await deps.repo.getOrders(tenant.id)).map((order) => order.number);

    expect(numbers).toContain("AC-1042");
    expect(numbers).not.toContain("CIR-8841");
  });
});
