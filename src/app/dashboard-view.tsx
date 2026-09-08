"use client";

import type { ComparisonMetrics, DashboardView, DemoStepId } from "@/dashboard/types";
import type { RunInspection, ToolCall } from "@/models";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const SNAPSHOT_KEY = "evolyn.session.snapshot";

interface SessionMeta {
  persistence?: DashboardView["persistence"]["mode"];
  persistenceLabel?: string;
  signed?: boolean;
  snapshot?: string;
}

type ApiPayload = Record<string, unknown> & {
  error?: string;
  session?: SessionMeta;
};

function readSnapshot(): string | null {
  try {
    return sessionStorage.getItem(SNAPSHOT_KEY);
  } catch {
    return null;
  }
}

function writeSnapshot(token?: string) {
  if (!token) {
    return;
  }
  try {
    sessionStorage.setItem(SNAPSHOT_KEY, token);
  } catch {
    // sessionStorage can be unavailable in strict browser modes
  }
}

function inspectionFrom(payload: ApiPayload): RunInspection | null {
  const trace = payload.trace;
  if (!trace || typeof trace !== "object") {
    return null;
  }
  return {
    trace: trace as RunInspection["trace"],
    evaluation: (payload.evaluation as RunInspection["evaluation"]) ?? null,
    failures: Array.isArray(payload.failures) ? (payload.failures as RunInspection["failures"]) : [],
  };
}

export function DashboardView({ initial }: { initial: DashboardView }) {
  const router = useRouter();
  const [view, setView] = useState(initial);
  const [prompt, setPrompt] = useState(initial.defaultTask);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryWork, setRetryWork] = useState<(() => Promise<void>) | null>(null);
  const [latest, setLatest] = useState<RunInspection | null>(initial.latest);

  useEffect(() => {
    if (!readSnapshot()) {
      return;
    }
    void refreshView().catch(() => undefined);
  }, []);

  async function parseResponse(response: Response): Promise<ApiPayload> {
    const payload = (await response.json()) as ApiPayload;
    if (payload.session?.snapshot) {
      writeSnapshot(payload.session.snapshot);
    }
    if (payload.session?.persistence && payload.session.persistenceLabel) {
      setView((current) => ({
        ...current,
        persistence: {
          mode: payload.session!.persistence!,
          label: payload.session!.persistenceLabel!,
        },
      }));
    }
    if (!response.ok) {
      throw new Error(payload.error ?? "Request failed");
    }
    return payload;
  }

  async function refreshView() {
    const response = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snapshot: readSnapshot() ?? undefined }),
    });
    const payload = await parseResponse(response);
    const next = payload as unknown as DashboardView;
    setView(next);
    setLatest(next.latest);
    router.refresh();
  }

  async function post<T = Record<string, unknown>>(url: string, body: Record<string, string | undefined> = {}) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, snapshot: readSnapshot() ?? undefined }),
    });
    const payload = await parseResponse(response);
    return payload as unknown as T & ApiPayload;
  }

  async function run(label: string, work: () => Promise<void>) {
    setPending(label);
    setError(null);
    setRetryWork(() => work);
    try {
      await work();
      await refreshView();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setPending(null);
    }
  }

  const learning = view.learning;
  const nextStep = view.nextStep;
  const busy = pending !== null;

  function isRecommended(id: DemoStepId) {
    return nextStep.id === id || (id === "run" && nextStep.id === "rerun");
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span>Automated agent engineering</span>
          <strong>{view.product}</strong>
        </div>
        <div className="top-meta">
          <span className="badge ok">{view.status.version.version}</span>
          <span className="badge">{view.persistence.label}</span>
        </div>
      </header>

      <main id="content">
        <section className="hero">
          <p className="eyebrow">Visible learning, not a rewritten prompt</p>
          <h1>{view.tagline}</h1>
          <p className="tagline">
            Execute a task, trace the waste, propose a tool policy, prove it on a benchmark, and only then change
            the next run.
          </p>
        </section>

        {view.promotionBanner ? (
          <aside className="banner">
            <strong>{view.promotionBanner.title}</strong>
            <p>{view.promotionBanner.policyText}</p>
          </aside>
        ) : null}

        <section className="status-row">
          <StatusCard label="Current agent" value={view.status.version.version} detail={view.status.version.label} />
          <StatusCard label="Learning status" value={view.status.learningStatus} detail={`${learning.events.length} ledger events`} />
          <StatusCard label="Tasks executed" value={String(view.status.tasksExecuted)} detail={`${pct(view.metrics.taskSuccessRate)}% success`} />
          <StatusCard label="Policies learned" value={String(view.status.policiesLearned)} detail={`${view.metrics.rejectedPolicies} rejected`} />
        </section>

        <section className="workspace">
          <article className="card">
            <h2>1. Execute</h2>
            <div className="stack">
              <label className="field-label" htmlFor="task-prompt">
                Investigation prompt
              </label>
              <textarea
                id="task-prompt"
                className="task-input"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={4}
                maxLength={4000}
                disabled={busy}
              />
              <p className="hint">{nextStep.reason}</p>
              <div className="actions-bar" role="group" aria-label="Learning loop actions">
                <ActionButton
                  pending={pending}
                  busy={busy}
                  id="reset"
                  recommended={false}
                  onClick={() =>
                    run("reset", async () => {
                      await post("/api/demo/reset");
                      setLatest(null);
                      setPrompt(view.defaultTask);
                    })
                  }
                >
                  Reset Demo
                </ActionButton>
                <ActionButton
                  pending={pending}
                  busy={busy}
                  id="run"
                  recommended={isRecommended("run") || isRecommended("rerun")}
                  onClick={() =>
                    run("run", async () => {
                      const payload = await post<RunInspection>("/api/runs", { prompt });
                      const inspection = inspectionFrom(payload as ApiPayload);
                      if (inspection) setLatest(inspection);
                    })
                  }
                >
                  {nextStep.id === "rerun" ? "Run Again" : "Run Task"}
                </ActionButton>
                <ActionButton
                  pending={pending}
                  busy={busy || !latest}
                  id="analyze"
                  recommended={isRecommended("analyze")}
                  title={!latest ? "Run a task first." : undefined}
                  onClick={() =>
                    run("analyze", async () => {
                      const payload = await post<RunInspection>("/api/analyze", { traceId: latest?.trace.id });
                      const inspection = inspectionFrom(payload as ApiPayload);
                      if (inspection) setLatest(inspection);
                    })
                  }
                >
                  Analyze Run
                </ActionButton>
                <ActionButton
                  pending={pending}
                  busy={busy || !latest}
                  id="learn"
                  recommended={isRecommended("learn")}
                  title={!latest ? "Analyze a run first." : undefined}
                  onClick={() =>
                    run("learn", async () => {
                      await post("/api/learn", { traceId: latest?.trace.id });
                    })
                  }
                >
                  Generate Improvement
                </ActionButton>
                <ActionButton
                  pending={pending}
                  busy={busy || !learning.candidate}
                  id="validate"
                  recommended={isRecommended("validate")}
                  title={!learning.candidate ? "Generate an improvement first." : undefined}
                  onClick={() =>
                    run("validate", async () => {
                      await post("/api/validate", { candidateId: learning.candidate?.id });
                    })
                  }
                >
                  {pending === "validate" ? "Validating…" : "Validate Improvement"}
                </ActionButton>
                <ActionButton
                  pending={pending}
                  busy={busy || !learning.candidate || learning.candidate.status === "promoted"}
                  id="promote"
                  recommended={isRecommended("promote")}
                  title={
                    !learning.candidate
                      ? "Validate a candidate first."
                      : learning.candidate.status === "promoted"
                        ? "This policy is already promoted."
                        : undefined
                  }
                  onClick={() =>
                    run("promote", async () => {
                      await post("/api/promote", { candidateId: learning.candidate?.id });
                    })
                  }
                >
                  Promote Policy
                </ActionButton>
                <ActionButton
                  pending={pending}
                  busy={busy}
                  id="cycle"
                  recommended={false}
                  onClick={() =>
                    run("cycle", async () => {
                      const payload = await post<{ after?: RunInspection }>("/api/cycle");
                      if (payload.after) setLatest(payload.after);
                    })
                  }
                >
                  {pending === "cycle" ? "Running full cycle…" : "Run Full Learning Cycle"}
                </ActionButton>
              </div>
              <div aria-live="polite">
                {pending ? <p className="muted">Working: {pending}. This page keeps the current run in view.</p> : null}
                {error ? (
                  <p className="error">
                    {error}{" "}
                    {retryWork ? (
                      <button
                        className="run-button secondary"
                        type="button"
                        onClick={() => run("retry", retryWork)}
                      >
                        Retry
                      </button>
                    ) : null}
                  </p>
                ) : null}
              </div>
            </div>
          </article>

          <article className="card">
            <h2>2. Run details</h2>
            {latest ? (
              <TracePanel inspection={latest} />
            ) : (
              <p className="empty-state">No runs yet. Execute the task to record a trace.</p>
            )}
          </article>
        </section>

        <section className="split">
          <article className="card">
            <h2>3. Evaluation</h2>
            {latest?.evaluation ? (
              <div className="stack">
                <div className="scores">
                  <Metric label="Correctness" value={`${pct(latest.evaluation.correctness)}%`} />
                  <Metric label="Evidence quality" value={`${pct(latest.evaluation.evidenceQuality)}%`} />
                  <Metric label="Efficiency" value={`${pct(latest.evaluation.efficiency)}%`} />
                  <Metric label="Overall score" value={`${pct(latest.evaluation.overall)}%`} emphasize />
                  <Metric label="Tool calls" value={String(latest.evaluation.toolCallCount)} />
                  <Metric label="Latency" value={`${latest.evaluation.latencyMs}ms`} />
                  <Metric label="Estimated cost" value={`$${latest.evaluation.estimatedCost.toFixed(4)}`} />
                </div>
              </div>
            ) : (
              <p className="empty-state">No evaluation yet. Analyze a completed run.</p>
            )}
          </article>
          <article className="card">
            <h2>4. Learning activity</h2>
            <ol className="timeline">
              <TimelineStep
                title="Failure detected"
                active={(latest?.failures.length ?? 0) > 0}
                body={latest?.failures[0]?.description ?? "No failure recorded on the latest run."}
              />
              <TimelineStep
                title="Reflection"
                active={Boolean(learning.candidate)}
                body={learning.candidate?.reason ?? "No structured reflection yet."}
              />
              <TimelineStep
                title="Candidate policy"
                active={Boolean(learning.candidate)}
                body={
                  learning.candidate
                    ? `${learning.candidate.recommendation}${learning.candidate.avoid ? `; avoid ${learning.candidate.avoid}` : ""}`
                    : "No candidate stored."
                }
              />
              <TimelineStep
                title="Validation"
                active={Boolean(learning.benchmark)}
                body={
                  learning.benchmark
                    ? `${learning.benchmark.oldScore} → ${learning.benchmark.newScore} (${signed(learning.benchmark.improvement)})`
                    : "Benchmark has not been run."
                }
              />
              <TimelineStep
                title={learning.candidate?.status === "rejected" ? "Rejected" : "Promoted"}
                active={learning.candidate?.status === "promoted" || learning.candidate?.status === "rejected"}
                body={
                  learning.events.find((event) => event.type === "promoted" || event.type === "rejected")?.summary ??
                  "No promotion decision yet."
                }
              />
            </ol>
          </article>
        </section>

        <section className="split">
          <article className="card">
            <h2>5. Learned policies</h2>
            {view.promotedPolicies.length > 0 ? (
              <div className="stack">
                {view.promotedPolicies.map((policy) => (
                  <div key={policy.id}>
                    <p className="meta">
                      <strong>{policy.condition}</strong>
                    </p>
                    <p className="task">{policy.action}</p>
                    <p className="muted">
                      confidence {policy.confidence} · evidence {policy.evidenceCount} ·{" "}
                      {policy.performanceBefore ?? "—"} → {policy.performanceAfter ?? "—"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">No promoted policies yet. v0 Slack-first behavior is still active.</p>
            )}
          </article>
          <article className="card">
            <h2>6. Agent evolution</h2>
            <div className="evolution">
              {learning.versions.map((version, index) => (
                <div key={version.id} className={version.id === learning.currentVersion.id ? "version current" : "version"}>
                  <p className="meta">
                    <strong>{version.version}</strong>
                    {index < learning.versions.length - 1 ? " →" : ""}
                    {version.id === learning.currentVersion.id ? " current" : ""}
                  </p>
                  <p className="muted">{version.changelog}</p>
                  <p className="muted">{version.defaultToolOrder.join(" → ")}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="card wide">
          <h2>7. Before vs after</h2>
          {view.before || view.after ? (
            <div className="compare">
              <CompareCard label="Score" before={view.before} after={view.after} field="score" format={asPercent} better="up" />
              <CompareCard label="Tool calls" before={view.before} after={view.after} field="toolCalls" format={asNumber} better="down" />
              <CompareCard label="Latency" before={view.before} after={view.after} field="latencyMs" format={asMs} better="down" />
              <CompareCard label="Cost" before={view.before} after={view.after} field="cost" format={asCost} better="down" />
            </div>
          ) : (
            <p className="empty-state">Run the task before and after promotion to populate real comparison metrics.</p>
          )}
          <p className="muted">
            Averages from stored runs only
            {view.before ? ` · before ${view.before.runs} v0 run(s)` : ""}
            {view.after ? ` · after ${view.after.runs} later run(s)` : ""}.
          </p>
        </section>
      </main>
    </div>
  );
}

function ActionButton({
  children,
  pending,
  busy,
  id,
  recommended,
  onClick,
  title,
}: {
  children: string;
  pending: string | null;
  busy: boolean;
  id: string;
  recommended: boolean;
  onClick: () => void;
  title?: string;
}) {
  const working = pending === id || (id === "run" && pending === "run");
  return (
    <button
      className={`run-button ${recommended ? "recommended" : "secondary"}`}
      type="button"
      disabled={busy}
      title={title}
      aria-busy={working}
      onClick={onClick}
    >
      {working ? "Working…" : children}
    </button>
  );
}

function StatusCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="status-card">
      <h2>{label}</h2>
      <p className="status-value">{value}</p>
      <p className="muted">{detail}</p>
    </article>
  );
}

function TracePanel({ inspection }: { inspection: RunInspection }) {
  const { trace } = inspection;
  return (
    <div className="stack">
      <p className={trace.success ? "ok" : "error"}>
        <span className="badge ok">{trace.success ? "succeeded" : "failed"}</span>{" "}
        {trace.agentVersion} · {trace.toolCalls.map((call) => call.tool).join(" → ")}
      </p>
      <ol className="calls">
        {trace.toolCalls.map((call, index) => (
          <li key={call.id}>
            <strong>
              {index + 1}. {call.tool}
            </strong>
            <span className="muted">
              {" "}
              · {call.latencyMs}ms · {call.success ? "ok" : "error"}
            </span>
            <p className="muted">{summarizeObservation(call)}</p>
          </li>
        ))}
      </ol>
      <p className="task">{trace.finalResult}</p>
    </div>
  );
}

function TimelineStep({ title, body, active }: { title: string; body: string; active: boolean }) {
  return (
    <li className={active ? "step active" : "step"}>
      <strong>{title}</strong>
      <p className="muted">{body}</p>
    </li>
  );
}

function Metric({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <p className={emphasize ? "metric emphasize" : "metric"}>
      <span className="muted">{label}</span>
      <strong>{value}</strong>
    </p>
  );
}

function CompareCard({
  label,
  before,
  after,
  field,
  format,
  better,
}: {
  label: string;
  before: ComparisonMetrics | null;
  after: ComparisonMetrics | null;
  field: keyof Pick<ComparisonMetrics, "score" | "toolCalls" | "latencyMs" | "cost">;
  format: (value: number) => string;
  better: "up" | "down";
}) {
  const beforeValue = before?.[field];
  const afterValue = after?.[field];
  const improved =
    beforeValue !== undefined && afterValue !== undefined
      ? better === "up"
        ? afterValue > beforeValue
        : afterValue < beforeValue
      : false;

  return (
    <article className={improved ? "compare-card improved" : "compare-card"}>
      <h2>{label}</h2>
      <p className="compare-line">
        <span>{beforeValue === undefined ? "—" : format(beforeValue)}</span>
        <span className="arrow">→</span>
        <strong>{afterValue === undefined ? "—" : format(afterValue)}</strong>
      </p>
    </article>
  );
}

function summarizeObservation(call: ToolCall): string {
  const observation = call.observation;
  if (!observation || typeof observation !== "object") {
    return "No observation";
  }
  const record = observation as Record<string, unknown>;
  if (record.delayCode) {
    return `${String(record.status ?? "found")} · ${String(record.delayCode)}`;
  }
  if (record.tier) {
    return `${String(record.name ?? "customer")} · ${String(record.tier)}`;
  }
  if (Array.isArray(record.articles)) {
    return `${record.articles.length} policy article(s)`;
  }
  if (Array.isArray(record.messages)) {
    return `${record.messages.length} Slack message(s) · ${record.authoritative === false ? "not authoritative" : "ok"}`;
  }
  return record.found === false ? "Not found" : "Observation recorded";
}

function pct(value: number): string {
  return (value * 100).toFixed(0);
}

function signed(value: number): string {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function asPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

function asNumber(value: number): string {
  return value.toFixed(1);
}

function asMs(value: number): string {
  return `${Math.round(value)}ms`;
}

function asCost(value: number): string {
  return `$${value.toFixed(4)}`;
}
