-- ============================================================================
-- REV · 018 · Moderation
--
-- Reports could be filed and then went nowhere: no reviewer could read them,
-- and nothing could be done about one. This adds the other half.
--
-- Two things worth stating plainly:
--
--   A block has to mean something. A block that only hides a profile is
--   theatre — the person you blocked can still turn up on your ride. So the
--   block is enforced in join_ride: neither direction can join a ride the
--   other captains.
--
--   A suspension has to bite at the database, not the interface. A suspended
--   member keeps a valid JWT, so hiding buttons changes nothing. create_ride
--   and join_ride check it server-side.
--
-- The moderator list lives in `private` so it cannot be enumerated, and
-- moderator powers are granted through policies that call app.is_moderator()
-- rather than by handing anyone a wider role.
-- ============================================================================

set local search_path = public, extensions, pg_catalog;

-- ----------------------------------------------------------------------------
-- Who can moderate
-- ----------------------------------------------------------------------------
create table if not exists private.moderators (
  member_id  uuid primary key references auth.users (id) on delete cascade,
  added_at   timestamptz not null default now(),
  note       text
);

alter table private.moderators enable row level security;
alter table private.moderators force  row level security;

create or replace function app.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select exists (select 1 from private.moderators m where m.member_id = app.uid()) $$;

grant execute on function app.is_moderator() to authenticated;

-- ----------------------------------------------------------------------------
-- Report lifecycle
-- ----------------------------------------------------------------------------
alter table public.reports add column if not exists resolution      text;
alter table public.reports add column if not exists resolved_by     uuid references auth.users (id) on delete set null;
alter table public.reports add column if not exists resolved_at     timestamptz;

-- A reporter sees their own report. A moderator sees everything. Nobody ever
-- sees who reported them — that is what makes reporting safe to do.
drop policy if exists reports_read_own on public.reports;
create policy reports_read_own on public.reports
  for select to authenticated
  using (reporter_id = (select app.uid()) or (select app.is_moderator()));

drop policy if exists reports_moderate on public.reports;
create policy reports_moderate on public.reports
  for update to authenticated
  using ((select app.is_moderator()))
  with check ((select app.is_moderator()));

grant update (status, resolution, resolved_by, resolved_at) on public.reports to authenticated;

-- ----------------------------------------------------------------------------
-- Suspension
-- ----------------------------------------------------------------------------
alter table public.profiles add column if not exists suspended_until  timestamptz;
alter table public.profiles add column if not exists suspended_reason text;

-- Members must not be able to lift their own suspension.
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
         new.is_verified      is distinct from old.is_verified
      or new.rides_count      is distinct from old.rides_count
      or new.rides_led        is distinct from old.rides_led
      or new.founding_number  is distinct from old.founding_number
      or new.captain_rank     is distinct from old.captain_rank
      or new.is_licence_verified is distinct from old.is_licence_verified
      or new.suspended_until  is distinct from old.suspended_until
      or new.suspended_reason is distinct from old.suspended_reason
      or new.id               is distinct from old.id
      or new.created_at       is distinct from old.created_at) then
      raise exception 'That field is managed by REV.' using errcode = '42501';
    end if;
  elsif tg_op = 'INSERT' then
    if session_user in ('anon', 'authenticated') then
      new.is_verified := false;
      new.rides_count := 0;
      new.suspended_until := null;
    end if;
  end if;

  return new;
end $$;

create or replace function app.assert_active()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_until timestamptz;
begin
  select suspended_until into v_until from public.profiles where id = app.uid();
  if v_until is not null and v_until > now() then
    raise exception 'Your account is suspended until %.',
      to_char(v_until at time zone 'Asia/Kolkata', 'DD Mon YYYY')
      using errcode = '42501';
  end if;
end $$;

grant execute on function app.assert_active() to authenticated;

-- ----------------------------------------------------------------------------
-- Make a block mean something, and enforce suspension where it matters
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

  perform app.assert_active();
  perform app.rate_limit('join_ride', 60, interval '1 hour');

  select * into v_ride from public.rides where id = p_ride;
  if not found then
    raise exception 'That ride no longer exists.' using errcode = 'P0002';
  end if;
  if app.ride_state(v_ride.status, v_ride.starts_at, v_ride.ends_at) <> 'upcoming' then
    raise exception 'That ride is no longer open to join.' using errcode = '23514';
  end if;

  -- a block has to work in both directions, or it is decoration
  if exists (
    select 1 from public.blocks b
     where (b.blocker_id = v_ride.captain_id and b.blocked_id = v_uid)
        or (b.blocker_id = v_uid and b.blocked_id = v_ride.captain_id)
  ) then
    raise exception 'You cannot join this ride.' using errcode = '42501';
  end if;

  begin
    insert into public.ride_attendees (ride_id, member_id, status)
    values (p_ride, v_uid, 'joined')
    on conflict (ride_id, member_id) do update
      set status = 'joined', joined_at = now()
      where public.ride_attendees.status <> 'joined';
  exception
    when check_violation then
      raise exception 'That ride is full.' using errcode = '23514';
  end;

  perform app.audit('ride.joined', 'ride', p_ride::text, '{}'::jsonb);
  select * into v_ride from public.rides where id = p_ride;
  return v_ride;
end $$;

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
  p_route             jsonb default null,
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

  perform app.assert_active();
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
  insert into public.ride_attendees (ride_id, member_id) values (v_ride.id, v_uid);

  perform app.audit('ride.created', 'ride', v_ride.id::text,
                    jsonb_build_object('mode', p_mode, 'capacity', p_capacity));

  select * into v_ride from public.rides where id = v_ride.id;
  return v_ride;
end $$;

-- ----------------------------------------------------------------------------
-- Reporting and moderation entry points
-- ----------------------------------------------------------------------------
create or replace function app.report_member(
  p_subject uuid, p_reason text, p_detail text default null, p_ride uuid default null
)
returns public.reports
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := app.uid(); v_row public.reports;
begin
  if v_uid is null then
    raise exception 'Not authenticated.' using errcode = '42501';
  end if;
  if p_subject = v_uid then
    raise exception 'You cannot report yourself.' using errcode = '23514';
  end if;

  perform app.rate_limit('report', 20, interval '24 hours');

  insert into public.reports (reporter_id, subject_id, ride_id, reason, detail)
  values (v_uid, p_subject, p_ride, p_reason, p_detail)
  returning * into v_row;

  perform app.audit('report.filed', 'member', p_subject::text,
                    jsonb_build_object('reason', p_reason, 'ride', p_ride));
  return v_row;
end $$;

-- The moderation queue, with the reporter's identity deliberately omitted.
create or replace function app.moderation_queue(p_status public.report_status default 'open')
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when not app.is_moderator() then '[]'::jsonb else
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'reason', r.reason,
        'detail', r.detail,
        'status', r.status,
        'created_at', r.created_at,
        'resolution', r.resolution,
        'ride_id', r.ride_id,
        'ride_title', (select x.title from public.rides x where x.id = r.ride_id),
        'subject', jsonb_build_object(
          'id', sp.id, 'handle', sp.handle, 'display_name', sp.display_name,
          'rides_count', sp.rides_count,
          'suspended_until', sp.suspended_until,
          'prior_reports', (select count(*) from public.reports r2
                             where r2.subject_id = r.subject_id and r2.id <> r.id)
        ))
      order by r.created_at desc)
      from public.reports r
      left join public.profiles sp on sp.id = r.subject_id
      where r.status = p_status
    ), '[]'::jsonb)
  end;
$$;

create or replace function app.resolve_report(
  p_report uuid,
  p_status public.report_status,
  p_resolution text default null,
  p_suspend_days integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := app.uid(); v_subject uuid;
begin
  if not app.is_moderator() then
    raise exception 'Not permitted.' using errcode = '42501';
  end if;

  update public.reports
     set status = p_status, resolution = p_resolution,
         resolved_by = v_uid, resolved_at = now()
   where id = p_report
  returning subject_id into v_subject;

  if not found then
    raise exception 'No such report.' using errcode = 'P0002';
  end if;

  if p_suspend_days is not null and v_subject is not null then
    update public.profiles
       set suspended_until = now() + make_interval(days => p_suspend_days),
           suspended_reason = coalesce(p_resolution, 'Community guidelines')
     where id = v_subject;
    perform app.audit('member.suspended', 'member', v_subject::text,
                      jsonb_build_object('days', p_suspend_days, 'report', p_report));
  end if;

  perform app.audit('report.resolved', 'report', p_report::text,
                    jsonb_build_object('status', p_status));
end $$;

-- ----------------------------------------------------------------------------
-- Public entry points
-- ----------------------------------------------------------------------------
create or replace function public.report_member(
  p_subject uuid, p_reason text, p_detail text default null, p_ride uuid default null
)
returns public.reports
language plpgsql security invoker set search_path = ''
as $$ begin return app.report_member(p_subject, p_reason, p_detail, p_ride); end $$;

create or replace function public.moderation_queue(p_status public.report_status default 'open')
returns jsonb
language sql security invoker set search_path = ''
as $$ select app.moderation_queue(p_status) $$;

create or replace function public.resolve_report(
  p_report uuid, p_status public.report_status,
  p_resolution text default null, p_suspend_days integer default null
)
returns void
language plpgsql security invoker set search_path = ''
as $$ begin perform app.resolve_report(p_report, p_status, p_resolution, p_suspend_days); end $$;

create or replace function public.am_i_moderator()
returns boolean
language sql security invoker set search_path = ''
as $$ select app.is_moderator() $$;

do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('report_member','moderation_queue','resolve_report','am_i_moderator')
  loop
    execute format('revoke all on function %s from public, anon', fn.sig);
    execute format('grant execute on function %s to authenticated', fn.sig);
  end loop;
end $$;

grant execute on function app.report_member(uuid, text, text, uuid) to authenticated;
grant execute on function app.moderation_queue(public.report_status) to authenticated;
grant execute on function app.resolve_report(uuid, public.report_status, text, integer) to authenticated;
