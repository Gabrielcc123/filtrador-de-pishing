import { NextResponse } from "next/server";
import { exchangeCode, profileEmail } from "@/backend/gmail";
import { getSession } from "@/backend/session";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const err = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:43127";

  if (err || !code) {
    return NextResponse.redirect(`${appUrl}/?gmail=error`);
  }

  try {
    const tokens = await exchangeCode(code);
    if (!tokens.access_token) {
      return NextResponse.redirect(`${appUrl}/?gmail=error`);
    }

    const session = await getSession();
    session.gmail = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? undefined,
      expiry: tokens.expiry_date ?? Date.now() + 3500_000,
    };
    session.gmail.email = await profileEmail(session.gmail);
    await session.save();

    return NextResponse.redirect(`${appUrl}/?gmail=ok`);
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(`${appUrl}/?gmail=error`);
  }
}
