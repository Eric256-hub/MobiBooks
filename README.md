# MobiBooks

**A Digital Bookkeeping and Business Management Platform for Small Businesses in Mbale, Uganda**

MobiBooks is a React-based web application that helps small businesses maintain digital records of products, sales, expenses and inventory. The examination prototype also demonstrates a Verified Business Record Statement (VBRS) workflow for submitting business records for review and allowing an assigned SACCO officer to view approved statements.

> **Academic prototype notice:** This is a bounded prototype prepared for the Uganda Christian University MGT3151 E-Business, E-Commerce and E-Governance project. It is not a production financial service. Use fictitious or anonymised data only. It does not approve or disburse loans, move money, or send real SMS messages.

## Main functions

- User authentication through Supabase Auth.
- Business dashboard and bookkeeping records.
- Product and inventory management.
- Sales and expense recording.
- Transactions and business reports.
- Role-based VBRS screens for traders, reviewers, SACCO officers and administrators.
- Statement submission and validation through the `submit_statement` database function.
- Reviewer approval or rejection through the `decide_statement` database function.
- Approved statements are assigned a statement code and content hash.
- In-app notifications, simulated SMS notification records and administrative audit logs.

## Technology stack

- React 18 and TypeScript
- Vite 5
- Supabase (PostgreSQL database, authentication, Row Level Security and database functions)
- Tailwind CSS
- lucide-react icons

The exact package versions and available commands are recorded in [package.json](./package.json).

## Requirements

- Node.js (use a current supported LTS release)
- npm
- Git
- A Supabase project with the required database schema, policies and functions

## Local setup

1. Clone the repository:

   ```bash
   git clone https://github.com/Eric256-hub/MobiBooks.git
   cd MobiBooks
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a local environment file named `.env` in the project root. Add the URL and public/anonymous key for your own Supabase project:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   ```

   Replace the example values with your own project values. Do not commit `.env`, service-role keys, database passwords or any other secrets. The application uses the public/anonymous key and relies on database Row Level Security for data access.

4. Configure the Supabase database using the SQL migrations in `supabase/migrations/`, in chronological order. Confirm that the required tables, Row Level Security policies, functions and triggers exist before testing the application. Never run production or destructive SQL against a database containing real customer data.

5. Start the development server:

   ```bash
   npm run dev
   ```

   Open the local URL printed by Vite in your browser.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Build the application for deployment |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run the TypeScript type check |

Run the build and checks before submitting changes.

## Supabase configuration and data

The Supabase client is configured in `src/lib/supabase.ts` and reads:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The prototype uses database tables for profiles, SACCOs, products, sales, expenses, statement requests, notifications and audit logs. Access should be controlled by the configured Row Level Security policies and database functions. Do not disable RLS to make the application work.

The registration Edge Function is configured under `supabase/functions/register-user/`. Its Supabase function configuration is in `supabase/config.toml`. Deploy and configure Edge Functions only in a project you control, and never publish secrets in this repository.

## VBRS workflow

1. A signed-in trader records business activity and submits a statement request for a selected date range.
2. The database validates the trader, assigned SACCO, date range and minimum record count.
3. The request is made available to an authorised reviewer.
4. The reviewer approves or rejects the request; a rejection must include a reason.
5. An approved statement receives a statement code and content hash.
6. The trader and assigned SACCO officer receive notification records.
7. The SACCO officer can view approved statements assigned to that SACCO; the officer view is read-only.
8. Administrative audit records support accountability.

The current database validation requires a date period of at least 14 days and at least 10 combined sales and expense entries. Confirm the deployed database functions before relying on these rules in another environment.

The `sms_mock` channel represents a simulated notification record. It does not send a real SMS.

## Fictitious demonstration accounts

The following email addresses are intended for the examination demonstration. They are not real customer identities:

| Role | Demo email |
| --- | --- |
| Administrator | `admin.demo@example.com` |
| Reviewer | `reviewer.demo@example.com` |
| SACCO officer | `officer.demo@example.com` |
| Trader | `trader.demo@example.com` |
| Trader (second account) | `trader2.demo@example.com` |

Demo passwords are not published in this repository. Use the passwords configured by the project team for the demonstration environment, and share them with the examiner through the approved submission channel if required. Do not use personal or production account credentials.

## Testing

At minimum, verify:

- Successful sign-in and sign-out.
- Product creation and viewing.
- Sales recording and viewing.
- Expense recording and viewing.
- Dashboard and report calculations.
- Valid trader statement submission.
- Rejection of invalid statement periods or insufficient entries.
- Reviewer approval and rejection behaviour.
- Role restrictions, including read-only SACCO officer access.
- Notification and audit-log creation.

Record the expected result, actual result, pass/fail status and screenshot for each formal test case in the project's test evidence. A successful local build alone does not prove that every workflow or security control works.

## Prototype and source links

- Repository: https://github.com/Eric256-hub/MobiBooks
- Examination prototype: https://mobibooks-seven.vercel.app/

The hosted prototype depends on its configured Supabase project and may change as the examination team refines the system. For reproducibility, follow the local setup instructions above.

## Security, privacy and ethical use

- Use fictitious or anonymised demonstration data only.
- Never enter real payment card details, mobile-money PINs, OTPs, national identity numbers, medical records, biometric data or other sensitive personal information.
- Keep Supabase service-role keys and all secrets outside source control.
- Keep Row Level Security enabled and review role permissions before deployment.
- Use HTTPS for hosted access.
- Obtain informed consent before any interview, photograph or recording used as project evidence.
- This prototype does not perform real loan approval, loan disbursement, payments or live SMS delivery.

## Project and academic context

Prepared for **MGT3151 – E-Business, E-Commerce and E-Governance**, Uganda Christian University, Advent 2026 Semester. Project direction: **Option A – E-Business**.

The project team must maintain its own contribution records, test evidence, references, consent records where applicable and declaration of generative AI use in the final examination submission.

## License and acknowledgements

This repository is maintained for the MGT3151 academic project. Third-party libraries remain subject to their respective licenses. Any reused external code, assets or material must be acknowledged in the project report.
