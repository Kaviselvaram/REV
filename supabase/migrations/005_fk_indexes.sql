-- ============================================================================
-- REV · 005 · Cover the remaining foreign keys
--
-- Postgres does not index the referencing side of a foreign key for you. Any
-- delete on the parent then has to sequentially scan the child to check the
-- constraint — which is exactly the path account deletion takes, cascading
-- from auth.users through every table a member touched.
-- ============================================================================

create index if not exists reports_reporter_idx      on public.reports (reporter_id, created_at desc);
create index if not exists reports_ride_idx          on public.reports (ride_id);
create index if not exists messages_sender_idx       on public.ride_messages (sender_id);
