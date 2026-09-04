# IcebreakerDailyBot — icebreaker question bot for Telegram

**Try it:** [@IcebreakerDailyBot](https://t.me/IcebreakerDailyBot) · [tg.zovo.one/bots/icebreaker/](https://tg.zovo.one/bots/icebreaker/)

## What it does

IcebreakerDailyBot posts one conversation-starter question to a Telegram group every day at a set hour, drawn from a bundled pack of 365 original questions — enough for a full year without repeats. Members just reply under the question in the group; there's no scoring or forced participation, it's just a daily prompt to get people talking. Free tier: 1 question a day at a fixed 10:00 group time. Pro adds a custom posting hour, themed question packs, and an extended no-repeat guarantee.

## Use it without adding the bot

Type `@IcebreakerDailyBot` (optionally with a theme, e.g. `@IcebreakerDailyBot work`) in **any** Telegram chat, even one the bot has never been added to. It posts one real icebreaker question from the question pack on the spot, right there — no install, no admin approval.

Both **Inline Mode** and **Guest Chat Mode** need to be turned on for the bot in [@BotFather](https://t.me/BotFather) (Bot Settings → Mode Settings) — turn Inline Mode on first, then Guest Chat Mode. Without both, only the classic `@Bot query` inline surface works.

## Self-host

```bash
pnpm i
wrangler secret put BOT_TOKEN
wrangler secret put WEBHOOK_SECRET
wrangler deploy
curl -G "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  --data-urlencode "url=https://<your-worker>.workers.dev/webhook" \
  --data-urlencode "secret_token=$WEBHOOK_SECRET" \
  --data-urlencode 'allowed_updates=["message","callback_query","guest_message","inline_query","chosen_inline_result"]'
```

## Stack

[grammY](https://grammy.dev/) on Cloudflare Workers, state in a Durable Object backed by SQLite, an hourly Cron Trigger for daily posting, Pro upgrades billed with Telegram Stars.

---
Part of Tiny Telegram Tools — https://tg.zovo.one/
