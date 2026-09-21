ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS user_id uuid
REFERENCES auth.users(id)
ON DELETE CASCADE;

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS user_id uuid
REFERENCES auth.users(id)
ON DELETE CASCADE;

ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS user_id uuid
REFERENCES auth.users(id)
ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_products_user_id
ON public.products(user_id);

CREATE INDEX IF NOT EXISTS idx_sales_user_id
ON public.sales(user_id);

CREATE INDEX IF NOT EXISTS idx_expenses_user_id
ON public.expenses(user_id);

NOTIFY pgrst, 'reload schema';