-- Haqiqiy ko'rilgan vaqt (sakrash hisobga olinmaydi). Supabase -> SQL Editor ga to'liq qo'yib Run bosing (bir marta).
-- Eski yozuvlar o'zgarmaydi (ular max_sec ga tayanadi).

alter table public.sessions add column if not exists watched_sec integer;   -- uzluksiz ko'rilgan noyob soniyalar

-- eski funksiyani olib tashlaymiz (aks holda ikkita variant bo'lib qoladi)
drop function if exists public.track_session(text,text,text,text,text,text,text,text,boolean,boolean,boolean,boolean,integer,integer,text);

create or replace function public.track_session(
  p_sid text, p_vid text,
  p_source text default null, p_medium text default null, p_campaign text default null,
  p_ref text default null, p_device text default null, p_country text default null,
  p_started boolean default null, p_ended boolean default null,
  p_reached_cta boolean default null, p_cta_clicked boolean default null,
  p_max_sec integer default null, p_duration integer default null,
  p_uid text default null, p_watched_sec integer default null
) returns void
language plpgsql
as $$
begin
  insert into public.sessions as s
    (sid, vid, source, medium, campaign, ref, device, country,
     started, ended, reached_cta, cta_clicked, max_sec, duration, uid, watched_sec)
  values
    (p_sid, p_vid, p_source, p_medium, p_campaign, p_ref, p_device, p_country,
     coalesce(p_started,false), coalesce(p_ended,false),
     coalesce(p_reached_cta,false), coalesce(p_cta_clicked,false),
     coalesce(p_max_sec,0), p_duration, p_uid, p_watched_sec)
  on conflict (sid) do update set
    started     = s.started     or coalesce(p_started,false),
    ended       = s.ended       or coalesce(p_ended,false),
    reached_cta = s.reached_cta or coalesce(p_reached_cta,false),
    cta_clicked = s.cta_clicked or coalesce(p_cta_clicked,false),
    max_sec     = greatest(s.max_sec, coalesce(p_max_sec,0)),
    watched_sec = case when p_watched_sec is null then s.watched_sec
                       else greatest(coalesce(s.watched_sec,0), p_watched_sec) end,
    duration    = coalesce(p_duration, s.duration),
    uid         = coalesce(s.uid, p_uid),
    updated_at  = now();
end;
$$;

revoke all on function public.track_session from public, anon, authenticated;
grant execute on function public.track_session to service_role;
