export type MailProvider = "gmail" | "microsoft365" | "imap";

export type AccountStatus = "connected" | "attention" | "syncing" | "demo";

export type MailPriority = "urgent" | "high" | "normal" | "low";

export type MailAddress = {
  name?: string;
  email: string;
};

export type EmailAccount = {
  id: string;
  provider: MailProvider;
  address: string;
  displayName: string;
  status: AccountStatus;
  unreadCount: number;
  color: string;
  lastSyncedAt?: string;
};

export type MailLabel = {
  id: string;
  accountId?: string;
  name: string;
  color: string;
  system?: boolean;
};

export type MailFlags = {
  unread: boolean;
  starred?: boolean;
  archived?: boolean;
  deleted?: boolean;
};

export type MailAttachment = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
};

export type EmailMessage = {
  id: string;
  providerMessageId: string;
  threadId: string;
  accountId: string;
  provider: MailProvider;
  subject: string;
  from: MailAddress;
  to: MailAddress[];
  cc?: MailAddress[];
  receivedAt: string;
  snippet: string;
  bodyText: string;
  bodyHtml?: string;
  labels: string[];
  flags: MailFlags;
  priority: MailPriority;
  aiSummary?: string;
  aiRationale?: string;
  attachments?: MailAttachment[];
};

export type MailSnapshot = {
  accounts: EmailAccount[];
  labels: MailLabel[];
  messages: EmailMessage[];
};

export type MailFilter = {
  accountId?: string;
  query?: string;
  label?: string;
  includeArchived?: boolean;
};

export type ComposePayload = {
  accountId: string;
  to: MailAddress[];
  cc?: MailAddress[];
  bcc?: MailAddress[];
  subject: string;
  bodyText: string;
  inReplyToId?: string;
  forwardOfId?: string;
};

export type AiDraftTone = "direct" | "warm" | "formal";

export type AiDraftRequest = {
  message: EmailMessage;
  tone: AiDraftTone;
  instruction?: string;
};

export type AiDraftResponse = {
  subject: string;
  bodyText: string;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    retryable?: boolean;
  };
};
