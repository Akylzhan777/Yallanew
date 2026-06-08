/*
  # Enable pg_cron and pg_net extensions

  ## Summary
  Enables the two extensions required for scheduled HTTP-based automation:

  1. `pg_cron` - PostgreSQL job scheduler that allows cron-style scheduling of SQL commands
  2. `pg_net` - Async HTTP client for PostgreSQL, used to call Edge Functions from within cron jobs

  ## Notes
  - Both extensions are available in this Supabase project but not yet installed
  - pg_cron jobs are always scheduled in UTC
  - pg_net allows non-blocking HTTP requests directly from SQL
*/

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
