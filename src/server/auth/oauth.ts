import type { MailProvider } from "@/lib/types";

type OAuthProvider = Extract<MailProvider, "gmail" | "microsoft365">;

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

const googleScopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send"
];

const microsoftScopes = ["offline_access", "User.Read", "Mail.ReadWrite", "Mail.Send"];

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";
}

export function oauthRedirectUri(provider: OAuthProvider): string {
  return `${getAppUrl()}/api/connect/${provider}/callback`;
}

export function buildOAuthUrl(provider: OAuthProvider, state: string): string {
  if (provider === "gmail") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", requiredEnv("GOOGLE_CLIENT_ID"));
    url.searchParams.set("redirect_uri", oauthRedirectUri(provider));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("scope", googleScopes.join(" "));
    url.searchParams.set("state", state);
    return url.toString();
  }

  const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  url.searchParams.set("client_id", requiredEnv("MICROSOFT_CLIENT_ID"));
  url.searchParams.set("redirect_uri", oauthRedirectUri(provider));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", microsoftScopes.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeOAuthCode(provider: OAuthProvider, code: string): Promise<TokenResponse> {
  const body = new URLSearchParams();
  body.set("code", code);
  body.set("redirect_uri", oauthRedirectUri(provider));
  body.set("grant_type", "authorization_code");

  let endpoint: string;

  if (provider === "gmail") {
    endpoint = "https://oauth2.googleapis.com/token";
    body.set("client_id", requiredEnv("GOOGLE_CLIENT_ID"));
    body.set("client_secret", requiredEnv("GOOGLE_CLIENT_SECRET"));
  } else {
    endpoint = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    body.set("client_id", requiredEnv("MICROSOFT_CLIENT_ID"));
    body.set("client_secret", requiredEnv("MICROSOFT_CLIENT_SECRET"));
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error(`OAuth token exchange failed for ${provider}`);
  }

  return response.json() as Promise<TokenResponse>;
}

export async function refreshOAuthToken(provider: OAuthProvider, refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams();
  body.set("refresh_token", refreshToken);
  body.set("grant_type", "refresh_token");

  let endpoint: string;

  if (provider === "gmail") {
    endpoint = "https://oauth2.googleapis.com/token";
    body.set("client_id", requiredEnv("GOOGLE_CLIENT_ID"));
    body.set("client_secret", requiredEnv("GOOGLE_CLIENT_SECRET"));
  } else {
    endpoint = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    body.set("client_id", requiredEnv("MICROSOFT_CLIENT_ID"));
    body.set("client_secret", requiredEnv("MICROSOFT_CLIENT_SECRET"));
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error(`OAuth refresh failed for ${provider}`);
  }

  return response.json() as Promise<TokenResponse>;
}

export async function fetchOAuthProfile(provider: OAuthProvider, accessToken: string): Promise<{ email: string; name: string }> {
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

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
