import { Bot, Context, InlineKeyboard } from "grammy";
import { Env as KitEnv, PRO_STARS, ProSpec, displayName, isPrivate, makeFetch, now, preparedShare, sendInvoice, wirePro } from "./kit.ts";
import { Store } from "./db.ts";
import { GENERAL, PACKS, THEME_LABEL } from "./questions.ts";
import type { Theme } from "./questions.ts";
import { GuestReply, queryText, wireGuest, wireInline } from "./guest.ts";
import {
  DIGEST_HOUR, buildGuestReply, canManualPost, dayIndex, decodeChatId, effectiveHour, encodeChatId, formatHour, formatTz,
  isAdminStatus, isDigestDue, isDueNow, isRealSender, isSourcePayload, isTheme, isThemeAllowed, packKey,
  parseIcebreakerArgs, parseTz, renderPost, rollIndex, shouldEditCounter,
} from "./logic.ts";
import { APP_HTML, buildShareText, handleProLink, initDataFailure, validateInitData } from "./webapp.ts";
import type { ProLinkBody } from "./webapp.ts";
import type { ProPlan } from "./webapp-i18n.ts";
import { BOT } from "./botname.ts";
import { resolveLang, t } from "./i18n.ts";
export { Store };

interface Env extends KitEnv { STORE: DurableObjectNamespace<Store>; }
const store = (env: Env) => env.STORE.get(env.STORE.idFromName("main"));

const PRO: ProSpec = {
  title: "IcebreakerBot Pro (this group)",
  description: "Custom posting hour, themed question packs, and an end-of-day answers digest for one group. One-time payment.",
  payload: "ice-pro",
  thanks: "✅ Pro unlocked for the group. Custom hour, themes, and the end-of-day digest are on.\n\n/more — more free tools",
};
const MORE_TEXT = "More free tools by the same maker:\n🔒 @WhisperLockBot — locked messages only one person can open\n⏰ @NudgeRemindBot — reminders that arrive on time\n📮 @AnonInboxProBot — anonymous inbox via your link\n🧾 @SplitTabsBot — split group expenses";
const SHARE_PITCH = "A free daily conversation starter for your group — no setup needed.";
const shareUrl = (): string => `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${BOT}?start=share`)}&text=${encodeURIComponent(SHARE_PITCH)}`;
const helpText = (lang: string): string => t(lang, "help", { stars: PRO_STARS });
const startText = (lang: string): string => t(lang, "start", { stars: PRO_STARS });
const proKb = (lang: string, chatId: number): InlineKeyboard =>
  new InlineKeyboard().url(t(lang, "btn_unlockPro", { stars: PRO_STARS }), `https://t.me/${BOT}?start=pro_${encodeChatId(chatId)}`);

/** One Stars invoice link, with exactly the title/description/payload the chat flow (PRO,
 * above) uses. Shared by the /pro deep-link flow and the Mini App's POST /api/pro-link, so
 * successful_payment's "ice-pro" payload match never drifts from what this mints. Icebreaker
 * has no monthly plan, so `plan` is always "onetime" here (normalizePlan enforces that with
 * allowMonthly:false before this is ever called). */
function proLink(api: Bot["api"], _plan: ProPlan): Promise<string> {
  return api.createInvoiceLink(PRO.title, PRO.description, PRO.payload, "", "XTR", [{ label: PRO.title, amount: PRO_STARS }]);
}

async function isAdmin(ctx: Context, env: Env, chatId: number, userId: number): Promise<boolean> {
  const cached = await store(env).isAdminCached(chatId, userId, now());
  if (cached !== null) return cached;
  let ok = false;
  try { const m = await ctx.api.getChatMember(chatId, userId); ok = isAdminStatus(m.status); } catch { ok = false; }
  await store(env).setAdminCache(chatId, userId, ok, now());
  return ok;
}

/** Rolls the next question for a group's active pack (theme if Pro + set, else the free
 * general pack) and marks it seen, rotating without repeats within the pack. */
async function nextQuestion(env: Env, chatId: number, pro: boolean, theme: string): Promise<string> {
  const activeTheme = pro && isTheme(theme) ? theme : null;
  const pool = activeTheme ? PACKS[activeTheme] : GENERAL;
  const pack = packKey(activeTheme);
  const seen = await store(env).getSeen(chatId, pack);
  const { idx, reset } = rollIndex(seen, pool.length);
  if (reset) await store(env).resetSeen(chatId, pack);
  await store(env).markSeen(chatId, pack, idx);
  return pool[idx];
}

async function postQuestion(bot: Bot, env: Env, chatId: number, day: number, pro: boolean, theme: string): Promise<void> {
  const text = `💬 Question of the day: ${await nextQuestion(env, chatId, pro, theme)}`;
  const msg = await bot.api.sendMessage(chatId, text);
  await store(env).savePost(chatId, day, msg.message_id, text);
}

async function onIcebreaker(ctx: Context, env: Env, argsStr: string): Promise<void> {
  const chat = ctx.chat!, from = ctx.from!;
  const lang = resolveLang(from.language_code);
  if (isPrivate(ctx)) { await ctx.reply(helpText(lang), { parse_mode: "Markdown" }); return; }
  if (!(await isAdmin(ctx, env, chat.id, from.id))) { await ctx.reply(t(lang, "adminOnly")); return; }
  const cmd = parseIcebreakerArgs(argsStr);
  if (!cmd) { await ctx.reply(t(lang, "icebreakerUsage"), { parse_mode: "Markdown" }); return; }
  const group = await store(env).touchGroup(chat.id, "title" in chat ? chat.title ?? "" : "");
  if (cmd.kind === "off") { await store(env).clearSchedule(chat.id); await ctx.reply(t(lang, "icebreakerOff")); return; }
  const hour = effectiveHour(cmd.hour, group.pro === 1);
  await store(env).setSchedule(chat.id, hour);
  await ctx.reply(t(lang, "icebreakerOn", { time: formatHour(hour), tz: formatTz(group.tz_min) }));
}

async function onItz(ctx: Context, env: Env, argsStr: string): Promise<void> {
  const chat = ctx.chat!, from = ctx.from!;
  const lang = resolveLang(from.language_code);
  if (isPrivate(ctx)) return;
  if (!(await isAdmin(ctx, env, chat.id, from.id))) { await ctx.reply(t(lang, "adminOnly")); return; }
  const tz = parseTz(argsStr);
  if (tz === null) { await ctx.reply(t(lang, "itzUsage"), { parse_mode: "Markdown" }); return; }
  await store(env).touchGroup(chat.id, "title" in chat ? chat.title ?? "" : "");
  await store(env).setGroupTz(chat.id, tz);
  await ctx.reply(t(lang, "itzDone", { tz: formatTz(tz) }));
}

async function onQuestion(ctx: Context, env: Env): Promise<void> {
  const lang = resolveLang(ctx.from?.language_code);
  if (isPrivate(ctx) || !ctx.from) { await ctx.reply(helpText(lang), { parse_mode: "Markdown" }); return; }
  const chat = ctx.chat!;
  const group = await store(env).touchGroup(chat.id, "title" in chat ? chat.title ?? "" : "");
  const day = dayIndex(now(), group.tz_min);
  const existing = await store(env).postForDay(chat.id, day);
  if (!canManualPost(group.pro === 1, existing !== null)) {
    await store(env).track(ctx.from.id, "pro_prompt");
    await ctx.reply(t(lang, "questionLimitReached", { stars: PRO_STARS }), { reply_markup: proKb(lang, chat.id) });
    return;
  }
  await store(env).track(ctx.from.id, "action");
  await postQuestion(new Bot(env.BOT_TOKEN), env, chat.id, day, group.pro === 1, group.theme);
}

async function onPause(ctx: Context, env: Env, active: boolean): Promise<void> {
  const chat = ctx.chat!, from = ctx.from!;
  const lang = resolveLang(from.language_code);
  if (isPrivate(ctx)) return;
  if (!(await isAdmin(ctx, env, chat.id, from.id))) { await ctx.reply(t(lang, "adminOnly")); return; }
  await store(env).touchGroup(chat.id, "title" in chat ? chat.title ?? "" : "");
  await store(env).setActive(chat.id, active);
  await ctx.reply(t(lang, active ? "resumed" : "paused"));
}

async function onTheme(ctx: Context, env: Env, argsStr: string): Promise<void> {
  const chat = ctx.chat!, from = ctx.from!;
  const lang = resolveLang(from.language_code);
  if (isPrivate(ctx)) { await ctx.reply(helpText(lang), { parse_mode: "Markdown" }); return; }
  if (!(await isAdmin(ctx, env, chat.id, from.id))) { await ctx.reply(t(lang, "adminOnly")); return; }
  const group = await store(env).touchGroup(chat.id, "title" in chat ? chat.title ?? "" : "");
  if (!isThemeAllowed(group.pro === 1)) { await ctx.reply(t(lang, "themeProOnly"), { reply_markup: proKb(lang, chat.id) }); return; }
  const theme = argsStr.trim().toLowerCase();
  if (!isTheme(theme)) { await ctx.reply(t(lang, "themeUsage"), { parse_mode: "Markdown" }); return; }
  await store(env).setTheme(chat.id, theme);
  await ctx.reply(t(lang, "themeDone", { theme: THEME_LABEL[theme as Theme] }));
}

async function onStart(ctx: Context, env: Env): Promise<void> {
  const from = ctx.from!;
  await store(env).touchUser(from.id, from.username, displayName(from));
  await store(env).track(from.id, "start");
  const lang = resolveLang(from.language_code);
  const payload = String(ctx.match ?? "");
  const pm = payload.match(/^pro_(m?\d+)$/);
  if (pm && isPrivate(ctx)) {
    const chatId = decodeChatId(pm[1]);
    if (chatId !== null) { await sendInvoice(ctx, PRO, "ice-pro:" + chatId, (s) => store(env).track(from.id, s)); return; }
  }
  if (isSourcePayload(payload)) await store(env).recordSource(from.id, payload);
  if (!isPrivate(ctx)) { await ctx.reply(startText(lang), { parse_mode: "Markdown" }); return; }
  const kb = new InlineKeyboard().url(t(lang, "btn_addToGroup"), `https://t.me/${BOT}?startgroup=true`);
  kb.row().url(t(lang, "btn_shareBot"), shareUrl());
  await ctx.reply(startText(lang), { parse_mode: "Markdown", reply_markup: kb });
}

/** Doubles as: group member/reply tracking, and the private help fallback. Registered after
 * wirePro so a successful_payment update is handled by wirePro's dedicated listener first and
 * never falls through to here. */
async function onGroupText(ctx: Context & { message: NonNullable<Context["message"]> }, env: Env): Promise<void> {
  if (isPrivate(ctx)) { if (!ctx.message.via_bot) await ctx.reply(helpText(resolveLang(ctx.from?.language_code)), { parse_mode: "Markdown" }); return; }
  if (!isRealSender(ctx.from?.id, ctx.message.via_bot) || !ctx.from) return;
  const chat = ctx.chat!;
  await store(env).touchGroup(chat.id, "title" in chat ? chat.title ?? "" : "");
  await store(env).touchMember(chat.id, ctx.from.id, displayName(ctx.from));
  const replyTo = ctx.message.reply_to_message;
  if (!replyTo) return;
  const post = await store(env).postByMessage(chat.id, replyTo.message_id);
  if (!post) return;
  const count = await store(env).incReplies(chat.id, post.day);
  await store(env).addResponder(chat.id, post.day, ctx.from.id, displayName(ctx.from));
  if (shouldEditCounter(count)) {
    try { await ctx.api.editMessageText(chat.id, post.message_id, renderPost(post.text, count)); } catch { /* post may be gone/edited already */ }
  }
}

/** Static copy for a guest chat, with the Markdown the i18n table carries stripped: guest
 * results are posted as plain text (the query is user-supplied and may contain _ or *). */
const plain = (s: string): string => s.replaceAll("*", "").replaceAll("`", "");

/** Guest Mode: someone @-mentioned us in a chat we were never added to. The pack pick
 * (parses -> value card) lives in the pure, unit-tested `buildGuestReply` in logic.ts;
 * this just gathers the query text and the caller's language. */
async function onGuest(ctx: Context, env: Env): Promise<GuestReply> {
  const lang = resolveLang(ctx.from?.language_code);
  const q = queryText(ctx, BOT);
  const pitch: GuestReply = { title: "💬 Icebreaker — a daily question for your group", description: "Try: @" + BOT + " deep", text: plain(startText(lang)) };
  return buildGuestReply(q, pitch);
}

function buildBot(env: Env): Bot {
  const bot = new Bot(env.BOT_TOKEN);
  // Registered first, on the RAW bot, before the `m` composer below even exists — a channel
  // post or an anonymous-admin message never reaches `m`'s isRealSender filter, so a
  // group-safe /pro must be wired here to still answer them (mirrors santa/index.ts).
  bot.command("pro", async (ctx) => {
    if (!isRealSender(ctx.from?.id, ctx.message?.via_bot)) return;
    const lang = resolveLang(ctx.from?.language_code);
    if (isPrivate(ctx)) { await ctx.reply(t(lang, "proRunInGroup")); return; }
    await ctx.reply(t(lang, "proGroupInfo", { stars: PRO_STARS }), { reply_markup: proKb(lang, ctx.chat!.id) });
  });
  const m = bot.on("message").filter((ctx) => isRealSender(ctx.from?.id, ctx.message.via_bot));
  m.command("start", (ctx) => onStart(ctx, env));
  m.command("help", (ctx) => ctx.reply(helpText(resolveLang(ctx.from.language_code)), { parse_mode: "Markdown" }));
  m.command("more", (ctx) => ctx.reply(MORE_TEXT));
  m.command("icebreaker", (ctx) => onIcebreaker(ctx, env, String(ctx.match ?? "")));
  m.command("itz", (ctx) => onItz(ctx, env, String(ctx.match ?? "")));
  m.command("question", (ctx) => onQuestion(ctx, env));
  m.command("pause", (ctx) => onPause(ctx, env, false));
  m.command("resume", (ctx) => onPause(ctx, env, true));
  m.command("theme", (ctx) => onTheme(ctx, env, String(ctx.match ?? "")));
  // wirePro's own bot.command("pro") is shadowed by the one registered at the top of this
  // function (see the comment there) — it's kept here only for its pre_checkout_query and
  // message:successful_payment handlers.
  // kit.ts always sends its own (English) spec.thanks after onPaid resolves; for a non-English
  // payer we send a localized thank-you first so they get at least one message in their language.
  wirePro(bot, PRO, async (ctx, payload, charge) => {
    const match = payload.match(/^ice-pro:(-?\d+)$/);
    if (match) await store(env).setGroupPro(Number(match[1]), charge); else if (ctx.from) await store(env).setPro(ctx.from.id, charge);
    const lang = resolveLang(ctx.from?.language_code);
    if (lang !== "en") await ctx.reply(t(lang, "thankYou"));
  }, (uid, s) => store(env).track(uid, s));
  bot.on("message:new_chat_members", async (ctx) => {
    const me = ctx.me.id;
    if (ctx.message.new_chat_members.some((mem) => mem.id === me)) await ctx.reply(startText(resolveLang(ctx.from?.language_code)), { parse_mode: "Markdown" });
  });
  bot.on("message:text", (ctx) => onGroupText(ctx, env));
  wireGuest(bot, {
    botUsername: BOT,
    reply: (ctx) => onGuest(ctx, env),
    // `guest` is NOT written to `sources` here (REVIEW-GUEST F3): a summoner is not an
    // installer. src_guest is earned later, through the ?start=guest deep link in the
    // buttons below. recordGuest self-limits; `flood` downgrades us to the cheap pitch.
    record: async (uid, chatType, chatId) => {
      const r = await store(env).recordGuest(uid, chatType, chatId);
      if (r.recorded) await store(env).track(uid, "guest");
      return !r.flood;
    },
  });
  // Classic inline mode: the SAME reply builder, answered as an inline result. A user types
  // "@Bot query" in any chat on any client and posts the card with `via @Bot` attribution —
  // no admin, no membership, no Guest Chat Mode toggle. The destination chat is unknown, so
  // the card carries private-style buttons only. Counted under `inline_queries`; `sources` is
  // never written here (an inline user is not an installer, same rule as the guest path).
  wireInline(bot, {
    botUsername: BOT,
    reply: (ctx) => onGuest(ctx, env),
    record: async (uid) => !(await store(env).recordInline(uid)).flood,
    chosen: (uid) => store(env).recordInlineChosen(uid),
  });
  return bot;
}

/** Starts today's question for each scheduled group whose local due-hour has just arrived. */
async function postDueQuestions(env: Env, nowTs: number): Promise<void> {
  const bot = new Bot(env.BOT_TOKEN);
  for (const g of await store(env).scheduledGroups()) {
    if (!isDueNow(g, nowTs, 2)) continue; // catch up on a missed tick, up to 2h late
    const day = dayIndex(nowTs, g.tz_min);
    try {
      await postQuestion(bot, env, g.chat_id, day, g.pro === 1, g.theme);
      await store(env).markPosted(g.chat_id, day);
    } catch (e) { console.log("post failed", g.chat_id, String(e).slice(0, 100)); }
  }
}

/** Posts the end-of-day answers digest for each Pro group whose digest hour has arrived. */
async function postDueDigests(env: Env, nowTs: number): Promise<void> {
  const bot = new Bot(env.BOT_TOKEN);
  for (const g of await store(env).proGroups()) {
    if (!isDigestDue(g, nowTs, DIGEST_HOUR, 2)) continue;
    const day = dayIndex(nowTs, g.tz_min);
    const post = await store(env).postForDay(g.chat_id, day);
    if (post) {
      const responders = await store(env).responders(g.chat_id, day);
      const text = responders.length
        ? `📊 Answers digest\n\n${responders.map((r) => r.name).join(", ")} answered today.`
        : `📊 Answers digest\n\nNo one answered today.`;
      try { await bot.api.sendMessage(g.chat_id, text); } catch (e) { console.log("digest failed", g.chat_id, String(e).slice(0, 100)); }
    }
    await store(env).markDigestSent(g.chat_id, day);
  }
}

/** POST /api/recent: today's question + last 7 for each group the user belongs to. */
async function apiRecent(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { initData?: string };
  const user = await validateInitData(body.initData ?? "", [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((x): x is string => !!x));
  if (!user) return Response.json(initDataFailure(body.initData ?? "", `https://t.me/${BOT}`), { status: 401 });
  const groups = [];
  for (const g of await store(env).groupsOf(user.id)) {
    const day = dayIndex(now(), g.tz_min);
    const posts = await store(env).recentPosts(g.chat_id, 7);
    const today = posts.find((p) => p.day === day);
    const history = posts.filter((p) => p.day !== day).map((p) => ({ day: String(p.day), text: p.text }));
    groups.push({ title: g.title, today: today?.text ?? null, history });
  }
  // Pro is purchased per-group (via /pro inside that group), not per-user, so there is no
  // single "pro" flag for a person who may belong to a mix of free and Pro groups — the
  // Mini App's Pro block always offers /api/pro-link, which mints the same plain "ice-pro"
  // invoice /pro's deep-link falls back to when it isn't scoped to one chat.
  return Response.json({ groups, proStars: PRO_STARS });
}

/** POST /api/share: registers a Bot API "prepared" inline message (savePreparedInlineMessage)
 * so the Mini App can hand its id to tg.shareMessage(id) for a native chat/group/channel share. */
async function apiShare(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { initData?: string };
  const user = await validateInitData(body.initData ?? "", [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((x): x is string => !!x));
  if (!user) return Response.json(initDataFailure(body.initData ?? "", `https://t.me/${BOT}`), { status: 401 });
  try {
    const share = await preparedShare(env, user.id, buildShareText(SHARE_PITCH, BOT, "shared"), `https://t.me/${BOT}`);
    await store(env).recordShare(user.id, "chat");
    return Response.json(share);
  } catch { return Response.json({ error: "Share unavailable." }, { status: 502 }); }
}

/** POST /api/share-story: records a "share to story" click. Telegram gives no server
 * callback for tg.shareToStory, so the client fires this right before calling it. */
async function apiShareStory(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { initData?: string };
  const user = await validateInitData(body.initData ?? "", [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((t): t is string => !!t));
  if (!user) return Response.json(initDataFailure(body.initData ?? "", `https://t.me/${BOT}`), { status: 401 });
  await store(env).recordShare(user.id, "story");
  return Response.json({ ok: true });
}

/** POST /api/pro-link: the Mini App's own Stars checkout (tg.openInvoice). Same invoice as
 * the chat flow (PRO), so successful_payment is unchanged. Icebreaker has no monthly plan,
 * so allowMonthly is false: normalizePlan degrades any "monthly" request to one-time. */
async function apiProLink(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as ProLinkBody;
  return handleProLink(body, {
    tokens: [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((x): x is string => !!x),
    botLink: `https://t.me/${BOT}`,
    allowMonthly: false,
    mint: (plan) => proLink(new Bot(env.BOT_TOKEN).api, plan),
    track: (userId) => store(env).track(userId, "invoice"),
  });
}

const botFetch = makeFetch<Env>(buildBot, (env) => store(env).stats());

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const path = new URL(req.url).pathname;
    if (path === "/app") return new Response(APP_HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
    if (path === "/api/share" && req.method === "POST") return apiShare(req, env);
    if (path === "/api/share-story" && req.method === "POST") return apiShareStory(req, env);
    if (path === "/api/pro-link" && req.method === "POST") return apiProLink(req, env);
    if (path === "/api/recent" && req.method === "POST") return apiRecent(req, env);
    return botFetch(req, env);
  },
  async scheduled(_ev: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil((async () => { const t = now(); await postDueQuestions(env, t); await postDueDigests(env, t); })());
  },
};
