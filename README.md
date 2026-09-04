# IcebreakerDailyBot — icebreaker question bot for Telegram

**Try it:** [@IcebreakerDailyBot](https://t.me/IcebreakerDailyBot) · [tg.zovo.one/bots/icebreaker/](https://tg.zovo.one/bots/icebreaker/)

## What it does

IcebreakerDailyBot posts one conversation-starter question to a Telegram group every day at a set hour, drawn from a bundled pack of 365 original questions — enough for a full year without repeats. Members just reply under the question in the group; there's no scoring or forced participation, it's just a daily prompt to get people talking. Free tier: 1 question a day at a fixed 10:00 group time. Pro adds a custom posting hour, themed question packs, and an extended no-repeat guarantee.

## Self-host

```bash
pnpm i
wrangler secret put BOT_TOKEN
wrangler secret put WEBHOOK_SECRET
wrangler deploy
curl "https://api.telegram.org/bot$BOT_TOKEN/setWebhook?url=https://<your-worker>.workers.dev/webhook&secret_token=$WEBHOOK_SECRET"
```

## Stack

[grammY](https://grammy.dev/) on Cloudflare Workers, state in a Durable Object backed by SQLite, an hourly Cron Trigger for daily posting, Pro upgrades billed with Telegram Stars.

---
Part of Tiny Telegram Tools — https://tg.zovo.one/
