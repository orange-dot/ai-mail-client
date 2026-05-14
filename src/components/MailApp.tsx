"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Bot,
  ChevronLeft,
  Forward,
  Inbox,
  MailPlus,
  Menu,
  RefreshCcw,
  Reply,
  Search,
  Send,
  Sparkles,
  Tag,
  Trash2,
  X
} from "lucide-react";
import { filterMessages } from "@/lib/mail-filters";
import type { AiDraftResponse, ComposePayload, EmailMessage, MailSnapshot } from "@/lib/types";

type ComposeState = {
  open: boolean;
  mode: "new" | "reply" | "forward";
  accountId: string;
  to: string;
  subject: string;
  bodyText: string;
  sourceId?: string;
};

type Props = {
  initialSnapshot: MailSnapshot;
};

const priorityRank: Record<EmailMessage["priority"], number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3
};

export function MailApp({ initialSnapshot }: Props) {
  const [accounts] = useState(initialSnapshot.accounts);
  const [labels] = useState(initialSnapshot.labels);
  const [messages, setMessages] = useState(initialSnapshot.messages);
  const [activeAccount, setActiveAccount] = useState<string>("all");
  const [activeLabel, setActiveLabel] = useState<string>("inbox");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialSnapshot.messages[0]?.id ?? "");
  const [mobileReaderOpen, setMobileReaderOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [compose, setCompose] = useState<ComposeState>({
    open: false,
    mode: "new",
    accountId: initialSnapshot.accounts[0]?.id ?? "",
    to: "",
    subject: "",
    bodyText: ""
  });

  const filteredMessages = useMemo(
    () =>
      filterMessages(messages, {
        accountId: activeAccount === "all" ? undefined : activeAccount,
        label: activeLabel === "all" ? undefined : activeLabel,
        query
      }).sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || Date.parse(b.receivedAt) - Date.parse(a.receivedAt)),
    [activeAccount, activeLabel, messages, query]
  );

  const selectedMessage = messages.find((message) => message.id === selectedId) ?? filteredMessages[0];
  const selectedAccount = selectedMessage ? accounts.find((account) => account.id === selectedMessage.accountId) : accounts[0];
  const unreadTotal = messages.filter((message) => message.flags.unread && !message.flags.archived && !message.flags.deleted).length;

  useEffect(() => {
    if (filteredMessages[0] && !filteredMessages.some((message) => message.id === selectedId)) {
      setSelectedId(filteredMessages[0].id);
    }
  }, [filteredMessages, selectedId]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  function patchMessage(id: string, patch: Partial<EmailMessage>) {
    setMessages((current) => current.map((message) => (message.id === id ? { ...message, ...patch } : message)));
  }

  function openCompose(mode: ComposeState["mode"], message?: EmailMessage) {
    if (mode === "reply" && message) {
      setCompose({
        open: true,
        mode,
        accountId: message.accountId,
        to: message.from.email,
        subject: message.subject.toLowerCase().startsWith("re:") ? message.subject : `Re: ${message.subject}`,
        bodyText: "",
        sourceId: message.id
      });
      return;
    }

    if (mode === "forward" && message) {
      setCompose({
        open: true,
        mode,
        accountId: message.accountId,
        to: "",
        subject: message.subject.toLowerCase().startsWith("fwd:") ? message.subject : `Fwd: ${message.subject}`,
        bodyText: `\n\n---------- Forwarded message ----------\nFrom: ${message.from.email}\nSubject: ${message.subject}\n\n${message.bodyText}`,
        sourceId: message.id
      });
      return;
    }

    setCompose({
      open: true,
      mode: "new",
      accountId: activeAccount === "all" ? accounts[0]?.id ?? "" : activeAccount,
      to: "",
      subject: "",
      bodyText: ""
    });
  }

  async function runAiSummary(message: EmailMessage) {
    patchMessage(message.id, { aiSummary: "Summarizing..." });
    try {
      const response = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messageId: message.id })
      });
      const payload = (await response.json()) as { summary?: string };
      patchMessage(message.id, { aiSummary: payload.summary ?? message.aiSummary });
    } catch {
      patchMessage(message.id, {
        aiSummary: `${message.from.name ?? message.from.email} is asking about ${message.subject.toLowerCase()}.`
      });
    }
  }

  async function runAiDraft(message: EmailMessage) {
    try {
      const response = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messageId: message.id, tone: "direct" })
      });
      const payload = (await response.json()) as { draft?: AiDraftResponse };
      const draft = payload.draft ?? fallbackDraft(message);
      setCompose({
        open: true,
        mode: "reply",
        accountId: message.accountId,
        to: message.from.email,
        subject: draft.subject,
        bodyText: draft.bodyText,
        sourceId: message.id
      });
    } catch {
      const draft = fallbackDraft(message);
      setCompose({
        open: true,
        mode: "reply",
        accountId: message.accountId,
        to: message.from.email,
        subject: draft.subject,
        bodyText: draft.bodyText,
        sourceId: message.id
      });
    }
  }

  async function prioritize() {
    setSyncing(true);
    try {
      const response = await fetch("/api/ai/prioritize", { method: "POST" });
      const payload = (await response.json()) as { messages?: EmailMessage[] };
      if (payload.messages) setMessages(payload.messages);
    } finally {
      setSyncing(false);
    }
  }

  async function sendDraft() {
    const accountId = compose.accountId || accounts[0]?.id;
    const payload: ComposePayload = {
      accountId,
      to: compose.to
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean)
        .map((email) => ({ email })),
      subject: compose.subject,
      bodyText: compose.bodyText,
      inReplyToId: compose.mode === "reply" ? compose.sourceId : undefined,
      forwardOfId: compose.mode === "forward" ? compose.sourceId : undefined
    };

    await fetch("/api/mail/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => undefined);

    setCompose((current) => ({ ...current, open: false }));
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Mailbox navigation">
        <div className="brand-row">
          <div className="brand-mark">C</div>
          <div>
            <h1>Conductor Mail</h1>
            <span>{unreadTotal} unread</span>
          </div>
        </div>

        <button className="primary-action" type="button" onClick={() => openCompose("new")}>
          <MailPlus size={18} />
          Compose
        </button>

        <section className="nav-section" aria-label="Accounts">
          <div className="section-title">
            <Inbox size={16} />
            Accounts
          </div>
          <button
            className={activeAccount === "all" ? "nav-pill active" : "nav-pill"}
            type="button"
            onClick={() => setActiveAccount("all")}
          >
            <span className="dot all" />
            Unified
            <b>{unreadTotal}</b>
          </button>
          {accounts.map((account) => (
            <button
              className={activeAccount === account.id ? "nav-pill active" : "nav-pill"}
              type="button"
              key={account.id}
              onClick={() => setActiveAccount(account.id)}
            >
              <span className="dot" style={{ background: account.color }} />
              {account.displayName}
              <b>{account.unreadCount}</b>
            </button>
          ))}
        </section>

        <section className="nav-section" aria-label="Labels">
          <div className="section-title">
            <Tag size={16} />
            Labels
          </div>
          <button className={activeLabel === "all" ? "nav-pill active" : "nav-pill"} type="button" onClick={() => setActiveLabel("all")}>
            All mail
          </button>
          {labels.map((label) => (
            <button
              className={activeLabel === label.id ? "nav-pill active" : "nav-pill"}
              type="button"
              key={label.id}
              onClick={() => setActiveLabel(label.id)}
            >
              <span className="tag-swatch" style={{ background: label.color }} />
              {label.name}
            </button>
          ))}
        </section>

        <section className="connect-panel" aria-label="Connect accounts">
          <button type="button" onClick={() => window.location.assign("/api/connect/gmail")}>
            Gmail
          </button>
          <button type="button" onClick={() => window.location.assign("/api/connect/microsoft365")}>
            Office 365
          </button>
          <button type="button" onClick={() => alert("Use /api/accounts/imap with IMAP and SMTP settings.")}>
            IMAP
          </button>
        </section>
      </aside>

      <section className="mail-column" aria-label="Messages">
        <header className="topbar">
          <button className="icon-button mobile-only" type="button" title="Menu">
            <Menu size={20} />
          </button>
          <label className="search-box">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search mail" />
          </label>
          <button className="icon-button" type="button" title="Prioritize" onClick={prioritize}>
            {syncing ? <RefreshCcw className="spin" size={18} /> : <Sparkles size={18} />}
          </button>
        </header>

        <div className="message-list">
          {filteredMessages.map((message) => (
            <button
              className={message.id === selectedMessage?.id ? "message-card selected" : "message-card"}
              type="button"
              key={message.id}
              onClick={() => {
                setSelectedId(message.id);
                setMobileReaderOpen(true);
              }}
            >
              <span className={`priority ${message.priority}`}>{message.priority}</span>
              <span className="sender-row">
                <b>{message.from.name ?? message.from.email}</b>
                <time>{formatDate(message.receivedAt)}</time>
              </span>
              <span className="subject-row">{message.subject}</span>
              <span className="snippet-row">{message.snippet}</span>
              <span className="label-row">
                {message.labels.slice(0, 3).map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className={mobileReaderOpen ? "reader open" : "reader"} aria-label="Selected message">
        {selectedMessage ? (
          <>
            <header className="reader-header">
              <button className="icon-button mobile-only" type="button" title="Back" onClick={() => setMobileReaderOpen(false)}>
                <ChevronLeft size={20} />
              </button>
              <div>
                <span className="account-chip" style={{ borderColor: selectedAccount?.color }}>
                  {selectedAccount?.displayName ?? "Account"}
                </span>
                <h2>{selectedMessage.subject}</h2>
                <p>
                  {selectedMessage.from.name ?? selectedMessage.from.email} · {formatDate(selectedMessage.receivedAt)}
                </p>
              </div>
            </header>

            <div className="reader-actions">
              <button type="button" title="Reply" onClick={() => openCompose("reply", selectedMessage)}>
                <Reply size={17} />
                Reply
              </button>
              <button type="button" title="Forward" onClick={() => openCompose("forward", selectedMessage)}>
                <Forward size={17} />
                Forward
              </button>
              <button type="button" title="Archive" onClick={() => patchMessage(selectedMessage.id, { flags: { ...selectedMessage.flags, archived: true } })}>
                <Archive size={17} />
                Archive
              </button>
              <button type="button" title="Delete" onClick={() => patchMessage(selectedMessage.id, { flags: { ...selectedMessage.flags, deleted: true } })}>
                <Trash2 size={17} />
                Delete
              </button>
            </div>

            <div className="ai-panel">
              <div>
                <Bot size={18} />
                <b>AI</b>
              </div>
              <p>{selectedMessage.aiSummary ?? "No summary yet."}</p>
              <div className="ai-actions">
                <button type="button" onClick={() => runAiSummary(selectedMessage)}>
                  <Sparkles size={16} />
                  Summary
                </button>
                <button type="button" onClick={() => runAiDraft(selectedMessage)}>
                  <Reply size={16} />
                  Draft
                </button>
              </div>
            </div>

            <article className="message-body">{selectedMessage.bodyText}</article>
          </>
        ) : (
          <div className="empty-state">Inbox empty</div>
        )}
      </section>

      {compose.open ? (
        <section className="compose-sheet" aria-label="Compose">
          <header>
            <b>{compose.mode === "new" ? "New message" : compose.mode === "reply" ? "Reply" : "Forward"}</b>
            <button className="icon-button" type="button" title="Close" onClick={() => setCompose((current) => ({ ...current, open: false }))}>
              <X size={19} />
            </button>
          </header>
          <select value={compose.accountId} onChange={(event) => setCompose((current) => ({ ...current, accountId: event.target.value }))}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.displayName} · {account.address}
              </option>
            ))}
          </select>
          <input value={compose.to} onChange={(event) => setCompose((current) => ({ ...current, to: event.target.value }))} placeholder="To" />
          <input
            value={compose.subject}
            onChange={(event) => setCompose((current) => ({ ...current, subject: event.target.value }))}
            placeholder="Subject"
          />
          <textarea
            value={compose.bodyText}
            onChange={(event) => setCompose((current) => ({ ...current, bodyText: event.target.value }))}
            placeholder="Write a message"
          />
          <footer>
            <button className="secondary-action" type="button" onClick={() => setCompose((current) => ({ ...current, open: false }))}>
              <X size={17} />
              Discard
            </button>
            <button className="send-action" type="button" onClick={sendDraft} disabled={!compose.to || !compose.subject || !compose.bodyText}>
              <Send size={17} />
              Send
            </button>
          </footer>
        </section>
      ) : null}
    </main>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(new Date(value));
}

function fallbackDraft(message: EmailMessage): AiDraftResponse {
  return {
    subject: message.subject.toLowerCase().startsWith("re:") ? message.subject : `Re: ${message.subject}`,
    bodyText: `Hi ${message.from.name?.split(" ")[0] ?? "there"},\n\nThanks for the note. I will review this and send the requested details shortly.\n\nBojan`
  };
}
