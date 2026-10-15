// Bitta tomoshabin (uid) bo'yicha sessiyalardan "hozir qanday holatda" ekanini aniqlaydi.
// Holatlar: no_visit | on_page | not_started | watching | left | completed
function computeWatchState(rows, now, leftAfterSec) {
  const LEFT = leftAfterSec || 90;
  if (!rows || !rows.length) {
    return { found: false, state: 'no_visit', pct: 0, watched_sec: 0, duration: 0, reached_cta: false, cta_clicked: false, idle_sec: null };
  }
  const dur = Math.max(0, ...rows.map(r => r.duration || 0));
  const maxSec = Math.max(0, ...rows.map(r => (r.watched_sec != null ? r.watched_sec : (r.max_sec || 0))));   // haqiqiy ko'rilgan vaqt
  const started = rows.some(r => r.started);
  const completed = (dur > 0 && maxSec >= dur * 0.9) || rows.some(r => r.ended && r.watched_sec == null);
  const last = rows.reduce((a, b) => (new Date(a.updated_at) > new Date(b.updated_at) ? a : b));
  const idle = Math.max(0, Math.round((now - new Date(last.updated_at).getTime()) / 1000));
  let state;
  if (completed) state = 'completed';
  else if (!started) state = idle <= LEFT ? 'on_page' : 'not_started';
  else state = idle <= LEFT ? 'watching' : 'left';
  return {
    found: true,
    state,
    pct: dur ? Math.min(100, Math.round((maxSec / dur) * 100)) : 0,
    watched_sec: maxSec,
    duration: dur,
    reached_cta: rows.some(r => r.reached_cta),
    cta_clicked: rows.some(r => r.cta_clicked),
    idle_sec: idle,
  };
}
module.exports = { computeWatchState };
