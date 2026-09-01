import type {
  ActionId,
  ActionProposalRecord,
  ActionStatus,
  Conversation,
  ConversationId,
  CustomerId,
  KnowledgeDocument,
  Order,
  RunId,
  RunStatus,
  Decision,
  SecurityDecision,
  SecurityEvent,
  Severity,
  Tenant,
  TenantId,
  ToolName,
  WorkflowRun,
} from "@/lib/domain";

export type RepositoryResult<T> = T | Promise<T>;

export interface NewAction {
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
}

export interface SupportRepository {
  readonly storageProvider: "sqlite" | "d1";
  reset(): RepositoryResult<void>;
  getDefaultTenant(): RepositoryResult<Tenant>;
  getConversation(id?: ConversationId): RepositoryResult<Conversation>;
  getOrders(tenant: TenantId, customer?: CustomerId): RepositoryResult<Order[]>;
  getOrderByNumber(number: string): RepositoryResult<Order | null>;
  getKnowledge(
    tenant: TenantId,
    documentIds?: readonly string[],
  ): RepositoryResult<KnowledgeDocument[]>;
  startRun(input: {
    scenarioId: string;
    tenantId: TenantId;
    conversationId: ConversationId;
    message: string;
  }): RepositoryResult<RunId>;
  finishRun(
    id: RunId,
    status: RunStatus,
    response: string,
    aiProvider: string,
  ): RepositoryResult<void>;
  addSecurityEvent(run: RunId, decision: SecurityDecision): RepositoryResult<SecurityEvent>;
  addAction(action: NewAction): RepositoryResult<ActionProposalRecord>;
  getAction(id: ActionId): RepositoryResult<ActionProposalRecord | null>;
  completeAction(
    id: ActionId,
    status: ActionStatus,
    result: Record<string, unknown>,
  ): RepositoryResult<void>;
  updateOrderAddress(
    orderId: string,
    tenant: TenantId,
    address: string,
  ): RepositoryResult<boolean>;
  listRuns(limit?: number): RepositoryResult<WorkflowRun[]>;
}
