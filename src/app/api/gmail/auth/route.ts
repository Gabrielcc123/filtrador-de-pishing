import { NextResponse } from "next/server";
import { getAuthUrl } from "@/backend/gmail";
import { gmailConfigured } from "@/backend/session";

export async function GET() {
  if (!gmailConfigured()) {
    return NextResponse.json(
      {
        error:
          "Gmail OAuth no configurado. Define GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET, o usa modo demo.",
      },
      { status: 503 }
    );
  }

  const url = getAuthUrl("shieldmail");
  return NextResponse.redirect(url);
}
