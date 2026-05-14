import { NextRequest, NextResponse } from "next/server";
import { getMessage, patchMessage } from "@/server/db/repository";
import { apiError, requireAccess } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const accessError = requireAccess(request);
  if (accessError) return accessError;

  try {
    const { id } = await params;
    const message = await getMessage(decodeURIComponent(id));
    if (!message) return apiError(new Error("Message not found"), 404);
    return NextResponse.json({ message });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const accessError = requireAccess(request);
  if (accessError) return accessError;

  try {
    const { id } = await params;
    const body = (await request.json()) as { action: "archive" | "delete" | "read" | "unread" | "label"; label?: string };
    const message = await getMessage(decodeURIComponent(id));
    if (!message) return apiError(new Error("Message not found"), 404);

    const updated = await patchMessage(message.id, patchForAction(message, body));
    return NextResponse.json({ message: updated });
  } catch (error) {
    return apiError(error, 400);
  }
}

function patchForAction(
  message: NonNullable<Awaited<ReturnType<typeof getMessage>>>,
  body: { action: string; label?: string }
) {
  if (body.action === "archive") return { flags: { ...message.flags, archived: true } };
  if (body.action === "delete") return { flags: { ...message.flags, deleted: true } };
  if (body.action === "read") return { flags: { ...message.flags, unread: false } };
  if (body.action === "unread") return { flags: { ...message.flags, unread: true } };
  if (body.action === "label" && body.label) {
    return { labels: Array.from(new Set([...message.labels, body.label])) };
  }
  throw new Error("Unsupported mail action");
}
