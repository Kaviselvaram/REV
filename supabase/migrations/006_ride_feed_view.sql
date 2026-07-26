-- ============================================================================
-- REV · 006 · Client-shaped view of a ride
--
-- PostgREST hands geography columns back as WKB hex, which the browser has no
-- use for. This view unpacks them into plain numbers and a [[lat, lng], ...]
-- array the map component can consume directly.
--
-- security_invoker = true is the whole ballgame here. A Postgres view runs as
-- its OWNER by default, which would make this view a hole straight through
-- every RLS policy on rides. With security_invoker the view is evaluated as
-- the member querying it, so the policies still apply.
--
-- Note it exposes meetup_area — the ~1 km snapped point — never the exact pin
-- from private.ride_secrets. That stays behind app.ride_meetup().
-- ============================================================================

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
  r.status,
  r.created_at
from public.rides r;

revoke all on public.ride_feed from anon, authenticated;
grant select on public.ride_feed to authenticated;

comment on view public.ride_feed is
  'Ride listing shaped for the client. Runs as the caller (security_invoker), '
  'so rides RLS still applies. Carries the snapped meetup area, never the exact pin.';
