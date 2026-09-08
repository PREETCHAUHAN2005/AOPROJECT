# Evolyn

**An agent that learns how to become a better agent.**

**Chosen track:** Track 1 — Automated Agent Engineering

Most agents get better only when a human rewrites the prompt or the tool order. Evolyn is the opposite idea: the agent should notice that it worked inefficiently, turn that experience into a reusable rule, prove the rule on a benchmark, and only then change how it behaves next time.

That is the whole project. Not a bigger model. A closed learning loop.

---

## Why I built this

I kept seeing “agent frameworks” that look intelligent because the UI says they learned something. The next run still does the same thing.

I wanted the opposite demo. Start with an agent that is *deliberately* bad. Let it investigate a delayed order the way a rushed intern would: Slack first, then CRM, then finally the system of record. Score that run. Name the failure. Propose a tool policy. Validate it. Promote it. Run the same task again and watch the behavior actually change.

If the policy is not promoted, v0 stays Slack-first. The improved order is not hardcoded. That was the line I refused to cross.

The interesting part, to me, is not that an agent can call tools. It is that execution can become engineering: trace → evaluation → failure → candidate → validation → promotion → a new agent version.

---

## Track (for Devpost)

**Track 1: Automated Agent Engineering**

Evolyn takes a general task, uses third-party-style tools, learns from execution experience, identifies failures, generates reusable behavioral / tool-use knowledge, validates that knowledge, and improves subsequent execution.

---

## Devpost description

Copy this into Devpost:

> **Track:** Track 1 — Automated Agent Engineering
>
> Evolyn is an agent that learns how to become a better agent.
>
> I built it because most agent demos fake improvement. A dashboard says a policy was learned, then the next run ignores it. I wanted a system where the first run is allowed to be inefficient, the failure is diagnosed from a real trace, a reusable tool-use rule is proposed, that rule is benchmarked, and only a promoted policy can change the next execution.
>
> The demo task is simple: investigate why order #4821 was delayed. Agent v0 searches Slack before the Order API. Evolyn records the trace, scores the run, attributes the waste to tool ordering, writes procedural and tool memory, validates the candidate on three order scenarios, and promotes v1 only if the score actually rises. The next run queries the Order API first, skips Slack, and the before/after metrics come from stored traces — not hardcoded numbers.
>
> The loop is local and deterministic. No external APIs. The point is visible agent engineering, not infrastructure.

---

## What happens in the loop

```
task → plan → tools → answer
     → trace → evaluation → failure
     → reflection → memory / policy candidate
     → validation → promote or reject
     → next run uses what was promoted
```

v0 tool order: Slack → CRM → Order API → Knowledge Base  
After a promoted policy: Order API → CRM → Knowledge Base

Typical scores from the live app: **0.69 → 0.98**.

---

## Run it

```bash
npm install
npm run demo
```

Open [http://localhost:3000](http://localhost:3000). The command resets to v0 first, so the talk always starts Slack-first.

### Live walkthrough

1. Reset Demo
2. Run Task — Slack first, score around 0.69
3. Analyze Run — `tool_ordering` / unnecessary Slack
4. Generate Improvement — `query order_api first`
5. Validate Improvement — benchmark 0.69 → 0.98
6. Promote Policy — v0 becomes v1
7. Run Again — Order API first, fewer tools, higher score
8. Read the before/after cards

**Run Full Learning Cycle** does that sequence from a clean reset.

### Other commands

```bash
npm run reset       # back to v0
npm run demo-flow   # offline proof of the loop
npm run smoke
npm run typecheck
```

No API keys. Tools are local mocks behind a real tool interface.

---

## Production (Vercel)

The live app cannot write `data/evolyn.json` on Vercel’s read-only serverless filesystem. Evolyn now:

- seeds in memory without writing on read
- writes session files under `/tmp` when deployed
- keeps a signed browser snapshot so the learning loop survives cold starts

Set `EVOLYN_SESSION_SECRET` in the Vercel project if you want snapshots HMAC-signed. Mutation APIs only accept same-origin browser requests.

---

## What I would not change before a demo

Do not hardcode the learned tool order. Do not auto-activate a candidate. Do not invent dashboard numbers. Start every talk from v0.
