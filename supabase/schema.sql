-- Supabase → SQL Editor ga to'liq qo'yib, Run bosing (bir marta).

create table if not exists public.sessions (
  sid         text primary key,                 -- bitta sahifa ochilishi
  vid         text not null,                    -- brauzer (takroriy kirishlarni ajratish uchun)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  source      text,                             -- utm_source / src / start
  medium      text,
  campaign    text,
  ref         text,                             -- referrer domeni
  device      text,                             -- mobile / desktop
  country     text,
  started     boolean not null default false,   -- Play bosdimi
  ended       boolean not null default false,   -- oxirigacha ko'rdimi
  reached_cta boolean not null default false,   -- tugma chiqqan joyga yetdimi
  cta_clicked boolean not null default false,   -- tugmani bosdimi
  max_sec     integer not null default 0,       -- eng uzoq ko'rgan soniyasi
  duration    integer,                          -- video uzunligi (soniya)
  uid         text                              -- Telegram bot orqali kelgan tomoshabin ID si
);

create index if not exists sessions_created_idx on public.sessions (created_at);
create index if not exists sessions_source_idx  on public.sessions (source);
create index if not exists sessions_uid_idx     on public.sessions (uid);

-- Hamma narsa yopiq: faqat serverdagi (service_role) kalit o'qiy/yoza oladi.
alter table public.sessions enable row level security;

create or replace function public.track_session(
  p_sid text, p_vid text,
  p_source text default null, p_medium text default null, p_campaign text default null,
  p_ref text default null, p_device text default null, p_country text default null,
  p_started boolean default null, p_ended boolean default null,
  p_reached_cta boolean default null, p_cta_clicked boolean default null,
  p_max_sec integer default null, p_duration integer default null,
  p_uid text default null
) returns void
language plpgsql
as $$
begin
  insert into public.sessions as s
    (sid, vid, source, medium, campaign, ref, device, country,
     started, ended, reached_cta, cta_clicked, max_sec, duration, uid)
  values
    (p_sid, p_vid, p_source, p_medium, p_campaign, p_ref, p_device, p_country,
     coalesce(p_started,false), coalesce(p_ended,false),
     coalesce(p_reached_cta,false), coalesce(p_cta_clicked,false),
     coalesce(p_max_sec,0), p_duration, p_uid)
  on conflict (sid) do update set
    started     = s.started     or coalesce(p_started,false),
    ended       = s.ended       or coalesce(p_ended,false),
    reached_cta = s.reached_cta or coalesce(p_reached_cta,false),
    cta_clicked = s.cta_clicked or coalesce(p_cta_clicked,false),
    max_sec     = greatest(s.max_sec, coalesce(p_max_sec,0)),
    duration    = coalesce(p_duration, s.duration),
    uid         = coalesce(s.uid, p_uid),
    updated_at  = now();
end;
$$;

revoke all on function public.track_session from public, anon, authenticated;

-- Serverdagi (service_role) kalit jadval va funksiyadan foydalana olsin
-- ("Automatically expose new tables" o'chirilgan bo'lsa ham ishlaydi).
grant select, insert, update on public.sessions to service_role;
grant execute on function public.track_session to service_role;
