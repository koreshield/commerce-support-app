import type { ActionProposalRecord, TenantId } from "@/lib/domain";
import type { DemoRepository } from "@/lib/server/repository";

const APPROVAL_REQUIRED = new Set([
  "update_shipping_address",
  "cancel_order",
  "issue_refund",
  "apply_discount",
]);

export interface AuthorizationResult {
  allowed: boolean;
  approvalRequired: boolean;
  reason: string;
}

export function authorizeAction(
  action: Pick<ActionProposalRecord, "toolName" | "args" | "tenantId">,
  repo: DemoRepository,
): AuthorizationResult {
  if (action.toolName === "export_customer_data") {
    return {
      allowed: false,
      approvalRequired: false,
      reason: "Bulk customer export is not exposed to the support agent.",
    };
  }
  const orderNumber = typeof action.args.order_number === "string" ? action.args.order_number : null;
  const orderId = typeof action.args.order_id === "string" ? action.args.order_id : null;
  const order = orderNumber
    ? repo.getOrderByNumber(orderNumber)
    : orderId
      ? repo.getOrders(action.tenantId).find((candidate) => candidate.id === orderId) ?? null
      : null;
  if (order && order.tenantId !== action.tenantId) {
    return {
      allowed: false,
      approvalRequired: false,
      reason: "Application tenancy authorization rejected this order.",
    };
  }
  return {
    allowed: true,
    approvalRequired: APPROVAL_REQUIRED.has(action.toolName),
    reason: APPROVAL_REQUIRED.has(action.toolName)
      ? "This mutation requires an operator approval."
      : "Application authorization passed.",
  };
}

export function executeReadOnlyAction(
  toolName: ActionProposalRecord["toolName"],
  args: Record<string, unknown>,
  tenant: TenantId,
  repo: DemoRepository,
): Record<string, unknown> {
  if (toolName === "lookup_order") {
    const number = typeof args.order_number === "string" ? args.order_number : "";
    const order = repo.getOrderByNumber(number);
    if (!order || order.tenantId !== tenant) return { found: false };
    return { found: true, order_number: order.number, status: order.status };
  }
  if (toolName === "escalate_to_human") return { escalated: true, queue: "merchant_support" };
  return { executed: false, reason: "Mutation requires approval." };
}

export function approveSandboxAction(
  action: ActionProposalRecord,
  repo: DemoRepository,
): Record<string, unknown> {
  const authorization = authorizeAction(action, repo);
  if (!authorization.allowed) throw new Error(authorization.reason);
  if (action.status !== "awaiting_approval") throw new Error("Action is not awaiting approval.");

  if (action.toolName === "update_shipping_address") {
    const number = typeof action.args.order_number === "string" ? action.args.order_number : "";
    const address = typeof action.args.address === "string" ? action.args.address : "";
    const order = repo.getOrderByNumber(number);
    if (!order || order.tenantId !== action.tenantId || !address) {
      throw new Error("Order or address is invalid.");
    }
    const updated = repo.updateOrderAddress(order.id, action.tenantId, address);
    return { updated, order_number: number, shipping_address: address, sandbox: true };
  }
  return {
    approved: true,
    executed: false,
    sandbox: true,
    note: "Provider execution is intentionally disabled.",
  };
}
