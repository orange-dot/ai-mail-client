import type { ComposePayload, EmailMessage, MailAddress } from "@/lib/types";

function formatAddress(address: MailAddress): string {
  if (!address.name) return address.email;
  return `"${address.name.replaceAll('"', "'")}" <${address.email}>`;
}

export function buildMimeMessage(payload: ComposePayload, options?: { from?: MailAddress; replyTo?: EmailMessage }): string {
  const headers = [
    options?.from ? `From: ${formatAddress(options.from)}` : undefined,
    `To: ${payload.to.map(formatAddress).join(", ")}`,
    payload.cc?.length ? `Cc: ${payload.cc.map(formatAddress).join(", ")}` : undefined,
    `Subject: ${payload.subject}`,
    options?.replyTo ? `In-Reply-To: <${options.replyTo.providerMessageId}>` : undefined,
    options?.replyTo ? `References: <${options.replyTo.providerMessageId}>` : undefined,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"'
  ].filter(Boolean);

  return `${headers.join("\r\n")}\r\n\r\n${payload.bodyText}`;
}

export function encodeBase64Url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}
