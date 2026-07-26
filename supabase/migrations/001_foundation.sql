-- ============================================================================
-- REV · 001 · Foundation
--
-- Security posture, in one place:
--   * Three schemas. `public` is the only one PostgREST exposes. `private`
--     holds data the client must never reach on any code path. `app` holds
--     the logic; clients call functions there, they do not write tables.
--   * Nothing is granted by default. Every privilege below is deliberate.
--   * Every SECURITY DEFINER function pins `search_path = ''` and fully
--     qualifies each name. Without that, anyone able to create objects can
--     shadow a name the function resolves and run their code as its owner.
-- ============================================================================

set local search_path = public, extensions, pg_catalog;

create extension if not exists postgis      with schema extensions;
create extension if not exists pgcrypto     with schema extensions;
create extension if not exists citext       with schema extensions;
create extension if not exists pg_trgm      with schema extensions;
create extension if not exists btree_gist   with schema extensions;

create schema if not exists app;
create schema if not exists private;

-- Deny by default. `private` is never reachable from the API; `app` is
-- callable but holds no tables the client can touch directly.
revoke all on schema private from anon, authenticated;
revoke all on schema app     from anon, authenticated;
grant usage on schema app to authenticated;

alter default privileges in schema private revoke all on tables    from anon, authenticated;
alter default privileges in schema private revoke all on functions from anon, authenticated;
alter default privileges in schema app     revoke all on tables    from anon, authenticated;

-- ----------------------------------------------------------------------------
-- Shared enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type public.vehicle_mode as enum ('bike', 'car');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ride_status as enum ('upcoming', 'live', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attendee_status as enum ('joined', 'left', 'removed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_status as enum ('open', 'reviewing', 'actioned', 'dismissed');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------

-- auth.uid() returns null for an unauthenticated request. Wrapping it keeps
-- policies terse and gives one place to change if the claim shape moves.
create or replace function app.uid()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$ select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid $$;

comment on function app.uid() is 'Current member id, or null when unauthenticated.';

create or replace function app.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ----------------------------------------------------------------------------
-- Audit log — append only. No update or delete grant exists for any client
-- role, and none should ever be added.
-- ----------------------------------------------------------------------------
create table if not exists private.audit_log (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  actor_id    uuid,
  action      text not null,
  entity      text not null,
  entity_id   text,
  detail      jsonb not null default '{}'::jsonb
);

create index if not exists audit_log_at_idx     on private.audit_log (at desc);
create index if not exists audit_log_actor_idx  on private.audit_log (actor_id, at desc);
create index if not exists audit_log_entity_idx on private.audit_log (entity, entity_id);

alter table private.audit_log enable row level security;
alter table private.audit_log force  row level security;
-- no policies: unreachable from the API by construction.

create or replace function app.audit(
  p_action text, p_entity text, p_entity_id text, p_detail jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.audit_log (actor_id, action, entity, entity_id, detail)
  values (app.uid(), p_action, p_entity, p_entity_id, coalesce(p_detail, '{}'::jsonb));
$$;

-- ----------------------------------------------------------------------------
-- Rate limiting — a fixed window per (member, action). Cheap, and it holds
-- because the upsert takes a row lock, so concurrent calls serialise.
-- ----------------------------------------------------------------------------
create table if not exists private.rate_limit (
  member_id    uuid not null,
  action       text not null,
  window_start timestamptz not null,
  hits         integer not null default 0,
  primary key (member_id, action, window_start)
);

alter table private.rate_limit enable row level security;
alter table private.rate_limit force  row level security;

create or replace function app.rate_limit(
  p_action text, p_limit integer, p_window interval
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member uuid := app.uid();
  v_start  timestamptz;
  v_hits   integer;
begin
  if v_member is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  v_start := date_bin(p_window, now(), timestamptz 'epoch');

  insert into private.rate_limit (member_id, action, window_start, hits)
  values (v_member, p_action, v_start, 1)
  on conflict (member_id, action, window_start)
    do update set hits = private.rate_limit.hits + 1
  returning hits into v_hits;

  if v_hits > p_limit then
    perform app.audit('rate_limit.tripped', 'member', v_member::text,
                      jsonb_build_object('action', p_action, 'hits', v_hits));
    raise exception 'Too many % requests. Try again shortly.', p_action
      using errcode = '54000';
  end if;
end $$;

-- Housekeeping: old windows are dead weight.
create or replace function app.prune_rate_limits()
returns void
language sql
security definer
set search_path = ''
as $$ delete from private.rate_limit where window_start < now() - interval '1 day' $$;

-- ----------------------------------------------------------------------------
-- Consent ledger — DPDP requires proof of what was agreed, and when.
-- Written only by the signup path; never updated, never deleted.
-- ----------------------------------------------------------------------------
create table if not exists private.consent_ledger (
  id          bigserial primary key,
  member_id   uuid not null,
  document    text not null,
  version     text not null,
  accepted_at timestamptz not null default now()
);

create index if not exists consent_member_idx on private.consent_ledger (member_id, accepted_at desc);

alter table private.consent_ledger enable row level security;
alter table private.consent_ledger force  row level security;
