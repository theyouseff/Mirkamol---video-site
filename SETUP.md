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
