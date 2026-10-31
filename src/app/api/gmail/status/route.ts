import { NextResponse } from "next/server";
import { getSession, gmailConfigured } from "@/backend/session";
import { hasGroqKey } from "@/backend/llm-analyzer";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    gmailConfigured: gmailConfigured(),
    gmailConnected: Boolean(session.gmail?.accessToken),
    gmailEmail: session.gmail?.email ?? null,
    groqConfigured: hasGroqKey(),
  });
}
