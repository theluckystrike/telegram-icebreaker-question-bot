// Static-text localization for IcebreakerBot. Only user-facing static chrome lives here —
// the question content itself (questions.ts) and anything with names in it (digests, replies)
// stays in English always, so it reads the same for every member of a group.

export const LANGS = ["en", "ru", "es", "pt", "id", "de", "tr", "uk", "fa", "ar", "hi"] as const;
export type Lang = (typeof LANGS)[number];
export type Key =
  | "help"
  | "start"
  | "adminOnly"
  | "icebreakerUsage"
  | "icebreakerOn"
  | "icebreakerOff"
  | "itzUsage"
  | "itzDone"
  | "themeUsage"
  | "themeProOnly"
  | "themeDone"
  | "paused"
  | "resumed"
  | "proGroupInfo"
  | "proRunInGroup"
  | "proDescription"
  | "thankYou"
  | "questionLimitReached"
  | "btn_unlockPro"
  | "btn_addToGroup"
  | "btn_shareBot";

/** ctx.from.language_code -> first two letters -> known table language, else "en". */
export function resolveLang(code?: string): Lang {
  const c = (code ?? "").slice(0, 2).toLowerCase();
  return (LANGS as readonly string[]).includes(c) ? (c as Lang) : "en";
}

/** Look up `key` for `lang` (falling back to English), substituting `{name}` tokens from `vars`. */
export function t(lang: string, key: Key, vars?: Record<string, string | number>): string {
  const l: Lang = (LANGS as readonly string[]).includes(lang) ? (lang as Lang) : "en";
  let s = TABLE[key][l] ?? TABLE[key].en;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

const TABLE: Record<Key, Record<Lang, string>> = {
  help: {
    en: "💬 *IcebreakerBot* posts a daily conversation starter for your group.\n\nAdd me to a group, then:\n`/icebreaker on 10:00` — turn on the daily question (admin)\n`/icebreaker off` — turn it off\n`/itz +2` — set the group's timezone offset\n`/question` — post one right now\n`/pause` `/resume` — pause/resume without losing your settings\n`/theme fun|deep|work|travel|food` — themed packs (Pro)\n\nFree: general pack, fixed 10:00. Pro: custom hour, themes, end-of-day answers digest — one-time {stars} ⭐ per group, /pro",
    ru: "💬 *IcebreakerBot* каждый день присылает тему для разговора в вашей группе.\n\nДобавьте меня в группу, затем:\n`/icebreaker on 10:00` — включить ежедневный вопрос (админ)\n`/icebreaker off` — выключить\n`/itz +2` — часовой пояс группы\n`/question` — прислать вопрос прямо сейчас\n`/pause` `/resume` — пауза/возобновление без потери настроек\n`/theme fun|deep|work|travel|food` — тематические наборы (Pro)\n\nБесплатно: общий набор, фиксированное время 10:00. Pro: своё время, темы, сводка ответов в конце дня — разовый платёж {stars} ⭐ за группу, /pro",
    es: "💬 *IcebreakerBot* publica una pregunta diaria para tu grupo.\n\nAgrégame a un grupo, luego:\n`/icebreaker on 10:00` — activa la pregunta diaria (admin)\n`/icebreaker off` — desactívala\n`/itz +2` — zona horaria del grupo\n`/question` — publica una ahora mismo\n`/pause` `/resume` — pausa/reanuda sin perder la configuración\n`/theme fun|deep|work|travel|food` — paquetes temáticos (Pro)\n\nGratis: paquete general, hora fija 10:00. Pro: hora personalizada, temas, resumen de respuestas al final del día — pago único de {stars} ⭐ por grupo, /pro",
    pt: "💬 *IcebreakerBot* publica uma pergunta diária para o seu grupo.\n\nAdicione-me a um grupo, depois:\n`/icebreaker on 10:00` — ativa a pergunta diária (admin)\n`/icebreaker off` — desativa\n`/itz +2` — fuso horário do grupo\n`/question` — publica uma agora\n`/pause` `/resume` — pausa/retoma sem perder as configurações\n`/theme fun|deep|work|travel|food` — pacotes temáticos (Pro)\n\nGrátis: pacote geral, horário fixo 10:00. Pro: horário personalizado, temas, resumo de respostas no fim do dia — pagamento único de {stars} ⭐ por grupo, /pro",
    id: "💬 *IcebreakerBot* mengirim pertanyaan pembuka obrolan setiap hari untuk grupmu.\n\nTambahkan aku ke grup, lalu:\n`/icebreaker on 10:00` — aktifkan pertanyaan harian (admin)\n`/icebreaker off` — matikan\n`/itz +2` — zona waktu grup\n`/question` — kirim satu sekarang\n`/pause` `/resume` — jeda/lanjutkan tanpa kehilangan pengaturan\n`/theme fun|deep|work|travel|food` — paket bertema (Pro)\n\nGratis: paket umum, jam tetap 10:00. Pro: jam kustom, tema, ringkasan jawaban akhir hari — sekali bayar {stars} ⭐ per grup, /pro",
    de: "💬 *IcebreakerBot* postet täglich einen Gesprächsanreiz für deine Gruppe.\n\nFüge mich zu einer Gruppe hinzu, dann:\n`/icebreaker on 10:00` — tägliche Frage aktivieren (Admin)\n`/icebreaker off` — deaktivieren\n`/itz +2` — Zeitzone der Gruppe\n`/question` — jetzt sofort eine posten\n`/pause` `/resume` — pausieren/fortsetzen ohne Einstellungen zu verlieren\n`/theme fun|deep|work|travel|food` — Themenpakete (Pro)\n\nKostenlos: allgemeines Paket, feste Zeit 10:00. Pro: eigene Uhrzeit, Themen, Antwort-Zusammenfassung am Tagesende — einmalig {stars} ⭐ pro Gruppe, /pro",
    tr: "💬 *IcebreakerBot* grubun için her gün bir sohbet başlatıcı soru paylaşır.\n\nBeni bir gruba ekle, sonra:\n`/icebreaker on 10:00` — günlük soruyu aç (admin)\n`/icebreaker off` — kapat\n`/itz +2` — grubun saat dilimi\n`/question` — hemen bir soru gönder\n`/pause` `/resume` — ayarları kaybetmeden duraklat/devam ettir\n`/theme fun|deep|work|travel|food` — temalı paketler (Pro)\n\nÜcretsiz: genel paket, sabit saat 10:00. Pro: özel saat, temalar, gün sonu cevap özeti — grup başına tek seferlik {stars} ⭐, /pro",
    uk: "💬 *IcebreakerBot* щодня надсилає тему для розмови у вашій групі.\n\nДодайте мене до групи, потім:\n`/icebreaker on 10:00` — увімкнути щоденне питання (адмін)\n`/icebreaker off` — вимкнути\n`/itz +2` — часовий пояс групи\n`/question` — надіслати питання прямо зараз\n`/pause` `/resume` — пауза/відновлення без втрати налаштувань\n`/theme fun|deep|work|travel|food` — тематичні набори (Pro)\n\nБезкоштовно: загальний набір, фіксований час 10:00. Pro: власний час, теми, підсумок відповідей наприкінці дня — разовий платіж {stars} ⭐ за групу, /pro",
    fa: "💬 *IcebreakerBot* هر روز یک سؤال شروع‌کننده گفتگو برای گروه شما ارسال می‌کند.\n\nمرا به یک گروه اضافه کنید، سپس:\n`/icebreaker on 10:00` — فعال‌کردن سؤال روزانه (ادمین)\n`/icebreaker off` — غیرفعال‌کردن\n`/itz +2` — منطقه زمانی گروه\n`/question` — ارسال فوری یک سؤال\n`/pause` `/resume` — توقف/ادامه بدون از دست‌دادن تنظیمات\n`/theme fun|deep|work|travel|food` — بسته‌های موضوعی (Pro)\n\nرایگان: بسته عمومی، ساعت ثابت ۱۰:۰۰. Pro: ساعت دلخواه، موضوعات، خلاصه پاسخ‌ها در پایان روز — پرداخت یک‌باره {stars} ⭐ برای هر گروه، /pro",
    ar: "💬 *IcebreakerBot* ينشر سؤال بداية محادثة يوميًا لمجموعتك.\n\nأضفني إلى مجموعة، ثم:\n`/icebreaker on 10:00` — تفعيل السؤال اليومي (مشرف)\n`/icebreaker off` — إيقافه\n`/itz +2` — المنطقة الزمنية للمجموعة\n`/question` — انشر سؤالًا الآن\n`/pause` `/resume` — إيقاف مؤقت/استئناف دون فقدان الإعدادات\n`/theme fun|deep|work|travel|food` — حزم مواضيع (Pro)\n\nمجاني: الحزمة العامة، وقت ثابت 10:00. Pro: وقت مخصص، مواضيع، ملخص الإجابات في نهاية اليوم — دفعة واحدة {stars} ⭐ لكل مجموعة، /pro",
    hi: "💬 *IcebreakerBot* आपके ग्रुप के लिए हर दिन एक बातचीत शुरू करने वाला सवाल भेजता है।\n\nमुझे किसी ग्रुप में जोड़ें, फिर:\n`/icebreaker on 10:00` — रोज़ का सवाल चालू करें (एडमिन)\n`/icebreaker off` — बंद करें\n`/itz +2` — ग्रुप का टाइमज़ोन\n`/question` — अभी एक सवाल भेजें\n`/pause` `/resume` — सेटिंग्स खोए बिना रोकें/फिर शुरू करें\n`/theme fun|deep|work|travel|food` — थीम पैक (Pro)\n\nमुफ़्त: सामान्य पैक, तय समय 10:00। Pro: कस्टम समय, थीम, दिन के अंत में जवाबों का सारांश — प्रति ग्रुप एकमुश्त {stars} ⭐, /pro",
  },
  start: {
    en: "💬 A question a day to wake your group up.\nAdd me, then an admin runs `/icebreaker on 10:00`.\nOr `/question` to post one right now.\nFree: general pack, fixed 10:00 · /help",
    ru: "💬 Вопрос дня, чтобы расшевелить вашу группу.\nДобавьте меня, затем админ запускает `/icebreaker on 10:00`.\nИли `/question`, чтобы прислать вопрос прямо сейчас.\nБесплатно: общий набор, фиксированное время 10:00 · /help",
    es: "💬 Una pregunta diaria para animar a tu grupo.\nAgrégame, luego un admin ejecuta `/icebreaker on 10:00`.\nO `/question` para publicar una ahora mismo.\nGratis: paquete general, hora fija 10:00 · /help",
    pt: "💬 Uma pergunta por dia para animar seu grupo.\nAdicione-me, depois um admin roda `/icebreaker on 10:00`.\nOu `/question` para publicar uma agora.\nGrátis: pacote geral, horário fixo 10:00 · /help",
    id: "💬 Satu pertanyaan sehari untuk menghidupkan grupmu.\nTambahkan aku, lalu admin jalankan `/icebreaker on 10:00`.\nAtau `/question` untuk kirim satu sekarang.\nGratis: paket umum, jam tetap 10:00 · /help",
    de: "💬 Eine Frage am Tag, die deine Gruppe zum Leben erweckt.\nFüge mich hinzu, dann führt ein Admin `/icebreaker on 10:00` aus.\nOder `/question`, um sofort eine zu posten.\nKostenlos: allgemeines Paket, feste Zeit 10:00 · /help",
    tr: "💬 Grubunu canlandıracak günde bir soru.\nBeni ekle, sonra bir yönetici `/icebreaker on 10:00` çalıştırsın.\nYa da hemen bir soru için `/question` yaz.\nÜcretsiz: genel paket, sabit saat 10:00 · /help",
    uk: "💬 Питання дня, щоб розворушити вашу групу.\nДодайте мене, потім адмін запускає `/icebreaker on 10:00`.\nАбо `/question`, щоб надіслати питання прямо зараз.\nБезкоштовно: загальний набір, фіксований час 10:00 · /help",
    fa: "💬 یک سؤال در روز برای زنده کردن گروه شما.\nمرا اضافه کنید، سپس یک ادمین `/icebreaker on 10:00` را اجرا کند.\nیا `/question` برای ارسال فوری یک سؤال.\nرایگان: بسته عمومی، ساعت ثابت ۱۰:۰۰ · /help",
    ar: "💬 سؤال يومي لتنشيط مجموعتك.\nأضفني، ثم يشغّل أحد المشرفين `/icebreaker on 10:00`.\nأو استخدم `/question` لنشر سؤال الآن.\nمجانًا: الحزمة العامة، وقت ثابت 10:00 · /help",
    hi: "💬 आपके ग्रुप को जगाने के लिए रोज़ एक सवाल।\nमुझे जोड़ें, फिर एक एडमिन `/icebreaker on 10:00` चलाए।\nया अभी सवाल भेजने के लिए `/question`।\nमुफ़्त: सामान्य पैक, तय समय 10:00 · /help",
  },
  adminOnly: {
    en: "Only group admins can do that.",
    ru: "Это могут делать только администраторы группы.",
    es: "Solo los administradores del grupo pueden hacer eso.",
    pt: "Apenas administradores do grupo podem fazer isso.",
    id: "Hanya admin grup yang bisa melakukan itu.",
    de: "Das können nur Gruppenadmins tun.",
    tr: "Bunu yalnızca grup yöneticileri yapabilir.",
    uk: "Це можуть робити лише адміністратори групи.",
    fa: "فقط مدیران گروه می‌توانند این کار را انجام دهند.",
    ar: "يمكن لمشرفي المجموعة فقط فعل ذلك.",
    hi: "यह केवल ग्रुप एडमिन ही कर सकते हैं।",
  },
  icebreakerUsage: {
    en: "Usage: `/icebreaker on 10:00` or `/icebreaker off`.",
    ru: "Использование: `/icebreaker on 10:00` или `/icebreaker off`.",
    es: "Uso: `/icebreaker on 10:00` o `/icebreaker off`.",
    pt: "Uso: `/icebreaker on 10:00` ou `/icebreaker off`.",
    id: "Penggunaan: `/icebreaker on 10:00` atau `/icebreaker off`.",
    de: "Verwendung: `/icebreaker on 10:00` oder `/icebreaker off`.",
    tr: "Kullanım: `/icebreaker on 10:00` veya `/icebreaker off`.",
    uk: "Використання: `/icebreaker on 10:00` або `/icebreaker off`.",
    fa: "استفاده: `/icebreaker on 10:00` یا `/icebreaker off`.",
    ar: "الاستخدام: `/icebreaker on 10:00` أو `/icebreaker off`.",
    hi: "उपयोग: `/icebreaker on 10:00` या `/icebreaker off`।",
  },
  icebreakerOn: {
    en: "✅ Daily question on at {time} ({tz}).",
    ru: "✅ Ежедневный вопрос включён на {time} ({tz}).",
    es: "✅ Pregunta diaria activada a las {time} ({tz}).",
    pt: "✅ Pergunta diária ativada às {time} ({tz}).",
    id: "✅ Pertanyaan harian aktif pukul {time} ({tz}).",
    de: "✅ Tägliche Frage aktiviert um {time} ({tz}).",
    tr: "✅ Günlük soru {time} ({tz}) saatinde açık.",
    uk: "✅ Щоденне питання увімкнено на {time} ({tz}).",
    fa: "✅ سؤال روزانه در ساعت {time} ({tz}) فعال شد.",
    ar: "✅ السؤال اليومي مفعّل الساعة {time} ({tz}).",
    hi: "✅ रोज़ का सवाल {time} ({tz}) पर चालू है।",
  },
  icebreakerOff: {
    en: "Daily question turned off.",
    ru: "Ежедневный вопрос выключен.",
    es: "Pregunta diaria desactivada.",
    pt: "Pergunta diária desativada.",
    id: "Pertanyaan harian dimatikan.",
    de: "Tägliche Frage deaktiviert.",
    tr: "Günlük soru kapatıldı.",
    uk: "Щоденне питання вимкнено.",
    fa: "سؤال روزانه غیرفعال شد.",
    ar: "تم إيقاف السؤال اليومي.",
    hi: "रोज़ का सवाल बंद कर दिया गया।",
  },
  itzUsage: {
    en: "Usage: `/itz +2` (offset from UTC, e.g. +2, -5, +5:30).",
    ru: "Использование: `/itz +2` (смещение от UTC, например +2, -5, +5:30).",
    es: "Uso: `/itz +2` (desfase de UTC, ej. +2, -5, +5:30).",
    pt: "Uso: `/itz +2` (deslocamento de UTC, ex. +2, -5, +5:30).",
    id: "Penggunaan: `/itz +2` (selisih dari UTC, mis. +2, -5, +5:30).",
    de: "Verwendung: `/itz +2` (Abweichung von UTC, z. B. +2, -5, +5:30).",
    tr: "Kullanım: `/itz +2` (UTC farkı, örn. +2, -5, +5:30).",
    uk: "Використання: `/itz +2` (зсув від UTC, напр. +2, -5, +5:30).",
    fa: "استفاده: `/itz +2` (اختلاف با UTC، مثلاً +2، -5، +5:30).",
    ar: "الاستخدام: `/itz +2` (فرق التوقيت عن UTC، مثل +2 أو -5 أو +5:30).",
    hi: "उपयोग: `/itz +2` (UTC से अंतर, जैसे +2, -5, +5:30)।",
  },
  itzDone: {
    en: "✅ Timezone set to {tz}.",
    ru: "✅ Часовой пояс установлен: {tz}.",
    es: "✅ Zona horaria establecida en {tz}.",
    pt: "✅ Fuso horário definido para {tz}.",
    id: "✅ Zona waktu diatur ke {tz}.",
    de: "✅ Zeitzone auf {tz} gesetzt.",
    tr: "✅ Saat dilimi {tz} olarak ayarlandı.",
    uk: "✅ Часовий пояс встановлено: {tz}.",
    fa: "✅ منطقه زمانی روی {tz} تنظیم شد.",
    ar: "✅ تم ضبط المنطقة الزمنية على {tz}.",
    hi: "✅ टाइमज़ोन {tz} पर सेट किया गया।",
  },
  themeUsage: {
    en: "Usage: `/theme fun|deep|work|travel|food`.",
    ru: "Использование: `/theme fun|deep|work|travel|food`.",
    es: "Uso: `/theme fun|deep|work|travel|food`.",
    pt: "Uso: `/theme fun|deep|work|travel|food`.",
    id: "Penggunaan: `/theme fun|deep|work|travel|food`.",
    de: "Verwendung: `/theme fun|deep|work|travel|food`.",
    tr: "Kullanım: `/theme fun|deep|work|travel|food`.",
    uk: "Використання: `/theme fun|deep|work|travel|food`.",
    fa: "استفاده: `/theme fun|deep|work|travel|food`.",
    ar: "الاستخدام: `/theme fun|deep|work|travel|food`.",
    hi: "उपयोग: `/theme fun|deep|work|travel|food`।",
  },
  themeProOnly: {
    en: "Themed packs are a Pro feature. Free groups get the general pack.",
    ru: "Тематические наборы доступны только в Pro. В бесплатной версии — общий набор.",
    es: "Los paquetes temáticos son una función Pro. Los grupos gratuitos usan el paquete general.",
    pt: "Pacotes temáticos são um recurso Pro. Grupos grátis usam o pacote geral.",
    id: "Paket bertema adalah fitur Pro. Grup gratis mendapat paket umum.",
    de: "Themenpakete sind eine Pro-Funktion. Kostenlose Gruppen nutzen das allgemeine Paket.",
    tr: "Temalı paketler bir Pro özelliğidir. Ücretsiz gruplar genel paketi kullanır.",
    uk: "Тематичні набори доступні лише в Pro. Безкоштовні групи отримують загальний набір.",
    fa: "بسته‌های موضوعی ویژگی Pro هستند. گروه‌های رایگان بسته عمومی دارند.",
    ar: "الحزم الموضوعية ميزة Pro. المجموعات المجانية تحصل على الحزمة العامة.",
    hi: "थीम पैक Pro सुविधा है। मुफ़्त ग्रुप को सामान्य पैक मिलता है।",
  },
  themeDone: {
    en: "✅ Theme set to {theme}.",
    ru: "✅ Тема установлена: {theme}.",
    es: "✅ Tema establecido en {theme}.",
    pt: "✅ Tema definido para {theme}.",
    id: "✅ Tema diatur ke {theme}.",
    de: "✅ Thema auf {theme} gesetzt.",
    tr: "✅ Tema {theme} olarak ayarlandı.",
    uk: "✅ Тему встановлено: {theme}.",
    fa: "✅ موضوع روی {theme} تنظیم شد.",
    ar: "✅ تم ضبط الموضوع على {theme}.",
    hi: "✅ थीम {theme} पर सेट की गई।",
  },
  paused: {
    en: "⏸ Paused. Daily questions won't post until you /resume.",
    ru: "⏸ Пауза. Ежедневные вопросы не будут приходить, пока не введёте /resume.",
    es: "⏸ En pausa. No se publicarán preguntas diarias hasta que uses /resume.",
    pt: "⏸ Pausado. Perguntas diárias não serão publicadas até você usar /resume.",
    id: "⏸ Dijeda. Pertanyaan harian tidak akan diposting sampai kamu /resume.",
    de: "⏸ Pausiert. Tägliche Fragen werden erst wieder mit /resume gepostet.",
    tr: "⏸ Duraklatıldı. /resume komutuna kadar günlük sorular gönderilmeyecek.",
    uk: "⏸ Пауза. Щоденні питання не надсилатимуться, доки ви не введете /resume.",
    fa: "⏸ متوقف شد. تا زمانی که /resume را نزنید سؤال روزانه ارسال نمی‌شود.",
    ar: "⏸ متوقف مؤقتًا. لن تُنشر الأسئلة اليومية حتى تستخدم /resume.",
    hi: "⏸ रोका गया। /resume करने तक रोज़ का सवाल नहीं भेजा जाएगा।",
  },
  resumed: {
    en: "▶️ Resumed. Daily questions are back on.",
    ru: "▶️ Возобновлено. Ежедневные вопросы снова включены.",
    es: "▶️ Reanudado. Las preguntas diarias están activas de nuevo.",
    pt: "▶️ Retomado. As perguntas diárias voltaram a ser publicadas.",
    id: "▶️ Dilanjutkan. Pertanyaan harian aktif kembali.",
    de: "▶️ Fortgesetzt. Tägliche Fragen sind wieder aktiv.",
    tr: "▶️ Devam ettirildi. Günlük sorular tekrar aktif.",
    uk: "▶️ Відновлено. Щоденні питання знову увімкнено.",
    fa: "▶️ ادامه یافت. سؤال روزانه دوباره فعال شد.",
    ar: "▶️ تم الاستئناف. الأسئلة اليومية عادت للعمل.",
    hi: "▶️ फिर से शुरू। रोज़ का सवाल फिर से चालू है।",
  },
  proGroupInfo: {
    en: "Custom posting hour, themed packs, and an end-of-day answers digest for this group. One-time {stars} ⭐.",
    ru: "Своё время публикации, тематические наборы и сводка ответов в конце дня для этой группы. Разовый платёж {stars} ⭐.",
    es: "Hora de publicación personalizada, paquetes temáticos y resumen de respuestas al final del día para este grupo. Pago único de {stars} ⭐.",
    pt: "Horário de publicação personalizado, pacotes temáticos e resumo de respostas no fim do dia para este grupo. Pagamento único de {stars} ⭐.",
    id: "Jam posting kustom, paket bertema, dan ringkasan jawaban akhir hari untuk grup ini. Sekali bayar {stars} ⭐.",
    de: "Eigene Uhrzeit, Themenpakete und eine Antwort-Zusammenfassung am Tagesende für diese Gruppe. Einmalig {stars} ⭐.",
    tr: "Bu grup için özel gönderi saati, temalı paketler ve gün sonu cevap özeti. Tek seferlik {stars} ⭐.",
    uk: "Власний час публікації, тематичні набори та підсумок відповідей наприкінці дня для цієї групи. Разовий платіж {stars} ⭐.",
    fa: "ساعت انتشار دلخواه، بسته‌های موضوعی و خلاصه پاسخ‌ها در پایان روز برای این گروه. پرداخت یک‌باره {stars} ⭐.",
    ar: "ساعة نشر مخصصة وحزم موضوعية وملخص إجابات نهاية اليوم لهذه المجموعة. دفعة واحدة {stars} ⭐.",
    hi: "इस ग्रुप के लिए कस्टम पोस्ट समय, थीम पैक और दिन के अंत का जवाब सारांश। एकमुश्त {stars} ⭐।",
  },
  proRunInGroup: {
    en: "Run /pro inside the group you want to upgrade.",
    ru: "Запустите /pro внутри группы, которую хотите обновить.",
    es: "Ejecuta /pro dentro del grupo que quieres actualizar.",
    pt: "Execute /pro dentro do grupo que deseja atualizar.",
    id: "Jalankan /pro di dalam grup yang ingin kamu upgrade.",
    de: "Führe /pro innerhalb der Gruppe aus, die du upgraden möchtest.",
    tr: "Yükseltmek istediğin grubun içinde /pro komutunu çalıştır.",
    uk: "Запустіть /pro всередині групи, яку хочете оновити.",
    fa: "دستور /pro را داخل گروهی که می‌خواهید ارتقا دهید اجرا کنید.",
    ar: "شغّل /pro داخل المجموعة التي تريد ترقيتها.",
    hi: "जिस ग्रुप को अपग्रेड करना है, उसके अंदर /pro चलाएं।",
  },
  proDescription: {
    en: "Custom posting hour, themed question packs, and an end-of-day answers digest for one group. One-time payment.",
    ru: "Своё время публикации, тематические наборы вопросов и сводка ответов в конце дня для одной группы. Разовый платёж.",
    es: "Hora de publicación personalizada, paquetes temáticos y resumen de respuestas al final del día para un grupo. Pago único.",
    pt: "Horário de publicação personalizado, pacotes temáticos e resumo de respostas no fim do dia para um grupo. Pagamento único.",
    id: "Jam posting kustom, paket bertema, dan ringkasan jawaban akhir hari untuk satu grup. Sekali bayar.",
    de: "Eigene Uhrzeit, Themenpakete und eine Antwort-Zusammenfassung am Tagesende für eine Gruppe. Einmalzahlung.",
    tr: "Bir grup için özel gönderi saati, temalı soru paketleri ve gün sonu cevap özeti. Tek seferlik ödeme.",
    uk: "Власний час публікації, тематичні набори питань та підсумок відповідей наприкінці дня для однієї групи. Разовий платіж.",
    fa: "ساعت انتشار دلخواه، بسته‌های موضوعی سؤال و خلاصه پاسخ‌ها در پایان روز برای یک گروه. پرداخت یک‌باره.",
    ar: "ساعة نشر مخصصة وحزم أسئلة موضوعية وملخص إجابات نهاية اليوم لمجموعة واحدة. دفعة واحدة.",
    hi: "एक ग्रुप के लिए कस्टम पोस्ट समय, थीम सवाल पैक और दिन के अंत का जवाब सारांश। एकमुश्त भुगतान।",
  },
  thankYou: {
    en: "✅ Pro unlocked for the group. Custom hour, themes, and the end-of-day digest are on.\n\n/more — more free tools",
    ru: "✅ Pro активирован для группы. Своё время, темы и сводка в конце дня включены.\n\n/more — другие бесплатные инструменты",
    es: "✅ Pro activado para el grupo. Hora personalizada, temas y el resumen del final del día están activos.\n\n/more — más herramientas gratis",
    pt: "✅ Pro ativado para o grupo. Horário personalizado, temas e o resumo do fim do dia estão ativos.\n\n/more — mais ferramentas grátis",
    id: "✅ Pro aktif untuk grup. Jam kustom, tema, dan ringkasan akhir hari sudah aktif.\n\n/more — alat gratis lainnya",
    de: "✅ Pro für die Gruppe freigeschaltet. Eigene Uhrzeit, Themen und die Tagesend-Zusammenfassung sind aktiv.\n\n/more — weitere kostenlose Tools",
    tr: "✅ Grup için Pro açıldı. Özel saat, temalar ve gün sonu özeti aktif.\n\n/more — daha fazla ücretsiz araç",
    uk: "✅ Pro активовано для групи. Власний час, теми та підсумок наприкінці дня увімкнено.\n\n/more — інші безкоштовні інструменти",
    fa: "✅ Pro برای گروه فعال شد. ساعت دلخواه، موضوعات و خلاصه پایان روز فعال هستند.\n\n/more — ابزارهای رایگان بیشتر",
    ar: "✅ تم تفعيل Pro للمجموعة. الساعة المخصصة والمواضيع وملخص نهاية اليوم مفعّلة.\n\n/more — أدوات مجانية أخرى",
    hi: "✅ ग्रुप के लिए Pro अनलॉक हुआ। कस्टम समय, थीम और दिन के अंत का सारांश चालू है।\n\n/more — और मुफ़्त टूल्स",
  },
  questionLimitReached: {
    en: "Free groups get one manual /question a day (today's is already posted). Pro groups can post anytime.",
    ru: "Бесплатные группы могут вручную запросить /question раз в день (на сегодня уже опубликовано). В Pro — без ограничений.",
    es: "Los grupos gratuitos tienen un /question manual al día (el de hoy ya se publicó). Los grupos Pro pueden publicar en cualquier momento.",
    pt: "Grupos grátis têm um /question manual por dia (o de hoje já foi publicado). Grupos Pro podem publicar a qualquer hora.",
    id: "Grup gratis dapat satu /question manual sehari (hari ini sudah diposting). Grup Pro bisa memposting kapan saja.",
    de: "Kostenlose Gruppen haben ein manuelles /question pro Tag (das heutige wurde bereits gepostet). Pro-Gruppen können jederzeit posten.",
    tr: "Ücretsiz gruplar günde bir manuel /question kullanabilir (bugünkü zaten paylaşıldı). Pro gruplar istediği zaman paylaşabilir.",
    uk: "Безкоштовні групи можуть вручну викликати /question раз на день (сьогоднішнє вже опубліковано). У Pro — без обмежень.",
    fa: "گروه‌های رایگان روزی یک بار می‌توانند /question را دستی اجرا کنند (سؤال امروز قبلاً ارسال شده). گروه‌های Pro هر زمان می‌توانند ارسال کنند.",
    ar: "تحصل المجموعات المجانية على استخدام يدوي واحد لـ /question يوميًا (سؤال اليوم نُشر بالفعل). مجموعات Pro يمكنها النشر في أي وقت.",
    hi: "मुफ़्त ग्रुप को दिन में एक बार मैन्युअल /question मिलता है (आज वाला पहले ही पोस्ट हो चुका है)। Pro ग्रुप कभी भी पोस्ट कर सकते हैं।",
  },
  btn_unlockPro: {
    en: "Unlock Pro, {stars} ⭐",
    ru: "Открыть Pro, {stars} ⭐",
    es: "Desbloquear Pro, {stars} ⭐",
    pt: "Desbloquear Pro, {stars} ⭐",
    id: "Buka Pro, {stars} ⭐",
    de: "Pro freischalten, {stars} ⭐",
    tr: "Pro'yu Aç, {stars} ⭐",
    uk: "Відкрити Pro, {stars} ⭐",
    fa: "باز کردن Pro، {stars} ⭐",
    ar: "فتح Pro، {stars} ⭐",
    hi: "Pro अनलॉक करें, {stars} ⭐",
  },
  btn_addToGroup: {
    en: "Add me to a group",
    ru: "Добавить в группу",
    es: "Añádeme a un grupo",
    pt: "Adicione-me a um grupo",
    id: "Tambahkan ke grup",
    de: "Zur Gruppe hinzufügen",
    tr: "Bir gruba ekle",
    uk: "Додати до групи",
    fa: "به گروه اضافه کن",
    ar: "أضفني إلى مجموعة",
    hi: "मुझे ग्रुप में जोड़ें",
  },
  btn_shareBot: {
    en: "📣 Share this bot",
    ru: "📣 Поделиться ботом",
    es: "📣 Comparte este bot",
    pt: "📣 Compartilhe este bot",
    id: "📣 Bagikan bot ini",
    de: "📣 Bot teilen",
    tr: "📣 Bu botu paylaş",
    uk: "📣 Поділитися ботом",
    fa: "📣 اشتراک‌گذاری ربات",
    ar: "📣 شارك هذا البوت",
    hi: "📣 यह बॉट शेयर करें",
  },
};
