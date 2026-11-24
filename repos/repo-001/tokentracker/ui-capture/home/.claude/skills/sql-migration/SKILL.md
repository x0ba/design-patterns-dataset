---
name: sql-migration
description: Write paired up/down Postgres migrations for the ledger services following the expand/contract pattern.
---

# sql-migration

- Name files `YYYYMMDDHHMM_<slug>.up.sql` / `.down.sql`
- Never drop a column in the same release that stops writing it
- Add indexes CONCURRENTLY
