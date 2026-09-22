import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type BusinessCategory = {
  category: string;
  businesses: string[];
};

const businessCategories: BusinessCategory[] = [
  {
    category: 'Food & Hospitality',
    businesses: [
      'Restaurant',
      'Café / Coffee Shop',
      'Bar / Pub',
      'Hotel / Lodge',
      'Guest House',
      'Food Vendor',
      'Bakery',
      'Butcher Shop',
      'Catering Services',
      'Fast Food Business',
      'Juice / Beverage Business',
    ],
  },
  {
    category: 'Shops & Retail',
    businesses: [
      'Grocery / General Shop',
      'Retail Shop',
      'Wholesale Shop',
      'Supermarket',
      'Mini Supermarket',
      'Convenience Store',
      'Market Stall',
      'Kiosk',
      'Boutique / Clothing Shop',
      'Shoe Shop',
      'Furniture Shop',
      'Household Goods Shop',
      'Cosmetics / Beauty Shop',
      'Gift Shop',
    ],
  },
  {
    category: 'Technology & Electronics',
    businesses: [
      'Electronics Shop',
      'Phone / Smartphone Shop',
      'Computer Shop',
      'Phone Repair Shop',
      'Computer Repair Shop',
      'Internet Café',
      'Printing / Photocopying',
      'Stationery / Bookshop',
      'Cyber Services',
      'Technology Services',
    ],
  },
  {
    category: 'Finance & Mobile Services',
    businesses: [
      'Mobile Money',
      'Airtel Money',
      'Financial Services',
      'Microfinance Business',
      'Savings / SACCO Services',
      'Insurance Services',
    ],
  },
  {
    category: 'Health',
    businesses: [
      'Pharmacy / Drug Shop',
      'Medical Clinic',
      'Dental Clinic',
      'Optical Shop',
      'Laboratory Services',
      'Health Products',
    ],
  },
  {
    category: 'Beauty & Personal Care',
    businesses: [
      'Salon',
      'Barber Shop',
      'Beauty Parlour',
      'Spa',
      'Nail Salon',
      'Makeup Services',
      'Massage Services',
    ],
  },
  {
    category: 'Construction & Hardware',
    businesses: [
      'Hardware Shop',
      'Building Materials',
      'Electrical Supplies',
      'Plumbing Supplies',
      'Paint Shop',
      'Carpentry',
      'Welding',
      'Masonry',
      'Construction Services',
    ],
  },
  {
    category: 'Agriculture',
    businesses: [
      'Farm',
      'Crop Farming',
      'Livestock Farming',
      'Poultry Farming',
      'Fish Farming',
      'Agricultural Produce',
      'Agrovet / Farm Supplies',
      'Seed & Fertilizer Shop',
      'Animal Feeds',
      'Fruit & Vegetable Vendor',
      'Grain / Cereals Business',
    ],
  },
  {
    category: 'Transport & Automotive',
    businesses: [
      'Taxi / Public Transport',
      'Boda Boda',
      'Motorcycle Business',
      'Car Hire',
      'Transport Services',
      'Delivery Services',
      'Courier Services',
      'Auto Parts Shop',
      'Motorcycle Parts Shop',
      'Car Wash',
      'Vehicle Repair / Garage',
      'Tyre Shop',
      'Fuel / Petrol Station',
    ],
  },
  {
    category: 'Fashion & Creative',
    businesses: [
      'Tailoring',
      'Fashion Design',
      'Clothing Manufacturing',
      'Textile / Fabric Shop',
      'Jewellery Shop',
      'Photography',
      'Videography',
      'Graphic Design',
      'Printing Business',
      'Event Decoration',
      'Events Management',
    ],
  },
  {
    category: 'Education',
    businesses: [
      'Private School',
      'Nursery / Kindergarten',
      'Tutoring Services',
      'Training Centre',
      'Computer Training',
      'Educational Services',
    ],
  },
  {
    category: 'Professional Services',
    businesses: [
      'Consulting',
      'Accounting Services',
      'Legal Services',
      'Real Estate',
      'Property Management',
      'Travel Agency',
      'Cleaning Services',
      'Security Services',
      'Professional Services',
    ],
  },
  {
    category: 'Manufacturing & Production',
    businesses: [
      'Food Processing',
      'Furniture Manufacturing',
      'Soap / Detergent Production',
      'Beverage Production',
      'Handcrafts / Crafts',
      'Small-Scale Manufacturing',
    ],
  },
  {
    category: 'Online & Digital',
    businesses: [
      'Online Shop',
      'E-commerce Business',
      'Digital Services',
      'Social Media Business',
      'Freelance Services',
      'Online Food Business',
    ],
  },
  {
    category: 'Other',
    businesses: ['Other'],
  },
];

export default function Login() {
  const [showSplash, setShowSplash] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [phone, setPhone] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [businessDropdownOpen, setBusinessDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  /*
   * Splash screen
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  /*
   * Close business dropdown when clicking outside
   */
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setBusinessDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const clearMessages = () => {
    setMessage('');
    setErrorMessage('');
  };

  const switchToLogin = () => {
    setIsRegistering(false);
    setBusinessDropdownOpen(false);
    clearMessages();

    setPassword('');
    setConfirmPassword('');
  };

  const switchToRegister = () => {
    setIsRegistering(true);
    setBusinessDropdownOpen(false);
    clearMessages();

    setPassword('');
    setConfirmPassword('');
  };

  /*
   * LOGIN
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    clearMessages();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setErrorMessage('Please enter your email address and password.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      /*
       * Successful login message first.
       */
      setMessage('Login successful! Welcome back to MobiBooks.');

      /*
       * Then go to dashboard.
       */
      setTimeout(() => {
        window.location.href = '/';
      }, 1200);
    } catch (error) {
      console.error(error);

      setErrorMessage(
        'Unable to sign in right now. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * REGISTRATION
   */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    clearMessages();

    const cleanFullName = fullName.trim();
    const cleanBusinessName = businessName.trim();
    const cleanBusinessType = businessType.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (
      !cleanFullName ||
      !cleanBusinessName ||
      !cleanBusinessType ||
      !cleanPhone ||
      !cleanEmail ||
      !password ||
      !confirmPassword
    ) {
      setErrorMessage('Please complete all registration fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        'Your password must contain at least 6 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('The passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        'register-user',
        {
          body: {
            email: cleanEmail,
            password,
            fullName: cleanFullName,
            businessName: cleanBusinessName,
            businessType: cleanBusinessType,
            phone: cleanPhone,
          },
        }
      );

      if (error) {
        console.error('Registration error:', error);

        setErrorMessage(
          error.message ||
            'Account creation failed. Please try again.'
        );

        return;
      }

      if (data?.error) {
        setErrorMessage(data.error);
        return;
      }

      /*
       * IMPORTANT:
       * Do NOT automatically log the user in.
       */
      setMessage(
        'Account created successfully! Please sign in to continue.'
      );

      /*
       * Clear registration data.
       */
      setFullName('');
      setBusinessName('');
      setBusinessType('');
      setPhone('');
      setPassword('');
      setConfirmPassword('');

      /*
       * Move to login after the success message is visible.
       */
      setTimeout(() => {
        setIsRegistering(false);

        /*
         * Keep the success message visible on the login screen.
         */
        setMessage(
          'Account created successfully! Please sign in to continue.'
        );
      }, 1400);
    } catch (error) {
      console.error(error);

      setErrorMessage(
        'Account creation failed. Please check your information and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * FORGOT PASSWORD
   */
  const handleForgotPassword = async () => {
    clearMessages();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage(
        'Enter your email address first, then click Forgot password.'
      );
      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setMessage(
        'Password reset instructions have been sent to your email.'
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        'Unable to send password reset instructions.'
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * SPLASH SCREEN
   */
  if (showSplash) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07152f] px-6">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-[120px]" />

        <div className="relative text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl">
            <img
              src="/mobibooks-logo.png"
              alt="MobiBooks"
              className="h-16 w-16 object-contain"
            />
          </div>

          <h1 className="mt-7 text-4xl font-bold tracking-tight text-white">
            MobiBooks
          </h1>

          <p className="mt-2 text-sm text-blue-200">
            Simple business records. Better decisions.
          </p>

          <div className="mt-7 flex justify-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400 [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    );
  }

  /*
   * MAIN AUTH SCREEN
   */
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07152f] px-4 py-8 sm:px-6">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-220px] h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[130px]" />

        <div className="absolute bottom-[-180px] left-[-120px] h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[130px]" />

        <div className="absolute bottom-[-180px] right-[-120px] h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[130px]" />

        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] [background-size:40px_40px]" />
      </div>

      <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="w-full max-w-[500px]">
          {/* Brand */}
          <div className="mb-7 text-center">
            <div className="mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-[22px] border border-white/15 bg-white/10 shadow-2xl shadow-blue-950/40 backdrop-blur-xl">
              <img
                src="/mobibooks-logo.png"
                alt="MobiBooks"
                className="h-12 w-12 object-contain"
              />
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
              MobiBooks
            </h1>

            <p className="mt-1 text-sm text-blue-200/80">
              Business management made simple
            </p>
          </div>

          {/* Authentication card */}
          <div className="overflow-visible rounded-[28px] border border-white/10 bg-white/[0.97] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-8">
            {/* Header */}
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                {isRegistering ? (
                  <User className="h-5 w-5" />
                ) : (
                  <LockKeyhole className="h-5 w-5" />
                )}
              </div>

              <h2 className="text-[26px] font-bold tracking-tight text-slate-900">
                {isRegistering
                  ? 'Create your account'
                  : 'Welcome back'}
              </h2>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {isRegistering
                  ? 'Create your MobiBooks account and start managing your business records.'
                  : 'Sign in to continue managing your business records.'}
              </p>
            </div>

            {/* Success */}
            {message && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                <div>
                  <p className="text-sm font-bold text-emerald-800">
                    Success
                  </p>

                  <p className="mt-0.5 text-sm leading-5 text-emerald-700">
                    {message}
                  </p>
                </div>
              </div>
            )}

            {/* Error */}
            {errorMessage && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
                <p className="text-sm font-bold text-red-800">
                  Something went wrong
                </p>

                <p className="mt-0.5 text-sm leading-5 text-red-700">
                  {errorMessage}
                </p>
              </div>
            )}

            {/* LOGIN */}
            {!isRegistering && (
              <form
                onSubmit={handleLogin}
                className="mt-7 space-y-5"
              >
                {/* Email */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Email address
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearMessages();
                      }}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700">
                      Password
                    </label>

                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={loading}
                      className="text-xs font-semibold text-blue-600 transition hover:text-blue-700"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="relative">
                    <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearMessages();
                      }}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((value) => !value)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Login button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-900/30 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs text-slate-400">
                    New to MobiBooks?
                  </span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                {/* Create account */}
                <button
                  type="button"
                  onClick={switchToRegister}
                  className="h-[50px] w-full rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  Create an account
                </button>
              </form>
            )}

            {/* REGISTER */}
            {isRegistering && (
              <form
                onSubmit={handleRegister}
                className="mt-7 space-y-4"
              >
                {/* Full Name + Business Name */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Full name
                    </label>

                    <div className="relative">
                      <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          clearMessages();
                        }}
                        placeholder="Your name"
                        autoComplete="name"
                        className="h-[50px] w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Business name
                    </label>

                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => {
                          setBusinessName(e.target.value);
                          clearMessages();
                        }}
                        placeholder="Business name"
                        autoComplete="organization"
                        className="h-[50px] w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Business Type */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Business type
                  </label>

                  <div
                    ref={dropdownRef}
                    className="relative"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setBusinessDropdownOpen(
                          (value) => !value
                        )
                      }
                      className={`flex h-[50px] w-full items-center justify-between rounded-2xl border px-4 text-left text-sm outline-none transition-all ${
                        businessDropdownOpen
                          ? 'border-blue-500 bg-white ring-4 ring-blue-100'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <span
                        className={
                          businessType
                            ? 'font-medium text-slate-900'
                            : 'text-slate-400'
                        }
                      >
                        {businessType ||
                          'Select your business type'}
                      </span>

                      <ChevronDown
                        className={`h-5 w-5 text-slate-400 transition-transform ${
                          businessDropdownOpen
                            ? 'rotate-180'
                            : ''
                        }`}
                      />
                    </button>

                    {businessDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-[330px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15">
                        {businessCategories.map(
                          (category) => (
                            <div key={category.category}>
                              <div className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                {category.category}
                              </div>

                              {category.businesses.map(
                                (business) => (
                                  <button
                                    key={business}
                                    type="button"
                                    onClick={() => {
                                      setBusinessType(
                                        business
                                      );
                                      setBusinessDropdownOpen(
                                        false
                                      );
                                      clearMessages();
                                    }}
                                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                                      businessType ===
                                      business
                                        ? 'bg-blue-50 font-semibold text-blue-700'
                                        : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span>
                                      {business}
                                    </span>

                                    {businessType ===
                                      business && (
                                      <Check className="h-4 w-4 shrink-0 text-blue-600" />
                                    )}
                                  </button>
                                )
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Phone + Email */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Phone number
                    </label>

                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          clearMessages();
                        }}
                        placeholder="07XX XXX XXX"
                        autoComplete="tel"
                        className="h-[50px] w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Email address
                    </label>

                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          clearMessages();
                        }}
                        placeholder="you@example.com"
                        autoComplete="email"
                        className="h-[50px] w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Password
                  </label>

                  <div className="relative">
                    <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearMessages();
                      }}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      className="h-[50px] w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) => !value
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Confirm password
                  </label>

                  <div className="relative">
                    <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      type={
                        showConfirmPassword
                          ? 'text'
                          : 'password'
                      }
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(
                          e.target.value
                        );
                        clearMessages();
                      }}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      className="h-[50px] w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (value) => !value
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Register button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group mt-2 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-900/30 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>

                {/* Login */}
                <div className="pt-1 text-center text-sm text-slate-500">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={switchToLogin}
                    className="font-bold text-blue-600 hover:text-blue-700"
                  >
                    Sign in
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-blue-200/50">
            MobiBooks · Simple business management
          </p>
        </div>
      </div>
    </div>
  );
}