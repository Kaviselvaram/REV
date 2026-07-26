-- ============================================================================
-- REV · 009 · Trust & safety
--
-- This is the layer that has to work when something has gone wrong, so it is
-- built around three ideas:
--
--   * Blocking is mutual and enforced server-side. If either party has blocked
--     the other, neither can join the other's ride. Doing this in a policy
--     rather than the UI means it holds even against a hand-crafted request.
--   * Emergency contacts live in `private`. They are third-party personal data
--     — someone who never signed up for REV — so they are never readable by
--     the API, only released into an active SOS.
--   * An SOS is an append-only record with an explicit lifecycle. It is the
--     one place where precise live location is allowed to leave the member.
-- ============================================================================

set local search_path = public, extensions, pg_catalog;

do $$ begin
  create type public.sos_status as enum ('active', 'resolved', 'cancelled');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- Blocks
-- ----------------------------------------------------------------------------
create table if not exists public.blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);

create index if not exists blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;
alter table public.blocks force  row level security;

revoke all on public.blocks from anon, authenticated;
grant select, delete on public.blocks to authenticated;
grant insert (blocker_id, blocked_id) on public.blocks to authenticated;

-- You can see and undo your own blocks. You can never see who blocked you —
-- that would turn a safety tool into a notification.
drop policy if exists blocks_read_own on public.blocks;
create policy blocks_read_own on public.blocks
  for select to authenticated using (blocker_id = (select app.uid()));

drop policy if exists blocks_insert_own on public.blocks;
create policy blocks_insert_own on public.blocks
  for insert to authenticated with check (blocker_id = (select app.uid()));

drop policy if exists blocks_delete_own on public.blocks;
create policy blocks_delete_own on public.blocks
  for delete to authenticated using (blocker_id = (select app.uid()));

-- Symmetric test — direction does not matter for safety purposes.
create or replace function app.is_blocked_with(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = app.uid() and b.blocked_id = p_other)
       or (b.blocker_id = p_other  and b.blocked_id = app.uid())
  );
$$;

-- ----------------------------------------------------------------------------
-- Emergency contacts — third-party data, never exposed through the API
-- ----------------------------------------------------------------------------
create table if not exists private.emergency_contacts (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  phone_e164  text not null,
  relation    text,
  created_at  timestamptz not null default now(),
  constraint ec_name_len  check (char_length(name) between 1 and 60),
  constraint ec_phone_shape check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$')
);

create index if not exists ec_member_idx on private.emergency_contacts (member_id);

alter table private.emergency_contacts enable row level security;
alter table private.emergency_contacts force  row level security;

create or replace function app.set_emergency_contacts(p_contacts jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.uid();
  v_n   integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated.' using errcode = '42501';
  end if;
  if jsonb_array_length(coalesce(p_contacts, '[]'::jsonb)) > 3 then
    raise exception 'Up to three emergency contacts.' using errcode = '23514';
  end if;

  delete from private.emergency_contacts where member_id = v_uid;

  insert into private.emergency_contacts (member_id, name, phone_e164, relation)
  select v_uid, c->>'name', c->>'phone', c->>'relation'
    from jsonb_array_elements(coalesce(p_contacts, '[]'::jsonb)) as c;

  get diagnostics v_n = row_count;
  perform app.audit('member.emergency_contacts_set', 'member', v_uid::text,
                    jsonb_build_object('count', v_n));
  return v_n;
end $$;

-- Only ever returns the caller's own contacts, and only their names, so a
-- member can confirm what is on file without the numbers being re-exposed.
create or replace function app.my_emergency_contacts()
returns table (id uuid, name text, relation text, phone_masked text)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.name, e.relation,
         '••••••' || right(e.phone_e164, 4)
    from private.emergency_contacts e
   where e.member_id = app.uid()
   order by e.created_at;
$$;

-- ----------------------------------------------------------------------------
-- SOS
-- ----------------------------------------------------------------------------
create table if not exists public.sos_alerts (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references auth.users (id) on delete cascade,
  ride_id     uuid references public.rides (id) on delete set null,
  status      public.sos_status not null default 'active',
  raised_at   timestamptz not null default now(),
  resolved_at timestamptz,
  last_lat    double precision,
  last_lng    double precision,
  note        text,
  constraint sos_note_len check (note is null or char_length(note) <= 300)
);

-- One live alert per member at a time.
create unique index if not exists sos_one_active
  on public.sos_alerts (member_id) where status = 'active';
create index if not exists sos_ride_idx on public.sos_alerts (ride_id) where status = 'active';

alter table public.sos_alerts enable row level security;
alter table public.sos_alerts force  row level security;

revoke all on public.sos_alerts from anon, authenticated;
grant select on public.sos_alerts to authenticated;

-- An active alert is visible to the member who raised it and to the roster of
-- the ride it was raised on — the people actually nearby and able to help.
drop policy if exists sos_read on public.sos_alerts;
create policy sos_read on public.sos_alerts
  for select to authenticated
  using (
    member_id = (select app.uid())
    or (status = 'active' and ride_id is not null and (select app.is_on_roster(ride_id)))
  );

create or replace function app.raise_sos(
  p_ride uuid default null, p_lat double precision default null,
  p_lng double precision default null, p_note text default null
)
returns public.sos_alerts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.uid();
  v_row public.sos_alerts;
begin
  if v_uid is null then
    raise exception 'Not authenticated.' using errcode = '42501';
  end if;

  -- Deliberately NOT rate limited. A safety call must never be refused
  -- because someone pressed it twice.
  insert into public.sos_alerts (member_id, ride_id, last_lat, last_lng, note)
  values (v_uid, p_ride, p_lat, p_lng, p_note)
  on conflict (member_id) where status = 'active'
    do update set last_lat = excluded.last_lat,
                  last_lng = excluded.last_lng,
                  note     = coalesce(excluded.note, public.sos_alerts.note)
  returning * into v_row;

  perform app.audit('sos.raised', 'sos', v_row.id::text,
                    jsonb_build_object('ride', p_ride));
  return v_row;
end $$;

create or replace function app.update_sos_location(p_lat double precision, p_lng double precision)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.sos_alerts
     set last_lat = p_lat, last_lng = p_lng
   where member_id = app.uid() and status = 'active';
$$;

create or replace function app.resolve_sos(p_cancelled boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := app.uid();
begin
  update public.sos_alerts
     set status = case when p_cancelled then 'cancelled' else 'resolved' end::public.sos_status,
         resolved_at = now()
   where member_id = v_uid and status = 'active';
  perform app.audit('sos.closed', 'member', v_uid::text,
                    jsonb_build_object('cancelled', p_cancelled));
end $$;

-- ----------------------------------------------------------------------------
-- Blocking is enforced on the join path, not just in the UI
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

  -- Deliberately vague: naming the block would tell one party the other
  -- blocked them, which is exactly what a blocked person should not learn.
  if app.is_blocked_with(v_ride.captain_id) then
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

-- ----------------------------------------------------------------------------
-- Public entry points + privileges
-- ----------------------------------------------------------------------------
create or replace function public.set_emergency_contacts(p_contacts jsonb)
returns integer language plpgsql security invoker set search_path = ''
as $$ begin return app.set_emergency_contacts(p_contacts); end $$;

create or replace function public.my_emergency_contacts()
returns table (id uuid, name text, relation text, phone_masked text)
language plpgsql security invoker set search_path = ''
as $$ begin return query select * from app.my_emergency_contacts(); end $$;

create or replace function public.raise_sos(
  p_ride uuid default null, p_lat double precision default null,
  p_lng double precision default null, p_note text default null)
returns public.sos_alerts language plpgsql security invoker set search_path = ''
as $$ begin return app.raise_sos(p_ride, p_lat, p_lng, p_note); end $$;

create or replace function public.update_sos_location(p_lat double precision, p_lng double precision)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform app.update_sos_location(p_lat, p_lng); end $$;

create or replace function public.resolve_sos(p_cancelled boolean default false)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform app.resolve_sos(p_cancelled); end $$;

do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig, n.nspname
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where (n.nspname = 'app' and p.proname in
             ('is_blocked_with','set_emergency_contacts','my_emergency_contacts',
              'raise_sos','update_sos_location','resolve_sos','join_ride'))
        or (n.nspname = 'public' and p.proname in
             ('set_emergency_contacts','my_emergency_contacts','raise_sos',
              'update_sos_location','resolve_sos'))
  loop
    execute format('revoke all on function %s from public, anon', fn.sig);
    execute format('grant execute on function %s to authenticated', fn.sig);
  end loop;
end $$;
