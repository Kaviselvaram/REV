-- ============================================================================
-- REV · 002 · Identity — profiles, private member data, garage
--
-- The product's core promise is "your number is never shown". The way to keep
-- a promise like that is to make breaking it structurally impossible rather
-- than policy-dependent:
--
--   * The phone number lives in `auth.users`, a schema PostgREST does not
--     expose. We never copy it into `public`.
--   * Date of birth lives in `private.member_private`, also unreachable.
--   * `public.profiles` therefore contains nothing that needs hiding, so a
--     plain "any member may read profiles" policy is safe to reason about.
--
-- Trust columns (is_verified, rides_count) are system-owned. Members are not
-- granted UPDATE on them, and a trigger rejects the attempt as well — either
-- alone would do, and that is the point.
-- ============================================================================

set local search_path = public, extensions, pg_catalog;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  handle       extensions.citext not null unique,
  display_name text not null,
  city         text not null,
  bio          text,
  avatar_path  text,
  is_verified  boolean not null default false,
  rides_count  integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint handle_shape check (handle ~ '^[a-z0-9_]{3,16}$'),
  constraint display_name_len check (char_length(display_name) between 2 and 40),
  constraint bio_len  check (bio is null or char_length(bio) <= 90),
  constraint city_len check (char_length(city) between 2 and 40),
  constraint rides_count_sane check (rides_count >= 0)
);

-- Names that could be used to impersonate REV itself.
create table if not exists private.reserved_handles (handle extensions.citext primary key);
insert into private.reserved_handles (handle) values
  ('rev'), ('admin'), ('administrator'), ('root'), ('support'), ('help'),
  ('official'), ('moderator'), ('mod'), ('staff'), ('team'), ('security'),
  ('system'), ('api'), ('billing'), ('payments'), ('captain'), ('sos')
on conflict do nothing;

alter table private.reserved_handles enable row level security;
alter table private.reserved_handles force  row level security;

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

  -- Trust signals are earned, never self-declared. The column grants below
  -- already prevent this; the check stays so a future over-grant cannot
  -- silently open a hole.
  if tg_op = 'UPDATE' then
    if new.is_verified is distinct from old.is_verified
       or new.rides_count is distinct from old.rides_count
       or new.id is distinct from old.id
       or new.created_at is distinct from old.created_at then
      raise exception 'That field is managed by REV.' using errcode = '42501';
    end if;
  elsif tg_op = 'INSERT' then
    new.is_verified := false;
    new.rides_count := 0;
  end if;

  return new;
end $$;

drop trigger if exists guard_profile on public.profiles;
create trigger guard_profile
  before insert or update on public.profiles
  for each row execute function app.guard_profile();

drop trigger if exists touch_profiles on public.profiles;
create trigger touch_profiles
  before update on public.profiles
  for each row execute function app.touch_updated_at();

create index if not exists profiles_city_idx   on public.profiles (city);
create index if not exists profiles_handle_trgm on public.profiles
  using gin (handle extensions.gin_trgm_ops);

alter table public.profiles enable row level security;
alter table public.profiles force  row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, handle, display_name, city, bio, avatar_path) on public.profiles to authenticated;
grant update (handle, display_name, city, bio, avatar_path)     on public.profiles to authenticated;
-- deliberately no DELETE: account removal goes through app.delete_my_account().

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated
  using (true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = app.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = app.uid())
  with check (id = app.uid());

-- ----------------------------------------------------------------------------
-- private.member_private — never exposed, on any code path
-- ----------------------------------------------------------------------------
create table if not exists private.member_private (
  member_id     uuid primary key references auth.users (id) on delete cascade,
  date_of_birth date not null,
  created_at    timestamptz not null default now()
);

alter table private.member_private enable row level security;
alter table private.member_private force  row level security;

-- ----------------------------------------------------------------------------
-- vehicles — the Garage
-- ----------------------------------------------------------------------------
create table if not exists public.vehicles (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  mode        public.vehicle_mode not null,
  make        text not null,
  model       text not null,
  year        integer,
  extra       text,                      -- engine cc (bike) / drivetrain (car)
  mods        text[] not null default '{}',
  ride_style  text,
  photo_paths text[] not null default '{}',
  is_primary  boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint make_len  check (char_length(make)  between 1 and 40),
  constraint model_len check (char_length(model) between 1 and 40),
  constraint year_sane check (year is null or year between 1900 and extract(year from now())::int + 1),
  constraint mods_sane   check (array_length(mods, 1) is null or array_length(mods, 1) <= 20),
  constraint photos_sane check (array_length(photo_paths, 1) is null or array_length(photo_paths, 1) <= 6)
);

-- One primary machine per member per world — what the Garage screen shows.
create unique index if not exists vehicles_one_primary
  on public.vehicles (owner_id, mode) where is_primary;

create index if not exists vehicles_owner_idx on public.vehicles (owner_id);

drop trigger if exists touch_vehicles on public.vehicles;
create trigger touch_vehicles
  before update on public.vehicles
  for each row execute function app.touch_updated_at();

alter table public.vehicles enable row level security;
alter table public.vehicles force  row level security;

revoke all on public.vehicles from anon, authenticated;
grant select on public.vehicles to authenticated;
grant insert (owner_id, mode, make, model, year, extra, mods, ride_style, photo_paths, is_primary)
  on public.vehicles to authenticated;
grant update (mode, make, model, year, extra, mods, ride_style, photo_paths, is_primary)
  on public.vehicles to authenticated;
grant delete on public.vehicles to authenticated;

-- Rosters show what a member rides, so vehicles are readable community-wide.
drop policy if exists vehicles_read on public.vehicles;
create policy vehicles_read on public.vehicles
  for select to authenticated
  using (true);

drop policy if exists vehicles_write_own on public.vehicles;
create policy vehicles_write_own on public.vehicles
  for insert to authenticated
  with check (owner_id = app.uid());

drop policy if exists vehicles_update_own on public.vehicles;
create policy vehicles_update_own on public.vehicles
  for update to authenticated
  using (owner_id = app.uid())
  with check (owner_id = app.uid());

drop policy if exists vehicles_delete_own on public.vehicles;
create policy vehicles_delete_own on public.vehicles
  for delete to authenticated
  using (owner_id = app.uid());
