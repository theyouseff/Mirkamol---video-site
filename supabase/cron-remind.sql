-- Eslatma taymeri: Supabase har daqiqada saytdagi /api/remind ni chaqiradi.
-- SQL Editor ga to'liq qo'yib Run bosing. FAQAT bitta joyni almashtiring:
-- PASTE_WATCH_API_KEY_HERE  ->  Vercel'dagi WATCH_API_KEY qiymati (qo'shtirnoqlar ichida qolsin)

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

-- Tekshirish:  select * from cron.job;
-- To'xtatish:  select cron.unschedule('remind-every-minute');
