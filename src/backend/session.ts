import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  gmail?: {
    accessToken: string;
    refreshToken?: string;
    expiry: number;
    email?: string;
  };
}

const password =
  process.env.SESSION_SECRET?.padEnd(32, "0").slice(0, 64) ||
  "dev-only-shieldmail-session-secret-change-me!!";

export const sessionOptions: SessionOptions = {
  password,
  cookieName: "shieldmail_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export function gmailConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
