import type { ComposePayload, EmailMessage, MailLabel, MailProvider } from "@/lib/types";

export type ProviderCredentials =
  | { provider: "gmail"; accessToken: string; refreshToken?: string }
  | { provider: "microsoft365"; accessToken: string; refreshToken?: string }
  | {
      provider: "imap";
      imap: { host: string; port: number; secure: boolean; username: string; password: string };
      smtp: { host: string; port: number; secure: boolean; username: string; password: string };
    };

export type ProviderError = {
  provider: MailProvider;
  operation: string;
  retryable: boolean;
  message: string;
};

export interface MailProviderAdapter {
  provider: MailProvider;
  listMessages(options?: { query?: string; label?: string; limit?: number }): Promise<EmailMessage[]>;
  getMessage(id: string): Promise<EmailMessage>;
  send(payload: ComposePayload): Promise<{ providerMessageId: string }>;
  reply(message: EmailMessage, payload: ComposePayload): Promise<{ providerMessageId: string }>;
  forward(message: EmailMessage, payload: ComposePayload): Promise<{ providerMessageId: string }>;
  archive(message: EmailMessage): Promise<void>;
  delete(message: EmailMessage): Promise<void>;
  applyLabel(message: EmailMessage, label: MailLabel): Promise<void>;
  removeLabel(message: EmailMessage, label: MailLabel): Promise<void>;
}

export function providerError(provider: MailProvider, operation: string, error: unknown, retryable = true): ProviderError {
  return {
    provider,
    operation,
    retryable,
    message: error instanceof Error ? error.message : String(error)
  };
}
