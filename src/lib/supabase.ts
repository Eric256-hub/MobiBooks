import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
    },
  }
);

export interface Product {
  id: string;
  user_id: string | null;

  name: string;
  category: string | null;
  description?: string | null;

  buying_price: number;
  selling_price: number;

  quantity: number;
  quantity_sold: number;

  min_stock_level: number;

  is_sample: boolean;
  created_at: string;
}

export interface Sale {
  id: string;
  user_id: string | null;

  product_id: string | null;
  product_name: string;

  quantity: number;
  unit_price: number;
  total_amount: number;

  profit_amount: number;

  sale_date: string;

  is_sample: boolean;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string | null;

  category: string;
  amount: number;
  description: string | null;

  expense_date: string;

  is_sample: boolean;
  created_at: string;
}