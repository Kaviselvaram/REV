-- ============================================================================
-- REV · 024 · Drop the stale create_ride overload
--
-- Adding p_city/p_corridor in 022 created a SECOND create_ride rather than
-- replacing the first: in Postgres a changed argument list makes a new
-- function. The 13-argument version kept working and would write rides with no
-- corridor — invisible in every corridor filter, and hard to notice because
-- nothing errors.
--
-- PostgREST resolves an RPC by argument name, so today's client always reached
-- the newer one. That is luck rather than design, and a stale overload is
-- exactly what produces a later "works in staging, fails in production".
-- ============================================================================

drop function if exists public.create_ride(
  public.vehicle_mode, text, timestamptz, text, double precision, double precision,
  integer, text, text, double precision, double precision, jsonb, numeric);

drop function if exists app.create_ride(
  public.vehicle_mode, text, timestamptz, text, double precision, double precision,
  integer, text, text, double precision, double precision, jsonb, numeric);
