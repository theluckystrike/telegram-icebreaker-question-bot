import { test } from "node:test";
import assert from "node:assert/strict";
import { GENERAL, PACKS, THEMES } from "../src/questions.ts";
import {
  DIGEST_HOUR, FREE_HOUR, buildGuestReply, canManualPost, decodeChatId, effectiveHour, encodeChatId, formatHour, formatTz,
  isAdminStatus, isDigestDue, isDueNow, isRealSender, isSourcePayload, isTheme, isThemeAllowed, packKey,
  parseIcebreakerArgs, parseTz, renderPost, rollIndex, shouldEditCounter,
} from "../src/logic.ts";

test("pack sizes and uniqueness: 190 general + 35 per theme = 365 total, all unique", () => {
  assert.equal(GENERAL.length, 190);
  for (const th of THEMES) assert.equal(PACKS[th].length, 35);
  const all = [GENERAL, ...THEMES.map((th) => PACKS[th])].flat();
  assert.equal(all.length, 365);
  assert.equal(new Set(all).size, 365); // no duplicates anywhere in the file
});

test("rotation: no repeat across a full pool, then a reset starts a fresh cycle", () => {
  const poolSize = 365;
  const seen = new Set<number>();
  for (let i = 0; i < poolSize; i++) {
    const { idx, reset } = rollIndex(seen, poolSize);
    assert.equal(reset, false);
    assert.ok(!seen.has(idx));
    seen.add(idx);
  }
  assert.equal(seen.size, poolSize);
  const { idx, reset } = rollIndex(seen, poolSize); // pool exhausted -> reset
  assert.equal(reset, true);
  assert.ok(idx >= 0 && idx < poolSize);
});

test("rotation: small pool cycles fully with no repeat before reset", () => {
  const poolSize = 5;
  const seen = new Set<number>();
  const drawn = new Set<number>();
  for (let i = 0; i < poolSize; i++) {
    const { idx, reset } = rollIndex(seen, poolSize);
    assert.equal(reset, false);
    drawn.add(idx);
    seen.add(idx);
  }
  assert.equal(drawn.size, poolSize);
});

test("hour/tz due selection: fires exactly on the due local hour, not before or long after", () => {
  const base = { hour: 10, tz_min: 0, last_day: -1, active: 1 };
  const at10 = 10 * 3600; // 1970-01-01 10:00 UTC
  assert.equal(isDueNow(base, at10), true);
  assert.equal(isDueNow(base, at10 - 3600), false); // 09:00, not due yet
  assert.equal(isDueNow(base, at10 + 3 * 3600), false); // 13:00, past the 2h catch-up window
  assert.equal(isDueNow(base, at10 + 3600), true); // 11:00, within catch-up
});

test("hour/tz due selection: a timezone offset shifts which UTC instant is due", () => {
  const g = { hour: 10, tz_min: 120, last_day: -1, active: 1 }; // UTC+2
  assert.equal(isDueNow(g, 8 * 3600), true); // 08:00 UTC == 10:00 local
  assert.equal(isDueNow(g, 14 * 3600), false); // 14:00 UTC == 16:00 local, well past the catch-up window
});

test("hour/tz due selection: already posted today is never due again until the next day", () => {
  const nowTs = 10 * 3600;
  const today = Math.floor(nowTs / 86_400);
  const g = { hour: 10, tz_min: 0, last_day: today, active: 1 };
  assert.equal(isDueNow(g, nowTs), false);
});

test("pause/resume: an inactive group is never due, even at its due hour", () => {
  const g = { hour: 10, tz_min: 0, last_day: -1, active: 0 };
  assert.equal(isDueNow(g, 10 * 3600), false);
});

test("digest due selection mirrors the same hour/catch-up/dedupe rules, gated on pro", () => {
  const today = 5;
  const nowTs = today * 86_400 + DIGEST_HOUR * 3600;
  assert.equal(isDigestDue({ pro: 1, tz_min: 0, digest_day: -1 }, nowTs), true);
  assert.equal(isDigestDue({ pro: 0, tz_min: 0, digest_day: -1 }, nowTs), false); // free groups never get a digest
  assert.equal(isDigestDue({ pro: 1, tz_min: 0, digest_day: today }, nowTs), false); // already sent today
});

test("reply counting bound: edits happen only once every 5 replies, never in between", () => {
  const edits: number[] = [];
  for (let count = 1; count <= 12; count++) if (shouldEditCounter(count)) edits.push(count);
  assert.deepEqual(edits, [5, 10]);
  assert.equal(shouldEditCounter(0), false);
});

test("reply counting: rendered text carries the counter only once the threshold is reached, and never stacks", () => {
  const base = "💬 Question of the day: What's your favorite hobby?";
  assert.equal(renderPost(base, 3), base);
  assert.equal(renderPost(base, 5), `${base}\n\n🔥 5 answered`);
  assert.equal(renderPost(base, 7), `${base}\n\n🔥 5 answered`); // still the last edited multiple, not 7
  assert.equal(renderPost(base, 10), `${base}\n\n🔥 10 answered`);
});

test("theme gating: themed packs are Pro-only; isTheme rejects unknown values", () => {
  assert.equal(isThemeAllowed(true), true);
  assert.equal(isThemeAllowed(false), false);
  assert.equal(isTheme("fun"), true);
  assert.equal(isTheme("food"), true);
  assert.equal(isTheme("spooky"), false);
  assert.equal(packKey(null), "general");
  assert.equal(packKey("fun"), "fun");
  assert.equal(packKey("not-a-theme"), "general"); // an invalid theme falls back to the general bucket
});

test("free hour lock: a free group always effectively posts at FREE_HOUR regardless of what it asked for", () => {
  assert.equal(effectiveHour(14, false), FREE_HOUR);
  assert.equal(effectiveHour(14, true), 14);
  assert.equal(effectiveHour(FREE_HOUR, false), FREE_HOUR);
});

test("parseIcebreakerArgs: accepts on HH:MM (:00 only) and off, rejects the rest", () => {
  assert.deepEqual(parseIcebreakerArgs("on 09:00"), { kind: "on", hour: 9 });
  assert.deepEqual(parseIcebreakerArgs("OFF"), { kind: "off" });
  assert.equal(parseIcebreakerArgs("on 9:30"), null); // cron only fires on the hour
  assert.equal(parseIcebreakerArgs("on 25:00"), null);
  assert.equal(parseIcebreakerArgs("later"), null);
});

test("parseTz / formatTz / formatHour round-trip common offsets", () => {
  assert.equal(parseTz("+2"), 120);
  assert.equal(parseTz("-5"), -300);
  assert.equal(parseTz("+5:30"), 330);
  assert.equal(parseTz("bogus"), null);
  assert.equal(formatTz(120), "+2");
  assert.equal(formatTz(-300), "-5");
  assert.equal(formatTz(330), "+5:30");
  assert.equal(formatHour(9), "09:00");
});

test("deep-link: encodeChatId/decodeChatId round-trip a negative group chat id", () => {
  const chatId = -1001234567890;
  const encoded = encodeChatId(chatId);
  assert.ok(!encoded.includes("-"));
  assert.equal(decodeChatId(encoded), chatId);
  assert.equal(decodeChatId("not-valid"), null);
});

test("source regex: accepts short lowercase attribution tags, rejects the reserved pro tag", () => {
  assert.equal(isSourcePayload("site"), true);
  assert.equal(isSourcePayload("x"), false); // below the 2-char minimum
  assert.equal(isSourcePayload("pro"), false); // reserved
  assert.equal(isSourcePayload("Has_Caps"), false);
  assert.equal(isSourcePayload("waytoolongforasourcecode"), false);
});

test("admin gate helper: isAdminStatus recognizes administrator/creator only", () => {
  assert.equal(isAdminStatus("administrator"), true);
  assert.equal(isAdminStatus("creator"), true);
  assert.equal(isAdminStatus("member"), false);
  assert.equal(isAdminStatus("left"), false);
  assert.equal(isAdminStatus("kicked"), false);
});

test("isRealSender guards anonymous admin, channel bot, service account, and via_bot messages", () => {
  assert.equal(isRealSender(42, undefined), true);
  assert.equal(isRealSender(1087968824, undefined), false); // anonymous group admin
  assert.equal(isRealSender(136817688, undefined), false); // Channel_Bot
  assert.equal(isRealSender(777000, undefined), false); // service notifications
  assert.equal(isRealSender(42, { id: 99 }), false); // relayed via another bot
  assert.equal(isRealSender(undefined, undefined), false);
});

test("canManualPost: free groups get one manual /question a day, Pro is unlimited", () => {
  assert.equal(canManualPost(false, false), true); // free, nothing posted today yet
  assert.equal(canManualPost(false, true), false); // free, already posted today -> blocked
  assert.equal(canManualPost(true, false), true); // Pro, no post yet
  assert.equal(canManualPost(true, true), true); // Pro, already posted -> still allowed
});

test("buildGuestReply: a named theme returns a value card from that pack", () => {
  const pitch = { title: "pitch", description: "d", text: "p" };
  const r = buildGuestReply("deep", pitch);
  assert.notEqual(r, pitch);
  assert.match(r.title, /Deep/i);
  assert.match(r.text, /^💬 Question of the day: /);
  assert.ok(PACKS.deep.some((q) => r.text.includes(q)));
  assert.ok(!("parse_mode" in r));
  assert.equal("buttons" in r, false, "buttons are appended by wireGuest, not the pure builder");
});
test("buildGuestReply: an unrecognized/empty theme still returns a value card from the general pack", () => {
  const pitch = { title: "pitch", description: "d", text: "p" };
  const r1 = buildGuestReply("not a theme", pitch);
  const r2 = buildGuestReply("", pitch);
  assert.notEqual(r1, pitch);
  assert.notEqual(r2, pitch);
  assert.match(r1.title, /General/i);
  assert.ok(GENERAL.some((q) => r1.text.includes(q)));
});
