-- ============================================================================
-- REV · Adversarial RLS suite
--
-- These tests do not check that the app works. They check that a member who
-- is actively trying to misuse it cannot. Each case impersonates a real
-- signed-in member by setting the same JWT claim PostgREST sets, then
-- attempts something they should not be able to do.
--
-- Run against STAGING only — it creates and deletes auth users.
--   psql "$STAGING_URL" -f supabase/tests/rls_adversarial.sql
--
-- Every row must report PASS. A FAIL is a shipping blocker, not a warning.
-- ============================================================================

begin;

insert into auth.users (id, instance_id, aud, role, phone, phone_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','+919000000001', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','+919000000002', now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated','+919000000003', now(), now(), now())
on conflict (id) do nothing;

create temp table t (n int, name text, expected text, result text);
grant all on t to authenticated;

do $$
declare
  A uuid := '11111111-1111-1111-1111-111111111111';  -- captain
  B uuid := '22222222-2222-2222-2222-222222222222';  -- rider
  C uuid := '33333333-3333-3333-3333-333333333333';  -- outsider
  v_ride uuid; v_txt text; v_int int; v_dob date;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', A)::text, true);
  perform set_config('role', 'authenticated', true);
  perform app.complete_signup('arjun', 'Arjun Prakash', 'Chennai', date '1994-03-11');
  insert into t values (1,'A completes signup','ok','ok');

  -- ---------------------------------------------------------------- gates
  perform set_config('request.jwt.claims', json_build_object('sub', B)::text, true);
  begin
    perform app.complete_signup('kid','Too Young','Chennai',(current_date - interval '15 years')::date);
    insert into t values (2,'under-18 signup blocked','blocked','NOT BLOCKED');
  exception when others then insert into t values (2,'under-18 signup blocked','blocked','blocked'); end;

  begin
    perform app.complete_signup('admin','Impostor','Chennai', date '1990-01-01');
    insert into t values (3,'reserved handle blocked','blocked','NOT BLOCKED');
  exception when others then insert into t values (3,'reserved handle blocked','blocked','blocked'); end;

  perform app.complete_signup('divya','Divya Nair','Chennai', date '1992-07-02');
  perform set_config('request.jwt.claims', json_build_object('sub', C)::text, true);
  perform app.complete_signup('karthik','Karthik S','Chennai', date '1991-05-20');
  insert into t values (4,'B and C complete signup','ok','ok');

  -- ------------------------------------------------- private data is private
  perform set_config('request.jwt.claims', json_build_object('sub', B)::text, true);
  begin
    select date_of_birth into v_dob from private.member_private where member_id = A;
    insert into t values (5,'B reads A date_of_birth','denied','LEAKED');
  exception when others then insert into t values (5,'B reads A date_of_birth','denied','denied'); end;

  begin
    select phone into v_txt from auth.users where id = A;
    insert into t values (6,'B reads A phone number','denied','LEAKED');
  exception when others then insert into t values (6,'B reads A phone number','denied','denied'); end;

  begin
    select date_of_birth into v_dob from private.member_private where member_id = B;
    insert into t values (7,'B reads own DOB via table','denied','LEAKED');
  exception when others then insert into t values (7,'B reads own DOB via table','denied','denied'); end;

  select app.my_date_of_birth() into v_dob;
  insert into t values (8,'B reads own DOB via function','1992-07-02', v_dob::text);

  -- ------------------------------------------------ privilege escalation
  begin
    update public.profiles set is_verified = true where id = B;
    insert into t values (9,'B self-verifies','denied','ESCALATED');
  exception when others then insert into t values (9,'B self-verifies','denied','denied'); end;

  begin
    update public.profiles set rides_count = 9999 where id = B;
    insert into t values (10,'B inflates rides_count','denied','ESCALATED');
  exception when others then insert into t values (10,'B inflates rides_count','denied','denied'); end;

  update public.profiles set display_name = 'Hacked' where id = A;
  get diagnostics v_int = row_count;
  insert into t values (11,'B edits A profile','0 rows', v_int || ' rows');

  begin
    perform app.audit('forged','member', B::text, '{}'::jsonb);
    insert into t values (12,'B forges audit entry','denied','FORGED');
  exception when others then insert into t values (12,'B forges audit entry','denied','denied'); end;

  -- ------------------------------------------------------ meetup precision
  perform set_config('request.jwt.claims', json_build_object('sub', A)::text, true);
  select id into v_ride from app.create_ride(
    'bike'::public.vehicle_mode,'Capacity Test Run', now() + interval '3 days',
    'Marina Lighthouse', 13.0500, 80.2824, 2);
  insert into t values (13,'A creates ride (cap 2)','ok','ok');

  select attendee_count into v_int from public.rides where id = v_ride;
  insert into t values (14,'captain occupies a seat','1', v_int::text);

  select round(lat::numeric,4)::text into v_txt from app.ride_meetup(v_ride);
  insert into t values (15,'captain reads exact pin','13.0500', v_txt);

  select round(extensions.ST_Y(meetup_area::extensions.geometry)::numeric,4)::text
    into v_txt from public.rides where id = v_ride;
  insert into t values (16,'public pin snapped to grid','13.0500', v_txt);

  perform set_config('request.jwt.claims', json_build_object('sub', C)::text, true);
  begin
    perform app.ride_meetup(v_ride);
    insert into t values (17,'non-roster reads exact pin','denied','LEAKED');
  exception when others then insert into t values (17,'non-roster reads exact pin','denied','denied'); end;

  -- --------------------------------------------------------------- chat
  perform set_config('request.jwt.claims', json_build_object('sub', A)::text, true);
  insert into public.ride_messages (ride_id, sender_id, body) values (v_ride, A, 'Captain here.');
  perform set_config('request.jwt.claims', json_build_object('sub', C)::text, true);
  select count(*) into v_int from public.ride_messages where ride_id = v_ride;
  insert into t values (18,'non-roster reads chat','0 rows', v_int || ' rows');

  begin
    insert into public.ride_messages (ride_id, sender_id, body) values (v_ride, C, 'let me in');
    insert into t values (19,'non-roster posts to chat','denied','POSTED');
  exception when others then insert into t values (19,'non-roster posts to chat','denied','denied'); end;

  -- ------------------------------------------------------------ capacity
  perform set_config('request.jwt.claims', json_build_object('sub', B)::text, true);
  perform app.join_ride(v_ride);
  select attendee_count into v_int from public.rides where id = v_ride;
  insert into t values (20,'B joins, ride now full','2', v_int::text);

  perform set_config('request.jwt.claims', json_build_object('sub', C)::text, true);
  begin
    perform app.join_ride(v_ride);
    insert into t values (21,'C joins a full ride','denied','OVERBOOKED');
  exception when others then insert into t values (21,'C joins a full ride','denied','denied'); end;

  select attendee_count into v_int from public.rides where id = v_ride;
  insert into t values (22,'count correct after refusal','2', v_int::text);

  -- ------------------------------------------------------- roster control
  begin
    perform app.remove_rider(v_ride, B);
    insert into t values (23,'non-captain removes rider','denied','REMOVED');
  exception when others then insert into t values (23,'non-captain removes rider','denied','denied'); end;

  perform set_config('request.jwt.claims', json_build_object('sub', A)::text, true);
  perform app.remove_rider(v_ride, B);
  select attendee_count into v_int from public.rides where id = v_ride;
  insert into t values (24,'captain removes rider, seat freed','1', v_int::text);

  perform set_config('request.jwt.claims', json_build_object('sub', B)::text, true);
  select count(*) into v_int from public.ride_messages where ride_id = v_ride;
  insert into t values (25,'removed rider reads chat','0 rows', v_int || ' rows');

  perform set_config('role','postgres', true);
end $$;

select n, name, expected, result,
       case when result = expected then 'PASS' else 'FAIL' end as verdict
from t order by n;

-- Cascade check: removing the auth user must erase every trace (DPDP erasure).
delete from auth.users where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333');

select
  (select count(*) from public.profiles)       as profiles,
  (select count(*) from public.rides)          as rides,
  (select count(*) from public.ride_attendees) as attendees,
  (select count(*) from public.ride_messages)  as messages,
  (select count(*) from private.ride_secrets)  as secrets;

commit;
