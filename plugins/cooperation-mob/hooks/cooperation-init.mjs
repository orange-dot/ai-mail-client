#!/usr/bin/env node
// SessionStart hook. Ensures .cooperations/ exists and prints the active cooperation (if any) for orientation.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

if (!existsSync(".cooperations")) mkdirSync(".cooperations");
if (!existsSync(".cooperations/handoffs")) mkdirSync(".cooperations/handoffs");
if (!existsSync(".cooperations/evidence")) mkdirSync(".cooperations/evidence");

const tasksPath = ".cooperations/tasks.json";
if (!existsSync(tasksPath)) {
  writeFileSync(tasksPath, JSON.stringify({ tasks: [] }, null, 2) + "\n");
  console.log("[cooperation-init] initialized .cooperations/tasks.json");
  process.exit(0);
}

let ledger;
try {
  ledger = JSON.parse(readFileSync(tasksPath, "utf8"));
} catch {
  console.warn("[cooperation-init] WARN: .cooperations/tasks.json is malformed.");
  process.exit(0);
}

const active = (ledger.tasks || []).filter((t) => t.status === "in_progress");
if (active.length === 0) {
  console.log("[cooperation-init] no active cooperation. /cooperate to start one.");
  process.exit(0);
}

if (active.length > 1) {
  console.warn(`[cooperation-init] WARN: ${active.length} cooperations in_progress; resolve before starting another.`);
}

for (const t of active) {
  console.log(
    `[cooperation-init] active task=${t.id} phase=${t.current_phase} role=${t.current_role} sandbox=${t.sandbox}`
  );
}
process.exit(0);
