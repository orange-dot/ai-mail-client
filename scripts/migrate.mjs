import { readFile } from "node:fs/promises";
import { sql } from "@vercel/postgres";

if (!process.env.POSTGRES_URL) {
  console.error("POSTGRES_URL is required for migrations.");
  process.exit(1);
}

const schema = await readFile(new URL("../src/server/db/schema.sql", import.meta.url), "utf8");
for (const statement of schema.split(/;\s*\n/).map((part) => part.trim()).filter(Boolean)) {
  await sql.query(`${statement};`);
}

console.log("Database schema is up to date.");
