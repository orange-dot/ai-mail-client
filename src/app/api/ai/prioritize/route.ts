import { NextRequest, NextResponse } from "next/server";
import { prioritizeMessages } from "@/server/ai/anthropic";
import { listMessages, patchMessage } from "@/server/db/repository";
import { apiError, requireAccess } from "@/server/http";

export async function POST(request: NextRequest) {
  const accessError = requireAccess(request);
  if (accessError) return accessError;

  try {
    const messages = await listMessages({});
    const prioritized = await prioritizeMessages(messages);
    await Promise.all(prioritized.map((message) => patchMessage(message.id, {
      priority: message.priority,
      aiRationale: message.aiRationale
    })));
    return NextResponse.json({ messages: prioritized });
  } catch (error) {
    return apiError(error, 400);
  }
}
