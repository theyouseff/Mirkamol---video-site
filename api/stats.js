// GET /api/stats?from=YYYY-MM-DD&to=YYYY-MM-DD&source=...  (sarlavha: x-stats-password)
// ?demo=1 — parolsiz, tasodifiy namunaviy ma'lumot (ko'rinishni ko'rish uchun).
const crypto = require('crypto');
const { aggregate, demoRows } = require('../lib/aggregate');

const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const dateRe = /^\d{4}-\d{2}-\d{2}$/;

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();
  const q = req.query || {};

  if (q.demo === '1') {
    return res.status(200).json({ demo: true, sources: ['instagram', 'tg_bot'], ...aggregate(demoRows()) });
  }

  const pass = process.env.STATS_PASSWORD;
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!pass || !url || !key) return res.status(500).json({ error: 'Vercel da SUPABASE_URL, SUPABASE_SERVICE_KEY, STATS_PASSWORD kiritilmagan' });

  const given = req.headers['x-stats-password'] || '';
  if (!crypto.timingSafeEqual(sha(given), sha(pass))) return res.status(401).json({ error: 'Неверный пароль' });

  const from = dateRe.test(q.from || '') ? q.from : new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const toDay = dateRe.test(q.to || '') ? q.to : new Date().toISOString().slice(0, 10);
  const to = new Date(Date.parse(toDay) + 86400000).toISOString().slice(0, 10);

  const cols = 'sid,vid,created_at,source,device,country,started,ended,reached_cta,cta_clicked,max_sec,duration';
  let filter = `created_at=gte.${from}&created_at=lt.${to}`;
  if (q.source) filter += `&source=eq.${encodeURIComponent(String(q.source).slice(0, 64))}`;

  const rows = [];
  try {
    for (let o = 0; o < 100000; o += 1000) {
      const r = await fetch(`${url}/rest/v1/sessions?select=${cols}&${filter}&order=created_at.asc`, {
        headers: { apikey: key, Authorization: 'Bearer ' + key, 'Range-Unit': 'items', Range: `${o}-${o + 999}` },
      });
      if (!r.ok) return res.status(502).json({ error: 'Supabase: ' + r.status });
      const part = await r.json();
      rows.push(...part);
      if (part.length < 1000) break;
    }
  } catch (e) {
    return res.status(502).json({ error: 'Supabase недоступен' });
  }

  // manbalar ro'yxati filtr uchun (sana oralig'idagi hamma sessiyalardan)
  const sources = [...new Set(rows.map(r => r.source).filter(Boolean))];
  res.status(200).json({ from, to: toDay, sources, ...aggregate(rows) });
};
