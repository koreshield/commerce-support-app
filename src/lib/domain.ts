export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type TenantId = Brand<string, "TenantId">;
export type CustomerId = Brand<string, "CustomerId">;
export type ConversationId = Brand<string, "ConversationId">;
export type RunId = Brand<string, "RunId">;
export type ActionId = Brand<string, "ActionId">;

export const BOUNDARIES = ["input", "context", "action"] as const;
export type Boundary = (typeof BOUNDARIES)[number];

export const DECISIONS = ["allow", "observe", "block", "approval"] as const;
export type Decision = (typeof DECISIONS)[number];

export const SEVERITIES = ["none", "low", "medium", "high", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const RUN_STATUSES = [
  "completed",
  "blocked_input",
  "blocked_context",
  "blocked_action",
  "awaiting_approval",
  "failed",
] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const ACTION_STATUSES = ["executed", "awaiting_approval", "blocked", "rejected"] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

export const TOOL_NAMES = [
  "lookup_order",
  "update_shipping_address",
  "cancel_order",
  "issue_refund",
  "apply_discount",
  "escalate_to_human",
  "export_customer_data",
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

export interface Tenant {
  id: TenantId;
  name: string;
  slug: string;
  accent: string;
}

export interface Customer {
  id: CustomerId;
  tenantId: TenantId;
  name: string;
  email: string;
  loyaltyTier: string;
}

export interface Order {
  id: string;
  tenantId: TenantId;
  customerId: CustomerId;
  number: string;
  status: string;
  totalMinor: number;
  currency: string;
  shippingAddress: string;
}

export interface KnowledgeDocument {
  id: string;
  tenantId: TenantId;
  title: string;
  content: string;
  trustLevel: "managed" | "customer_supplied";
}

export interface Message {
  id: string;
  conversationId: ConversationId;
  role: "customer" | "assistant" | "operator";
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: ConversationId;
  tenantId: TenantId;
  customerId: CustomerId;
  channel: "web" | "whatsapp";
  status: "open" | "escalated" | "resolved";
  subject: string;
  customer: Customer;
  messages: Message[];
}

export interface ToolProposal {
  toolName: ToolName;
  args: Record<string, unknown>;
  rationale: string;
}

export interface AiOutcome {
  response: string;
  intent: string;
  proposals: ToolProposal[];
  provider: "simulator" | "openai";
}

export interface SecurityDecision {
  boundary: Boundary;
  blocked: boolean;
  wouldBlock: boolean;
  decision: Decision;
  severity: Severity;
  confidence: number;
  provider: "simulator" | "koreshield";
  requestId: string;
  summary: string;
  latencyMs: number;
  mode: "detect" | "enforce";
}

export interface SecurityEvent extends SecurityDecision {
  id: string;
  runId: RunId;
  createdAt: string;
}

export interface ActionProposalRecord {
  id: ActionId;
  runId: RunId;
  tenantId: TenantId;
  conversationId: ConversationId;
  toolName: ToolName;
  args: Record<string, unknown>;
  rationale: string;
  risk: Severity;
  decision: Decision;
  status: ActionStatus;
  result: Record<string, unknown> | null;
  createdAt: string;
}

export interface WorkflowRun {
  id: RunId;
  scenarioId: string;
  tenantId: TenantId;
  conversationId: ConversationId;
  input: string;
  status: RunStatus;
  response: string;
  aiProvider: "simulator" | "openai" | "not_reached";
  createdAt: string;
  events: SecurityEvent[];
  actions: ActionProposalRecord[];
}

export interface IntegrationStatus {
  ai: { provider: "simulator" | "openai"; configured: boolean; model: string };
  security: {
    provider: "simulator" | "koreshield";
    configured: boolean;
    mode: "detect" | "enforce";
    apiOrigin: string | null;
  };
  data: { provider: "sqlite"; syntheticOnly: true };
}

export interface DashboardSnapshot {
  tenant: Tenant;
  conversation: Conversation;
  orders: Order[];
  runs: WorkflowRun[];
  integration: IntegrationStatus;
}

export function assertNever(value: never): never {
  throw new Error(`Unhandled domain value: ${String(value)}`);
}
