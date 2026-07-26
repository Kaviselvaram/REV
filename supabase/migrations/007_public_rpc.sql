-- ============================================================================
-- REV · 007 · Public entry points
--
-- PostgREST only exposes `public`, so app.* is unreachable over HTTP. Rather
-- than widen the exposed schema list — which would publish every helper in
-- `app`, including app.audit() and app.rate_limit() — we publish exactly the
-- eight operations a member is allowed to perform, each a one-line pass
-- through to the real implementation.
--
-- These wrappers are SECURITY INVOKER on purpose. They run as the caller, so
-- the caller must genuinely hold EXECUTE on the app.* function underneath;
-- the wrapper adds reach, never privilege.
-- ============================================================================

create or replace function public.complete_signup(
  p_handle text, p_display_name text, p_city text, p_dob date,
  p_consent_version text default '1.0'
)
returns public.profiles
language plpgsql
security invoker
set search_path = ''
as $$ begin return app.complete_signup(p_handle, p_display_name, p_city, p_dob, p_consent_version); end $$;

create or replace function public.create_ride(
  p_mode public.vehicle_mode, p_title text, p_starts_at timestamptz, p_meetup_label text,
  p_meetup_lat double precision, p_meetup_lng double precision, p_capacity integer,
  p_safety_notes text default null, p_destination_label text default null,
  p_dest_lat double precision default null, p_dest_lng double precision default null,
  p_route jsonb default null, p_distance_km numeric default null
)
returns public.rides
language plpgsql
security invoker
set search_path = ''
as $$ begin
  return app.create_ride(p_mode, p_title, p_starts_at, p_meetup_label, p_meetup_lat,
    p_meetup_lng, p_capacity, p_safety_notes, p_destination_label, p_dest_lat,
    p_dest_lng, p_route, p_distance_km);
end $$;

create or replace function public.join_ride(p_ride uuid)
returns public.rides
language plpgsql security invoker set search_path = ''
as $$ begin return app.join_ride(p_ride); end $$;

create or replace function public.leave_ride(p_ride uuid)
returns void
language plpgsql security invoker set search_path = ''
as $$ begin perform app.leave_ride(p_ride); end $$;

create or replace function public.remove_rider(p_ride uuid, p_member uuid)
returns void
language plpgsql security invoker set search_path = ''
as $$ begin perform app.remove_rider(p_ride, p_member); end $$;

create or replace function public.ride_meetup(p_ride uuid)
returns table (lat double precision, lng double precision)
language plpgsql security invoker set search_path = ''
as $$ begin return query select * from app.ride_meetup(p_ride); end $$;

create or replace function public.my_date_of_birth()
returns date
language sql security invoker set search_path = ''
as $$ select app.my_date_of_birth() $$;

create or replace function public.delete_my_account()
returns void
language plpgsql security invoker set search_path = ''
as $$ begin perform app.delete_my_account(); end $$;

-- Same posture as the app schema: nothing to PUBLIC, then hand back the eight.
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('complete_signup','create_ride','join_ride','leave_ride',
                         'remove_rider','ride_meetup','my_date_of_birth','delete_my_account')
  loop
    execute format('revoke all on function %s from public, anon', fn.sig);
    execute format('grant execute on function %s to authenticated', fn.sig);
  end loop;
end $$;
