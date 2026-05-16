import type { MailAddress, MailProvider } from "@/lib/types";
import { refreshOAuthToken } from "../auth/oauth";
import { listAccounts, saveAccount } from "../db/repository";
import { decryptSecret, encryptSecret } from "../security/crypto";
import { GmailAdapter } from "./adapters/gmail";
import { ImapAdapter } from "./adapters/imap";
import { MicrosoftAdapter } from "./adapters/microsoft";
import type { MailProviderAdapter, ProviderCredentials } from "./adapters/types";

export function adapterFromEncryptedCredential(args: {
  accountId: string;
  provider: MailProvider;
  encryptedCredential?: string;
  address: string;
  displayName?: string;
}): MailProviderAdapter {
  if (!args.encryptedCredential) {
    throw new Error(`Missing credentials for ${args.provider}`);
  }

  const credentials = JSON.parse(decryptSecret(args.encryptedCredential)) as ProviderCredentials;
  return adapterFromCredentials({
    accountId: args.accountId,
    credentials,
    from: { name: args.displayName, email: args.address }
  });
}

export function adapterFromCredentials(args: {
  accountId: string;
  credentials: ProviderCredentials;
  from?: MailAddress;
}): MailProviderAdapter {
  if (args.credentials.provider === "gmail") {
    const gmail = args.credentials;
    const refreshAccessToken = gmail.refreshToken
      ? buildGmailRefresher(args.accountId, gmail.refreshToken)
      : undefined;
    return new GmailAdapter(args.accountId, gmail.accessToken, requireSender(args.from), refreshAccessToken);
  }

  if (args.credentials.provider === "microsoft365") {
    return new MicrosoftAdapter(args.accountId, args.credentials.accessToken);
  }

  return new ImapAdapter(args.accountId, args.credentials);
}

// A Gmail send needs a real From address. The sole production caller
// (adapterFromEncryptedCredential) always supplies one; this guards direct
// callers and replaces the former `{ email: "me" }` fallback, which would have
// produced a malformed From header.
function requireSender(from: MailAddress | undefined): MailAddress {
  if (!from?.email) {
    throw new Error("Gmail adapter requires a sender address");
  }
  return from;
}

// Builds the refresh-on-401 callback for the Gmail adapter. The refresh token
// never leaves this server module; the rotated credential is re-encrypted and
// persisted through the repository so later requests reuse it. No token text is
// returned to callers or placed in errors.
function buildGmailRefresher(accountId: string, refreshToken: string): () => Promise<string> {
  let currentRefreshToken = refreshToken;

  return async () => {
    const refreshed = await refreshOAuthToken("gmail", currentRefreshToken).catch(() => {
      throw new Error("Gmail authorization expired. Reconnect the account.");
    });

    // Google may rotate the refresh token; keep the newest one.
    if (refreshed.refresh_token) currentRefreshToken = refreshed.refresh_token;

    await persistGmailCredential(accountId, {
      provider: "gmail",
      accessToken: refreshed.access_token,
      refreshToken: currentRefreshToken
    });

    return refreshed.access_token;
  };
}

// Routes the refreshed credential back through saveAccount so the Postgres and
// in-memory (real-mode-no-Postgres) account stores stay consistent.
async function persistGmailCredential(accountId: string, credentials: ProviderCredentials): Promise<void> {
  const account = (await listAccounts()).find((candidate) => candidate.id === accountId);
  if (!account) return;

  await saveAccount({
    ...account,
    encryptedCredential: encryptSecret(JSON.stringify(credentials)),
    lastSyncedAt: new Date().toISOString()
  });
}
