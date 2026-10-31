import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function extractUrls(text: string): string[] {
  const re = /https?:\/\/[^\s<>"')\]]+/gi;
  return Array.from(new Set((text.match(re) ?? []).map((u) => u.replace(/[.,;:]+$/, ""))));
}

export function parseEmailDomain(from: string): string | null {
  const angle = from.match(/<([^>]+)>/);
  const addr = (angle?.[1] ?? from).trim().toLowerCase();
  const at = addr.lastIndexOf("@");
  if (at < 0) return null;
  return addr.slice(at + 1).replace(/>$/, "");
}

export function parseDisplayName(from: string): string | null {
  const m = from.match(/^"?([^"<]+)"?\s*</);
  return m?.[1]?.trim() || null;
}
