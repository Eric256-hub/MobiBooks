import { useState } from 'react';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, Button, Input } from '@/components/ui';

type LoginProps = {
  onLogin: () => void;
};

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError('');
    setMessage('');

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError('Email address is required.');
      return;
    }

    if (!cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          onLogin();
        } else {
          setMessage(
            'Account created successfully. Please check your email to confirm your account, then sign in.'
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          throw error;
        }

        onLogin();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setIsRegistering((current) => !current);
    setError('');
    setMessage('');
    setPassword('');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-6 sm:p-8 shadow-lg">
        {/* MobiBooks Branding */}
        <div className="text-center mb-7">
          <div className="flex justify-center mb-4">
            <img
              src="/mobibooks-logo.png"
              alt="MobiBooks Logo"
              className="w-24 h-24 object-contain"
            />
          </div>

          <h1 className="text-3xl font-bold text-slate-800">
            MobiBooks
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Digital Bookkeeping & Financial Records
          </p>
        </div>

        {/* Login Heading */}
        <h2 className="text-xl font-bold text-slate-800 mb-1">
          {isRegistering ? 'Create your account' : 'Welcome back'}
        </h2>

        <p className="text-sm text-slate-500 mb-5">
          {isRegistering
            ? 'Create an account to manage your business records.'
            : 'Sign in to access your business records.'}
        </p>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
            <AlertCircle
              size={20}
              className="text-rose-600 mt-0.5 flex-shrink-0"
            />

            <p className="text-sm text-rose-700">
              {error}
            </p>
          </div>
        )}

        {/* Success Message */}
        {message && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <p className="text-sm text-emerald-700">
              {message}
            </p>
          </div>
        )}

        {/* Login / Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="trader@example.com"
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="At least 6 characters"
            required
            minLength={6}
          />

          <Button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2"
          >
            {isRegistering ? (
              <UserPlus size={20} />
            ) : (
              <LogIn size={20} />
            )}

            {loading
              ? 'Please wait...'
              : isRegistering
              ? 'Create Account'
              : 'Sign In'}
          </Button>
        </form>

        {/* Switch Login / Register */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={switchMode}
            disabled={loading}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50"
          >
            {isRegistering
              ? 'Already have an account? Sign in'
              : "Don't have an account? Create one"}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} MobiBooks
          </p>
        </div>
      </Card>
    </div>
  );
}