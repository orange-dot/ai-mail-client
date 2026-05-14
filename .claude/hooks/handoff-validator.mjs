#!/usr/bin/env node
// PreToolUse hook for Edit | Write on src/**.
// Reads .cooperations/tasks.json for the active task and warns if no recent handoff names the active role.
// Soft warning only — does not block.

import { readFileSync, readdirSync, existsSync } from "node:fs";

let envelope = {};
try {
  const raw = readFileSync(0, "utf8");
  envelope = raw ? JSON.parse(raw) : {};
} catch {
  process.exit(0);
}

const tool = envelope.tool_name || "";
const file = envelope.tool_input?.file_path || "";

if (!/^(Edit|Write|MultiEdit)$/.test(tool)) process.exit(0);
if (!file.includes("/src/")) process.exit(0);

const tasksPath = ".cooperations/tasks.json";
if (!existsSync(tasksPath)) {
  console.warn("[handoff-validator] WARN: no .cooperations/tasks.json yet; run /cooperate before editing src/.");
  process.exit(0);
}

let ledger;
try {
  ledger = JSON.parse(readFileSync(tasksPath, "utf8"));
} catch {
  console.warn("[handoff-validator] WARN: .cooperations/tasks.json unreadable.");
  process.exit(0);
}

const active = (ledger.tasks || []).find((t) => t.status === "in_progress");
if (!active) {
  console.warn("[handoff-validator] WARN: no active cooperation; src/ edit without a /cooperate task is uncovered.");
  process.exit(0);
}

const phase = active.current_phase;
if (phase === "plan" || phase === "claude_review" || phase === "plan_refine" || phase === "claude_final") {
  console.warn(
    `[handoff-validator] WARN: active task ${active.id} is in phase '${phase}' (read-only). ` +
    `Editing ${file} now violates sandbox-discipline. Advance via /checkpoint first.`
  );
  process.exit(0);
}

// Phase is 'implement' or 'test' — workspace-write is allowed. Look at the latest handoff and confirm.
const handoffsDir = ".cooperations/handoffs";
if (!existsSync(handoffsDir)) {
  console.warn(`[handoff-validator] WARN: handoffs dir missing for task ${active.id}.`);
  process.exit(0);
}

const handoffs = readdirSync(handoffsDir)
  .filter((f) => f.startsWith(`${active.id}-`) && f.endsWith(".json"))
  .sort();

if (handoffs.length === 0) {
  console.warn(`[handoff-validator] WARN: task ${active.id} in phase '${phase}' has no handoffs recorded.`);
  process.exit(0);
}

// Optional deeper check: parse the last handoff and ensure to_role aligns with the current_role.
// Kept as a soft hint only.

process.exit(0);
