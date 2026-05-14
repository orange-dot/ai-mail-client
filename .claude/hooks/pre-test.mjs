import { existsSync } from "node:fs";

const required = ["specs/product.md", "specs/email-adapters.md", "specs/ai-features.md", "CLAUDE.md"];
const missing = required.filter((path) => !existsSync(path));

if (missing.length) {
  console.error(`Missing required workflow files: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Workflow files present.");
