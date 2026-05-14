#!/usr/bin/env node
// PreToolUse hook for Edit | Write on src/server/{mail/adapters,ai}/* and src/app/api/{mail,ai}/**.
// Warns (does not block) if the edit appears to drift from specs/ unless a corresponding spec is co-edited
// in the session (heuristic: spec mtime within last 30 minutes).
//
// Input: stdin is a JSON envelope with { tool_name, tool_input.file_path }.
// Output: stderr message; exit 0 = allow, exit 0 with warning = allow with warning, exit 2 = block (not used here).

import { readFileSync, statSync, existsSync } from "node:fs";
import { resolve } from "node:path";

let envelope = {};
try {
  const raw = readFileSync(0, "utf8");
  envelope = raw ? JSON.parse(raw) : {};
} catch {
  // No envelope or malformed; bail silently — hook should not break tool flow.
  process.exit(0);
}

const tool = envelope.tool_name || "";
const file = envelope.tool_input?.file_path || "";

if (!file) process.exit(0);
if (!/^(Edit|Write|MultiEdit)$/.test(tool)) process.exit(0);

const SIGNALS = [
  { pattern: /src\/server\/mail\/adapters\//, spec: "specs/email-adapters.md" },
  { pattern: /src\/server\/ai\//,             spec: "specs/ai-features.md"   },
  { pattern: /src\/app\/api\/mail\//,         spec: "specs/email-adapters.md" },
  { pattern: /src\/app\/api\/ai\//,           spec: "specs/ai-features.md"   },
  { pattern: /src\/components\/MailApp/,      spec: "specs/product.md"       },
];

const match = SIGNALS.find((s) => s.pattern.test(file));
if (!match) process.exit(0);

const specPath = resolve(process.cwd(), match.spec);
if (!existsSync(specPath)) {
  console.warn(`[specs-drift-guard] WARN: ${match.spec} missing while editing ${file}`);
  process.exit(0);
}

const specMtime = statSync(specPath).mtimeMs;
const ageMin = (Date.now() - specMtime) / 60000;

if (ageMin > 30) {
  console.warn(
    `[specs-drift-guard] WARN: editing ${file} but ${match.spec} not co-edited (last touched ${ageMin.toFixed(0)} min ago). ` +
    `Verify spec alignment; this is a warning, not a block.`
  );
}

process.exit(0);
