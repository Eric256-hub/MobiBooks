/*
# MobiBooks Mbale - Core Database Schema

## Overview
Creates the database tables for MobiBooks Mbale, a digital bookkeeping and financial
record system for informal small-scale traders in Mbale, Uganda. This is a
single-tenant application with no authentication — all data is shared/public.

## New Tables

### 1. products
Stores the trader's inventory items.
- `id` (uuid, primary key)
- `name` (text, not null) — product name e.g. "Sugar"
- `category` (text, not null) — e.g. "Food", "Drinks", "Household"
- `buying_price` (integer, not null) — cost price in UGX
- `selling_price` (integer, not null) — selling price in UGX
- `quantity` (integer, not null, default 0) — current stock quantity
- `min_stock_level` (integer, not null, default 5) — low-stock threshold
- `is_sample` (boolean, default false) — marks demo/sample data
- `created_at` (timestamptz, default now)

### 2. sales
Records individual sales transactions.
- `id` (uuid, primary key)
- `product_id` (uuid, references products, ON DELETE SET NULL) — product sold
- `product_name` (text, not null) — snapshot of product name at time of sale
- `quantity` (integer, not null) — quantity sold
- `unit_price` (integer, not null) — selling price per unit in UGX
- `total_amount` (integer, not null) — total sale amount in UGX
- `sale_date` (timestamptz, not null, default now) — date and time of sale
- `is_sample` (boolean, default false) — marks demo/sample data
- `created_at` (timestamptz, default now)

### 3. expenses
Records individual expense transactions.
- `id` (uuid, primary key)
- `category` (text, not null) — e.g. "Transport", "Rent", "Stock Purchase"
- `amount` (integer, not null) — expense amount in UGX
- `description` (text) — optional description
- `expense_date` (timestamptz, not null, default now) — date of expense
- `is_sample` (boolean, default false) — marks demo/sample data
- `created_at` (timestamptz, default now)

## Security
- RLS enabled on all three tables.
- Single-tenant, no-auth app: all CRUD allowed for anon + authenticated roles
  using `USING (true)` / `WITH CHECK (true)` because the data is intentionally
  public/shared (no sign-in screen in this app).

## Sample Data
- 6 realistic Ugandan products (Sugar, Rice, Cooking Oil, Soap, Bread, Soft Drinks)
- 3 sample sales and 2 sample expenses, all marked with is_sample = true
*/

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  buying_price integer NOT NULL,
  selling_price integer NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  min_stock_level integer NOT NULL DEFAULT 5,
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_products" ON products;
CREATE POLICY "anon_select_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_products" ON products;
CREATE POLICY "anon_insert_products" ON products FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_products" ON products;
CREATE POLICY "anon_update_products" ON products FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_products" ON products;
CREATE POLICY "anon_delete_products" ON products FOR DELETE
  TO anon, authenticated USING (true);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price integer NOT NULL,
  total_amount integer NOT NULL,
  sale_date timestamptz NOT NULL DEFAULT now(),
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sales" ON sales;
CREATE POLICY "anon_select_sales" ON sales FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sales" ON sales;
CREATE POLICY "anon_insert_sales" ON sales FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sales" ON sales;
CREATE POLICY "anon_update_sales" ON sales FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sales" ON sales;
CREATE POLICY "anon_delete_sales" ON sales FOR DELETE
  TO anon, authenticated USING (true);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  amount integer NOT NULL,
  description text,
  expense_date timestamptz NOT NULL DEFAULT now(),
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_expenses" ON expenses;
CREATE POLICY "anon_select_expenses" ON expenses FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_expenses" ON expenses;
CREATE POLICY "anon_insert_expenses" ON expenses FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_expenses" ON expenses;
CREATE POLICY "anon_update_expenses" ON expenses FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_expenses" ON expenses;
CREATE POLICY "anon_delete_expenses" ON expenses FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);

-- Sample data: Products (realistic Ugandan market items)
INSERT INTO products (name, category, buying_price, selling_price, quantity, min_stock_level, is_sample) VALUES
  ('Sugar (1kg)', 'Food', 4500, 5200, 20, 5, true),
  ('Rice (1kg)', 'Food', 4000, 4800, 15, 5, true),
  ('Cooking Oil (1L)', 'Household', 5500, 6500, 8, 5, true),
  ('Soap (bar)', 'Household', 1500, 2000, 30, 10, true),
  ('Bread (loaf)', 'Food', 3000, 3500, 3, 5, true),
  ('Soft Drinks (500ml)', 'Drinks', 1500, 2000, 24, 10, true)
ON CONFLICT DO NOTHING;

-- Sample data: Sales (today and recent days)
-- Use a CTE to get product IDs for sample sales
WITH product_ids AS (
  SELECT name, id FROM products WHERE is_sample = true
)
INSERT INTO sales (product_id, product_name, quantity, unit_price, total_amount, sale_date, is_sample)
SELECT
  p.id,
  p.name,
  s.qty,
  s.price,
  s.qty * s.price,
  s.sale_date,
  true
FROM (VALUES
  ('Sugar (1kg)', 2, 5200, now() - interval '2 hours'),
  ('Soft Drinks (500ml)', 6, 2000, now() - interval '5 hours'),
  ('Rice (1kg)', 1, 4800, now() - interval '1 day' - interval '3 hours'),
  ('Soap (bar)', 5, 2000, now() - interval '1 day' - interval '1 hour')
) AS s(name, qty, price, sale_date)
JOIN product_ids p ON p.name = s.name
ON CONFLICT DO NOTHING;

-- Sample data: Expenses
INSERT INTO expenses (category, amount, description, expense_date, is_sample) VALUES
  ('Transport', 5000, 'Boda boda to market', now() - interval '3 hours', true),
  ('Stock Purchase', 45000, 'Bought sugar and rice from wholesaler', now() - interval '1 day', true),
  ('Rent', 50000, 'Market stall rent for the week', now() - interval '2 days', true)
ON CONFLICT DO NOTHING;
