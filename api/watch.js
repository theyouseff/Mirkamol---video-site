// GET /api/watch?uid=...   (sarlavha: x-api-key: <WATCH_API_KEY>  yoki  ?key=<WATCH_API_KEY>)
// ChatPlace "HTTP request" bu manzilga murojaat qilib, tomoshabin holatini oladi.
const crypto = require('crypto');
const { computeWatchState } = require('../lib/watchState');

const sha = s => crypto.createHash('sha256').update(String(s)).digest();

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY;
  const secret = process.env.WATCH_API_KEY;
  if (!url || !key || !secret) return res.status(500).json({ error: 'not configured' });

  const q = req.query || {};
  const given = req.headers['x-api-key'] || q.key || '';
  if (!crypto.timingSafeEqual(sha(given), sha(secret))) return res.status(401).json({ error: 'unauthorized' });

  const uid = String(q.uid || '');
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(uid)) return res.status(400).json({ error: 'bad uid' });

  const leftAfter = Math.max(15, Math.min(1800, parseInt(process.env.LEFT_AFTER_SEC, 10) || 90));
  try {
    const cols = '*';
    const r = await fetch(`${url}/rest/v1/sessions?select=${cols}&uid=eq.${encodeURIComponent(uid)}&order=updated_at.desc&limit=20`, {
      headers: { apikey: key, Authorization: 'Bearer ' + key },
    });
    if (!r.ok) return res.status(502).json({ error: 'db ' + r.status });
    const rows = await r.json();
    return res.status(200).json(computeWatchState(rows, Date.now(), leftAfter));
  } catch (e) {
    return res.status(502).json({ error: 'db unavailable' });
  }
};
