# Подключение статистики (Supabase + Vercel)

## 1. Supabase
1. supabase.com → создать аккаунт → **New project** (регион, например Frankfurt, и пароль базы).
2. Слева **SQL Editor** → **New query** → вставить весь файл `supabase/schema.sql` → **Run**.
3. **Project Settings → API**: скопировать **Project URL** и **service_role** key (секретный, никому не показывать).

## 2. Vercel
Project → **Settings → Environment Variables** → добавить три переменные (для Production и Preview):

| Имя | Значение |
|---|---|
| `SUPABASE_URL` | Project URL из Supabase |
| `SUPABASE_SERVICE_KEY` | service_role key |
| `STATS_PASSWORD` | любой пароль для страницы статистики |

Затем **Deployments → … → Redeploy** (переменные применяются только после нового деплоя).

## 3. Проверка
- `https://ВАШ-САЙТ/stats?demo=1` — страница с демо-данными (работает без базы).
- `https://ВАШ-САЙТ/stats` — реальная статистика, спросит пароль.
- Откройте сайт со своей ссылкой, обновите `/stats`: должен появиться 1 заход.

## Ссылки с метками источника
- Instagram → `https://ВАШ-САЙТ/?src=instagram`
- Telegram-бот → `https://ВАШ-САЙТ/?src=tg_bot`
(можно также `utm_source`, `utm_medium`, `utm_campaign`)

## Что считается
Заход, нажатие Play, самая дальняя секунда просмотра (отправляется каждые 5 секунд и при закрытии страницы), досмотр до конца, дошёл до кнопки (`REVEAL_AT`), клик по кнопке, источник, устройство, страна. IP-адреса не хранятся.

---

# Telegram-bot bilan bog'lash (ko'rib chiqib ketganlarga eslatma)

Bot tugma ssilkasiga tomoshabin ID sini qo'shadi: `https://mirkamol-lor-jarroh.vercel.app/?src=tg_bot&uid={{clientId}}`
Sayt `uid` ni saqlaydi, ChatPlace esa `GET /api/watch` orqali holatni so'raydi.

## 1. Supabase (bir marta)
SQL Editor → `supabase/migration-uid.sql` ni to'liq qo'yib **Run** (mavjud loyiha uchun). Yangi loyiha uchun `schema.sql` yetarli.

## 2. Vercel o'zgaruvchisi
| Nom | Qiymat |
|---|---|
| `WATCH_API_KEY` | uzun tasodifiy parol (ChatPlace shuni yuboradi) |
| `LEFT_AFTER_SEC` | ixtiyoriy, standart 90: shuncha soniya signal bo'lmasa "ketdi" hisoblanadi |

Qo'shgach **Redeploy**.

## 3. ChatPlace so'rovi
`GET https://mirkamol-lor-jarroh.vercel.app/api/watch?uid={{clientId}}` + sarlavha `x-api-key: <WATCH_API_KEY>`

Javob (JSON): `state`, `pct` (0–100), `watched_sec`, `duration`, `reached_cta`, `cta_clicked`, `idle_sec`.

`state` qiymatlari:
- `no_visit` — saytni umuman ochmagan
- `on_page` — ochdi, hali Play bosmagan, hozir sahifada
- `not_started` — ochdi, Play bosmadi va ketdi
- `watching` — hozir ko'ryapti
- `left` — boshladi, oxirigacha ko'rmadi va ketdi  ← eslatma shu holatda yuboriladi
- `completed` — oxirigacha ko'rdi

---

# Eslatma: videoni ko'rib chiqib ketganlarga (sayt o'zi yuboradi)

Tomoshabin 1-kunlik tugma orqali kirib, videoni oxirigacha ko'rmay (70% gacha ko'rgan holda) chiqib ketsa,
~4 daqiqadan keyin Telegram'ga **bir marta** eslatma boradi. Kunlik 5 ta xabar jadvaliga tegmaydi.

## Ishga tushirish (3 qadam)
1. **Vercel → Environment Variables:** `TELEGRAM_BOT_TOKEN` (BotFather → /mybots → bot → API Token). Redeploy.
2. **Sinov:** `https://mirkamol-lor-jarroh.vercel.app/api/remind?key=<WATCH_API_KEY>&dry=1` — xato bo'lmasligi kerak.
3. **Supabase → SQL Editor:** `supabase/setup-reminders.sql` ni qo'yib, `PASTE_WATCH_API_KEY_HERE` ni almashtirib **Run**.
   Taymer shundan keyin ishlay boshlaydi (eslatmalar ketadi).

O'chirish: Vercel'da `REMINDERS_ENABLED=0`, yoki Supabase'da `select cron.unschedule('remind-every-minute');`

## Sozlamalar (ixtiyoriy, Vercel o'zgaruvchilari)
| Nom | Standart |
|---|---|
| `REMIND_AFTER_SEC` | 240 (chiqib ketgandan keyin necha soniyada) |
| `REMIND_MAX_PCT` | 70 (shundan ko'p ko'rganlarga yuborilmaydi) |
| `REMIND_MAX_AGE_SEC` | 3600 (juda eski chiqib ketganlarga yuborilmaydi) |

## Qoidalar
- Faqat `?src=tg_bot` (1-kunlik tugma) orqali kirgan va Play bosgan odamga
- Oxirigacha ko'rmagan va 70% gacha (shu jumladan) ko'rgan
- Har odamga umr bo'yi **bir marta** (jadval `reminders`); bot bloklangan bo'lsa xato yoziladi, qayta urinilmaydi
- Zaxira taymer: cron-job.org da har 1 daqiqada `https://mirkamol-lor-jarroh.vercel.app/api/remind?key=<WATCH_API_KEY>`

---

# Haqiqiy ko'rilgan vaqt (sakrashdan keyin to'g'ri statistika)

Progress barni sudrab sakrash mumkin bo'lgani uchun "qancha ko'rdi" endi **haqiqatan o'ynalgan noyob soniyalar** bo'yicha hisoblanadi (`watched_sec`).
`max_sec` (eng uzoq joy) saqlanadi, lekin o'rtacha vaqt, voronka (25/50/75%), "oxirigacha ko'rdi" (90%+) va eslatma `watched_sec` ga tayanadi.
Eski yozuvlar (sakrash imkoni bo'lmagan davrdagi) `max_sec` bilan hisoblanaveradi.

**Bir marta:** Supabase → SQL Editor → `supabase/migration-watched.sql` ni to'liq qo'yib **Run**.
(Bajarilmaguncha sayt eskicha ishlayveradi, hech narsa buzilmaydi; faqat yangi ko'rsatkich yozilmaydi.)
