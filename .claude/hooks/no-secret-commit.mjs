import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const patterns = [
  /ANTHROPIC_API_KEY\s*=\s*sk-/i,
  /GOOGLE_CLIENT_SECRET\s*=\s*[^ \n]+/i,
  /MICROSOFT_CLIENT_SECRET\s*=\s*[^ \n]+/i,
  /TOKEN_ENCRYPTION_KEY\s*=\s*(?!replace-with)/i,
  /refresh_token/i
];

const files = execFileSync("git", ["diff", "--cached", "--name-only"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

for (const file of files) {
  let content = "";
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  for (const pattern of patterns) {
    if (pattern.test(content)) {
      console.error(`Potential secret in ${file}`);
      process.exit(1);
    }
  }
}

console.log("No obvious staged secrets found.");
