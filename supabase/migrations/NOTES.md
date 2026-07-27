# Migrations

Both projects are kept structurally identical:

- production `ronqiihqsxopcfyvkvyx`
- staging    `safwykqfsczxvtvxzzzr`

Both in ap-south-1 (Mumbai), Postgres 17.

## Applying

Every schema change ships as a numbered file here and is applied to **staging
first**, verified, then mirrored to production. Nothing is changed by hand in a
dashboard — a change that is not in this directory cannot be reproduced.

## A gap worth recording

Migrations 008, 010, 014, 015, 017 and 020 were applied through the management
API during the build and were not written to files at the time. 013 was written
but was mirrored to production late.

The consequence was real: production ran for a period without the standing
engine (founding numbers, badges, captain ladder) and without the memory layer
(recaps, ride photos, machine milestones) — six tables that staging had and
production did not. Signup would have failed on the first real member, because
`complete_signup` calls `claim_founding_number`.

It was caught by diffing `pg_tables` between the two projects rather than by
trusting the migration list. **Diff the schemas, not the intentions** — that is
the check worth repeating before any release.
