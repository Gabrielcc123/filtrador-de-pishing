import { NextResponse } from "next/server";
import { getFixtureEmails } from "@/backend/fixtures";
import { analyzeEmail } from "@/backend/analyze";

export const runtime = "nodejs";

export async function GET() {
  const emails = getFixtureEmails();
  const analyzed = [];

  for (const email of emails) {
    const { verdict, modeBanner } = await analyzeEmail(email);
    analyzed.push({ email, verdict, action: "none" as const, modeBanner });
  }

  const banner = analyzed.some((a) => a.modeBanner === "heuristic_fallback")
    ? ("heuristic_fallback" as const)
    : ("llm_ok" as const);

  return NextResponse.json({ items: analyzed, modeBanner: banner });
}
