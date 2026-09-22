import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  History,
  BarChart3,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import Login from '@/pages/Login';

import Dashboard from '@/pages/Dashboard';
import Products from '@/pages/Products';
import Sales from '@/pages/Sales';
import Expenses from '@/pages/Expenses';
import Inventory from '@/pages/Inventory';
import Transactions from '@/pages/Transactions';
import Reports from '@/pages/Reports';

export type Page =
  | 'dashboard'
  | 'products'
  | 'sales'
  | 'expenses'
  | 'inventory'
  | 'transactions'
  | 'reports';

export type DashboardPeriod =
  | 'today'
  | 'week'
  | 'month';

const navItems: {
  id: Page;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'products',
    label: 'Products',
    icon: Package,
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: ShoppingCart,
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: Receipt,
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Package,
  },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: History,
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
  },
];

function App() {
  const [page, setPage] = useState<Page>('dashboard');

  const [dashboardPeriod, setDashboardPeriod] =
    useState<DashboardPeriod>('today');

  const [mobileNavOpen, setMobileNavOpen] =
    useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [showLoginSplash, setShowLoginSplash] =
    useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setAuthLoading(false);

        if (event === 'SIGNED_IN' && session?.user) {
          setShowLoginSplash(true);

          setTimeout(() => {
            setShowLoginSplash(false);
          }, 1500);
        }

        if (event === 'SIGNED_OUT') {
          setShowLoginSplash(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [page]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setPage('dashboard');
    setDashboardPeriod('today');
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <img
            src="/mobibooks-logo.png"
            alt="MobiBooks Logo"
            className="mx-auto w-28 h-28 object-contain"
          />

          <h1 className="mt-5 text-4xl font-bold text-slate-800">
            MobiBooks
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Digital Bookkeeping & Financial Records
          </p>

          <div className="mt-6 flex justify-center">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (showLoginSplash && user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <img
            src="/mobibooks-logo.png"
            alt="MobiBooks Logo"
            className="mx-auto w-28 h-28 object-contain"
          />

          <h1 className="mt-5 text-4xl font-bold text-slate-800">
            MobiBooks
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Digital Bookkeeping & Financial Records
          </p>

          <div className="mt-6 flex justify-center">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Preparing your dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={() => {}} />;
  }

  const navigateFromDashboard = (
    targetPage: Page,
    period?: DashboardPeriod
  ) => {
    if (period) {
      setDashboardPeriod(period);
    }

    setPage(targetPage);
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigate={navigateFromDashboard}
            selectedPeriod={dashboardPeriod}
            onPeriodChange={setDashboardPeriod}
          />
        );

      case 'products':
        return <Products />;

      case 'sales':
        return (
          <Sales
            period={dashboardPeriod}
            onPeriodChange={setDashboardPeriod}
          />
        );

      case 'expenses':
        return <Expenses />;

      case 'inventory':
        return <Inventory />;

      case 'transactions':
        return <Transactions />;

      case 'reports':
        return <Reports />;

      default:
        return (
          <Dashboard
            onNavigate={navigateFromDashboard}
            selectedPeriod={dashboardPeriod}
            onPeriodChange={setDashboardPeriod}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">

      {/* MOBILE HEADER */}
      <header className="lg:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <img
            src="/mobibooks-logo.png"
            alt="MobiBooks Logo"
            className="w-10 h-10 object-contain"
          />

          <div>
            <h1 className="font-bold text-slate-800 text-base leading-tight">
              MobiBooks
            </h1>

            <p className="text-xs text-slate-500 leading-tight">
              Digital Bookkeeping
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            setMobileNavOpen(!mobileNavOpen)
          }
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Toggle navigation"
        >
          {mobileNavOpen ? (
            <X size={24} />
          ) : (
            <Menu size={24} />
          )}
        </button>
      </header>

      {/* SIDEBAR */}
      <aside
        className={`${
          mobileNavOpen ? 'block' : 'hidden'
        } lg:block w-full lg:w-64 bg-white border-r border-slate-200 lg:min-h-screen flex-shrink-0`}
      >
        <div className="hidden lg:flex items-center gap-3 px-6 py-6 border-b border-slate-200">
          <img
            src="/mobibooks-logo.png"
            alt="MobiBooks Logo"
            className="w-12 h-12 object-contain"
          />

          <div>
            <h1 className="font-bold text-slate-800 text-lg leading-tight">
              MobiBooks
            </h1>

            <p className="text-sm text-slate-500 leading-tight">
              Digital Bookkeeping
            </p>
          </div>
        </div>

        <nav className="p-3 lg:p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-4 mt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500 mb-3 truncate">
            {user.email}
          </p>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>

        <div className="px-4 py-4 border-t border-slate-200 hidden lg:block">
          <p className="text-xs text-slate-400 leading-relaxed">
            Digital bookkeeping and financial records management.
          </p>

          <p className="text-xs text-slate-400 mt-2">
            MobiBooks
          </p>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;