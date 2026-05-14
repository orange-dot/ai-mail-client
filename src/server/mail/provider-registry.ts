import type { MailAddress, MailProvider } from "@/lib/types";
import { decryptSecret } from "../security/crypto";
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
    return new GmailAdapter(args.accountId, args.credentials.accessToken, args.from ?? { email: "me" });
  }

  if (args.credentials.provider === "microsoft365") {
    return new MicrosoftAdapter(args.accountId, args.credentials.accessToken);
  }

  return new ImapAdapter(args.accountId, args.credentials);
}
