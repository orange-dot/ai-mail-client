import { NextRequest, NextResponse } from "next/server";
import { getMessage, patchMessage } from "@/server/db/repository";
import { apiError, requireAccess } from "@/server/http";
import { summarizeMessage } from "@/server/ai/anthropic";

export async function POST(request: NextRequest) {
  const accessError = requireAccess(request);
  if (accessError) return accessError;

  try {
    const { messageId } = (await request.json()) as { messageId: string };
    const message = await getMessage(messageId);
    if (!message) return apiError(new Error("Message not found"), 404);

    const summary = await summarizeMessage(message);
    await patchMessage(message.id, { aiSummary: summary });
    return NextResponse.json({ summary });
  } catch (error) {
    return apiError(error, 400);
  }
}
