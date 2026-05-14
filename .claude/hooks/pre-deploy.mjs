const warnings = [];

if (!process.env.NEXT_PUBLIC_APP_URL) warnings.push("NEXT_PUBLIC_APP_URL is not set.");
if (!process.env.POSTGRES_URL) warnings.push("POSTGRES_URL is not set; deployment will run demo-only.");
if (!process.env.TOKEN_ENCRYPTION_KEY) warnings.push("TOKEN_ENCRYPTION_KEY is not set; real provider mode is unsafe.");
if (!process.env.ANTHROPIC_API_KEY) warnings.push("ANTHROPIC_API_KEY is not set; AI will use deterministic fallbacks.");

for (const warning of warnings) console.warn(warning);

if (!process.env.TOKEN_ENCRYPTION_KEY && process.env.DEMO_MODE !== "true") {
  process.exit(1);
}

console.log("Pre-deploy review complete.");
