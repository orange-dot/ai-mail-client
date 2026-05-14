import { NextRequest, NextResponse } from "next/server";
import { listAccounts, listLabels } from "@/server/db/repository";
import { apiError, requireAccess } from "@/server/http";

export async function GET(request: NextRequest) {
  const accessError = requireAccess(request);
  if (accessError) return accessError;

  try {
    const [accounts, labels] = await Promise.all([listAccounts(), listLabels()]);
    return NextResponse.json({ accounts, labels });
  } catch (error) {
    return apiError(error);
  }
}
