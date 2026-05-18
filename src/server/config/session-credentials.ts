import { cookies } from "next/headers";
import { decryptSecret, encryptSecret } from "@/server/security/crypto";

// Per-browser "bring your own credentials" store for the deployed demo. A
// visitor's Google OAuth app credentials and Anthropic API key live only in
// this encrypted, httpOnly cookie — no database, no shared server state — so a
// single public deploy serves every visitor independently.

const COOKIE_NAME = "byo_credentials";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const MAX_FIELD_LENGTH = 512;

export type SessionCredentials = {
  googleClientId?: string;
  googleClientSecret?: string;
  anthropicApiKey?: string;
};

// --- pure helpers (unit-tested without a request context) ---------------

// Encrypts a credentials object into the cookie payload.
export function encodeCredentials(credentials: SessionCredentials): string {
  return encryptSecret(JSON.stringify(sanitize(credentials)));
}

// Decrypts a cookie payload. Never throws: a missing, truncated, tampered, or
// wrong-version value yields {} so no route can 500 on a bad cookie.
export function decodeCredentials(raw: string | null | undefined): SessionCredentials {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(decryptSecret(raw)) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return sanitize(parsed as SessionCredentials);
  } catch {
    return {};
  }
}

// Merges a partial update over the current credentials. An explicit empty
// string clears a field; an absent (undefined) field is left unchanged.
export function mergeCredentials(current: SessionCredentials, update: SessionCredentials): SessionCredentials {
  return sanitize({
    googleClientId: pick(update.googleClientId, current.googleClientId),
    googleClientSecret: pick(update.googleClientSecret, current.googleClientSecret),
    anthropicApiKey: pick(update.anthropicApiKey, current.anthropicApiKey)
  });
}

// --- cookie-bound API (request context required) ------------------------

export async function readSessionCredentials(): Promise<SessionCredentials> {
  try {
    return decodeCredentials((await cookies()).get(COOKIE_NAME)?.value);
  } catch {
    return {};
  }
}

// Cookie writes are only valid in route handlers / server actions (Next 15),
// so this is called solely from the settings route.
export async function writeSessionCredentials(update: SessionCredentials): Promise<void> {
  const merged = mergeCredentials(await readSessionCredentials(), update);
  (await cookies()).set(COOKIE_NAME, encodeCredentials(merged), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/"
  });
}

export async function clearSessionCredentials(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

// Effective Google OAuth app credentials: the session value wins, then server
// environment. Either field may be undefined when nothing is configured.
export async function resolveGoogleCredentials(): Promise<{ clientId?: string; clientSecret?: string }> {
  const session = await readSessionCredentials();
  return {
    clientId: session.googleClientId ?? clean(process.env.GOOGLE_CLIENT_ID),
    clientSecret: session.googleClientSecret ?? clean(process.env.GOOGLE_CLIENT_SECRET)
  };
}

// Effective Anthropic API key: session value wins, then server environment.
export async function resolveAnthropicKey(): Promise<string | undefined> {
  const session = await readSessionCredentials();
  return session.anthropicApiKey ?? clean(process.env.ANTHROPIC_API_KEY);
}

// --- internals ----------------------------------------------------------

function sanitize(credentials: SessionCredentials): SessionCredentials {
  const result: SessionCredentials = {};
  const id = clean(credentials.googleClientId);
  const secret = clean(credentials.googleClientSecret);
  const key = clean(credentials.anthropicApiKey);
  if (id) result.googleClientId = id;
  if (secret) result.googleClientSecret = secret;
  if (key) result.anthropicApiKey = key;
  return result;
}

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_FIELD_LENGTH ? trimmed : undefined;
}

function pick(next: string | undefined, current: string | undefined): string | undefined {
  if (next === undefined) return current;
  return clean(next);
}
