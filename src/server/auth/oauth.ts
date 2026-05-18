import type { MailProvider } from "@/lib/types";

type OAuthProvider = Extract<MailProvider, "gmail" | "microsoft365">;

// OAuth *app* credentials (client id + secret), resolved by the caller from
// the per-session BYO store or server environment. Distinct from a connected
// account's access/refresh tokens.
export type OAuthAppCredentials = { clientId?: string; clientSecret?: string };

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

// Thrown when an OAuth app client id / secret is not configured. Callers catch
// this specific type to redirect to the in-app setup screen instead of
// surfacing a raw error.
export class MissingCredentialsError extends Error {
  readonly provider: OAuthProvider;

  constructor(provider: OAuthProvider) {
    super(`${provider} OAuth credentials are not configured`);
    this.name = "MissingCredentialsError";
    this.provider = provider;
  }
}

const googleScopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send"
];

const microsoftScopes = ["offline_access", "User.Read", "Mail.ReadWrite", "Mail.Send"];

export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  // Vercel injects VERCEL_URL (host only, no scheme) for every deployment, so
  // the OAuth redirect_uri resolves correctly without manual configuration.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://127.0.0.1:3000";
}

export function oauthRedirectUri(provider: OAuthProvider): string {
  return `${getAppUrl()}/api/connect/${provider}/callback`;
}

export function buildOAuthUrl(provider: OAuthProvider, state: string, credentials: OAuthAppCredentials): string {
  const clientId = credentials.clientId;
  if (!clientId) throw new MissingCredentialsError(provider);

  if (provider === "gmail") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", oauthRedirectUri(provider));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("scope", googleScopes.join(" "));
    url.searchParams.set("state", state);
    return url.toString();
  }

  const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", oauthRedirectUri(provider));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", microsoftScopes.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeOAuthCode(
  provider: OAuthProvider,
  code: string,
  credentials: OAuthAppCredentials
): Promise<TokenResponse> {
  const { clientId, clientSecret } = requireAppCredentials(provider, credentials);

  const body = new URLSearchParams();
  body.set("code", code);
  body.set("redirect_uri", oauthRedirectUri(provider));
  body.set("grant_type", "authorization_code");
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);

  const response = await fetch(tokenEndpoint(provider), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error(`OAuth token exchange failed for ${provider}`);
  }

  return response.json() as Promise<TokenResponse>;
}

export async function refreshOAuthToken(
  provider: OAuthProvider,
  refreshToken: string,
  credentials: OAuthAppCredentials
): Promise<TokenResponse> {
  const { clientId, clientSecret } = requireAppCredentials(provider, credentials);

  const body = new URLSearchParams();
  body.set("refresh_token", refreshToken);
  body.set("grant_type", "refresh_token");
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);

  const response = await fetch(tokenEndpoint(provider), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error(`OAuth refresh failed for ${provider}`);
  }

  return response.json() as Promise<TokenResponse>;
}

export async function fetchOAuthProfile(
  provider: OAuthProvider,
  accessToken: string
): Promise<{ email: string; name: string }> {
  const endpoint =
    provider === "gmail"
      ? "https://www.googleapis.com/oauth2/v2/userinfo"
      : "https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName";

  const response = await fetch(endpoint, {
    headers: { authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(`Profile fetch failed for ${provider}`);
  }

  const profile = (await response.json()) as Record<string, string>;
  return {
    email: profile.email ?? profile.mail ?? profile.userPrincipalName,
    name: profile.name ?? profile.displayName ?? profile.email ?? "Connected account"
  };
}

function tokenEndpoint(provider: OAuthProvider): string {
  return provider === "gmail"
    ? "https://oauth2.googleapis.com/token"
    : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
}

function requireAppCredentials(
  provider: OAuthProvider,
  credentials: OAuthAppCredentials
): { clientId: string; clientSecret: string } {
  if (!credentials.clientId || !credentials.clientSecret) {
    throw new MissingCredentialsError(provider);
  }
  return { clientId: credentials.clientId, clientSecret: credentials.clientSecret };
}
