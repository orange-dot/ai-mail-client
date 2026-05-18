import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  exchangeOAuthCode,
  fetchOAuthProfile,
  getAppUrl,
  MissingCredentialsError,
  type OAuthAppCredentials
} from "@/server/auth/oauth";
import { resolveGoogleCredentials } from "@/server/config/session-credentials";
import { saveAccount } from "@/server/db/repository";
import { apiError } from "@/server/http";
import type { ProviderCredentials } from "@/server/mail/adapters/types";
import { encryptSecret } from "@/server/security/crypto";

type Params = { params: Promise<{ provider: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { provider } = await params;
    if (provider !== "gmail" && provider !== "microsoft365") {
      return apiError(new Error("Unsupported OAuth provider"), 404);
    }

    const url = new URL(request.url);
    const cookieStore = await cookies();

    // The provider redirects here with ?error=access_denied when the user
    // declines consent (or the request is rejected). That is a clean outcome,
    // not a 400. The error_description is never logged.
    if (url.searchParams.get("error")) {
      cookieStore.delete("oauth_state");
      return NextResponse.redirect(`${getAppUrl()}/?connected=denied`);
    }

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const expectedState = cookieStore.get("oauth_state")?.value;

    if (!code || !state || state !== expectedState) {
      return apiError(new Error("Invalid OAuth callback state"), 400);
    }

    const credentials: OAuthAppCredentials =
      provider === "gmail"
        ? await resolveGoogleCredentials()
        : { clientId: process.env.MICROSOFT_CLIENT_ID, clientSecret: process.env.MICROSOFT_CLIENT_SECRET };

    let token;
    try {
      token = await exchangeOAuthCode(provider, code, credentials);
    } catch (error) {
      // App credentials went missing between connect and callback (e.g. the
      // BYO cookie expired): route back to the setup screen, not a raw error.
      if (error instanceof MissingCredentialsError) {
        cookieStore.delete("oauth_state");
        return NextResponse.redirect(`${getAppUrl()}/?setup=${provider}&reason=missing-credentials`);
      }
      throw error;
    }

    const profile = await fetchOAuthProfile(provider, token.access_token);
    const providerCredentials: ProviderCredentials =
      provider === "gmail"
        ? { provider: "gmail", accessToken: token.access_token, refreshToken: token.refresh_token }
        : { provider: "microsoft365", accessToken: token.access_token, refreshToken: token.refresh_token };

    await saveAccount({
      id: `${provider}:${profile.email}`,
      provider,
      address: profile.email,
      displayName: profile.name,
      color: provider === "gmail" ? "#2f6f64" : "#d95f43",
      encryptedCredential: encryptSecret(JSON.stringify(providerCredentials)),
      lastSyncedAt: new Date().toISOString()
    });

    cookieStore.delete("oauth_state");
    return NextResponse.redirect(`${getAppUrl()}/?connected=${provider}`);
  } catch (error) {
    return apiError(error, 400);
  }
}
