# Evolyn — Session Context (Master Spec)

Read this file at the start of every session. It is the source of truth for product, architecture, implementation stages, and demo behavior.

**Product:** Evolyn  
**Tagline:** An agent that learns how to become a better agent.  
**Track:** Track 1 — Automated Agent Engineering  
**Constraint:** ~2 hour hackathon prototype. Optimize for working software, visible learning, measurable improvement, and demo reliability.

---

## 1. Identity and naming (non-negotiable)

- Use **Evolyn** everywhere: UI, README, package name, page title, branding, demo copy.
- Never use the name **AgentForge**.
- Suggested tagline: "An agent that learns how to become a better agent."

---

## 2. What Evolyn is

Evolyn is an automated agent-engineering system. It does **not** merely execute tasks. It:

1. Executes a task
2. Records a structured execution trace
3. Evaluates its own performance
4. Identifies failures and inefficiencies
5. Extracts reusable procedural knowledge
6. Proposes behavioral / tool-use improvements
7. Validates those improvements against benchmark tasks
8. Promotes only improvements that measurably improve performance

The learning loop must be **real in code**, not simulated in the UI.

```
TASK
→ PLAN
→ TOOL USE
→ RESULT
→ TRACE
→ EVALUATION
→ FAILURE ANALYSIS
→ REFLECTION
→ MEMORY / POLICY CANDIDATE
→ VALIDATION
→ PROMOTE OR REJECT
→ BETTER FUTURE EXECUTION
```

Critical principle the system must demonstrate:

```
EXECUTION → EXPERIENCE → FAILURE ANALYSIS → LEARNING → VALIDATION → BEHAVIOR CHANGE
```

The underlying code must actually:

- record traces
- evaluate runs
- create learning candidates
- validate them
- persist promoted policies
- load promoted policies in future runs
- change tool selection based on learned policy

Do **not** hardcode the improved final behavior as if learning already happened.

---

## 3. Hackathon priorities

Prioritize, in order:

1. End-to-end functionality
2. Visible learning behavior
3. Measurable before/after improvement
4. Clean architecture
5. Fast local execution
6. A polished demo UI

Do **not** over-engineer. Do **not** build Redis, Kafka, Kubernetes, microservices, or other production infrastructure.

Use a simple persistent local store (SQLite or JSON).

---

## 4. Primary demonstration

**Domain:** investigation of an order issue.

**Example task:**

> Investigate why order #4821 was delayed and determine what action should be taken.

Tools (deterministic mock/local is preferred):

- Order API
- CRM
- Knowledge Base
- Slack / operational context

Realism of the APIs is not important. What matters is that the agent **learns which tools to use, in what order, and under what conditions**.

### Intentional initial (suboptimal) strategy

Default v0 behavior for order investigation:

1. Slack
2. CRM
3. Order API
4. Knowledge Base

### Learned (after promotion) strategy

1. Order API first
2. CRM only when customer context is needed
3. Knowledge Base when policy information is needed
4. Slack only when operational context / escalation is required

This improved order must come from a **promoted policy**, not from hardcoded post-learning logic.

---

## 5. Mandatory architecture

Create these logical modules. Keep them modular. Avoid giant files. Do not create placeholder modules that are never integrated.

```
/agent
  runtime
  planner
  tool_selector
  policy_loader

/tools
  order_api
  crm
  knowledge_base
  slack

/learning
  evaluator
  failure_analyzer
  reflection_engine
  memory_manager
  policy_engine
  validation_engine

/memory
  episodic
  procedural
  tool_memory

/evaluation
  benchmark
  metrics

/telemetry
  trace_store
  cost_tracker

/dashboard
  runs
  learning
  metrics
```

Every tool must expose:

- `name`
- `description`
- `input schema`
- `execute()`

The learning engine must operate on **generic traces**, not be hardcoded to one specific tool. External integrations, if added later, are adapters around the same Tool interface.

---

## 6. Core data models

Implement clear models for:

- Task
- ExecutionTrace
- ToolCall
- Evaluation
- Failure
- Memory
- Policy
- LearningCandidate
- AgentVersion
- BenchmarkResult

### ExecutionTrace (minimum fields)

- task_id
- task
- agent_version
- timestamp
- actions / tool calls
- observations
- final result
- success
- quality score
- tool-call count
- latency
- estimated cost
- failure classification

### Policy (minimum fields)

- id
- condition
- action / recommendation
- confidence
- evidence_count
- status
- created_from_runs
- performance_before
- performance_after

### Procedural memory (minimum fields)

- rule
- confidence
- evidence count
- source runs
- validation status
- performance impact

---

## 7. Agent execution

The runtime must:

1. Receive a task
2. Load relevant procedural / tool memory
3. Determine an execution strategy
4. Select tools (policy-aware)
5. Execute tools
6. Observe results
7. Produce a final answer
8. Record the complete trace

The tool selector **must be policy-aware**. Initially the agent intentionally uses the suboptimal Slack-first strategy. After a policy is promoted, subsequent runs must load that policy and change tool selection.

---

## 8. Evaluation

Hybrid / simple evaluator. Score at least:

- correctness
- evidence quality
- efficiency
- policy compliance

Also calculate an overall task score.

Also track:

- tool calls
- latency
- estimated token / model cost

The evaluator must make **before/after comparison** possible.

---

## 9. Failure analysis

Classify failures into:

- task_understanding
- tool_selection
- tool_ordering
- unnecessary_tool
- invalid_tool_call
- missing_context
- reasoning
- unsupported_claim
- policy_violation
- efficiency

For the demo, make recurring inefficient tool ordering detectable.

Example lesson:

> The Order API is authoritative for order state, but the agent repeatedly searches Slack before querying it.

---

## 10. Reflection engine

Receives an execution trace and evaluation.

Produces a **structured learning candidate**, not a natural-language-only reflection.

Example:

```json
{
  "type": "tool_policy",
  "condition": "task requires authoritative order state",
  "recommendation": "query order_api before slack",
  "reason": "order_api provides authoritative state",
  "confidence": 0.91
}
```

This structured knowledge must be usable by the runtime.

---

## 11. Memory

Do **not** blindly save every transcript.

Store reusable lessons only.

### Episodic memory

Important execution experiences.

### Procedural memory

Reusable behavioral rules (see fields above).

### Tool memory

Tool usefulness and observed performance.

---

## 12. Validation (mandatory)

A learning candidate must **not** automatically modify agent behavior.

Flow:

```
candidate
→ benchmark
→ compare old behavior vs candidate behavior
→ calculate improvement
→ promote if improvement exceeds threshold
→ otherwise reject
```

Example:

- old_score = 0.68 (Slack first)
- new_score = 0.86 (Order API first)
- improvement = +0.18
- result = **PROMOTED**

If the candidate makes performance worse: **REJECTED**.

This validation behavior must be **visible in the UI**.

Every promoted improvement creates a new **agent version**.

Example:

- v0 → initial Slack-first behavior
- v1 → learned Order API priority
- v2 → learned enterprise escalation logic (only if time allows)

The dashboard must show what changed between versions.

---

## 13. Metrics to track

- Task success rate
- Average quality
- Average tool calls
- Average latency
- Estimated cost
- Learning candidates
- Promoted policies
- Rejected policies
- Failure recurrence

The dashboard must make before/after improvement visually obvious.

Target visual story:

| Metric      | Before | After |
|-------------|--------|-------|
| Accuracy    | 68%    | 86%   |
| Tool Calls  | 4.0    | 2.4   |
| Latency     | 8.4s   | 4.9s  |
| Cost        | $0.021 | $0.013 |

Exact numbers may differ as long as the improvement is real and measurable from traces.

---

## 14. Dashboard

Polished single-page dashboard with:

1. Overview
2. Current Agent Version
3. Task execution panel
4. Execution trace
5. Tool usage
6. Evaluation score
7. Learning activity
8. Learned policies
9. Validation results
10. Before/after metrics

Most important visual story: **BEFORE vs AFTER**.

---

## 15. Demo mode

Deterministic demo mode. The learning loop must be reproducible.

Controls:

- Run Task
- Analyze Run
- Generate Improvement
- Validate Improvement
- Promote Policy
- Run Again
- **Run Full Learning Cycle** (entire pipeline automatically)

The same task must visibly behave differently after the policy is promoted.

Use deterministic mock data so the demo cannot fail because an external API is unavailable.

---

## 16. Stack decision

The repository was empty when this spec was written.

**Chosen stack (unless a later session has already scaffolded something else — do not rewrite a working stack):**

- **Next.js (App Router) + TypeScript**
- Single local app (API routes + React dashboard)
- Persistence: **SQLite** via `better-sqlite3` if easy, otherwise **JSON files** under `/data`
- No LLM required for the core demo. Use a deterministic planner / tool selector driven by policies and mock tool results.
- Optional later: an LLM adapter behind the same planner interface. Do not block the demo on API keys.

Why this stack:

- One command to run locally (`npm install` + `npm run dev`)
- Typed models
- Fast UI
- No extra backend process

Package name / app title: **evolyn**.

---

## 17. Implementation strategy

Build incrementally. After each stage:

1. Inspect existing code
2. Implement only the requested stage
3. Run the application
4. Run tests or smoke checks
5. Fix errors
6. Report exactly what works
7. Do not move to unrelated features until the current stage is functional

Rules for every session:

- Do not rewrite working code unnecessarily
- Do not introduce new dependencies unless required
- Do not create unused placeholder modules
- Follow the existing repo if code already exists
- Keep components modular
- Use typed interfaces/models
- The final system must be runnable locally with a simple command

---

## 18. Staged build plan

Update the status table at the bottom of this file after every completed stage.

### Stage 0 — Context (this file)

- [x] Write `cursor.md`
- [x] Write always-on Cursor rule that points later sessions here

### Stage 1 — Scaffold + models + store

Goal: runnable empty app + typed models + persistence.

- Next.js + TypeScript project named Evolyn
- Shared types for all core data models
- Local store (SQLite or JSON)
- Seed agent version **v0**
- README with one-command run instructions

Done when: `npm run dev` starts and models can be written/read.

### Stage 2 — Tools + mock domain data

Goal: four tools with a shared Tool interface and deterministic order #4821 data.

- `order_api`, `crm`, `knowledge_base`, `slack`
- Mock facts that support a coherent investigation answer
- Each tool returns structured observations

Done when: tools can be executed independently and return stable mock results.

### Stage 3 — Agent runtime (v0 suboptimal)

Goal: task in → plan → tool calls → answer → trace.

- runtime, planner, tool_selector, policy_loader
- v0 strategy: Slack → CRM → Order API → Knowledge Base
- Persist ExecutionTrace

Done when: submitting the demo task produces a full trace with 4 tool calls in the suboptimal order.

### Stage 4 — Telemetry

Goal: traces and cost are queryable.

- trace_store
- cost_tracker
- latency + tool-call count + estimated cost on every run

Done when: a completed run can be loaded back with all telemetry fields.

### Stage 5 — Evaluation + failure analysis

Goal: scored run + classified inefficiency.

- evaluator (correctness, evidence, efficiency, policy compliance, overall)
- failure_analyzer with required categories
- Detect Slack-before-Order-API as `tool_ordering` / `efficiency`

Done when: a v0 run shows a mediocre score and a clear tool_ordering failure.

### Stage 6 — Reflection → structured candidate

Goal: trace + evaluation → LearningCandidate.

- reflection_engine
- policy_engine stores candidate as **pending**, not active

Done when: a candidate like “query order_api before slack” exists in the store.

### Stage 7 — Memory

Goal: reusable lessons, not raw transcripts.

- episodic: notable v0 failure experience
- procedural: candidate rule (unvalidated)
- tool_memory: usefulness / latency / authority notes per tool

Done when: memory records exist and are loadable by the runtime / policy_loader.

### Stage 8 — Validation + promote/reject + versioning

Goal: candidate cannot change behavior until promoted.

- benchmark suite for the order-investigation task
- compare baseline policy vs candidate policy
- promote if improvement exceeds threshold; else reject
- promoted policy creates AgentVersion v1
- v1 policy_loader changes tool order

Done when: promote creates v1, reject does not, and a new run uses Order API first.

### Stage 9 — Dashboard + demo controls

Goal: polished single-page demo UI that tells the BEFORE vs AFTER story.

- Overview, current version, task panel, trace, tool usage, scores
- Learning activity, policies, validation results, before/after metrics
- Demo buttons listed in section 15
- Run Full Learning Cycle

Done when: a judge can click through the loop without using the terminal.

### Stage 10 — Polish + demo reliability

Goal: one-command local run, deterministic demo, README, no AgentForge leftovers.

- Deterministic timings / costs if needed for a clean visual story
- Smoke check of the full loop
- Final copy pass (Evolyn only)

Done when: the Definition of Done checklist below is all true.

---

## 19. Definition of Done

The prototype is successful if a user can:

1. Start the application
2. Submit the order investigation task
3. Observe tool calls
4. See an execution trace
5. See evaluation
6. See the detected inefficiency
7. Generate a structured policy candidate
8. Validate it
9. Promote it
10. Run the same task again
11. Observe different / better tool selection
12. Observe improved metrics
13. Inspect the learned policy
14. Explain the complete learning loop during a live demo

Optimize for:

**WORKING SOFTWARE + VISIBLE LEARNING + MEASURABLE IMPROVEMENT + DEMO RELIABILITY**

---

## 20. Session protocol (every later session)

At the start of each session:

1. Read this file (`cursor.md`)
2. Read the **Implementation status** section below
3. Inspect the repo (do not assume the status table is perfect)
4. Continue from the **next incomplete stage**
5. Stay inside that stage unless it is already complete
6. After finishing, update the status table and the “Last completed work” notes
7. Report exactly what works, what does not, and what the next stage is

If the user asks to continue / build / implement without specifying a stage, execute the next incomplete stage, then stop and report.

If the user asks for the full product in one session, still build in stage order, but keep going through stages until time or the user stops you. Do not skip validation or the real policy-load path just to fake a UI.

---

## 21. Demo script (for the live presentation)

1. Show v0. Explain Slack-first is intentionally inefficient.
2. Run Task on order #4821. Show four tool calls and the answer.
3. Analyze Run. Show scores and `tool_ordering` failure.
4. Generate Improvement. Show structured candidate, not prose.
5. Validate Improvement. Show old_score vs new_score on the benchmark.
6. Promote Policy. Show v0 → v1 and the new policy.
7. Run Again. Show Order API first, fewer tools, better score.
8. Point at BEFORE vs AFTER cards.

---

## 22. Implementation status

**Current stage:** Stage 10 complete. Final audit wired promoted memories into runtime tool selection.  
**Repo state at last update:** Clean reset starts at v0. Promoted policies **and** promoted procedural/tool memories change the next run. Unvalidated memories do not. Validate/promote/analyze are idempotent. No external APIs.  
**Stack:** Next.js App Router, TypeScript 5, JSON file at `data/evolyn.json`.

### Status table

| Stage | Name | Status |
|-------|------|--------|
| 0 | Context (`cursor.md` + always-on rule) | complete |
| 1 | Scaffold + models + store | complete |
| 2 | Tools + mock domain data | complete |
| 3 | Agent runtime (v0 suboptimal) | complete |
| 4 | Telemetry | complete |
| 5 | Evaluation + failure analysis | complete |
| 6 | Reflection → structured candidate | complete |
| 7 | Memory | complete |
| 8 | Validation + promote/reject + versioning | complete |
| 9 | Dashboard + demo controls | complete |
| 10 | Polish + demo reliability | complete |

### Last completed work

- Final audit: runtime now applies **promoted** procedural/tool memories in the tool selector (`applyPromotedMemories`), not just promoted policies.
- Factory `loadMemories` and `memory-manager.loadRelevant` ignore unvalidated memories so candidates cannot change behavior before promotion.
- Dashboard/metrics still come from stored traces only (no hardcoded 0.68/0.86 scores).
- Added Reset Demo (`POST /api/demo/reset`) and `npm run demo` so a live talk always starts at v0.
- Made analyze, validate, and promote idempotent so double-clicks cannot create v2 or duplicate benchmarks.
- Full Learning Cycle resets first, then runs the complete loop.
- Proved the 13-step flow from a clean state with `npm run demo-flow`.

### Next session should do

Nothing required for the hackathon demo. If time remains, only copy or timing polish. Do not change the learning loop.
