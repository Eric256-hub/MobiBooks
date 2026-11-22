-- MobiBooks live-schema inspection queries
-- Run these in Supabase SQL Editor. These are read-only catalog queries.
-- Export each result set separately so the output is not cut off.

-- 1. Exact columns, types, nullability, and defaults for application tables.
SELECT
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'audit_logs', 'expenses', 'notifications', 'products',
    'profiles', 'saccos', 'sales', 'statement_requests'
  )
ORDER BY table_name, ordinal_position;

-- 2. All constraints for the eight application tables.
SELECT
  c.conrelid::regclass AS table_name,
  c.conname AS constraint_name,
  pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
WHERE c.connamespace = 'public'::regnamespace
  AND c.conrelid::regclass::text IN (
    'audit_logs', 'expenses', 'notifications', 'products',
    'profiles', 'saccos', 'sales', 'statement_requests'
  )
ORDER BY 1, 2;

-- 3. Index definitions.
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'audit_logs', 'expenses', 'notifications', 'products',
    'profiles', 'saccos', 'sales', 'statement_requests'
  )
ORDER BY tablename, indexname;

-- 4. RLS enabled/forced status.
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'audit_logs', 'expenses', 'notifications', 'products',
    'profiles', 'saccos', 'sales', 'statement_requests'
  )
ORDER BY c.relname;

-- 5. Trigger definitions on public tables.
SELECT
  event_object_table AS table_name,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name, event_manipulation;

-- 6. Function signatures and complete definitions.
SELECT
  p.oid::regprocedure AS function_signature,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'app_role', 'handle_new_user', 'submit_statement', 'decide_statement'
  )
ORDER BY p.proname;

-- 7. Table privileges for application roles only.
SELECT
  grantee,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY grantee, table_name, privilege_type;

-- 8. Function execution privileges for application roles.
SELECT
  grantee,
  routine_name,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role')
  AND routine_name IN (
    'app_role', 'handle_new_user', 'submit_statement', 'decide_statement'
  )
ORDER BY routine_name, grantee;
