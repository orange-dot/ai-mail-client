import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  clearSessionCredentials,
  readSessionCredentials,
  writeSessionCredentials,
  type SessionCredentials
} from "@/server/config/session-credentials";
import { apiError, requireAccess } from "@/server/http";

// Per-browser credential settings for the bring-your-own-keys demo. Every
// response is a redacted status object — no stored secret value ever leaves
// the server.

const schema = z.object({
  googleClientId: z.string().max(512).optional(),
  googleClientSecret: z.string().max(512).optional(),
  anthropicApiKey: z.string().max(512).optional()
});

type CredentialStatus = {
  googleConfigured: boolean;
  anthropicConfigured: boolean;
  googleSource: "session" | "env" | "none";
  anthropicSource: "session" | "env" | "none";
  encryptionKeyset: boolean;
};

function statusFor(session: SessionCredentials): CredentialStatus {
  const envGoogleId = clean(process.env.GOOGLE_CLIENT_ID);
  const envGoogleSecret = clean(process.env.GOOGLE_CLIENT_SECRET);
  const envAnthropic = clean(process.env.ANTHROPIC_API_KEY);

  const googleId = session.googleClientId ?? envGoogleId;
  const googleSecret = session.googleClientSecret ?? envGoogleSecret;
  const anthropicKey = session.anthropicApiKey ?? envAnthropic;

  return {
    googleConfigured: Boolean(googleId && googleSecret),
    anthropicConfigured: Boolean(anthropicKey),
    googleSource: session.googleClientId ? "session" : googleId ? "env" : "none",
    anthropicSource: session.anthropicApiKey ? "session" : anthropicKey ? "env" : "none",
    encryptionKeyset: Boolean(clean(process.env.TOKEN_ENCRYPTION_KEY))
  };
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function GET(request: NextRequest) {
  const accessError = requireAccess(request);
  if (accessError) return accessError;

  try {
    return NextResponse.json(statusFor(await readSessionCredentials()));
  } catch (error) {
    return apiError(error, 500);
  }
}

export async function POST(request: NextRequest) {
  const accessError = requireAccess(request);
  if (accessError) return accessError;

  try {
    const update = schema.parse(await request.json());
    await writeSessionCredentials(update);
    return NextResponse.json(statusFor(await readSessionCredentials()));
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error, 400);
    return apiError(error, 400);
  }
}

export async function DELETE(request: NextRequest) {
  const accessError = requireAccess(request);
  if (accessError) return accessError;

  try {
    await clearSessionCredentials();
    return NextResponse.json(statusFor({}));
  } catch (error) {
    return apiError(error, 500);
  }
}
