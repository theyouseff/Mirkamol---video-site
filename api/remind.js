// GET /api/remind?key=<WATCH_API_KEY>[&dry=1]
// Tashqi taymer (cron-job.org) har daqiqada chaqiradi. Videoni ko'rib, chiqib ketganlarga
// Telegram orqali BIR MARTA eslatma yuboradi. Yuborish faqat REMINDERS_ENABLED=1 bo'lsa ishlaydi.
const crypto = require('crypto');
const { pickDue, REMINDER_TEXT } = require('../lib/remind');

const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const num = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : d; };

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY;
  const secret = process.env.WATCH_API_KEY;
  if (!url || !key || !secret) return res.status(500).json({ error: 'not configured' });

  const q = req.query || {};
  const given = req.headers['x-api-key'] || q.key || '';
  if (!crypto.timingSafeEqual(sha(given), sha(secret))) return res.status(401).json({ error: 'unauthorized' });

  const enabled = process.env.REMINDERS_ENABLED === '1';
  const dry = q.dry === '1' || !enabled;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const tgBase = (process.env.TELEGRAM_API_BASE || 'https://api.telegram.org').replace(/\/+$/, '');
  const site = (process.env.SITE_URL || 'https://mirkamol-lor-jarroh.vercel.app').replace(/\/+$/, '');
  const opts = {
    afterSec: num(process.env.REMIND_AFTER_SEC, 240),
    maxAgeSec: num(process.env.REMIND_MAX_AGE_SEC, 3600),
    maxPct: num(process.env.REMIND_MAX_PCT, 95),
  };
  const H = { apikey: key, Authorization: 'Bearer ' + key };

  try {
    // 1) oxirgi ~1 soatda faol bo'lgan uid lar
    const since = new Date(Date.now() - (opts.maxAgeSec + 600) * 1000).toISOString();
    const r1 = await fetch(`${url}/rest/v1/sessions?select=uid&uid=not.is.null&updated_at=gt.${encodeURIComponent(since)}&limit=2000`, { headers: H });
    if (!r1.ok) return res.status(502).json({ error: 'db ' + r1.status });
    const uids = [...new Set((await r1.json()).map(x => x.uid).filter(u => /^\d{1,15}$/.test(u || '')))];
    if (!uids.length) return res.status(200).json({ enabled, dry, checked: 0, due: [], sent: [] });

    // 2) shu uid larning hamma sessiyalari (oxirigacha ko'rganmi, 1-kunlik tugma orqali kirganmi — hammasi shundan)
    const r2 = await fetch(`${url}/rest/v1/sessions?select=uid,source,started,ended,max_sec,duration,updated_at&uid=in.(${uids.join(',')})&limit=10000`, { headers: H });
    if (!r2.ok) return res.status(502).json({ error: 'db ' + r2.status });
    let due = pickDue(await r2.json(), Date.now(), opts);

    // 3) allaqachon eslatma olganlarni chiqarib tashlaymiz
    if (due.length) {
      const r3 = await fetch(`${url}/rest/v1/reminders?select=uid&uid=in.(${due.map(d => d.uid).join(',')})`, { headers: H });
      if (r3.ok) { const done = new Set((await r3.json()).map(x => x.uid)); due = due.filter(d => !done.has(d.uid)); }
    }
    if (dry) return res.status(200).json({ enabled, dry: true, checked: uids.length, due, sent: [] });
    if (!token) return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not set' });

    const sent = [];
    for (const d of due) {
      // yuborishdan OLDIN "band qilamiz": ikki marta yuborilib ketmasligi uchun
      const claim = await fetch(`${url}/rest/v1/reminders`, {
        method: 'POST',
        headers: { ...H, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=representation' },
        body: JSON.stringify({ uid: d.uid }),
      });
      if (!claim.ok) continue;
      const got = await claim.json();
      if (!Array.isArray(got) || !got.length) continue;       // boshqa chaqiruv allaqachon band qilgan

      let result = 'ok';
      try {
        const tg = await fetch(`${tgBase}/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: d.uid,
            text: REMINDER_TEXT,
            reply_markup: { inline_keyboard: [[{ text: 'VIDEONI DAVOM ETTIRISH', url: `${site}/?src=tg_bot_reminder&uid=${d.uid}` }]] },
          }),
        });
        if (!tg.ok) { const j = await tg.json().catch(() => ({})); result = 'fail ' + tg.status + ' ' + String(j.description || '').slice(0, 80); }
      } catch (e) { result = 'fail network'; }
      await fetch(`${url}/rest/v1/reminders?uid=eq.${encodeURIComponent(d.uid)}`, {
        method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ result }),
      }).catch(() => {});
      sent.push({ uid: d.uid, pct: d.pct, result });
    }
    return res.status(200).json({ enabled, dry: false, checked: uids.length, due: due.length, sent });
  } catch (e) {
    return res.status(502).json({ error: 'failed' });
  }
};
