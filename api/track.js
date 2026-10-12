// POST /api/track — saytdan kelgan hodisalarni Supabase ga yozadi.
const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '') || null;
const int = (v, max) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : null;
};
const flag = v => (v === true ? true : null);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(500).end();

  if (/bot|crawl|spider|preview|facebookexternalhit|headless/i.test(req.headers['user-agent'] || '')) {
    return res.status(204).end();
  }

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).end();

  const id = /^[A-Za-z0-9-]{8,64}$/;
  if (!id.test(b.sid || '') || !id.test(b.vid || '')) return res.status(400).end();

  const args = {
    p_sid: b.sid,
    p_vid: b.vid,
    p_source: clip(b.source, 64),
    p_medium: clip(b.medium, 64),
    p_campaign: clip(b.campaign, 64),
    p_ref: clip(b.ref, 128),
    p_device: b.device === 'mobile' ? 'mobile' : 'desktop',
    p_country: clip(req.headers['x-vercel-ip-country'], 2),
    p_started: flag(b.started),
    p_ended: flag(b.ended),
    p_reached_cta: flag(b.reached_cta),
    p_cta_clicked: flag(b.cta_clicked),
    p_max_sec: int(b.max_sec, 86400),
    p_duration: int(b.duration, 86400),
  };

  try {
    const r = await fetch(url + '/rest/v1/rpc/track_session', {
      method: 'POST',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    return res.status(r.ok ? 204 : 502).end();
  } catch (e) {
    return res.status(502).end();
  }
};
