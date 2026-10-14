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
