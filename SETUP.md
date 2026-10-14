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

Tomoshabin 1-kunlik tugma orqali kirib, videoni oxirigacha ko'rmay chiqib ketsa, ~4 daqiqadan keyin
Telegram'ga **bir marta** eslatma boradi. Kunlik 5 ta xabar jadvaliga tegmaydi.

Ishlash tartibi: tashqi taymer har daqiqada `/api/remind` ni chaqiradi → sayt kimdir chiqib ketganini topadi →
Telegram `sendMessage` orqali yuboradi.

## 1. Supabase (bir marta)
SQL Editor → `supabase/migration-reminders.sql` ni to'liq qo'yib **Run**.

## 2. Vercel o'zgaruvchilari
| Nom | Qiymat |
|---|---|
| `TELEGRAM_BOT_TOKEN` | BotFather → /mybots → bot → API Token (faqat shu yerga qo'yiladi, hech kimga yozilmaydi) |
| `REMINDERS_ENABLED` | `1` bo'lsa yuboradi. Bo'sh bo'lsa faqat "sinov rejimi" (hech narsa yubormaydi) |
| `REMIND_AFTER_SEC` | ixtiyoriy, standart 240 (chiqib ketgandan keyin necha soniyada) |
| `REMIND_MAX_PCT` | ixtiyoriy, standart 70 (shundan ko'p ko'rganlarga yuborilmaydi) |
| `REMIND_MAX_AGE_SEC` | ixtiyoriy, standart 3600 (juda eski chiqib ketganlarga yuborilmaydi) |

Qo'shgach **Redeploy**.

## 3. Sinov rejimi
`https://mirkamol-lor-jarroh.vercel.app/api/remind?key=<WATCH_API_KEY>&dry=1`
Javobda `due` ro'yxati: hozir eslatma yuboriladigan odamlar (haqiqatda yuborilmaydi).

## 4. Taymer (Supabase, bitta SQL)
SQL Editor → `supabase/cron-remind.sql` ni qo'yib, `PASTE_WATCH_API_KEY_HERE` o'rniga o'z kalitingizni yozing → **Run**.
Tekshirish: `select * from cron.job;`. To'xtatish: `select cron.unschedule('remind-every-minute');`
(Zaxira yo'l: cron-job.org da har 1 daqiqada `https://mirkamol-lor-jarroh.vercel.app/api/remind?key=<WATCH_API_KEY>`.)

## Qoidalar
- Faqat `?src=tg_bot` (1-kunlik tugma) orqali kirgan va Play bosgan odamga
- Oxirigacha ko'rmagan va 70% gacha (shu jumladan) ko'rgan; 70% dan ko'p ko'rganlarga yuborilmaydi
- Har odamga umr bo'yi **bir marta** (jadval `reminders`)
- Bot bloklangan bo'lsa xato yoziladi, qayta urinilmaydi
