import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { buildOAuthUrl, getAppUrl, MissingCredentialsError, type OAuthAppCredentials } from "@/server/auth/oauth";
import { resolveGoogleCredentials } from "@/server/config/session-credentials";
import { apiError, requireAccess } from "@/server/http";

type Params = { params: Promise<{ provider: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const accessError = requireAccess(request);
  if (accessError) return accessError;

  try {
    const { provider } = await params;
    if (provider !== "gmail" && provider !== "microsoft365") {
      return apiError(new Error("Unsupported OAuth provider"), 404);
    }

    // Gmail credentials come from the per-session BYO store (falling back to
    // server env); Microsoft is server-env only on this deploy.
    const credentials: OAuthAppCredentials =
      provider === "gmail"
        ? await resolveGoogleCredentials()
        : { clientId: process.env.MICROSOFT_CLIENT_ID, clientSecret: process.env.MICROSOFT_CLIENT_SECRET };

    const state = randomBytes(18).toString("base64url");
    let oauthUrl: string;
    try {
      oauthUrl = buildOAuthUrl(provider, state, credentials);
    } catch (error) {
      // Missing app credentials is a setup gap, not an error: send the visitor
      // to the in-app setup screen instead of returning a raw JSON error.
      if (error instanceof MissingCredentialsError) {
        return NextResponse.redirect(`${getAppUrl()}/?setup=${provider}&reason=missing-credentials`);
      }
      throw error;
    }

    const cookieStore = await cookies();
    cookieStore.set("oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/"
    });

    return NextResponse.redirect(oauthUrl);
  } catch (error) {
    return apiError(error, 400);
  }
}
