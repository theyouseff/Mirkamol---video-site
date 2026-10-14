// Eslatma yuborilishi kerak bo'lgan tomoshabinlarni aniqlaydi (sof funksiya, testlash oson).
// Qoida: 1-kunlik tugma (src=tg_bot) orqali kirgan, videoni boshlagan, oxirigacha ko'rmagan,
// oxirgi signaldan beri >= afterSec o'tgan (lekin <= maxAgeSec), 95% dan kam ko'rgan.
function pickDue(rows, now, opts) {
  const o = Object.assign({ afterSec: 240, maxAgeSec: 3600, maxPct: 95 }, opts || {});
  const byUid = new Map();
  rows.forEach(r => {
    if (!r.uid) return;
    if (!byUid.has(r.uid)) byUid.set(r.uid, []);
    byUid.get(r.uid).push(r);
  });
  const due = [];
  byUid.forEach((list, uid) => {
    if (!/^\d{1,15}$/.test(uid)) return;                       // Telegram ID raqam bo'lishi shart
    if (!list.some(r => r.source === 'tg_bot')) return;        // 1-kunlik tugma orqali kirgan
    if (!list.some(r => r.started)) return;                    // Play bosgan
    const dur = Math.max(0, ...list.map(r => r.duration || 0));
    const maxSec = Math.max(0, ...list.map(r => r.max_sec || 0));
    const completed = list.some(r => r.ended) || (dur > 0 && maxSec >= dur - 3);
    if (completed) return;
    const pct = dur ? Math.round((maxSec / dur) * 100) : 0;
    if (pct >= o.maxPct) return;
    const last = Math.max(...list.map(r => new Date(r.updated_at).getTime()));
    const idle = Math.round((now - last) / 1000);
    if (idle < o.afterSec || idle > o.maxAgeSec) return;
    due.push({ uid, pct, idle_sec: idle });
  });
  return due;
}

const REMINDER_TEXT = [
  'Eng muhim joyida nega chiqib ketdingiz? 🙂',
  '',
  'Aynan o\'sha paytda real bemorning MSKT\'sida peshona cho\'ntagidagi katakchalarni "building block" usulida birma-bir ajratib, katakchani peshona bo\'shlig\'idan qanday farqlashni ko\'rsatayotgan edim.',
  '',
  'Operatsiya stolida bo\'shliqni qidirib vaqt yo\'qotmaslik uchun aynan shu qism kerak.',
  '',
  '⏳ Bu darsni ko\'rish imkoniyati yaqin kunlarda bo\'lmasligi mumkin.',
  '',
  'Imkoniyatni qo\'ldan boy bermang.',
  '',
  '🎬 Videoni davom ettirish uchun tugmani bosing 👇',
].join('\n');

module.exports = { pickDue, REMINDER_TEXT };
