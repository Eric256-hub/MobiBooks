# MobiBooks database verification

This document records database facts returned by the live Supabase project during the MGT3151 project preparation. It is an evidence snapshot, not a replacement for the complete migration history.

## Verification status

- The live database contains eight application tables: `audit_logs`, `expenses`, `notifications`, `products`, `profiles`, `saccos`, `sales`, and `statement_requests`.
- Row-level security is enabled on all eight tables.
- The foreign keys and policies below were copied from the Supabase catalog query output supplied for this project.
- The catalog output supplied so far is truncated during the `postgres` table grants. It does not include the complete grant list or the trigger rows. Therefore, this file deliberately does not claim to be a complete privilege/trigger export.
- The repository's `03_Process_and_Design/Database_ERD` path was not present in the inspected `main` branch tree. The ERD must be added at that location and checked against the relationships below before submission.
- Do not apply a reconstructed schema to a production database. First compare it with a fresh project and validate it in a disposable Supabase project.

## Confirmed foreign keys and constraints

| Table | Constraint | Definition |
|---|---|---|
| audit_logs | audit_logs_pkey | PRIMARY KEY (id) |
| audit_logs | audit_logs_user_id_fkey | FOREIGN KEY (user_id) REFERENCES profiles(id) |
| expenses | expenses_pkey | PRIMARY KEY (id) |
| expenses | expenses_user_id_fkey | FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE |
| notifications | notifications_pkey | PRIMARY KEY (id) |
| notifications | notifications_channel_check | CHECK channel is either `in_app` or `sms_mock` |
| notifications | notifications_request_id_fkey | FOREIGN KEY (request_id) REFERENCES statement_requests(id) |
| notifications | notifications_user_id_fkey | FOREIGN KEY (user_id) REFERENCES profiles(id) |
| products | products_pkey | PRIMARY KEY (id) |
| products | products_user_id_fkey | FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE |
| profiles | profiles_pkey | PRIMARY KEY (id) |
| profiles | profiles_id_fkey | FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE |
| profiles | profiles_role_check | role is one of `trader`, `reviewer`, `officer`, `admin` |
| profiles | profiles_sacco_id_fkey | FOREIGN KEY (sacco_id) REFERENCES saccos(id) |
| saccos | saccos_pkey | PRIMARY KEY (id) |
| sales | sales_pkey | PRIMARY KEY (id) |
| sales | sales_product_id_fkey | FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL |
| sales | sales_user_id_fkey | FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE |
| statement_requests | statement_requests_pkey | PRIMARY KEY (id) |
| statement_requests | statement_requests_check | CHECK period_to >= period_from |
| statement_requests | statement_requests_status_check | status is one of `draft`, `submitted`, `approved`, `rejected` |
| statement_requests | statement_requests_reviewer_id_fkey | FOREIGN KEY (reviewer_id) REFERENCES profiles(id) |
| statement_requests | statement_requests_sacco_id_fkey | FOREIGN KEY (sacco_id) REFERENCES saccos(id) |
| statement_requests | statement_requests_trader_id_fkey | FOREIGN KEY (trader_id) REFERENCES profiles(id) |

Important correction: `products.user_id`, `sales.user_id`, and `expenses.user_id` reference `auth.users(id)`, not `profiles(id)`.

## Confirmed RLS policies

All policies below are on the `public` schema and apply to the `authenticated` role.

| Table | Policy | Command | Rule |
|---|---|---|---|
| audit_logs | exam_audit_select | SELECT | `app_role() = 'admin'` |
| expenses | Users can create their own expenses | INSERT | authenticated UID must equal `user_id` |
| expenses | Users can insert their own expenses | INSERT | `user_id = auth.uid()` |
| expenses | Users can delete their own expenses | DELETE | `auth.uid() = user_id` |
| expenses | Users can update their own expenses | UPDATE | row must belong to UID before and after update |
| expenses | Users can view their own expenses | SELECT | authenticated UID must equal `user_id` |
| notifications | exam_notifications_select | SELECT | recipient UID or admin |
| products | Users can create their own products | INSERT | authenticated UID must equal `user_id` |
| products | Users can insert their own products | INSERT | `user_id = auth.uid()` |
| products | Users can delete their own products | DELETE | `auth.uid() = user_id` |
| products | Users can update their own products | UPDATE | row must belong to UID before and after update |
| products | Users can view their own products | SELECT | authenticated UID must equal `user_id` |
| profiles | exam_profiles_select | SELECT | own profile, admin, or reviewer |
| saccos | exam_saccos_select | SELECT | `true` for authenticated users |
| sales | Users can create their own sales | INSERT | authenticated UID must equal `user_id` |
| sales | Users can insert their own sales | INSERT | `user_id = auth.uid()` |
| sales | Users can delete their own sales | DELETE | `auth.uid() = user_id` |
| sales | Users can update their own sales | UPDATE | row must belong to UID before and after update |
| sales | Users can view their own sales | SELECT | authenticated UID must equal `user_id` |
| statement_requests | exam_requests_select | SELECT | trader sees own requests; reviewer/admin see requests; officer sees approved requests for assigned SACCO |

The catalog shows two INSERT policies on each of `products`, `sales`, and `expenses`. They appear to enforce equivalent ownership checks. Preserve the live policies in the evidence record; any consolidation should be a separately tested cleanup migration.

## Confirmed application table grants

The supplied catalog output confirms these grants to `authenticated`:

- `audit_logs`: SELECT
- `notifications`: SELECT
- `statement_requests`: SELECT
- `profiles`: SELECT
- `saccos`: SELECT
- `products`, `sales`, `expenses`: SELECT, INSERT, UPDATE, DELETE

The supplied output also contains many `postgres` grants, but it was cut off before the complete list. Do not treat this list as a full export of all role privileges.

## Function and trigger inventory

The live project definitions were supplied separately for these functions:

- `public.app_role()`
- `public.handle_new_user()`
- `public.submit_statement(p_from date, p_to date, p_sacco uuid)`
- `public.decide_statement(p_id uuid, p_approve boolean, p_reason text)`

The function bodies must be stored verbatim in a versioned SQL migration after the complete function text and execution grants have been checked. The trigger catalog output is still required to confirm the trigger name, timing, event, and target table for `handle_new_user()`.

The current catalog output reports EXECUTE grants to `PUBLIC` and `anon` for `app_role` and `handle_new_user`. This deserves a deliberate security review. Do not revoke or change these permissions blindly: first verify the registration flow and the trigger's required execution context in a test project.

## Remaining evidence required before calling the database export complete

1. Full remainder of the catalog query output, including all table grants, trigger rows, and function grants.
2. Exact column definitions, types, nullability, defaults, and indexes for all eight tables.
3. Verbatim definitions of the four functions, checked against the live SQL editor output.
4. Exact trigger definition for the profile-creation trigger.
5. ERD file committed under `03_Process_and_Design/Database_ERD`.
6. Fictitious seed SQL validated against a clean test database. Do not insert records into `auth.users` from a public seed script and do not commit passwords, password hashes, tokens, or service-role keys.

## Reproducibility warning

The existing migration files in this repository do not, by themselves, establish that a clean Supabase project will reproduce the current eight-table schema and its current hardened RLS/grant configuration. Treat the live database as the evidence source and complete a clean-project migration test before describing the migration set as reproducible.
