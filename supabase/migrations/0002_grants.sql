-- Only needed if the app shows "Error code: 42501" after logging in.
-- Some newer Supabase projects don't give logged-in users access to new tables automatically.
-- Row-level security from 0001_init.sql still limits each user to their own rows.
-- Safe to run more than once.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
