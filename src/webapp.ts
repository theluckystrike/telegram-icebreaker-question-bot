/** Telegram Mini App: initData validation (HMAC-SHA256, key "WebAppData") + tiny JSON API + HTML shell. */
const enc = new TextEncoder();
const hex = (b: ArrayBuffer): string => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

async function hmac(key: ArrayBuffer | Uint8Array, msg: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, enc.encode(msg));
}

export interface InitUser { id: number; first_name: string; username?: string; }

async function hashMatches(hash: string, dcs: string, token: string): Promise<boolean> {
  const secret = await hmac(enc.encode("WebAppData"), token);
  return hex(await hmac(secret, dcs)) === hash;
}

/** Returns the user if initData is authentic (signed by any of `tokens`, e.g. a bot's own
 * BOT_TOKEN plus a shared hub bot token) and younger than maxAgeSec, else null. */
export async function validateInitData(initData: string, tokens: string | string[], maxAgeSec = 86_400): Promise<InitUser | null> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const dcs = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const list = Array.isArray(tokens) ? tokens : [tokens];
  let ok = false;
  for (const token of list) { if (await hashMatches(hash, dcs, token)) { ok = true; break; } }
  if (!ok) return null;
  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || Math.floor(Date.now() / 1000) - authDate > maxAgeSec) return null;
  try { return JSON.parse(params.get("user") ?? "null") as InitUser | null; } catch { return null; }
}

/** Pure: one-line pitch + an attributable deep link (?start=<startParam>), for both the
 * "Share to a chat" prepared message and any "Share to story" widget_link text. Kept short
 * enough (fleet convention: <=300 chars) to fit comfortably in a story/chat share sheet.
 * Lives here (not kit.ts) so it stays importable by tests without pulling in kit.ts's
 * "cloudflare:workers" DurableObject dependency. */
export function buildShareText(pitch: string, botUsername: string, startParam: string): string {
  return `${pitch}\n\nhttps://t.me/${botUsername}?start=${startParam}`;
}

export const APP_HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>IcebreakerBot</title>
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<style>body{margin:0;font:16px/1.4 -apple-system,system-ui,sans-serif;background:var(--tg-theme-bg-color,#fff);color:var(--tg-theme-text-color,#111);padding:16px}
h1{font-size:18px;margin:0 0 12px}h2{font-size:14px;margin:18px 0 8px;color:var(--tg-theme-hint-color,#777)}
.group{margin-bottom:14px}.gname{font-weight:600;margin-bottom:6px}
.card{padding:14px;border-radius:14px;background:var(--tg-theme-secondary-bg-color,#f3f3f3);margin-bottom:8px}
.q{font-size:16px}.day{font-size:12px;color:var(--tg-theme-hint-color,#777);margin-top:4px}
.empty{color:var(--tg-theme-hint-color,#777)}
button{border:0;border-radius:10px;padding:10px 14px;font-size:14px;background:var(--tg-theme-secondary-bg-color,#f3f3f3);color:var(--tg-theme-text-color,#111);width:100%}
</style></head><body>
<h1>💬 Icebreaker</h1><div id="area" class="empty">Loading…</div>
<div id="shareRow" style="margin-top:14px"></div>
<div id="more"></div>
<script>
const tg=window.Telegram.WebApp;tg.ready();tg.expand();
async function api(path,body){const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({initData:tg.initData,...body})});return r.json()}
const OTHER_BOTS=[['🔒 WhisperLock','WhisperLockBot'],['⏰ Nudge','NudgeRemindBot'],['📮 AnonInbox','AnonInboxProBot'],['🧾 SplitTabs','SplitTabsBot'],['📊 GroupPulse','GroupPulseBot']];
function renderMore(){document.getElementById('more').innerHTML='<h2>More apps</h2>'+OTHER_BOTS.map(([label,bot])=>'<button class="mo" data-bot="'+bot+'">'+label+'</button>').join('');for(const b of document.querySelectorAll('.mo'))b.onclick=()=>tg.openTelegramLink('https://t.me/'+b.dataset.bot)}
function renderShare(){const el=document.getElementById("shareRow");if(!el)return;let ok=false;try{ok=typeof tg.shareMessage==="function"&&tg.isVersionAtLeast("8.0")}catch(e){}if(ok){const b=document.createElement("button");b.textContent="💬 Share to a chat";b.onclick=async()=>{try{const r=await fetch("/api/share",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({initData:tg.initData})});const d=await r.json();if(d&&d.id)tg.shareMessage(d.id)}catch(e){}};el.appendChild(b)}let ok2=false;try{ok2=typeof tg.shareToStory==="function"&&tg.isVersionAtLeast("7.8")}catch(e){}if(ok2){const s=document.createElement("button");s.textContent="📣 Share to story";s.style.marginTop="8px";s.onclick=()=>{try{fetch("/api/share-story",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({initData:tg.initData})}).catch(()=>{});tg.shareToStory("https://tg.zovo.one/img/banner-ice.png",{text:"A free daily conversation starter for your group, right inside Telegram.\\n\\nhttps://t.me/IcebreakerBot?start=story",widget_link:{url:"https://t.me/IcebreakerBot?start=story",name:"IcebreakerBot"}})}catch(e){}};el.appendChild(s)}}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}
function renderGroups(d){const el=document.getElementById('area');
 if(d.error){el.className='empty';el.textContent=d.error;return}
 const groups=d.groups||[];
 if(!groups.length){el.className='empty';el.textContent='No groups yet. Add me to a group and try /icebreaker on 10:00.';return}
 el.className='';
 el.innerHTML=groups.map(function(g){
   var today=g.today?'<div class="card"><div class="q">'+esc(g.today)+'</div><div class="day">Today</div></div>':'<div class="empty">No question posted today yet.</div>';
   var history=(g.history||[]).map(function(h){return '<div class="card"><div class="q">'+esc(h.text)+'</div><div class="day">'+esc(h.day)+'</div></div>'}).join('');
   return '<div class="group"><div class="gname">'+esc(g.title||'Group')+'</div>'+today+history+'</div>';
 }).join('');
}
async function load(){const d=await api('/api/recent',{});renderGroups(d)}
load();renderMore();renderShare();
</script></body></html>`;
