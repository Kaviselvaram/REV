-- ============================================================================
-- REV · 004 · Operations — the only writes a client is allowed to perform
--
-- Postgres grants EXECUTE on new functions to PUBLIC by default. Left alone
-- that would let any caller invoke app.audit() or app.rate_limit() directly
-- and forge log entries or reset their own limits. So: revoke everything in
-- `app` from PUBLIC first, then grant back exactly the entry points a member
-- is meant to call.
-- ============================================================================

set local search_path = public, extensions, pg_catalog;

-- ----------------------------------------------------------------------------
-- Signup — profile, private data and consent proof in one transaction
-- ----------------------------------------------------------------------------
create or replace function app.complete_signup(
  p_handle          text,
  p_display_name    text,
  p_city            text,
  p_dob             date,
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
begin
  if v_uid is null then
    raise exception 'Not authenticated.' using errcode = '42501';
  end if;

  if p_dob is null or p_dob > (current_date - interval '18 years')::date then
    raise exception 'You must be 18 or older to join REV.' using errcode = '23514';
  end if;

  insert into public.profiles (id, handle, display_name, city)
  values (v_uid, lower(p_handle), p_display_name, p_city)
  returning * into v_row;

  insert into private.member_private (member_id, date_of_birth)
  values (v_uid, p_dob)
  on conflict (member_id) do nothing;

  -- DPDP: keep provable evidence of what was agreed, and when.
  insert into private.consent_ledger (member_id, document, version)
  values (v_uid, 'terms', p_consent_version), (v_uid, 'privacy', p_consent_version);

  perform app.audit('member.signup', 'member', v_uid::text,
                    jsonb_build_object('handle', lower(p_handle), 'city', p_city));
  return v_row;
end $$;

-- ----------------------------------------------------------------------------
-- Create a ride
-- ----------------------------------------------------------------------------
create or replace function app.create_ride(
  p_mode              public.vehicle_mode,
  p_title             text,
  p_starts_at         timestamptz,
  p_meetup_label      text,
  p_meetup_lat        double precision,
  p_meetup_lng        double precision,
  p_capacity          integer,
  p_safety_notes      text default null,
  p_destination_label text default null,
  p_dest_lat          double precision default null,
  p_dest_lng          double precision default null,
  p_route             jsonb default null,      -- [[lat, lng], ...]
  p_distance_km       numeric default null
)
returns public.rides
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := app.uid();
  v_ride  public.rides;
  v_exact extensions.geography;
  v_line  extensions.geography;
begin
  if v_uid is null then
    raise exception 'Not authenticated.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_uid) then
    raise exception 'Finish creating your profile first.' using errcode = '42501';
  end if;

  perform app.rate_limit('create_ride', 10, interval '1 hour');

  if p_starts_at <= now() then
    raise exception 'A ride must start in the future.' using errcode = '23514';
  end if;
  if p_meetup_lat is null or p_meetup_lng is null
     or p_meetup_lat not between -90 and 90
     or p_meetup_lng not between -180 and 180 then
    raise exception 'Invalid meetup coordinates.' using errcode = '23514';
  end if;

  v_exact := extensions.ST_SetSRID(
               extensions.ST_MakePoint(p_meetup_lng, p_meetup_lat), 4326)::extensions.geography;

  if p_route is not null and jsonb_array_length(p_route) > 1 then
    select extensions.ST_SetSRID(
             extensions.ST_MakeLine(
               array_agg(extensions.ST_MakePoint((e->>1)::double precision,
                                                 (e->>0)::double precision) order by ord)), 4326
           )::extensions.geography
      into v_line
      from jsonb_array_elements(p_route) with ordinality as t(e, ord);
  end if;

  insert into public.rides (
    captain_id, mode, title, safety_notes, starts_at,
    meetup_label, meetup_area,
    destination_label, destination_point, route_path, distance_km, capacity
  )
  values (
    v_uid, p_mode, p_title, p_safety_notes, p_starts_at,
    p_meetup_label,
    -- snapped to ~1 km: enough to render a map, not enough to stake out
    extensions.ST_SetSRID(
      extensions.ST_SnapToGrid(
        extensions.ST_MakePoint(p_meetup_lng, p_meetup_lat), 0.01), 4326)::extensions.geography,
    p_destination_label,
    case when p_dest_lat is not null and p_dest_lng is not null
      then extensions.ST_SetSRID(
             extensions.ST_MakePoint(p_dest_lng, p_dest_lat), 4326)::extensions.geography end,
    v_line, p_distance_km, p_capacity
  )
  returning * into v_ride;

  insert into private.ride_secrets (ride_id, meetup_point) values (v_ride.id, v_exact);

  -- the captain occupies a seat
  insert into public.ride_attendees (ride_id, member_id) values (v_ride.id, v_uid);

  perform app.audit('ride.created', 'ride', v_ride.id::text,
                    jsonb_build_object('mode', p_mode, 'capacity', p_capacity));

  select * into v_ride from public.rides where id = v_ride.id;
  return v_ride;
end $$;

-- ----------------------------------------------------------------------------
-- Join / leave / remove
-- ----------------------------------------------------------------------------
create or replace function app.join_ride(p_ride uuid)
returns public.rides
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := app.uid();
  v_ride public.rides;
begin
  if v_uid is null then
    raise exception 'Not authenticated.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_uid) then
    raise exception 'Finish creating your profile first.' using errcode = '42501';
  end if;

  perform app.rate_limit('join_ride', 60, interval '1 hour');

  select * into v_ride from public.rides where id = p_ride;
  if not found then
    raise exception 'That ride no longer exists.' using errcode = 'P0002';
  end if;
  if v_ride.status <> 'upcoming' then
    raise exception 'That ride is no longer open to join.' using errcode = '23514';
  end if;
  if v_ride.starts_at <= now() then
    raise exception 'That ride has already started.' using errcode = '23514';
  end if;

  begin
    insert into public.ride_attendees (ride_id, member_id, status)
    values (p_ride, v_uid, 'joined')
    on conflict (ride_id, member_id) do update
      set status = 'joined', joined_at = now()
      where public.ride_attendees.status <> 'joined';
  exception
    -- the capacity CHECK on rides fires here when the last seat has gone
    when check_violation then
      raise exception 'That ride is full.' using errcode = '23514';
  end;

  perform app.audit('ride.joined', 'ride', p_ride::text, '{}'::jsonb);

  select * into v_ride from public.rides where id = p_ride;
  return v_ride;
end $$;

create or replace function app.leave_ride(p_ride uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := app.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated.' using errcode = '42501';
  end if;

  if exists (select 1 from public.rides r where r.id = p_ride and r.captain_id = v_uid) then
    raise exception 'A captain cannot leave their own ride — cancel it instead.'
      using errcode = '23514';
  end if;

  update public.ride_attendees
     set status = 'left'
   where ride_id = p_ride and member_id = v_uid and status = 'joined';

  perform app.audit('ride.left', 'ride', p_ride::text, '{}'::jsonb);
end $$;

create or replace function app.remove_rider(p_ride uuid, p_member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := app.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.rides r where r.id = p_ride and r.captain_id = v_uid) then
    raise exception 'Only the captain can change this roster.' using errcode = '42501';
  end if;
  if p_member = v_uid then
    raise exception 'A captain cannot remove themselves.' using errcode = '23514';
  end if;

  update public.ride_attendees
     set status = 'removed'
   where ride_id = p_ride and member_id = p_member and status = 'joined';

  perform app.audit('ride.rider_removed', 'ride', p_ride::text,
                    jsonb_build_object('member', p_member));
end $$;

-- ----------------------------------------------------------------------------
-- Reads that need to be earned
-- ----------------------------------------------------------------------------

-- Exact meetup pin: captain and confirmed riders only.
create or replace function app.ride_meetup(p_ride uuid)
returns table (lat double precision, lng double precision)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_uid uuid := app.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.rides r where r.id = p_ride and r.captain_id = v_uid
  ) and not app.is_on_roster(p_ride) then
    raise exception 'Join the ride to see the exact meetup point.' using errcode = '42501';
  end if;

  return query
    select extensions.ST_Y(s.meetup_point::extensions.geometry),
           extensions.ST_X(s.meetup_point::extensions.geometry)
      from private.ride_secrets s
     where s.ride_id = p_ride;
end $$;

create or replace function app.my_date_of_birth()
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select m.date_of_birth from private.member_private m where m.member_id = app.uid();
$$;

-- DPDP right to erasure. Removing the auth user cascades through every table.
create or replace function app.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := app.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated.' using errcode = '42501';
  end if;
  perform app.audit('member.deleted', 'member', v_uid::text, '{}'::jsonb);
  delete from auth.users where id = v_uid;
end $$;

-- ----------------------------------------------------------------------------
-- Execution privileges — deny everything, then hand back the entry points
-- ----------------------------------------------------------------------------
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'app'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn.sig);
  end loop;
end $$;

grant execute on function app.complete_signup(text, text, text, date, text) to authenticated;
grant execute on function app.create_ride(public.vehicle_mode, text, timestamptz, text,
  double precision, double precision, integer, text, text,
  double precision, double precision, jsonb, numeric) to authenticated;
grant execute on function app.join_ride(uuid)                to authenticated;
grant execute on function app.leave_ride(uuid)               to authenticated;
grant execute on function app.remove_rider(uuid, uuid)       to authenticated;
grant execute on function app.ride_meetup(uuid)              to authenticated;
grant execute on function app.my_date_of_birth()             to authenticated;
grant execute on function app.delete_my_account()            to authenticated;

-- app.uid() and app.is_on_roster() are referenced inside RLS policies, which
-- are evaluated as the querying role, so that role needs EXECUTE on them.
grant execute on function app.uid()              to authenticated, anon;
grant execute on function app.is_on_roster(uuid) to authenticated;
