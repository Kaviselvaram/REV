-- ============================================================================
-- REV · 013 · Standing, recognition and the memory layer
--
-- The product principle this encodes: money buys the door, standing is earned
-- inside. Nothing in this migration can be granted by paying. Every recognition
-- mechanic is written by a SECURITY DEFINER function from facts about riding —
-- rides completed, rides led, verification passed — and no client role holds
-- INSERT or UPDATE on any of it.
--
-- Three groups:
--   1. Standing    founding numbers, badges, captain ladder
--   2. Memory      recaps, ride photos, machine milestones
--   3. Identity    the public projection a rider can share
-- ============================================================================

set local search_path = public, extensions, pg_catalog;

-- ----------------------------------------------------------------------------
-- 1 · FOUNDING NUMBERS
--
-- Sequential, gapless, permanent, capped. A sequence would be wrong here:
-- nextval() does not roll back, so a failed transaction burns a number and the
-- gap is visible forever in something members treat as an heirloom. A single
-- counter row updated under its own lock is atomic and gapless.
-- ----------------------------------------------------------------------------
create table if not exists private.founding_window (
  id          boolean primary key default true constraint one_row check (id),
  city        text    not null,
  cap         integer not null,
  issued      integer not null default 0,
  closed_at   timestamptz,
  constraint issued_within_cap check (issued >= 0 and issued <= cap)
);

insert into private.founding_window (city, cap) values ('Chennai', 500)
on conflict (id) do nothing;

alter table private.founding_window enable row level security;
alter table private.founding_window force  row level security;

alter table public.profiles add column if not exists founding_number integer;
alter table public.profiles add column if not exists captain_rank    text;
alter table public.profiles add column if not exists rides_led       integer not null default 0;
alter table public.profiles add column if not exists is_licence_verified boolean not null default false;
alter table public.profiles add column if not exists corridor        text;

do $$ begin
  alter table public.profiles add constraint founding_number_unique unique (founding_number);
exception when duplicate_table or duplicate_object then null; end $$;

-- Issued once, on first verification, to members in the launch city. Returns
-- the number, or null when the window has closed.
create or replace function app.claim_founding_number(p_member uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_num  integer;
  v_city text;
  v_have integer;
begin
  select founding_number, city into v_have, v_city
    from public.profiles where id = p_member;
  if v_have is not null then return v_have; end if;

  -- the UPDATE takes the counter row's lock, so concurrent claims serialise
  update private.founding_window w
     set issued = w.issued + 1,
         closed_at = case when w.issued + 1 >= w.cap then now() else w.closed_at end
   where w.issued < w.cap
     and w.city = v_city
  returning w.issued into v_num;

  if v_num is null then return null; end if;   -- window full, or another city

  update public.profiles set founding_number = v_num where id = p_member;
  perform app.audit('standing.founding_number', 'member', p_member::text,
                    jsonb_build_object('number', v_num));
  return v_num;
end $$;

-- Readable by anyone signed in: the live counter is the scarcity signal.
create or replace function app.founding_status()
returns table (city text, cap integer, issued integer, remaining integer, is_open boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select w.city, w.cap, w.issued, greatest(w.cap - w.issued, 0), w.issued < w.cap
    from private.founding_window w;
$$;

-- ----------------------------------------------------------------------------
-- 2 · BADGES
--
-- A catalogue plus an award ledger. Members hold SELECT and nothing else —
-- there is no code path by which a member awards themselves anything.
-- ----------------------------------------------------------------------------
create table if not exists public.badges (
  code        text primary key,
  label       text not null,
  description text not null,
  kind        text not null,           -- verification | founding | captain | riding
  sort_order  integer not null default 100
);

insert into public.badges (code, label, description, kind, sort_order) values
  ('verified',        'Verified',          'Mobile number verified with REV.',                      'verification', 10),
  ('licence_verified','Licence verified',  'Driving licence and vehicle registration checked.',     'verification', 20),
  ('founding',        'Founding member',   'Among the first members of the launch city.',           'founding',     30),
  ('captain',         'Captain',           'Has led rides for the community.',                      'captain',      40),
  ('founding_captain','Founding captain',  'Led rides during the founding window.',                 'captain',      50),
  ('corridor_regular','Corridor regular',  'Rides a corridor often enough to be a familiar face.',  'riding',       60),
  ('marquee_finisher','Marquee finisher',  'Completed a marquee run.',                              'riding',       70),
  ('first_ride',      'First ride',        'Completed a first ride with REV.',                      'riding',       80),
  ('ten_rides',       'Ten rides',         'Completed ten rides.',                                  'riding',       90),
  ('fifty_rides',     'Fifty rides',       'Completed fifty rides.',                                'riding',      100)
on conflict (code) do update set
  label = excluded.label, description = excluded.description,
  kind = excluded.kind, sort_order = excluded.sort_order;

create table if not exists public.member_badges (
  member_id  uuid not null references auth.users (id) on delete cascade,
  badge_code text not null references public.badges (code) on delete cascade,
  awarded_at timestamptz not null default now(),
  detail     jsonb not null default '{}'::jsonb,
  primary key (member_id, badge_code)
);

create index if not exists member_badges_member_idx on public.member_badges (member_id);

alter table public.badges        enable row level security;
alter table public.badges        force  row level security;
alter table public.member_badges enable row level security;
alter table public.member_badges force  row level security;

revoke all on public.badges        from anon, authenticated;
revoke all on public.member_badges from anon, authenticated;
grant select on public.badges        to authenticated;
grant select on public.member_badges to authenticated;
-- no INSERT/UPDATE/DELETE grant to any client role, by design

drop policy if exists badges_read on public.badges;
create policy badges_read on public.badges for select to authenticated using (true);

drop policy if exists member_badges_read on public.member_badges;
create policy member_badges_read on public.member_badges for select to authenticated using (true);

-- The single place standing is computed. Called after signup, after a ride
-- completes, and by the hourly job. Idempotent.
create or replace function app.recompute_standing(p_member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_done    integer;
  v_led     integer;
  v_prof    public.profiles;
  v_rank    text;
  v_founding boolean;
begin
  select * into v_prof from public.profiles where id = p_member;
  if not found then return; end if;

  select count(*) into v_done
    from public.ride_attendees a join public.rides r on r.id = a.ride_id
   where a.member_id = p_member and a.status = 'joined'
     and app.ride_state(r.status, r.starts_at, r.ends_at) = 'completed';

  select count(*) into v_led
    from public.rides r
   where r.captain_id = p_member
     and app.ride_state(r.status, r.starts_at, r.ends_at) = 'completed';

  -- captain ladder: visible progression earned by leading, not by paying
  v_rank := case
    when v_led >= 25 then 'corridor_legend'
    when v_led >= 10 then 'founding_captain'
    when v_led >= 1  then 'captain'
    else null end;

  update public.profiles
     set rides_count = v_done,
         rides_led   = v_led,
         captain_rank = v_rank
   where id = p_member;

  v_founding := v_prof.founding_number is not null;

  -- award — never revoke riding badges, they record something that happened
  insert into public.member_badges (member_id, badge_code) values
    (p_member, 'verified')
  on conflict do nothing;

  if v_prof.is_licence_verified then
    insert into public.member_badges (member_id, badge_code)
    values (p_member, 'licence_verified') on conflict do nothing;
  end if;

  if v_founding then
    insert into public.member_badges (member_id, badge_code, detail)
    values (p_member, 'founding',
            jsonb_build_object('number', v_prof.founding_number))
    on conflict do nothing;
  end if;

  if v_done >= 1 then
    insert into public.member_badges (member_id, badge_code) values (p_member,'first_ride')
    on conflict do nothing;
  end if;
  if v_done >= 10 then
    insert into public.member_badges (member_id, badge_code) values (p_member,'ten_rides')
    on conflict do nothing;
  end if;
  if v_done >= 50 then
    insert into public.member_badges (member_id, badge_code) values (p_member,'fifty_rides')
    on conflict do nothing;
  end if;
  if v_led >= 1 then
    insert into public.member_badges (member_id, badge_code) values (p_member,'captain')
    on conflict do nothing;
  end if;
  if v_led >= 10 and v_founding then
    insert into public.member_badges (member_id, badge_code) values (p_member,'founding_captain')
    on conflict do nothing;
  end if;
end $$;

-- Replaces the earlier count-only job with one that also recomputes standing.
create or replace function app.recount_rides()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_n integer := 0; m record;
begin
  for m in select id from public.profiles loop
    perform app.recompute_standing(m.id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- ----------------------------------------------------------------------------
-- 3 · MEMORY LAYER — recaps, photos, machine milestones
-- ----------------------------------------------------------------------------
create table if not exists public.recaps (
  ride_id      uuid primary key references public.rides (id) on delete cascade,
  generated_at timestamptz not null default now(),
  distance_km  numeric(6,1),
  rider_count  integer not null default 0,
  note         text,
  constraint note_len check (note is null or char_length(note) <= 500)
);

alter table public.recaps enable row level security;
alter table public.recaps force  row level security;
revoke all on public.recaps from anon, authenticated;
grant select on public.recaps to authenticated;
grant update (note) on public.recaps to authenticated;

drop policy if exists recaps_read on public.recaps;
create policy recaps_read on public.recaps for select to authenticated using (true);

-- only the captain may write the recap note
drop policy if exists recaps_note_captain on public.recaps;
create policy recaps_note_captain on public.recaps
  for update to authenticated
  using (exists (select 1 from public.rides r
                  where r.id = recaps.ride_id and r.captain_id = (select app.uid())))
  with check (exists (select 1 from public.rides r
                       where r.id = recaps.ride_id and r.captain_id = (select app.uid())));

create table if not exists public.ride_photos (
  id           uuid primary key default gen_random_uuid(),
  ride_id      uuid not null references public.rides (id) on delete cascade,
  member_id    uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  caption      text,
  created_at   timestamptz not null default now(),
  constraint caption_len check (caption is null or char_length(caption) <= 140)
);

create index if not exists ride_photos_ride_idx on public.ride_photos (ride_id, created_at desc);

alter table public.ride_photos enable row level security;
alter table public.ride_photos force  row level security;
revoke all on public.ride_photos from anon, authenticated;
grant select on public.ride_photos to authenticated;
grant insert (ride_id, member_id, storage_path, caption) on public.ride_photos to authenticated;
grant delete on public.ride_photos to authenticated;

-- the gallery belongs to the people who were actually on the ride
drop policy if exists ride_photos_read_roster on public.ride_photos;
create policy ride_photos_read_roster on public.ride_photos
  for select to authenticated
  using ((select app.is_on_roster(ride_id)));

drop policy if exists ride_photos_add_roster on public.ride_photos;
create policy ride_photos_add_roster on public.ride_photos
  for insert to authenticated
  with check (member_id = (select app.uid()) and (select app.is_on_roster(ride_id)));

drop policy if exists ride_photos_delete_own on public.ride_photos;
create policy ride_photos_delete_own on public.ride_photos
  for delete to authenticated
  using (member_id = (select app.uid()));

-- A machine's own story: what it has done, in order.
create table if not exists public.machine_milestones (
  id         uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  ride_id    uuid references public.rides (id) on delete set null,
  kind       text not null,             -- ride | distance | marquee | joined
  label      text not null,
  at         timestamptz not null default now(),
  detail     jsonb not null default '{}'::jsonb
);

create index if not exists milestones_vehicle_idx on public.machine_milestones (vehicle_id, at desc);

alter table public.machine_milestones enable row level security;
alter table public.machine_milestones force  row level security;
revoke all on public.machine_milestones from anon, authenticated;
grant select on public.machine_milestones to authenticated;

drop policy if exists milestones_read on public.machine_milestones;
create policy milestones_read on public.machine_milestones
  for select to authenticated using (true);

-- Creates the recap for a completed ride and writes each rider's machine a
-- milestone. Idempotent — safe to call repeatedly.
create or replace function app.ensure_recap(p_ride uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare r public.rides; a record; v_vehicle uuid;
begin
  select * into r from public.rides where id = p_ride;
  if not found then return; end if;
  if app.ride_state(r.status, r.starts_at, r.ends_at) <> 'completed' then return; end if;

  insert into public.recaps (ride_id, distance_km, rider_count)
  values (p_ride, r.distance_km,
          (select count(*) from public.ride_attendees x
            where x.ride_id = p_ride and x.status = 'joined'))
  on conflict (ride_id) do update
    set rider_count = excluded.rider_count, distance_km = excluded.distance_km;

  for a in select member_id from public.ride_attendees
            where ride_id = p_ride and status = 'joined' loop
    select id into v_vehicle from public.vehicles
      where owner_id = a.member_id and mode = r.mode and is_primary limit 1;

    if v_vehicle is not null then
      insert into public.machine_milestones (vehicle_id, ride_id, kind, label, at, detail)
      select v_vehicle, p_ride, 'ride', r.title, r.starts_at,
             jsonb_build_object('distance_km', r.distance_km)
      where not exists (
        select 1 from public.machine_milestones m
         where m.vehicle_id = v_vehicle and m.ride_id = p_ride);
    end if;

    perform app.recompute_standing(a.member_id);
  end loop;
end $$;

-- Sweeps rides that have just finished. Runs on the same hourly schedule.
create or replace function app.close_finished_rides()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare n integer := 0; r record;
begin
  for r in
    select id from public.rides
     where app.ride_state(status, starts_at, ends_at) = 'completed'
       and id not in (select ride_id from public.recaps)
  loop
    perform app.ensure_recap(r.id);
    n := n + 1;
  end loop;
  return n;
end $$;

-- ----------------------------------------------------------------------------
-- 4 · PUBLIC IDENTITY PROJECTION
--
-- One call returns everything the shareable rider page needs. It is a function
-- rather than a view so the shape is explicit and so nothing outside this list
-- can ever be selected — no phone, no date of birth, no home location.
-- ----------------------------------------------------------------------------
create or replace function app.rider_identity(p_handle text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'handle',          p.handle,
    'display_name',    p.display_name,
    'city',            p.city,
    'corridor',        p.corridor,
    'bio',             p.bio,
    'avatar_path',     p.avatar_path,
    'is_verified',     p.is_verified,
    'licence_verified',p.is_licence_verified,
    'founding_number', p.founding_number,
    'captain_rank',    p.captain_rank,
    'rides_count',     p.rides_count,
    'rides_led',       p.rides_led,
    'member_since',    p.created_at,
    'badges', coalesce((
      select jsonb_agg(jsonb_build_object(
               'code', b.code, 'label', b.label,
               'description', b.description, 'kind', b.kind,
               'detail', mb.detail, 'awarded_at', mb.awarded_at)
             order by b.sort_order)
        from public.member_badges mb join public.badges b on b.code = mb.badge_code
       where mb.member_id = p.id), '[]'::jsonb),
    'machines', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', v.id, 'mode', v.mode, 'make', v.make, 'model', v.model,
               'year', v.year, 'extra', v.extra, 'mods', v.mods,
               'ride_style', v.ride_style, 'photos', v.photo_paths,
               'milestones', coalesce((
                  select jsonb_agg(jsonb_build_object(
                           'kind', m.kind, 'label', m.label, 'at', m.at, 'detail', m.detail)
                         order by m.at desc)
                    from public.machine_milestones m where m.vehicle_id = v.id), '[]'::jsonb))
             order by v.is_primary desc, v.created_at)
        from public.vehicles v where v.owner_id = p.id), '[]'::jsonb)
  )
  from public.profiles p
  where p.handle = lower(p_handle);
$$;

-- ----------------------------------------------------------------------------
-- 5 · WIRE STANDING INTO SIGNUP
-- ----------------------------------------------------------------------------
create or replace function app.complete_signup(
  p_handle text, p_display_name text, p_city text, p_dob date,
  p_consent_version text default '1.0'
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.uid();
  v_row public.profiles;
  v_confirmed timestamptz;
begin
  if v_uid is null then raise exception 'Not authenticated.' using errcode = '42501'; end if;
  if p_dob is null or p_dob > (current_date - interval '18 years')::date then
    raise exception 'You must be 18 or older to join REV.' using errcode = '23514';
  end if;

  select u.phone_confirmed_at into v_confirmed from auth.users u where u.id = v_uid;

  insert into public.profiles (id, handle, display_name, city)
  values (v_uid, lower(p_handle), p_display_name, p_city)
  returning * into v_row;

  if v_confirmed is not null then
    update public.profiles set is_verified = true where id = v_uid;
    -- verification is what opens the founding window, never payment
    perform app.claim_founding_number(v_uid);
  end if;

  insert into private.member_private (member_id, date_of_birth)
  values (v_uid, p_dob) on conflict (member_id) do nothing;

  insert into private.consent_ledger (member_id, document, version)
  values (v_uid, 'terms', p_consent_version), (v_uid, 'privacy', p_consent_version);

  perform app.recompute_standing(v_uid);

  perform app.audit('member.signup', 'member', v_uid::text,
                    jsonb_build_object('handle', lower(p_handle), 'city', p_city));

  select * into v_row from public.profiles where id = v_uid;
  return v_row;
end $$;

-- ----------------------------------------------------------------------------
-- 6 · PUBLIC ENTRY POINTS
-- ----------------------------------------------------------------------------
create or replace function public.rider_identity(p_handle text)
returns jsonb
language sql security invoker set search_path = ''
as $$ select app.rider_identity(p_handle) $$;

create or replace function public.founding_status()
returns table (city text, cap integer, issued integer, remaining integer, is_open boolean)
language sql security invoker set search_path = ''
as $$ select * from app.founding_status() $$;

create or replace function public.add_ride_photo(
  p_ride uuid, p_path text, p_caption text default null
)
returns public.ride_photos
language plpgsql security invoker set search_path = ''
as $$
declare v public.ride_photos;
begin
  insert into public.ride_photos (ride_id, member_id, storage_path, caption)
  values (p_ride, app.uid(), p_path, p_caption)
  returning * into v;
  return v;
end $$;

do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('rider_identity','founding_status','add_ride_photo')
  loop
    execute format('revoke all on function %s from public, anon', fn.sig);
    execute format('grant execute on function %s to authenticated', fn.sig);
  end loop;
end $$;

grant execute on function app.rider_identity(text)        to authenticated;
grant execute on function app.founding_status()           to authenticated;
grant execute on function app.recompute_standing(uuid)    to authenticated;
grant execute on function app.ride_state(public.ride_status, timestamptz, timestamptz) to authenticated;
