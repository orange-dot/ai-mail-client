#!/usr/bin/env node
// UserPromptSubmit hook. If the prompt starts with `/checkpoint`, append a record to
// .cooperations/tasks.json on the active task. Idempotent on repeat — sequence number guards duplicates.
//
// Input: stdin envelope { hook_event_name, prompt }
// Output: stdout message; exit 0 always.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

let envelope = {};
try {
  const raw = readFileSync(0, "utf8");
  envelope = raw ? JSON.parse(raw) : {};
} catch {
  process.exit(0);
}

const prompt = (envelope.prompt || "").trim();
if (!prompt.startsWith("/checkpoint")) process.exit(0);

const parts = prompt.split(/\s+/);
const gate = parts[1];
const decision = parts[2];

if (!gate || !decision) process.exit(0);
if (!["plan_check", "review_check", "refine_check", "final_check"].includes(gate)) process.exit(0);
if (!["approve", "revise", "stop"].includes(decision)) process.exit(0);

if (!existsSync(".cooperations")) mkdirSync(".cooperations");
const tasksPath = ".cooperations/tasks.json";
if (!existsSync(tasksPath)) {
  // Nothing to record against.
  process.exit(0);
}

let ledger;
try {
  ledger = JSON.parse(readFileSync(tasksPath, "utf8"));
} catch {
  console.warn("[checkpoint-record] WARN: tasks.json unreadable; skipping record.");
  process.exit(0);
}

const active = (ledger.tasks || []).find((t) => t.status === "in_progress");
if (!active) {
  console.warn("[checkpoint-record] WARN: no in_progress task to record checkpoint against.");
  process.exit(0);
}

active.checkpoints = active.checkpoints || [];
const record = { gate, decision, timestamp: new Date().toISOString() };
active.checkpoints.push(record);

if (decision === "revise") {
  active.revise_count = active.revise_count || {};
  active.revise_count[gate] = (active.revise_count[gate] || 0) + 1;
  if (active.revise_count[gate] >= 2) {
    console.warn(`[checkpoint-record] WARN: gate ${gate} hit MAX_REVIEW_CYCLES (2) on task ${active.id}.`);
  }
}

writeFileSync(tasksPath, JSON.stringify(ledger, null, 2) + "\n");
console.log(`[checkpoint-record] recorded ${gate} ${decision} on task ${active.id}`);
process.exit(0);
