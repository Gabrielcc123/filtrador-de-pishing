import { NextResponse } from "next/server";
import { fetchInbox } from "@/backend/gmail";
import { analyzeEmail } from "@/backend/analyze";
import { getSession, gmailConfigured } from "@/backend/session";

export const runtime = "nodejs";

export async function GET() {
  if (!gmailConfigured()) {
    return NextResponse.json({ error: "gmail_not_configured" }, { status: 503 });
  }

  const session = await getSession();
  if (!session.gmail?.accessToken) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  try {
    const emails = await fetchInbox(session.gmail, 20);
    const items = [];
    for (const email of emails) {
      const { verdict, modeBanner } = await analyzeEmail(email);
      items.push({ email, verdict, action: "none" as const, modeBanner });
    }

    const banner = items.some((a) => a.modeBanner === "heuristic_fallback")
      ? "heuristic_fallback"
      : "llm_ok";

    return NextResponse.json({
      items,
      modeBanner: banner,
      account: session.gmail.email,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }
}
