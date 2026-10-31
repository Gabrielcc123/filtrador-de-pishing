import type { EmailMessage } from "@/shared/types";
import fixtures from "../../demo/fixtures/emails.json";

export function getFixtureEmails(): EmailMessage[] {
  return (fixtures as EmailMessage[]).map((e) => ({
    ...e,
    source: "fixture" as const,
  }));
}

export function getFixtureById(id: string): EmailMessage | undefined {
  return getFixtureEmails().find((e) => e.id === id);
}
