-- ============================================================================
-- REV · 003 · Rides, rosters, chat, reports
--
-- Two things here are worth reading closely.
--
-- 1. Meetup precision. A public ride listing that carries exact coordinates
--    tells the internet precisely where a named person will physically be at
--    a stated time. `public.rides` therefore carries only a landmark label and
--    a point snapped to a ~1 km grid. The exact pin lives in
--    `private.ride_secrets` and is released by app.ride_meetup() to the
--    captain and confirmed riders only.
--
-- 2. Capacity. Checking a count and then inserting is a race: two riders can
--    both read 11/12 and both join. Instead the roster trigger does
--    `attendee_count = attendee_count + 1`, which under READ COMMITTED
--    re-reads the row after taking its lock, so concurrent joins serialise.
--    A CHECK constraint then rejects the overflowing transaction outright.
--    O(1), and correct without any advisory locking.
-- ============================================================================

set local search_path = public, extensions, pg_catalog;

-- ----------------------------------------------------------------------------
-- Policy performance: wrapping the uid lookup in a scalar subquery lets the
-- planner hoist it into an InitPlan and evaluate it once per statement rather
-- than once per row. Restated here for the policies written in 002.
-- ----------------------------------------------------------------------------
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated with check (id = (select app.uid()));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select app.uid())) with check (id = (select app.uid()));

drop policy if exists vehicles_write_own on public.vehicles;
create policy vehicles_write_own on public.vehicles
  for insert to authenticated with check (owner_id = (select app.uid()));

drop policy if exists vehicles_update_own on public.vehicles;
create policy vehicles_update_own on public.vehicles
  for update to authenticated
  using (owner_id = (select app.uid())) with check (owner_id = (select app.uid()));

drop policy if exists vehicles_delete_own on public.vehicles;
create policy vehicles_delete_own on public.vehicles
  for delete to authenticated using (owner_id = (select app.uid()));

-- ----------------------------------------------------------------------------
-- rides
-- ----------------------------------------------------------------------------
create table if not exists public.rides (
  id                uuid primary key default gen_random_uuid(),
  captain_id        uuid not null references auth.users (id) on delete cascade,
  mode              public.vehicle_mode not null,
  title             text not null,
  safety_notes      text,
  starts_at         timestamptz not null,
  meetup_label      text not null,
  meetup_area       extensions.geography(Point, 4326) not null,
  destination_label text,
  destination_point extensions.geography(Point, 4326),
  route_path        extensions.geography(LineString, 4326),
  distance_km       numeric(6,1),
  capacity          integer not null,
  attendee_count    integer not null default 0,
  status            public.ride_status not null default 'upcoming',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint title_len    check (char_length(title) between 3 and 80),
  constraint notes_len    check (safety_notes is null or char_length(safety_notes) <= 500),
  constraint capacity_bounds check (capacity between 2 and 60),
  constraint attendees_within_capacity check (attendee_count >= 0 and attendee_count <= capacity),
  constraint distance_sane check (distance_km is null or (distance_km >= 0 and distance_km <= 5000))
);

-- The feed: upcoming rides for a world, soonest first.
create index if not exists rides_feed_idx on public.rides (mode, status, starts_at);
create index if not exists rides_captain_idx on public.rides (captain_id, starts_at desc);
create index if not exists rides_area_gix on public.rides using gist (meetup_area);

drop trigger if exists touch_rides on public.rides;
create trigger touch_rides
  before update on public.rides
  for each row execute function app.touch_updated_at();

alter table public.rides enable row level security;
alter table public.rides force  row level security;

revoke all on public.rides from anon, authenticated;
grant select on public.rides to authenticated;
grant update (title, safety_notes, status) on public.rides to authenticated;
-- Inserts go through app.create_ride() so the exact pin and the captain's
-- roster row are written in the same transaction.

drop policy if exists rides_read on public.rides;
create policy rides_read on public.rides
  for select to authenticated using (true);

drop policy if exists rides_update_captain on public.rides;
create policy rides_update_captain on public.rides
  for update to authenticated
  using (captain_id = (select app.uid()))
  with check (captain_id = (select app.uid()));

-- ----------------------------------------------------------------------------
-- private.ride_secrets — the exact meetup pin
-- ----------------------------------------------------------------------------
create table if not exists private.ride_secrets (
  ride_id      uuid primary key references public.rides (id) on delete cascade,
  meetup_point extensions.geography(Point, 4326) not null
);

alter table private.ride_secrets enable row level security;
alter table private.ride_secrets force  row level security;

-- ----------------------------------------------------------------------------
-- ride_attendees — the roster
-- ----------------------------------------------------------------------------
create table if not exists public.ride_attendees (
  ride_id    uuid not null references public.rides (id) on delete cascade,
  member_id  uuid not null references auth.users (id) on delete cascade,
  status     public.attendee_status not null default 'joined',
  joined_at  timestamptz not null default now(),
  primary key (ride_id, member_id)
);

create index if not exists attendees_member_idx on public.ride_attendees (member_id, joined_at desc);
create index if not exists attendees_roster_idx on public.ride_attendees (ride_id) where status = 'joined';

alter table public.ride_attendees enable row level security;
alter table public.ride_attendees force  row level security;

revoke all on public.ride_attendees from anon, authenticated;
grant select on public.ride_attendees to authenticated;
-- joining and leaving go through functions; no direct write grant.

drop policy if exists attendees_read on public.ride_attendees;
create policy attendees_read on public.ride_attendees
  for select to authenticated using (true);

-- Keeps rides.attendee_count exact under concurrency. See the header note.
create or replace function app.sync_attendee_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_was_on boolean := (tg_op <> 'INSERT') and (old.status = 'joined');
  v_is_on  boolean := (tg_op <> 'DELETE') and (new.status = 'joined');
  v_ride   uuid    := case when tg_op = 'DELETE' then old.ride_id else new.ride_id end;
begin
  if v_is_on and not v_was_on then
    update public.rides set attendee_count = attendee_count + 1 where id = v_ride;
  elsif v_was_on and not v_is_on then
    update public.rides set attendee_count = attendee_count - 1 where id = v_ride;
  end if;
  return null;
end $$;

drop trigger if exists sync_attendee_count on public.ride_attendees;
create trigger sync_attendee_count
  after insert or update or delete on public.ride_attendees
  for each row execute function app.sync_attendee_count();

-- ----------------------------------------------------------------------------
-- ride_messages — chat, readable only by the roster
-- ----------------------------------------------------------------------------
create table if not exists public.ride_messages (
  id         bigserial primary key,
  ride_id    uuid not null references public.rides (id) on delete cascade,
  sender_id  uuid not null references auth.users (id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),

  constraint body_len check (char_length(body) between 1 and 1000)
);

create index if not exists messages_ride_idx on public.ride_messages (ride_id, created_at desc);

alter table public.ride_messages enable row level security;
alter table public.ride_messages force  row level security;

revoke all on public.ride_messages from anon, authenticated;
grant select on public.ride_messages to authenticated;
grant insert (ride_id, sender_id, body) on public.ride_messages to authenticated;

-- Membership test, kept in one place so the policies below cannot drift apart.
create or replace function app.is_on_roster(p_ride uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.ride_attendees a
    where a.ride_id = p_ride
      and a.member_id = app.uid()
      and a.status = 'joined'
  );
$$;

drop policy if exists messages_read_roster on public.ride_messages;
create policy messages_read_roster on public.ride_messages
  for select to authenticated
  using ((select app.is_on_roster(ride_id)));

drop policy if exists messages_write_roster on public.ride_messages;
create policy messages_write_roster on public.ride_messages
  for insert to authenticated
  with check (sender_id = (select app.uid()) and (select app.is_on_roster(ride_id)));

-- ----------------------------------------------------------------------------
-- reports — trust & safety
-- ----------------------------------------------------------------------------
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references auth.users (id) on delete cascade,
  subject_id   uuid references auth.users (id) on delete set null,
  ride_id      uuid references public.rides (id) on delete set null,
  reason       text not null,
  detail       text,
  status       public.report_status not null default 'open',
  created_at   timestamptz not null default now(),

  constraint reason_len check (char_length(reason) between 3 and 60),
  constraint detail_len check (detail is null or char_length(detail) <= 1000),
  constraint no_self_report check (subject_id is null or subject_id <> reporter_id)
);

create index if not exists reports_subject_idx on public.reports (subject_id, created_at desc);
create index if not exists reports_open_idx    on public.reports (status, created_at desc);

alter table public.reports enable row level security;
alter table public.reports force  row level security;

revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;
grant insert (reporter_id, subject_id, ride_id, reason, detail) on public.reports to authenticated;

-- A reporter sees only their own report. Nobody sees who reported them —
-- that is what makes reporting safe to do.
drop policy if exists reports_read_own on public.reports;
create policy reports_read_own on public.reports
  for select to authenticated
  using (reporter_id = (select app.uid()));

drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports
  for insert to authenticated
  with check (reporter_id = (select app.uid()));
