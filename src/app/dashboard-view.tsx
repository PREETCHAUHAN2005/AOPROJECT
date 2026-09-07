"use client";

import type { ComparisonMetrics, DashboardView } from "@/dashboard/types";
import type { RunInspection, ToolCall } from "@/models";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DashboardView({ initial }: { initial: DashboardView }) {
  const router = useRouter();
  const [view, setView] = useState(initial);
  const [prompt, setPrompt] = useState(initial.defaultTask);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<RunInspection | null>(initial.latest);

  async function refreshView() {
    const response = await fetch("/api/dashboard");
    if (response.ok) {
      const next = (await response.json()) as DashboardView;
      setView(next);
      setLatest(next.latest);
    }
    router.refresh();
  }

  async function post<T = Record<string, unknown>>(url: string, body: Record<string, string | undefined> = {}) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { error?: string } & Record<string, unknown>;
    if (!response.ok) {
      throw new Error(payload.error ?? "Request failed");
    }
    return payload as unknown as T;
  }

  async function run(label: string, work: () => Promise<void>) {
    setPending(label);
    setError(null);
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

  return (
    <main>
      <header className="hero">
        <p className="eyebrow">Automated agent engineering</p>
        <h1>{view.product}</h1>
        <p className="tagline">{view.tagline}</p>
      </header>

      {view.promotionBanner ? (
        <aside className="banner">
          <strong>{view.promotionBanner.title}</strong>
          <p>{view.promotionBanner.policyText}</p>
        </aside>
      ) : null}

      <section className="status-row">
        <StatusCard label="Current Agent Version" value={view.status.version.version} detail={view.status.version.label} />
        <StatusCard label="Learning Status" value={view.status.learningStatus} detail={`${learning.events.length} ledger events`} />
        <StatusCard label="Tasks Executed" value={String(view.status.tasksExecuted)} detail={`${pct(view.metrics.taskSuccessRate)}% success`} />
        <StatusCard label="Policies Learned" value={String(view.status.policiesLearned)} detail={`${view.metrics.rejectedPolicies} rejected`} />
      </section>

      <section className="card wide">
        <h2>1. Execute Task</h2>
        <div className="stack">
          <textarea
            className="task-input"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={3}
          />
          <div className="actions">
            <button className="run-button secondary" type="button" disabled={pending !== null} onClick={() => run("reset", async () => {
              await post("/api/demo/reset");
              setLatest(null);
              setPrompt(view.defaultTask);
            })}>
              {pending === "reset" ? "Resetting…" : "Reset Demo"}
            </button>
            <button className="run-button" type="button" disabled={pending !== null} onClick={() => run("run", async () => {
              const payload = await post<RunInspection>("/api/runs", { prompt });
              setLatest(payload);
            })}>
              {pending === "run" ? "Running…" : "Run Task"}
            </button>
            <button className="run-button secondary" type="button" disabled={pending !== null || !latest} onClick={() => run("analyze", async () => {
              const payload = await post<RunInspection>("/api/analyze", { traceId: latest?.trace.id });
              setLatest(payload);
            })}>
              {pending === "analyze" ? "Analyzing…" : "Analyze Run"}
            </button>
            <button className="run-button secondary" type="button" disabled={pending !== null || !latest} onClick={() => run("learn", async () => {
              await post("/api/learn", { traceId: latest?.trace.id });
            })}>
              {pending === "learn" ? "Generating…" : "Generate Improvement"}
            </button>
            <button className="run-button secondary" type="button" disabled={pending !== null || !learning.candidate} onClick={() => run("validate", async () => {
              await post("/api/validate", { candidateId: learning.candidate?.id });
            })}>
              {pending === "validate" ? "Validating… about 15s" : "Validate Improvement"}
            </button>
            <button className="run-button secondary" type="button" disabled={pending !== null || !learning.candidate || learning.candidate.status === "promoted"} onClick={() => run("promote", async () => {
              await post("/api/promote", { candidateId: learning.candidate?.id });
            })}>
              {pending === "promote" ? "Promoting…" : "Promote Policy"}
            </button>
            <button className="run-button secondary" type="button" disabled={pending !== null} onClick={() => run("run", async () => {
              const payload = await post<RunInspection>("/api/runs", { prompt });
              setLatest(payload);
            })}>
              Run Again
            </button>
            <button className="run-button" type="button" disabled={pending !== null} onClick={() => run("cycle", async () => {
              const payload = await post<{ after?: RunInspection }>("/api/cycle");
              if (payload.after) setLatest(payload.after);
            })}>
              {pending === "cycle" ? "Running full cycle… about 20s" : "Run Full Learning Cycle"}
            </button>
          </div>
          {pending ? <p className="muted">Working: {pending}. The page stays on this run so the demo does not lose state.</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </div>
      </section>

      <section className="split">
        <article className="card">
          <h2>2. Execution Trace</h2>
          {latest ? <TracePanel inspection={latest} /> : <p className="muted">No runs yet. Execute the task to record a trace.</p>}
        </article>
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
            <p className="muted">No evaluation yet.</p>
          )}
        </article>
      </section>

      <section className="card wide">
        <h2>4. Learning Activity</h2>
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
      </section>

      <section className="split">
        <article className="card">
          <h2>5. Learned Policies</h2>
          {view.promotedPolicies.length > 0 ? (
            <div className="stack">
              {view.promotedPolicies.map((policy) => (
                <div key={policy.id}>
                  <p className="meta"><strong>{policy.condition}</strong></p>
                  <p className="task">{policy.action}</p>
                  <p className="muted">
                    confidence {policy.confidence} · evidence {policy.evidenceCount} ·{" "}
                    {policy.performanceBefore ?? "—"} → {policy.performanceAfter ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No promoted policies yet. v0 Slack-first behavior is still active.</p>
          )}
        </article>
        <article className="card">
          <h2>6. Agent Evolution</h2>
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
        <h2>7. Before vs After</h2>
        {view.before || view.after ? (
          <div className="compare">
            <CompareCard label="Score" before={view.before} after={view.after} field="score" format={asPercent} better="up" />
            <CompareCard label="Tool calls" before={view.before} after={view.after} field="toolCalls" format={asNumber} better="down" />
            <CompareCard label="Latency" before={view.before} after={view.after} field="latencyMs" format={asMs} better="down" />
            <CompareCard label="Cost" before={view.before} after={view.after} field="cost" format={asCost} better="down" />
          </div>
        ) : (
          <p className="muted">Run the task before and after promotion to populate real comparison metrics.</p>
        )}
        <p className="muted">
          Averages from stored runs only
          {view.before ? ` · before ${view.before.runs} v0 run(s)` : ""}
          {view.after ? ` · after ${view.after.runs} later run(s)` : ""}.
        </p>
      </section>
    </main>
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
        {trace.success ? "Succeeded" : "Failed"} · {trace.agentVersion} · {trace.toolCalls.map((call) => call.tool).join(" → ")}
      </p>
      <ol className="calls">
        {trace.toolCalls.map((call, index) => (
          <li key={call.id}>
            <strong>{index + 1}. {call.tool}</strong>
            <span className="muted"> · {call.latencyMs}ms · {call.success ? "ok" : "error"}</span>
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
