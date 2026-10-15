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
    const all = demoRows();
    const sel = String(q.source || '');
    const rows = !sel ? all : sel === '__none__' ? all.filter(r => !r.source) : all.filter(r => r.source === sel);
    return res.status(200).json({
      demo: true,
      sources: [...new Set(all.map(r => r.source).filter(Boolean))].sort(),
      hasNone: all.some(r => !r.source),
      reminders: { sent: 40, ok: 38, failed: 2 },
      ...aggregate(rows),
    });
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

  const cols = '*';
  const dateFilter = `created_at=gte.${from}&created_at=lt.${to}`;
  const sel = String(q.source || '').slice(0, 64);
  let filter = dateFilter;
  if (sel === '__none__') filter += '&source=is.null';
  else if (sel) filter += `&source=eq.${encodeURIComponent(sel)}`;

  const fetchAll = async (select, f) => {
    const out = [];
    for (let o = 0; o < 100000; o += 1000) {
      const r = await fetch(`${url}/rest/v1/sessions?select=${select}&${f}&order=created_at.asc`, {
        headers: { apikey: key, Authorization: 'Bearer ' + key, 'Range-Unit': 'items', Range: `${o}-${o + 999}` },
      });
      if (!r.ok) throw new Error('Supabase: ' + r.status);
      const part = await r.json();
      out.push(...part);
      if (part.length < 1000) break;
    }
    return out;
  };

  let rows, srcRows;
  try {
    rows = await fetchAll(cols, filter);
    // manbalar ro'yxati har doim butun sana oralig'idan olinadi (filtr tanlanganda ham hamma manba ko'rinsin)
    srcRows = sel ? await fetchAll('source', dateFilter) : rows;
  } catch (e) {
    return res.status(502).json({ error: String(e.message || 'Supabase недоступен') });
  }

  const sources = [...new Set(srcRows.map(r => r.source).filter(Boolean))].sort();
  const hasNone = srcRows.some(r => !r.source);
  // eslatmalar (jadval hali yaratilmagan bo'lsa null)
  let reminders = null;
  try {
    const rr = await fetch(`${url}/rest/v1/reminders?select=result&sent_at=gte.${from}&sent_at=lt.${to}&limit=10000`, {
      headers: { apikey: key, Authorization: 'Bearer ' + key },
    });
    if (rr.ok) {
      const list = await rr.json();
      const ok = list.filter(x => x.result === 'ok').length;
      reminders = { sent: list.length, ok, failed: list.filter(x => /^fail/.test(x.result || '')).length };
    }
  } catch (e) { reminders = null; }

  res.status(200).json({ from, to: toDay, sources, hasNone, reminders, ...aggregate(rows) });
};
