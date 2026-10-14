-- ESLATMA UCHUN BITTA SQL (Supabase → SQL Editor ga to'liq qo'yib Run bosing).
-- FAQAT bitta joyni almashtiring:  PASTE_WATCH_API_KEY_HERE  →  Vercel'dagi WATCH_API_KEY qiymati
-- (qo'shtirnoq ichida qolsin, bo'sh joy qoldirmang)

-- 1) Eslatmalar jadvali: har odamga bir marta
create table if not exists public.reminders (
  uid     text primary key,
  sent_at timestamptz not null default now(),
  result  text
);
alter table public.reminders enable row level security;
grant select, insert, update on public.reminders to service_role;

-- 2) Taymer: har daqiqada saytdagi /api/remind ni chaqiradi
create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.schedule(
  'remind-every-minute',
  '* * * * *',
  $$ select net.http_get(
       url := 'https://mirkamol-lor-jarroh.vercel.app/api/remind?key=PASTE_WATCH_API_KEY_HERE',
       timeout_milliseconds := 20000
     ); $$
);

-- Tekshirish:  select jobname, schedule, active from cron.job;
-- To'xtatish:  select cron.unschedule('remind-every-minute');
