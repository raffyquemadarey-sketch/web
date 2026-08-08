#!/usr/bin/env node
// UserPromptSubmit hook: reminds the main session to run the project's
// planner -> programmer -> qa -> reviewer pipeline on every request.
// Full spec lives in CLAUDE.md ("Agent pipeline").

const reminder = [
  "[goodminton agent pipeline]",
  "For any request that changes code in this repo, do not implement it yourself.",
  "Run the four project agents via the Agent tool with run_in_background: false, in order:",
  "planner -> programmer -> qa -> reviewer.",
  "Pass each agent the previous agent's output verbatim.",
  "If qa reports FAIL or reviewer reports REQUEST CHANGES, send the blockers back to programmer and re-run qa,",
  "up to 2 fix rounds, then report what is still broken.",
  "Requests that change no files (questions, explanations, reading code) are answered directly - no pipeline.",
  "Spec: CLAUDE.md section 'Agent pipeline'.",
].join(" ");

process.stdout.write(
  JSON.stringify({
    suppressOutput: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: reminder,
    },
  })
);
