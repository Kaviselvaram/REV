-- ============================================================================
-- REV · 011 · Lifecycle fixes
--
-- Three things the schema declared but never actually did. Each was silent —
-- nothing errored, the feature simply could not happen:
--
--   1. No ride ever left 'upcoming'. The "Live now" and "Completed" filters
--      could never populate and a recap was unreachable.
--   2. profiles.rides_count never moved off zero, so a trust signal shown on
--      every roster was permanently false.
--   3. is_verified was never set true, so nobody was ever verified — in a
--      product whose entire promise is that everyone is.
--
-- Ride state is DERIVED from the clock rather than written by a job. A stored
-- status needs something to update it, and anything that updates it can lag,
-- drift, or fail; a derived one is correct at the instant it is read, costs a
-- comparison, and cannot go stale. The stored column now only records the
-- states a human actually chooses: upcoming, or cancelled.
-- ============================================================================

set local search_path = public, extensions, pg_catalog;

-- Captains can say when a ride ends; until they do, assume six hours.
alter table public.rides add column if not exists ends_at timestamptz;

create or replace function app.ride_state(
  p_status public.ride_status, p_starts_at timestamptz, p_ends_at timestamptz
)
returns public.ride_status
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_status = 'cancelled' then 'cancelled'::public.ride_status
    when now() >= coalesce(p_ends_at, p_starts_at + interval '6 hours')
      then 'completed'::public.ride_status
    when now() >= p_starts_at then 'live'::public.ride_status
    else 'upcoming'::public.ride_status
  end;
$$;

grant execute on function app.ride_state(public.ride_status, timestamptz, timestamptz)
  to authenticated;

-- The feed view now reports the derived state.
create or replace view public.ride_feed
with (security_invoker = true)
as
select
  r.id,
  r.captain_id,
  r.mode,
  r.title,
  r.safety_notes,
  r.starts_at,
  r.ends_at,
  r.meetup_label,
  extensions.ST_Y(r.meetup_area::extensions.geometry)       as meetup_lat,
  extensions.ST_X(r.meetup_area::extensions.geometry)       as meetup_lng,
  r.destination_label,
  extensions.ST_Y(r.destination_point::extensions.geometry) as dest_lat,
  extensions.ST_X(r.destination_point::extensions.geometry) as dest_lng,
  case when r.route_path is null then null else (
    select jsonb_agg(jsonb_build_array(
             extensions.ST_Y(p.geom), extensions.ST_X(p.geom)) order by p.path)
      from extensions.ST_DumpPoints(r.route_path::extensions.geometry) as p
  ) end as route,
  r.distance_km,
  r.capacity,
  r.attendee_count,
  app.ride_state(r.status, r.starts_at, r.ends_at) as status,
  r.status as authored_status,
  r.created_at
from public.rides r;

revoke all on public.ride_feed from anon, authenticated;
grant select on public.ride_feed to authenticated;

-- ----------------------------------------------------------------------------
-- Verification. Reaching complete_signup means the one-time password on that
-- number was answered, so the member is phone-verified by definition. Licence
-- and registration checks are a separate, higher tier added later.
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
  if v_uid is null then
    raise exception 'Not authenticated.' using errcode = '42501';
  end if;
  if p_dob is null or p_dob > (current_date - interval '18 years')::date then
    raise exception 'You must be 18 or older to join REV.' using errcode = '23514';
  end if;

  select u.phone_confirmed_at into v_confirmed from auth.users u where u.id = v_uid;

  insert into public.profiles (id, handle, display_name, city)
  values (v_uid, lower(p_handle), p_display_name, p_city)
  returning * into v_row;

  -- set past the guard trigger, which refuses client-supplied trust flags
  if v_confirmed is not null then
    update public.profiles set is_verified = true where id = v_uid;
    v_row.is_verified := true;
  end if;

  insert into private.member_private (member_id, date_of_birth)
  values (v_uid, p_dob) on conflict (member_id) do nothing;

  insert into private.consent_ledger (member_id, document, version)
  values (v_uid, 'terms', p_consent_version), (v_uid, 'privacy', p_consent_version);

  perform app.audit('member.signup', 'member', v_uid::text,
                    jsonb_build_object('handle', lower(p_handle), 'city', p_city));
  return v_row;
end $$;

-- The guard trigger must let a SECURITY DEFINER function set trust flags while
-- still refusing them from a client. session_user is the real logged-in role,
-- which stays `authenticated` for a member and `postgres` inside our own
-- definer functions — so it distinguishes the two without a magic flag.
create or replace function app.guard_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from private.reserved_handles r where r.handle = new.handle) then
    raise exception 'That handle is reserved.' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    if session_user in ('anon', 'authenticated') and (
         new.is_verified is distinct from old.is_verified
      or new.rides_count is distinct from old.rides_count
      or new.id          is distinct from old.id
      or new.created_at  is distinct from old.created_at) then
      raise exception 'That field is managed by REV.' using errcode = '42501';
    end if;
  elsif tg_op = 'INSERT' then
    if session_user in ('anon', 'authenticated') then
      new.is_verified := false;
      new.rides_count := 0;
    end if;
  end if;

  return new;
end $$;

-- ----------------------------------------------------------------------------
-- rides_count. Recomputed rather than incremented: a counter that is added to
-- can drift and has no way to notice, while a recount is self-correcting and,
-- at community scale, cheap. Runs hourly and only touches rows that changed.
-- ----------------------------------------------------------------------------
create or replace function app.recount_rides()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_n integer;
begin
  with truth as (
    select a.member_id, count(*)::int as n
      from public.ride_attendees a
      join public.rides r on r.id = a.ride_id
     where a.status = 'joined'
       and app.ride_state(r.status, r.starts_at, r.ends_at) = 'completed'
     group by a.member_id
  )
  update public.profiles p
     set rides_count = coalesce(t.n, 0)
    from (select p2.id, coalesce(t2.n, 0) as n
            from public.profiles p2 left join truth t2 on t2.member_id = p2.id) t
   where p.id = t.id and p.rides_count is distinct from t.n;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('rev-recount-rides');
  end if;
exception when others then null;
end $$;

create extension if not exists pg_cron;

select cron.schedule('rev-recount-rides', '7 * * * *', 'select app.recount_rides()');

select app.recount_rides() as profiles_corrected;
