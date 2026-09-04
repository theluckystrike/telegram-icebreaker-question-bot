import { BaseStore, FleetStats, now } from "./kit.ts";

const QA_CHAT = -1001234567890;
const ADMIN_TTL = 300; // seconds

export interface GroupRow {
  chat_id: number; title: string; pro: number; hour: number; tz_min: number; active: number;
  theme: string; last_day: number; digest_day: number; created: number;
}
export interface PostRow { chat_id: number; day: number; message_id: number; text: string; replies: number; created: number; }

const SCHEMA = `
CREATE TABLE IF NOT EXISTS groups (chat_id INTEGER PRIMARY KEY, title TEXT NOT NULL DEFAULT '', pro INTEGER NOT NULL DEFAULT 0,
  paid_charge TEXT, hour INTEGER NOT NULL DEFAULT -1, tz_min INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
  theme TEXT NOT NULL DEFAULT '', last_day INTEGER NOT NULL DEFAULT -1, digest_day INTEGER NOT NULL DEFAULT -1, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS members (chat_id INTEGER NOT NULL, user_id INTEGER NOT NULL, name TEXT NOT NULL DEFAULT '',
  last_seen INTEGER NOT NULL, PRIMARY KEY (chat_id, user_id));
CREATE TABLE IF NOT EXISTS seen (chat_id INTEGER NOT NULL, pack TEXT NOT NULL, idx INTEGER NOT NULL, PRIMARY KEY (chat_id, pack, idx));
CREATE TABLE IF NOT EXISTS posts (chat_id INTEGER NOT NULL, day INTEGER NOT NULL, message_id INTEGER NOT NULL,
  text TEXT NOT NULL DEFAULT '', replies INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, PRIMARY KEY (chat_id, day));
CREATE INDEX IF NOT EXISTS posts_msg ON posts(chat_id, message_id);
CREATE TABLE IF NOT EXISTS responders (chat_id INTEGER NOT NULL, day INTEGER NOT NULL, user_id INTEGER NOT NULL,
  name TEXT NOT NULL DEFAULT '', PRIMARY KEY (chat_id, day, user_id));
CREATE TABLE IF NOT EXISTS admin_cache (chat_id INTEGER NOT NULL, user_id INTEGER NOT NULL, is_admin INTEGER NOT NULL,
  checked_at INTEGER NOT NULL, PRIMARY KEY (chat_id, user_id));
CREATE TABLE IF NOT EXISTS sources (user_id INTEGER PRIMARY KEY, src TEXT NOT NULL, ts INTEGER NOT NULL);`;

export class Store extends BaseStore {
  constructor(ctx: DurableObjectState, env: Record<string, unknown>) { super(ctx, env, SCHEMA); }

  async touchGroup(chatId: number, title: string): Promise<GroupRow> {
    this.run(`INSERT INTO groups (chat_id, title, created) VALUES (?1, ?2, ?3)
              ON CONFLICT(chat_id) DO UPDATE SET title = CASE WHEN ?2 = '' THEN title ELSE ?2 END`, chatId, title, now());
    return (await this.group(chatId))!;
  }
  async group(chatId: number): Promise<GroupRow | null> {
    return this.one<GroupRow>(
      "SELECT chat_id, title, pro, hour, tz_min, active, theme, last_day, digest_day, created FROM groups WHERE chat_id = ?1", chatId);
  }
  async setSchedule(chatId: number, hour: number): Promise<void> { this.run("UPDATE groups SET hour = ?2, active = 1 WHERE chat_id = ?1", chatId, hour); }
  async clearSchedule(chatId: number): Promise<void> { this.run("UPDATE groups SET hour = -1 WHERE chat_id = ?1", chatId); }
  async setGroupTz(chatId: number, tzMin: number): Promise<void> { this.run("UPDATE groups SET tz_min = ?2 WHERE chat_id = ?1", chatId, tzMin); }
  async setActive(chatId: number, active: boolean): Promise<void> { this.run("UPDATE groups SET active = ?2 WHERE chat_id = ?1", chatId, active ? 1 : 0); }
  async setTheme(chatId: number, theme: string): Promise<void> { this.run("UPDATE groups SET theme = ?2 WHERE chat_id = ?1", chatId, theme); }
  async markPosted(chatId: number, day: number): Promise<void> { this.run("UPDATE groups SET last_day = ?2 WHERE chat_id = ?1", chatId, day); }
  async markDigestSent(chatId: number, day: number): Promise<void> { this.run("UPDATE groups SET digest_day = ?2 WHERE chat_id = ?1", chatId, day); }
  async setGroupPro(chatId: number, charge: string): Promise<void> {
    this.run("INSERT INTO groups (chat_id, pro, paid_charge, created) VALUES (?1, 1, ?2, ?3) ON CONFLICT(chat_id) DO UPDATE SET pro = 1, paid_charge = ?2",
      chatId, charge, now());
  }
  /** Ordered by last_day ascending (never-posted / longest-overdue groups first) so a LIMIT
   * truncation under heavy load rotates through the backlog instead of starving the same
   * tail of groups every hour. */
  async scheduledGroups(): Promise<GroupRow[]> {
    return this.all<GroupRow>(
      "SELECT chat_id, title, pro, hour, tz_min, active, theme, last_day, digest_day, created FROM groups WHERE hour >= 0 ORDER BY last_day ASC LIMIT 5000");
  }
  /** Same rotation rationale as scheduledGroups, ordered by digest_day instead. */
  async proGroups(): Promise<GroupRow[]> {
    return this.all<GroupRow>(
      "SELECT chat_id, title, pro, hour, tz_min, active, theme, last_day, digest_day, created FROM groups WHERE pro = 1 ORDER BY digest_day ASC LIMIT 5000");
  }

  async touchMember(chatId: number, userId: number, name: string): Promise<void> {
    this.run(`INSERT INTO members (chat_id, user_id, name, last_seen) VALUES (?1, ?2, ?3, ?4)
              ON CONFLICT(chat_id, user_id) DO UPDATE SET name = ?3, last_seen = ?4`, chatId, userId, name, now());
  }
  async groupsOf(userId: number): Promise<GroupRow[]> {
    return this.all<GroupRow>(
      `SELECT g.chat_id, g.title, g.pro, g.hour, g.tz_min, g.active, g.theme, g.last_day, g.digest_day, g.created
       FROM groups g JOIN members m ON m.chat_id = g.chat_id WHERE m.user_id = ?1 LIMIT 50`, userId);
  }

  async getSeen(chatId: number, pack: string): Promise<Set<number>> {
    const rows = this.all<{ idx: number }>("SELECT idx FROM seen WHERE chat_id = ?1 AND pack = ?2", chatId, pack);
    return new Set(rows.map((r) => r.idx));
  }
  async markSeen(chatId: number, pack: string, idx: number): Promise<void> {
    this.run("INSERT OR IGNORE INTO seen (chat_id, pack, idx) VALUES (?1, ?2, ?3)", chatId, pack, idx);
  }
  async resetSeen(chatId: number, pack: string): Promise<void> { this.run("DELETE FROM seen WHERE chat_id = ?1 AND pack = ?2", chatId, pack); }

  /** Upsert: a manual /question can post a second time on a day the cron already posted for
   * (or vice versa) — the later post simply replaces the day's tracked message and resets its
   * reply counter, rather than erroring on the (chat_id, day) primary key. */
  async savePost(chatId: number, day: number, messageId: number, text: string): Promise<void> {
    this.run(`INSERT INTO posts (chat_id, day, message_id, text, replies, created) VALUES (?1, ?2, ?3, ?4, 0, ?5)
              ON CONFLICT(chat_id, day) DO UPDATE SET message_id = ?3, text = ?4, replies = 0, created = ?5`,
      chatId, day, messageId, text, now());
  }
  async postByMessage(chatId: number, messageId: number): Promise<PostRow | null> {
    return this.one<PostRow>("SELECT chat_id, day, message_id, text, replies, created FROM posts WHERE chat_id = ?1 AND message_id = ?2", chatId, messageId);
  }
  async postForDay(chatId: number, day: number): Promise<PostRow | null> {
    return this.one<PostRow>("SELECT chat_id, day, message_id, text, replies, created FROM posts WHERE chat_id = ?1 AND day = ?2", chatId, day);
  }
  async incReplies(chatId: number, day: number): Promise<number> {
    this.run("UPDATE posts SET replies = replies + 1 WHERE chat_id = ?1 AND day = ?2", chatId, day);
    return (await this.postForDay(chatId, day))?.replies ?? 0;
  }
  async addResponder(chatId: number, day: number, userId: number, name: string): Promise<boolean> {
    const before = this.run("INSERT OR IGNORE INTO responders (chat_id, day, user_id, name) VALUES (?1, ?2, ?3, ?4)", chatId, day, userId, name);
    return before > 0;
  }
  async responders(chatId: number, day: number): Promise<{ user_id: number; name: string }[]> {
    return this.all("SELECT user_id, name FROM responders WHERE chat_id = ?1 AND day = ?2 LIMIT 500", chatId, day);
  }
  async recentPosts(chatId: number, limit = 7): Promise<PostRow[]> {
    return this.all<PostRow>("SELECT chat_id, day, message_id, text, replies, created FROM posts WHERE chat_id = ?1 ORDER BY day DESC LIMIT ?2", chatId, limit);
  }

  async isAdminCached(chatId: number, userId: number, nowTs: number): Promise<boolean | null> {
    const r = this.one<{ is_admin: number; checked_at: number }>("SELECT is_admin, checked_at FROM admin_cache WHERE chat_id = ?1 AND user_id = ?2", chatId, userId);
    if (!r || nowTs - r.checked_at > ADMIN_TTL) return null;
    return r.is_admin === 1;
  }
  async setAdminCache(chatId: number, userId: number, isAdmin: boolean, nowTs: number): Promise<void> {
    this.run("INSERT INTO admin_cache (chat_id, user_id, is_admin, checked_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(chat_id, user_id) DO UPDATE SET is_admin = ?3, checked_at = ?4",
      chatId, userId, isAdmin ? 1 : 0, nowTs);
  }

  async recordSource(userId: number, src: string): Promise<void> { this.run("INSERT OR IGNORE INTO sources (user_id, src, ts) VALUES (?1, ?2, ?3)", userId, src, now()); }
  private sourceStats(): Record<string, number> {
    const rows = this.all<{ src: string; n: number }>("SELECT src, COUNT(*) AS n FROM sources WHERE NOT (user_id BETWEEN 900000000 AND 900999999) GROUP BY src");
    const out: Record<string, number> = {};
    for (const r of rows) out["src_" + r.src] = r.n;
    return out;
  }

  /** Fleet stats. `events` = questions posted, `groups` = real groups, `replies` = total
   * counted replies to a question — everything excludes the QA chat and QA user ids. */
  async stats(): Promise<FleetStats & { events: number; groups: number; replies: number }> {
    const u = this.userStats();
    const g = this.one<{ n: number; p: number | null }>("SELECT COUNT(*) AS n, SUM(pro) AS p FROM groups WHERE chat_id != ?1", QA_CHAT);
    const e = this.one<{ n: number }>("SELECT COUNT(*) AS n FROM posts p JOIN groups gr ON gr.chat_id = p.chat_id WHERE gr.chat_id != ?1", QA_CHAT);
    const r = this.one<{ n: number }>(
      `SELECT COUNT(*) AS n FROM responders rr JOIN groups gr ON gr.chat_id = rr.chat_id
       WHERE gr.chat_id != ?1 AND NOT (rr.user_id BETWEEN 900000000 AND 900999999)`, QA_CHAT);
    return { ...u, pro: u.pro + (g?.p ?? 0), events: e?.n ?? 0, groups: g?.n ?? 0, replies: r?.n ?? 0, ...this.sourceStats() };
  }
}
