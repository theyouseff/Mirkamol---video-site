-- Eslatmalar jadvali: har bir tomoshabinga eslatma BIR MARTA yuboriladi.
-- SQL Editor ga to'liq qo'yib, Run bosing (bir marta).

create table if not exists public.reminders (
  uid     text primary key,                      -- Telegram ID
  sent_at timestamptz not null default now(),
  result  text                                   -- ok yoki xato sababi
);

alter table public.reminders enable row level security;
grant select, insert, update on public.reminders to service_role;
