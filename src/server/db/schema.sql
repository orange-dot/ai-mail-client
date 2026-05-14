CREATE TABLE IF NOT EXISTS email_accounts (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  address TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected',
  unread_count INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL,
  encrypted_credential TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mail_labels (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES email_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  system BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS email_messages (
  id TEXT PRIMARY KEY,
  provider_message_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  sender JSONB NOT NULL,
  recipients JSONB NOT NULL,
  cc JSONB,
  received_at TIMESTAMPTZ NOT NULL,
  snippet TEXT NOT NULL,
  body_text TEXT NOT NULL,
  body_html TEXT,
  labels JSONB NOT NULL DEFAULT '[]',
  flags JSONB NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  ai_summary TEXT,
  ai_rationale TEXT,
  attachments JSONB,
  raw JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_messages_account_received_idx
  ON email_messages (account_id, received_at DESC);

CREATE INDEX IF NOT EXISTS email_messages_labels_idx
  ON email_messages USING GIN (labels);

CREATE INDEX IF NOT EXISTS email_messages_search_idx
  ON email_messages USING GIN (
    to_tsvector('simple', subject || ' ' || snippet || ' ' || body_text)
  );
