import { NextResponse } from "next/server";
import { analyzeEmail } from "@/backend/analyze";
import type { AnalyzeRequestBody, EmailMessage } from "@/shared/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AnalyzeRequestBody;
    if (!body?.email?.id || !body.email.subject) {
      return NextResponse.json({ error: "email inválido" }, { status: 400 });
    }

    const email: EmailMessage = {
      id: body.email.id,
      threadId: body.email.threadId,
      from: body.email.from ?? "",
      to: body.email.to,
      subject: body.email.subject,
      date: body.email.date || new Date().toISOString(),
      snippet: body.email.snippet || "",
      body: body.email.body || body.email.snippet || "",
      labels: body.email.labels,
      source: body.email.source === "gmail" ? "gmail" : "fixture",
    };

    const result = await analyzeEmail(email);
    return NextResponse.json({
      verdict: result.verdict,
      modeBanner: result.modeBanner,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "falló el análisis" }, { status: 500 });
  }
}
