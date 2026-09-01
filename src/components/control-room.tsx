"use client";

import {
  Activity,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Database,
  FlaskConical,
  Inbox,
  KeyRound,
  LockKeyhole,
  MessageSquareText,
  RefreshCcw,
  RotateCcw,
  Shield,
  ShieldAlert,
  Sparkles,
  Store,
  UserRoundCheck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import styles from "@/components/control-room.module.css";
import type {
  ActionProposalRecord,
  Boundary,
  DashboardSnapshot,
  SecurityEvent,
  WorkflowRun,
} from "@/lib/domain";
import { DEMO_SCENARIOS, getScenario } from "@/lib/scenarios";

type View = "lab" | "inbox" | "evidence" | "integration";

const VIEW_LABELS = {
  lab: "Workflow",
  inbox: "Support",
  evidence: "Evidence",
  integration: "Integration",
} as const satisfies Record<View, string>;

function ViewIcon({ view }: { view: View }): React.ReactElement {
  switch (view) {
    case "lab":
      return <FlaskConical aria-hidden="true" />;
    case "inbox":
      return <Inbox aria-hidden="true" />;
    case "evidence":
      return <Activity aria-hidden="true" />;
    case "integration":
      return <Database aria-hidden="true" />;
  }
}

const BOUNDARY_COPY = {
  input: {
    index: "01",
    title: "Customer input",
    description: "Before the message reaches the model",
  },
  context: {
    index: "02",
    title: "Private context",
    description: "After retrieval, before model context",
  },
  action: {
    index: "03",
    title: "Proposed action",
    description: "Before database or provider execution",
  },
} as const satisfies Record<Boundary, { index: string; title: string; description: string }>;

const DEFAULT_SCENARIO = (() => {
  const scenario = DEMO_SCENARIOS.find((candidate) => candidate.id === "clean-order-status");
  if (!scenario) throw new Error("Default demo scenario is missing.");
  return scenario;
})();

function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function shortTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "—"
    : new Intl.DateTimeFormat("en", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
      }).format(date);
}

function runLabel(status: WorkflowRun["status"]): string {
  return status.replaceAll("_", " ");
}

function statusTone(status: WorkflowRun["status"]): string {
  if (status.startsWith("blocked") || status === "failed") return styles.dangerTone ?? "";
  if (status === "awaiting_approval") return styles.warningTone ?? "";
  return styles.safeTone ?? "";
}

function eventFor(run: WorkflowRun | undefined, boundary: Boundary): SecurityEvent | undefined {
  return run?.events.find((event) => event.boundary === boundary);
}

export function ControlRoom({
  initialSnapshot,
}: {
  initialSnapshot: DashboardSnapshot;
}): React.ReactElement {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [view, setView] = useState<View>("lab");
  const [scenarioId, setScenarioId] = useState<string>(DEFAULT_SCENARIO.id);
  const [message, setMessage] = useState<string>(DEFAULT_SCENARIO.message);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(
    initialSnapshot.runs[0]?.id ?? null,
  );
  const [busy, setBusy] = useState<"run" | "reset" | string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedRun = useMemo(
    () => snapshot.runs.find((run) => run.id === selectedRunId) ?? snapshot.runs[0],
    [selectedRunId, snapshot.runs],
  );

  function chooseScenario(id: string): void {
    const next = getScenario(id);
    if (!next) return;
    setScenarioId(next.id);
    setMessage(next.message);
    setError(null);
  }

  async function runSelectedScenario(): Promise<void> {
    setBusy("run");
    setError(null);
    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId, message }),
      });
      const payload: unknown = await response.json();
      if (!response.ok || !isRunResponse(payload)) {
        throw new Error(readApiError(payload));
      }
      setSnapshot(payload.snapshot);
      setSelectedRunId(payload.run.id);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "The scenario could not run.");
    } finally {
      setBusy(null);
    }
  }

  async function resetDemo(): Promise<void> {
    if (!window.confirm("Reset all synthetic orders, runs, and approvals to the demo baseline?")) {
      return;
    }
    setBusy("reset");
    setError(null);
    try {
      const response = await fetch("/api/reset", { method: "POST" });
      const payload: unknown = await response.json();
      if (!response.ok || !isSnapshot(payload)) throw new Error(readApiError(payload));
      setSnapshot(payload);
      setSelectedRunId(null);
      chooseScenario(DEFAULT_SCENARIO.id);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "The demo could not reset.");
    } finally {
      setBusy(null);
    }
  }

  async function approveAction(action: ActionProposalRecord): Promise<void> {
    setBusy(action.id);
    setError(null);
    try {
      const response = await fetch(`/api/actions/${action.id}/approve`, { method: "POST" });
      const payload: unknown = await response.json();
      if (!response.ok || !isActionResponse(payload)) throw new Error(readApiError(payload));
      setSnapshot(payload.snapshot);
    } catch (approvalError) {
      setError(approvalError instanceof Error ? approvalError.message : "Approval failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">
        Skip to main content
      </a>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <Shield strokeWidth={2.25} />
          </span>
          <div>
            <span className={styles.brandName}>Commerce Support</span>
            <span className={styles.brandByline}>A Koreshield reference client</span>
          </div>
        </div>
        <nav className={styles.navigation} aria-label="Primary navigation">
          {(Object.keys(VIEW_LABELS) as View[]).map((item) => (
            <button
              className={view === item ? styles.navActive : styles.navButton}
              aria-current={view === item ? "page" : undefined}
              key={item}
              onClick={() => setView(item)}
              type="button"
            >
              <span className={styles.navIcon}>
                <ViewIcon view={item} />
              </span>
              <span className={styles.navLabel}>{VIEW_LABELS[item]}</span>
            </button>
          ))}
        </nav>
        <div className={styles.topActions}>
          <span className={styles.liveStatus}>
            <span aria-hidden="true" />
            Synthetic workspace
          </span>
          <button
            aria-label="Reset all synthetic demo data"
            className={styles.iconButton}
            disabled={busy !== null}
            onClick={resetDemo}
            title="Reset demo"
            type="button"
          >
            <RotateCcw strokeWidth={1.75} />
          </button>
        </div>
      </header>

      <main className={styles.main} id="main-content">
        {view === "lab" && (
          <LabView
            approveAction={approveAction}
            busy={busy}
            message={message}
            onMessageChange={setMessage}
            onRun={runSelectedScenario}
            onScenarioChange={chooseScenario}
            run={selectedRun}
            scenarioId={scenarioId}
          />
        )}
        {view === "inbox" && <InboxView snapshot={snapshot} />}
        {view === "evidence" && (
          <EvidenceView
            onSelectRun={(id) => {
              setSelectedRunId(id);
              setView("lab");
            }}
            runs={snapshot.runs}
          />
        )}
        {view === "integration" && <IntegrationView snapshot={snapshot} />}
      </main>

      <footer className={styles.footer}>
        <span>All people, orders, messages, addresses, and actions in this app are synthetic.</span>
        <span>Sandbox mutations only · No payment or messaging providers</span>
      </footer>

      <div aria-live="polite" className={styles.srOnly}>
        {busy === "run" ? "Scenario is running." : ""}
        {error ? `Error: ${error}` : ""}
      </div>
      {error && (
        <div className={styles.errorToast} role="alert">
          <CircleAlert aria-hidden="true" />
          <span>{error}</span>
          <button aria-label="Dismiss error" onClick={() => setError(null)} type="button">
            <X aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

interface LabViewProps {
  scenarioId: string;
  message: string;
  run: WorkflowRun | undefined;
  busy: string | null;
  onScenarioChange: (id: string) => void;
  onMessageChange: (message: string) => void;
  onRun: () => Promise<void>;
  approveAction: (action: ActionProposalRecord) => Promise<void>;
}

function LabView(props: LabViewProps): React.ReactElement {
  const scenario = getScenario(props.scenarioId) ?? DEFAULT_SCENARIO;
  return (
    <div className={styles.labGrid}>
      <aside aria-label="Demo scenarios" className={styles.scenarioRail}>
        <div className={styles.railHeading}>
          <span className={styles.eyebrow}>Scenario library</span>
          <span className={styles.scenarioCount}>{DEMO_SCENARIOS.length}</span>
        </div>
        <div className={styles.mobileScenarioPicker}>
          <label htmlFor="mobile-scenario">Test scenario</label>
          <select
            id="mobile-scenario"
            name="mobile-scenario"
            onChange={(event) => props.onScenarioChange(event.target.value)}
            value={props.scenarioId}
          >
            {DEMO_SCENARIOS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.shortLabel} · {item.category}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.scenarioList}>
          {DEMO_SCENARIOS.map((item, index) => (
            <button
              aria-current={props.scenarioId === item.id ? "true" : undefined}
              className={props.scenarioId === item.id ? styles.scenarioActive : styles.scenarioButton}
              key={item.id}
              onClick={() => props.onScenarioChange(item.id)}
              type="button"
            >
              <span className={styles.scenarioIndex}>{String(index + 1).padStart(2, "0")}</span>
              <span>
                <strong>{item.shortLabel}</strong>
                <small>{item.category}</small>
              </span>
              <ChevronRight aria-hidden="true" strokeWidth={1.75} />
            </button>
          ))}
        </div>
        <div className={styles.railNote}>
          <FlaskConical aria-hidden="true" strokeWidth={1.75} />
          <p>Repeatable attacks, tenant-scoped data, and sandbox-only tools. Reset at any time.</p>
        </div>
      </aside>

      <section className={styles.scenarioWorkspace}>
        <div className={styles.workspaceHeading}>
          <div>
            <span className={styles.eyebrow}>Current exercise</span>
            <h1>{scenario.title}</h1>
            <p>{scenario.description}</p>
          </div>
          <span className={styles.expectedBadge}>
            Expected: {scenario.expectedBoundary === "none" ? "allow" : `stop at ${scenario.expectedBoundary}`}
          </span>
        </div>

        <div className={styles.messageComposer}>
          <label htmlFor="scenario-message">
            <MessageSquareText aria-hidden="true" strokeWidth={1.75} />
            Customer message
          </label>
          <textarea
            autoComplete="off"
            id="scenario-message"
            maxLength={2_000}
            name="scenario-message"
            onChange={(event) => props.onMessageChange(event.target.value)}
            rows={5}
            spellCheck="true"
            value={props.message}
          />
          <div className={styles.composerFooter}>
            <span>{props.message.length} / 2,000</span>
            <button
              className={styles.runButton}
              disabled={props.busy !== null || props.message.trim().length === 0}
              onClick={props.onRun}
              type="button"
            >
              {props.busy === "run" ? (
                <RefreshCcw aria-hidden="true" className={styles.spin} />
              ) : (
                <Sparkles aria-hidden="true" />
              )}
              {props.busy === "run" ? "Inspecting workflow…" : "Run protected request"}
              {props.busy !== "run" && <ArrowRight aria-hidden="true" />}
            </button>
          </div>
        </div>

        {props.run ? (
          <RunResult approveAction={props.approveAction} busy={props.busy} run={props.run} />
        ) : (
          <EmptyRun />
        )}
      </section>

      <aside aria-label="Trust-boundary trace" className={styles.pipelinePanel}>
        <div className={styles.pipelineHeading}>
          <span className={styles.eyebrow}>Trust-boundary trace</span>
          <span className={props.run ? statusTone(props.run.status) : styles.neutralTone}>
            {props.run ? runLabel(props.run.status) : "not run"}
          </span>
        </div>
        <div className={styles.pipeline}>
          {(["input", "context", "action"] as const).map((boundary, index) => (
            <BoundaryStep
              boundary={boundary}
              event={eventFor(props.run, boundary)}
              isLast={index === 2}
              key={boundary}
            />
          ))}
        </div>
        <div className={styles.providerFootnote}>
          <Shield aria-hidden="true" strokeWidth={1.75} />
          <p>
            Each result names its provider. Simulator decisions are demonstration evidence, not
            Koreshield production results.
          </p>
        </div>
      </aside>
    </div>
  );
}

function BoundaryStep({
  boundary,
  event,
  isLast,
}: {
  boundary: Boundary;
  event: SecurityEvent | undefined;
  isLast: boolean;
}): React.ReactElement {
  const copy = BOUNDARY_COPY[boundary];
  const stopped = event?.blocked;
  const observed = event?.wouldBlock && !event.blocked;
  return (
    <div className={styles.boundaryStep}>
      <div className={styles.boundaryRail} aria-hidden="true">
        <span className={stopped ? styles.nodeBlocked : event ? styles.nodePassed : styles.nodeIdle}>
          {stopped ? <X /> : event ? <Check /> : copy.index}
        </span>
        {!isLast && <i />}
      </div>
      <div className={styles.boundaryContent}>
        <div className={styles.boundaryTitle}>
          <strong>{copy.title}</strong>
          {event && (
            <span className={stopped ? styles.dangerTone : observed ? styles.warningTone : styles.safeTone}>
              {stopped ? "blocked" : observed ? "observed" : "allowed"}
            </span>
          )}
        </div>
        <p>{event?.summary ?? copy.description}</p>
        {event && (
          <dl className={styles.boundaryMeta}>
            <div><dt>Provider</dt><dd>{event.provider}</dd></div>
            <div><dt>Confidence</dt><dd>{Math.round(event.confidence * 100)}%</dd></div>
            <div><dt>Latency</dt><dd>{Math.round(event.latencyMs)} ms</dd></div>
          </dl>
        )}
      </div>
    </div>
  );
}

function EmptyRun(): React.ReactElement {
  return (
    <div className={styles.emptyRun}>
      <div className={styles.emptyGlyph} aria-hidden="true"><Activity strokeWidth={1.5} /></div>
      <div>
        <strong>No request selected yet</strong>
        <p>Choose an exercise and run it to see the AI response, tool proposal, and evidence.</p>
      </div>
    </div>
  );
}

function RunResult({
  run,
  busy,
  approveAction,
}: {
  run: WorkflowRun;
  busy: string | null;
  approveAction: (action: ActionProposalRecord) => Promise<void>;
}): React.ReactElement {
  return (
    <section className={styles.resultPanel} aria-labelledby="run-result-title">
      <div className={styles.resultHeader}>
        <div>
          <span className={styles.eyebrow}>Latest outcome · {shortTime(run.createdAt)} UTC</span>
          <h2 id="run-result-title">Workflow result</h2>
        </div>
        <span className={statusTone(run.status)}>{runLabel(run.status)}</span>
      </div>
      <div className={styles.responseBlock}>
        <Bot aria-hidden="true" strokeWidth={1.75} />
        <div>
          <span>Customer-facing response</span>
          <p>{run.response}</p>
        </div>
      </div>
      {run.actions.length > 0 && (
        <div className={styles.actionStack}>
          {run.actions.map((action) => (
            <div className={styles.actionCard} key={action.id}>
              <div className={styles.actionHeader}>
                <div><span>Proposed tool</span><strong>{action.toolName.replaceAll("_", " ")}</strong></div>
                <span className={
                  action.status === "blocked"
                    ? styles.dangerTone
                    : action.status === "awaiting_approval"
                      ? styles.warningTone
                      : styles.safeTone
                }>
                  {action.status.replaceAll("_", " ")}
                </span>
              </div>
              <p>{action.rationale}</p>
              <pre>{JSON.stringify(action.args, null, 2)}</pre>
              {action.result && <p className={styles.actionResult}>{JSON.stringify(action.result)}</p>}
              {action.status === "awaiting_approval" && (
                <button
                  className={styles.approveButton}
                  disabled={busy !== null}
                  onClick={() => approveAction(action)}
                  type="button"
                >
                  <UserRoundCheck aria-hidden="true" />
                  {busy === action.id ? "Applying sandbox change…" : "Approve sandbox action"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <div className={styles.resultFooter}>
        <span><KeyRound aria-hidden="true" /> Request {run.id.slice(0, 8)}</span>
        <span>AI: {run.aiProvider.replace("_", " ")}</span>
      </div>
    </section>
  );
}

function InboxView({ snapshot }: { snapshot: DashboardSnapshot }): React.ReactElement {
  const order = snapshot.orders[0];
  return (
    <div className={styles.pageFrame}>
      <header className={styles.pageHeading}>
        <div>
          <span className={styles.eyebrow}>Synthetic operator workspace</span>
          <h1>Support desk</h1>
          <p>The private context and customer conversation used by the protected workflow.</p>
        </div>
        <span className={styles.workspaceBadge}><Store aria-hidden="true" /> {snapshot.tenant.name}</span>
      </header>
      <div className={styles.inboxGrid}>
        <aside aria-label="Support conversations" className={styles.inboxList}>
          <div className={styles.inboxListHeader}>
            <Inbox aria-hidden="true" />
            <strong>Open conversation</strong>
            <span>1</span>
          </div>
          <button aria-current="true" className={styles.conversationRow} type="button">
            <span className={styles.avatar}>AO</span>
            <span><strong>{snapshot.conversation.customer.name}</strong><small>{snapshot.conversation.subject}</small></span>
            <time>{shortTime(snapshot.conversation.messages.at(-1)?.createdAt ?? "")}</time>
          </button>
        </aside>
        <section className={styles.thread}>
          <div className={styles.threadHeader}>
            <div><strong>{snapshot.conversation.customer.name}</strong><span>WhatsApp · {snapshot.conversation.status}</span></div>
            <span className={styles.safeTone}>AI protected</span>
          </div>
          <div className={styles.messages}>
            {snapshot.conversation.messages.map((item) => (
              <div className={item.role === "customer" ? styles.customerMessage : styles.agentMessage} key={item.id}>
                <span>{item.role}</span><p>{item.content}</p><time>{shortTime(item.createdAt)}</time>
              </div>
            ))}
          </div>
          <div className={styles.composerDisabled}>
            <LockKeyhole aria-hidden="true" />
            Sending is disabled here. Use Workflow to add synthetic messages.
          </div>
        </section>
        <aside aria-label="Customer and order context" className={styles.contextPanel}>
          <div className={styles.contextSection}>
            <span className={styles.eyebrow}>Private customer context</span>
            <h2>{snapshot.conversation.customer.name}</h2>
            <dl>
              <div><dt>Email</dt><dd>{snapshot.conversation.customer.email}</dd></div>
              <div><dt>Loyalty</dt><dd>{snapshot.conversation.customer.loyaltyTier}</dd></div>
            </dl>
          </div>
          {order && (
            <div className={styles.orderCard}>
              <div><span>Order</span><strong>{order.number}</strong></div>
              <span className={styles.safeTone}>{order.status}</span>
              <dl>
                <div><dt>Total</dt><dd>{formatMoney(order.totalMinor, order.currency)}</dd></div>
                <div><dt>Delivery</dt><dd>{order.shippingAddress}</dd></div>
              </dl>
            </div>
          )}
          <div className={styles.contextWarning}>
            <ShieldAlert aria-hidden="true" />
            <p>This panel demonstrates why retrieved context must be inspected and tenant-scoped.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function EvidenceView({
  runs,
  onSelectRun,
}: {
  runs: WorkflowRun[];
  onSelectRun: (id: string) => void;
}): React.ReactElement {
  const blocked = runs.filter((run) => run.status.startsWith("blocked")).length;
  return (
    <div className={styles.pageFrame}>
      <header className={styles.pageHeading}>
        <div>
          <span className={styles.eyebrow}>Privacy-minimized audit trail</span>
          <h1>Security evidence</h1>
          <p>Decisions, request identifiers, latency, and final workflow outcomes.</p>
        </div>
      </header>
      <div className={styles.metricStrip}>
        <Metric label="Protected requests" value={String(runs.length)} />
        <Metric label="Stopped workflows" value={String(blocked)} />
        <Metric label="Pending approvals" value={String(runs.filter((run) => run.status === "awaiting_approval").length)} />
        <Metric label="Boundaries inspected" value={String(runs.reduce((sum, run) => sum + run.events.length, 0))} />
      </div>
      {runs.length === 0 ? <EmptyRun /> : (
        <div className={styles.evidenceTableWrap}>
          <table className={styles.evidenceTable}>
            <caption className={styles.srOnly}>Recent protected workflow runs</caption>
            <thead><tr><th scope="col">Request</th><th scope="col">Scenario</th><th scope="col">Outcome</th><th scope="col">Boundaries</th><th scope="col">Provider</th><th scope="col"><span className={styles.srOnly}>Open</span></th></tr></thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td data-label="Request"><code>{run.id.slice(0, 8)}</code><small>{shortTime(run.createdAt)} UTC</small></td>
                  <td data-label="Scenario">{getScenario(run.scenarioId)?.shortLabel ?? run.scenarioId}</td>
                  <td data-label="Outcome"><span className={statusTone(run.status)}>{runLabel(run.status)}</span></td>
                  <td data-label="Boundaries">
                    <span className={styles.boundaryDots} aria-label={`${run.events.length} boundaries inspected`}>
                      {(["input", "context", "action"] as const).map((boundary) => {
                        const event = eventFor(run, boundary);
                        return <i className={!event ? styles.dotIdle : event.blocked ? styles.dotBlocked : styles.dotPassed} key={boundary} />;
                      })}
                    </span>
                  </td>
                  <td data-label="Provider">{run.events[0]?.provider ?? "—"}</td>
                  <td data-label="Open"><button aria-label={`Open request ${run.id.slice(0, 8)}`} onClick={() => onSelectRun(run.id)} type="button"><ArrowRight aria-hidden="true" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): React.ReactElement {
  return <div className={styles.metric}><strong>{value}</strong><span>{label}</span></div>;
}

function IntegrationView({ snapshot }: { snapshot: DashboardSnapshot }): React.ReactElement {
  return (
    <div className={styles.pageFrame}>
      <header className={styles.pageHeading}>
        <div>
          <span className={styles.eyebrow}>Server-side provider contract</span>
          <h1>Integration map</h1>
          <p>How this reference client connects real AI, private data, Koreshield, and sandbox tools.</p>
        </div>
      </header>
      <div className={styles.integrationGrid}>
        <section className={styles.architectureCard}>
          <span className={styles.eyebrow}>Protected request path</span>
          <div className={styles.architectureFlow}>
            <ArchitectureNode icon={<MessageSquareText />} label="Customer message" sublabel="Untrusted" />
            <FlowArrow />
            <ArchitectureNode icon={<Shield />} label="Input scan" sublabel="Boundary 01" />
            <FlowArrow />
            <ArchitectureNode icon={<Database />} label="Private retrieval" sublabel="Tenant-scoped" />
            <FlowArrow />
            <ArchitectureNode icon={<Shield />} label="Context scan" sublabel="Boundary 02" />
            <FlowArrow />
            <ArchitectureNode icon={<Bot />} label="AI planner" sublabel="Structured proposal" />
            <FlowArrow />
            <ArchitectureNode icon={<Shield />} label="Action scan" sublabel="Boundary 03" />
            <FlowArrow />
            <ArchitectureNode icon={<UserRoundCheck />} label="Approval / tool" sublabel="Sandbox only" />
          </div>
        </section>
        <section className={styles.connectionCard}>
          <span className={styles.eyebrow}>Runtime connections</span>
          <ConnectionRow configured={snapshot.integration.security.configured} icon={<Shield />} label="Security" value={`${snapshot.integration.security.provider} · ${snapshot.integration.security.mode}`} />
          <ConnectionRow configured={snapshot.integration.ai.configured} icon={<Bot />} label="AI" value={`${snapshot.integration.ai.provider} · ${snapshot.integration.ai.model}`} />
          <ConnectionRow
            configured
            icon={<Database />}
            label="Data"
            value={`${snapshot.integration.data.provider.toUpperCase()} · synthetic only`}
          />
          <p className={styles.connectionNote}>
            Simulator mode is functional and deterministic. Live mode requires server-side
            credentials and labels returned decisions as Koreshield or OpenAI evidence.
          </p>
        </section>
        <section className={styles.envCard}>
          <span className={styles.eyebrow}>Enable live providers</span>
          <pre>{`DEMO_AI_PROVIDER=openai
OPENAI_API_KEY=••••••••
OPENAI_MODEL=gpt-4o-mini

DEMO_SECURITY_PROVIDER=koreshield
KORESHIELD_API_URL=https://api.koreshield.com
KORESHIELD_API_KEY=ks_••••••••
KORESHIELD_MODE=enforce`}</pre>
          <p>Keys remain on the server and are never included in browser state or API responses.</p>
        </section>
        <section className={styles.guaranteesCard}>
          <span className={styles.eyebrow}>Host application guarantees</span>
          <ul>
            <li><CheckCircle2 aria-hidden="true" /> Tenant checks remain mandatory after Koreshield.</li>
            <li><CheckCircle2 aria-hidden="true" /> Sensitive mutations require explicit operator approval.</li>
            <li><CheckCircle2 aria-hidden="true" /> Real payment and messaging providers are not connected.</li>
            <li><CheckCircle2 aria-hidden="true" /> Reset restores the complete synthetic baseline.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function ArchitectureNode({ icon, label, sublabel }: { icon: React.ReactNode; label: string; sublabel: string }): React.ReactElement {
  return <div className={styles.architectureNode}><span aria-hidden="true">{icon}</span><strong>{label}</strong><small>{sublabel}</small></div>;
}

function FlowArrow(): React.ReactElement {
  return <ArrowRight aria-hidden="true" className={styles.flowArrow} strokeWidth={1.5} />;
}

function ConnectionRow({ configured, icon, label, value }: { configured: boolean; icon: React.ReactNode; label: string; value: string }): React.ReactElement {
  return (
    <div className={styles.connectionRow}>
      <span aria-hidden="true">{icon}</span>
      <div><strong>{label}</strong><small>{value}</small></div>
      <span className={configured ? styles.safeTone : styles.neutralTone}>{configured ? "connected" : "simulated"}</span>
    </div>
  );
}

function isSnapshot(value: unknown): value is DashboardSnapshot {
  if (!value || typeof value !== "object") return false;
  return "tenant" in value && "conversation" in value && "runs" in value && "integration" in value;
}

function isRunResponse(value: unknown): value is { run: WorkflowRun; snapshot: DashboardSnapshot } {
  if (!value || typeof value !== "object") return false;
  return "run" in value && "snapshot" in value && isSnapshot(value.snapshot);
}

function isActionResponse(value: unknown): value is { action: ActionProposalRecord; snapshot: DashboardSnapshot } {
  if (!value || typeof value !== "object") return false;
  return "action" in value && "snapshot" in value && isSnapshot(value.snapshot);
}

function readApiError(value: unknown): string {
  if (value && typeof value === "object" && "error" in value && typeof value.error === "string") {
    return value.error;
  }
  return "The server returned an unexpected response.";
}
