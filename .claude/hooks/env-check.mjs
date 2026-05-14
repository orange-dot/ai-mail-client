const requiredForRealMode = [
  "POSTGRES_URL",
  "TOKEN_ENCRYPTION_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET",
  "ANTHROPIC_API_KEY"
];

const missing = requiredForRealMode.filter((name) => !process.env[name]);

if (process.env.DEMO_MODE !== "false") {
  console.log("DEMO_MODE=true; provider credentials may be omitted.");
  process.exit(0);
}

if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Environment is ready for real provider mode.");
