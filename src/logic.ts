/** Pure helpers for IcebreakerBot: schedule/tz parsing, due-time selection, pack rotation,
 * reply-counter rendering, theme gating, and small format/deep-link helpers. No I/O, no
 * Date.now() reads. */
import { GENERAL, PACKS, THEMES, THEME_LABEL } from "./questions.ts";
import type { Theme } from "./questions.ts";
import type { GuestReply } from "./guest.ts";

const DAY_SEC = 86_400;

/** Day index since epoch, shifted by a timezone offset in minutes (0 = UTC). */
export function dayIndex(tsSec: number, tzMin = 0): number {
  return Math.floor((tsSec + tzMin * 60) / DAY_SEC);
}

/** Hour of day (0-23) in the given timezone offset. */
export function hourOfDay(tsSec: number, tzMin = 0): number {
  const secInDay = (tsSec + tzMin * 60) % DAY_SEC;
  return Math.floor((secInDay >= 0 ? secInDay : secInDay + DAY_SEC) / 3600);
}

export const FREE_HOUR = 10;
/** Local hour the end-of-day answers digest goes out for Pro groups. */
export const DIGEST_HOUR = 22;

/** Parses "/icebreaker" args: "on HH:MM" (minutes must be "00" — the cron only fires on the
 * hour) or "off". Anything else is invalid. */
export type IcebreakerCmd = { kind: "on"; hour: number } | { kind: "off" };
export function parseIcebreakerArgs(text: string): IcebreakerCmd | null {
  const s = text.trim();
  if (/^off$/i.test(s)) return { kind: "off" };
  const m = s.match(/^on\s+(\d{1,2}):(\d{2})$/i);
  if (!m) return null;
  const hour = Number(m[1]);
  if (m[2] !== "00" || hour < 0 || hour > 23) return null;
  return { kind: "on", hour };
}

/** Free groups always post at FREE_HOUR regardless of what they asked for; Pro groups get
 * whatever hour they set. */
export function effectiveHour(requestedHour: number, pro: boolean): number {
  return pro ? requestedHour : FREE_HOUR;
}

/** Parses "/itz" text: an optionally-signed hour offset with an optional ":MM", e.g.
 * "+2", "-5", "+5:30". Returns the offset in minutes, or null if out of a sane UTC range. */
export function parseTz(text: string): number | null {
  const m = text.trim().match(/^([+-]?)(\d{1,2})(?::([0-5]\d))?$/);
  if (!m) return null;
  const sign = m[1] === "-" ? -1 : 1;
  const hours = Number(m[2]);
  const minutes = m[3] ? Number(m[3]) : 0;
  if (hours > 14 || (hours === 14 && minutes > 0)) return null;
  return sign * (hours * 60 + minutes);
}

export function formatHour(hour: number): string { return String(hour).padStart(2, "0") + ":00"; }

/** Renders a tz offset in minutes as "+2", "-5", or "+5:30". */
export function formatTz(tzMin: number): string {
  const sign = tzMin < 0 ? "-" : "+";
  const abs = Math.abs(tzMin);
  const hh = Math.floor(abs / 60), mm = abs % 60;
  return mm ? `${sign}${hh}:${String(mm).padStart(2, "0")}` : `${sign}${hh}`;
}

export interface DueGroup { hour: number; tz_min: number; last_day: number; active: number; }

/** True when `nowTs` falls in the group's due local hour and today's question hasn't
 * posted yet — or up to `catchUpHours` after the due hour (Cloudflare cron delivery is
 * best-effort; `last_day` dedupe makes it safe to keep checking after a missed tick). */
export function isDueNow(g: DueGroup, nowTs: number, catchUpHours = 2): boolean {
  if (g.active !== 1 || g.hour < 0) return false;
  const today = dayIndex(nowTs, g.tz_min);
  if (g.last_day === today) return false;
  const delta = ((hourOfDay(nowTs, g.tz_min) - g.hour) % 24 + 24) % 24;
  return delta <= catchUpHours;
}

export interface DigestGroup { pro: number; tz_min: number; digest_day: number; }

/** True when a Pro group's end-of-day digest hour has arrived and today's digest hasn't
 * gone out yet, with the same missed-tick catch-up window as isDueNow. */
export function isDigestDue(g: DigestGroup, nowTs: number, digestHour = DIGEST_HOUR, catchUpHours = 2): boolean {
  if (g.pro !== 1) return false;
  const today = dayIndex(nowTs, g.tz_min);
  if (g.digest_day === today) return false;
  const delta = ((hourOfDay(nowTs, g.tz_min) - digestHour) % 24 + 24) % 24;
  return delta <= catchUpHours;
}

export interface RollResult { idx: number; reset: boolean; }

/** Pick a random unseen index within [0, poolSize). Resets (starting a fresh cycle) once
 * every index has been used, so a group cycles through its whole pack before any repeat. */
export function rollIndex(seen: ReadonlySet<number>, poolSize: number): RollResult {
  let unseen: number[] = [];
  for (let i = 0; i < poolSize; i++) if (!seen.has(i)) unseen.push(i);
  let reset = false;
  if (unseen.length === 0) {
    reset = true;
    unseen = Array.from({ length: poolSize }, (_, i) => i);
  }
  const idx = unseen[Math.floor(Math.random() * unseen.length)];
  return { idx, reset };
}

/** "seen" bucket key: theme packs and the free general pack rotate independently, so
 * switching /theme never clears (or is cleared by) another pack's progress. */
export function packKey(theme: string | null): string { return theme && isTheme(theme) ? theme : "general"; }

export function isTheme(s: string): s is Theme { return (THEMES as readonly string[]).includes(s); }

/** Themed packs are Pro-only; the free tier always uses the general pack. */
export function isThemeAllowed(pro: boolean): boolean { return pro; }

export const REPLY_COUNTER_EVERY = 5;

/** Edit the posted message only once per REPLY_COUNTER_EVERY replies — bounded, not spammy. */
export function shouldEditCounter(count: number, every: number = REPLY_COUNTER_EVERY): boolean {
  return count > 0 && count % every === 0;
}

/** The full displayed post text: the base question, plus a counter line once at least one
 * multiple of REPLY_COUNTER_EVERY replies has come in. Recomputed from `count` each time,
 * so repeated edits never stack multiple counter lines. */
export function renderPost(baseText: string, count: number, every: number = REPLY_COUNTER_EVERY): string {
  if (count < every) return baseText;
  const step = Math.floor(count / every) * every;
  return `${baseText}\n\n🔥 ${step} answered`;
}

/** t.me/<bot>?start=pro_<id> deep-link payload: chat ids are negative, '-' is not
 * URL-safe there, so it's swapped for 'm'. */
export function encodeChatId(chatId: number): string {
  return String(chatId).replace("-", "m");
}
export function decodeChatId(encoded: string): number | null {
  if (!/^m?\d+$/.test(encoded)) return null;
  const n = Number(encoded.startsWith("m") ? "-" + encoded.slice(1) : encoded);
  return Number.isSafeInteger(n) ? n : null;
}

/** True for a first-touch attribution payload on /start (e.g. "site", "share"), never the
 * reserved "pro" tag (pro_<id> never matches this regex anyway — no underscores). */
export const SOURCE_RE = /^[a-z]{2,12}$/;
export function isSourcePayload(s: string): boolean { return s !== "pro" && SOURCE_RE.test(s); }

/** True for the administrator/creator statuses returned by getChatMember. Split out as a
 * pure predicate so the admin gate is testable without hitting the Telegram API. */
export function isAdminStatus(status: string): boolean {
  return status === "administrator" || status === "creator";
}

/** Telegram's pseudo-user id for a group's anonymous admin, plus the Channel_Bot and
 * service-notifications accounts — none are real members worth crediting or gating on. */
const PSEUDO_IDS = new Set([1087968824, 136817688, 777000]);
export function isRealSender(fromId: number | undefined, viaBot: unknown): boolean {
  return fromId !== undefined && !PSEUDO_IDS.has(fromId) && !viaBot;
}

/** Human date label for an epoch-day index (as produced by dayIndex). */
export function dateLabel(day: number): string { return new Date(day * 86_400_000).toISOString().slice(0, 10); }

/** Gate for the manual /question command: Pro groups may post at will, but a free group is
 * limited to one manual post per local day — otherwise any member could re-post the day's
 * question at will, resetting the reply counter and burning through the free pack (S9 #5). */
export function canManualPost(pro: boolean, alreadyPostedToday: boolean): boolean {
  return pro || !alreadyPostedToday;
}

/** Pure Guest Mode reply builder: posts one question, themed if the query names a Pro theme
 * (fun/deep/work/travel/food), else the free general pack. Never touches the store: the reply
 * counter (renderPost's escalation) needs a real posted message to track, which a guest
 * summon never has. */
export function buildGuestReply(q: string, pitch: GuestReply): GuestReply {
  const query = q.trim().toLowerCase();
  const theme = isTheme(query) ? query : null;
  const pool = theme ? PACKS[theme] : GENERAL;
  if (pool.length === 0) return pitch;
  const { idx } = rollIndex(new Set(), pool.length);
  const label = theme ? THEME_LABEL[theme] : "General";
  const text = `💬 Question of the day: ${pool[idx]}`;
  return { title: `💬 ${label} icebreaker`, description: pool[idx].slice(0, 90), text };
}
