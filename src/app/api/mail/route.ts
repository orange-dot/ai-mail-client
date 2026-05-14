import { NextRequest, NextResponse } from "next/server";
import { listMessages } from "@/server/db/repository";
import { apiError, requireAccess } from "@/server/http";

export async function GET(request: NextRequest) {
  const accessError = requireAccess(request);
  if (accessError) return accessError;

  try {
    const url = new URL(request.url);
    const messages = await listMessages({
      accountId: url.searchParams.get("accountId") ?? undefined,
      query: url.searchParams.get("q") ?? undefined,
      label: url.searchParams.get("label") ?? undefined,
      includeArchived: url.searchParams.get("includeArchived") === "true"
    });

    return NextResponse.json({ messages });
  } catch (error) {
    return apiError(error);
  }
}
