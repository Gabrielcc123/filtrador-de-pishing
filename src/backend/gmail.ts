import { google } from "googleapis";
import type { EmailMessage } from "@/shared/types";
import type { SessionData } from "./session";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
];

const LABEL_QUARANTINE = "ShieldMail/Quarantine";
const LABEL_SAFE = "ShieldMail/Safe";

export function getOAuthClient() {
  const redirect =
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:43127"}/api/gmail/callback`;

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirect
  );
}

export function getAuthUrl(state?: string) {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function exchangeCode(code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

function authFromSession(gmail: NonNullable<SessionData["gmail"]>) {
  const client = getOAuthClient();
  client.setCredentials({
    access_token: gmail.accessToken,
    refresh_token: gmail.refreshToken,
    expiry_date: gmail.expiry,
  });
  return client;
}

function headerMap(headers: { name?: string | null; value?: string | null }[] | undefined) {
  const map: Record<string, string> = {};
  for (const h of headers ?? []) {
    if (h.name && h.value) map[h.name.toLowerCase()] = h.value;
  }
  return map;
}

function decodeBody(payload: {
  body?: { data?: string | null };
  parts?: { mimeType?: string | null; body?: { data?: string | null }; parts?: unknown[] }[];
  mimeType?: string | null;
}): string {
  const walk = (part: typeof payload): string => {
    if (part.body?.data) {
      const raw = part.body.data.replace(/-/g, "+").replace(/_/g, "/");
      return Buffer.from(raw, "base64").toString("utf8");
    }
    if (part.parts) {
      const text =
        part.parts.find((p) => p.mimeType === "text/plain") ||
        part.parts.find((p) => p.mimeType === "text/html") ||
        part.parts[0];
      if (text) return walk(text as typeof payload);
    }
    return "";
  };
  const decoded = walk(payload);
  return decoded.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function fetchInbox(
  gmailSession: NonNullable<SessionData["gmail"]>,
  max = 20
): Promise<EmailMessage[]> {
  const auth = authFromSession(gmailSession);
  const gmail = google.gmail({ version: "v1", auth });

  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults: max,
    q: "in:inbox",
  });

  const messages = list.data.messages ?? [];
  const out: EmailMessage[] = [];

  for (const m of messages) {
    if (!m.id) continue;
    const full = await gmail.users.messages.get({
      userId: "me",
      id: m.id,
      format: "full",
    });
    const headers = headerMap(full.data.payload?.headers);
    const body = decodeBody(full.data.payload ?? {});
    out.push({
      id: m.id,
      threadId: full.data.threadId ?? undefined,
      from: headers.from ?? "(desconocido)",
      to: headers.to,
      subject: headers.subject ?? "(sin asunto)",
      date: headers.date ?? new Date().toISOString(),
      snippet: full.data.snippet ?? "",
      body: body || full.data.snippet || "",
      labels: full.data.labelIds ?? [],
      source: "gmail",
    });
  }

  return out;
}

async function ensureLabel(
  gmail: ReturnType<typeof google.gmail>,
  name: string
): Promise<string> {
  const existing = await gmail.users.labels.list({ userId: "me" });
  const found = existing.data.labels?.find((l) => l.name === name);
  if (found?.id) return found.id;

  const created = await gmail.users.labels.create({
    userId: "me",
    requestBody: {
      name,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    },
  });
  if (!created.data.id) throw new Error(`No se pudo crear label ${name}`);
  return created.data.id;
}

export async function applyShieldLabel(
  gmailSession: NonNullable<SessionData["gmail"]>,
  messageId: string,
  action: "quarantine" | "safe"
) {
  const auth = authFromSession(gmailSession);
  const gmail = google.gmail({ version: "v1", auth });
  const labelName = action === "quarantine" ? LABEL_QUARANTINE : LABEL_SAFE;
  const labelId = await ensureLabel(gmail, labelName);

  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: {
      addLabelIds: [labelId],
      removeLabelIds: action === "quarantine" ? ["INBOX"] : [],
    },
  });

  return { labelName, labelId };
}

export async function profileEmail(gmailSession: NonNullable<SessionData["gmail"]>) {
  const auth = authFromSession(gmailSession);
  const gmail = google.gmail({ version: "v1", auth });
  const profile = await gmail.users.getProfile({ userId: "me" });
  return profile.data.emailAddress ?? undefined;
}
