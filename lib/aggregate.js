// Sessiyalar ro'yxatidan statistika hisoblaydi (api/stats.js va demo uchun umumiy).
const sum = a => a.reduce((x, y) => x + y, 0);
const avg = a => (a.length ? sum(a) / a.length : 0);
const median = a => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function group(rows, keyFn, dur) {
  const map = new Map();
  rows.forEach(r => {
    const k = keyFn(r) || '(нет данных)';
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  });
  return [...map.entries()]
    .map(([key, list]) => {
      const st = list.filter(r => r.started);
      return {
        key,
        sessions: list.length,
        started: st.length,
        completed: st.filter(r => isDone(r, dur)).length,
        avgWatch: Math.round(avg(st.map(eff))),
        cta: list.filter(r => r.cta_clicked).length,
      };
    })
    .sort((a, b) => b.sessions - a.sessions);
}

// Haqiqiy ko'rilgan soniyalar (sakrash hisobga olinmaydi). Eski yozuvlarda watched_sec yo'q — ular max_sec ga tayanadi
// (o'sha paytda sakrab bo'lmasdi, shuning uchun max_sec to'g'ri edi).
const DONE_PCT = 0.9;
const eff = r => (r.watched_sec != null ? r.watched_sec : (r.max_sec || 0));
const isDone = (r, dur) => (r.watched_sec != null
  ? dur > 0 && r.watched_sec >= dur * DONE_PCT
  : r.ended || (dur > 0 && (r.max_sec || 0) >= dur - 3));

function aggregate(rows) {
  const dur = Math.max(0, ...rows.map(r => r.duration || 0));
  const started = rows.filter(r => r.started);
  const watch = started.map(eff);
  const completed = started.filter(r => isDone(r, dur));
  const reach = p => (dur ? started.filter(r => eff(r) >= dur * p || isDone(r, dur)).length : 0);

  const maxWatch = Math.max(0, ...watch, dur);
  const nMin = Math.max(1, Math.ceil(maxWatch / 60));
  const leftIn = Array(nMin).fill(0);
  const alive = Array(nMin).fill(0);
  started.forEach(r => {
    const m = Math.min(nMin - 1, Math.floor(eff(r) / 60));
    if (!isDone(r, dur)) leftIn[m]++;
    for (let i = 0; i <= m; i++) alive[i]++;
  });
  const retention = alive.map(n => (started.length ? n / started.length : 0));

  const daily = {};
  rows.forEach(r => {
    const d = String(r.created_at).slice(0, 10);
    daily[d] = daily[d] || { date: d, sessions: 0, started: 0 };
    daily[d].sessions++;
    if (r.started) daily[d].started++;
  });

  return {
    totals: {
      sessions: rows.length,
      visitors: new Set(rows.map(r => r.vid)).size,
      started: started.length,
      completed: completed.length,
      reachedCta: rows.filter(r => r.reached_cta).length,
      ctaClicks: rows.filter(r => r.cta_clicked).length,
      avgWatch: Math.round(avg(watch)),
      medianWatch: Math.round(median(watch)),
      avgPct: dur ? avg(started.map(r => Math.min(1, eff(r) / dur))) : 0,
      duration: dur,
    },
    funnel: [
      { label: 'Зашли на сайт', n: rows.length },
      { label: 'Нажали Play', n: started.length },
      { label: 'Дошли до 25%', n: reach(0.25) },
      { label: 'Дошли до 50%', n: reach(0.5) },
      { label: 'Дошли до 75%', n: reach(0.75) },
      { label: 'Досмотрели до конца', n: completed.length },
      { label: 'Дошли до кнопки', n: rows.filter(r => r.reached_cta).length },
      { label: 'Нажали на кнопку', n: rows.filter(r => r.cta_clicked).length },
    ],
    minutes: { leftIn, retention },
    bySource: group(rows, r => r.source, dur),
    byDevice: group(rows, r => r.device, dur),
    byCountry: group(rows, r => r.country, dur),
    daily: Object.values(daily).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

// Demo: tasodifiy (lekin har safar bir xil) 500 ta sessiya
function demoRows(n = 500) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const dur = 1380;
  const now = Date.now();
  const rows = [];
  for (let i = 0; i < n; i++) {
    const p = rnd();
    const source = p < 0.58 ? 'instagram' : p < 0.86 ? 'tg_bot' : p < 0.9 ? 'tg_bot_reminder' : '';
    const started = rnd() < (source === 'tg_bot' ? 0.78 : 0.6);
    let max = 0, ended = false;
    if (started) {
      max = Math.min(dur, Math.round(-Math.log(1 - rnd()) * 250) + 5);
      if (rnd() < 0.11) { max = dur; ended = true; }
    }
    rows.push({
      sid: 's' + i, vid: 'v' + Math.floor(i * 0.93),
      created_at: new Date(now - Math.floor(rnd() * 6 * 86400000)).toISOString(),
      source, device: rnd() < 0.82 ? 'mobile' : 'desktop', country: rnd() < 0.9 ? 'UZ' : 'RU',
      started, ended, reached_cta: started && max >= 628, cta_clicked: started && max >= 628 && rnd() < 0.35,
      max_sec: max, watched_sec: started ? max : null, duration: started ? dur : null,
    });
  }
  return rows;
}

module.exports = { aggregate, demoRows, eff, isDone };
