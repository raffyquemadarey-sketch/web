@AGENTS.md

# Agent pipeline

Work in this repo runs through four project agents defined in `.claude/agents/`. Do not implement changes directly — orchestrate.

| Agent | Role | Can edit files? |
| --- | --- | --- |
| `planner` | Investigates and writes the plan + acceptance criteria | No |
| `programmer` | Implements the plan | Yes |
| `qa` | Type check, lint, build, drives the running app | No |
| `reviewer` | Reviews the working diff | No |

## How to run it

For **any request that changes code**, invoke all four with the Agent tool, `run_in_background: false`, one at a time in order:

1. `planner` — pass the user's request verbatim, plus any constraints from the conversation.
2. `programmer` — pass the planner's full output verbatim.
3. `qa` — pass the plan's acceptance criteria and the programmer's change summary.
4. `reviewer` — pass the plan's goal; the reviewer reads the diff itself.

Each agent starts cold, so relay the previous agent's output in full rather than summarizing it.

**Fix loop:** if `qa` returns `FAIL` or `reviewer` returns `REQUEST CHANGES`, send the blockers back to `programmer`, then re-run `qa` (and `reviewer` if it was the one that objected). Cap at 2 fix rounds — after that, stop and report to the user what is still broken rather than looping.

## When to skip the pipeline

Requests that change no files — questions, explanations, reading code, "what does X do" — are answered directly. The pipeline is for changes.

To turn the automatic behavior off entirely, remove the `UserPromptSubmit` hook from `.claude/settings.json`; the agents stay available for explicit invocation.

## Reporting back

After the pipeline finishes, give the user one consolidated summary: what changed (with file links), QA's verdict, the reviewer's verdict, and anything left open. Don't dump the raw agent transcripts.
