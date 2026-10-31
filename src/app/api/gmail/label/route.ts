import { NextResponse } from "next/server";
import { applyShieldLabel } from "@/backend/gmail";
import { getSession } from "@/backend/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.gmail?.accessToken) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const body = (await req.json()) as {
    messageId?: string;
    action?: "quarantine" | "safe";
  };

  if (!body.messageId || !body.action) {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  try {
    const result = await applyShieldLabel(session.gmail, body.messageId, body.action);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "label_failed" }, { status: 500 });
  }
}
