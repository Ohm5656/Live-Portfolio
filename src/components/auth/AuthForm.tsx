"use client";

import { FormEvent, useState } from 'react';
import { Eye, EyeOff, Lock, Loader2, LogIn, Mail, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { usePortfolioStore } from '@/store/usePortfolioStore';

export type AuthMode = 'signin' | 'signup';

const GMAIL_DOMAIN = '@gmail.com';

interface AuthFormProps {
  initialMode?: AuthMode;
  onAuthenticated?: () => void;
}

const getFriendlyAuthError = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Authentication failed.';

  if (message.toLowerCase().includes('email not confirmed')) {
    return 'Email is not confirmed yet. Please open the confirmation email from Supabase first, or disable Confirm email in Supabase Auth settings for instant login.';
  }

  if (message.toLowerCase().includes('email rate limit exceeded')) {
    return 'Supabase email limit has been reached. For development, disable Confirm email in Supabase Auth > Sign In / Providers > Email, then try signing up again.';
  }

  if (message.toLowerCase().includes('invalid login credentials')) {
    return 'Invalid email or password. If you just signed up, please confirm your email first before signing in.';
  }

  return message;
};

const getGmailUsername = (value: string) =>
  value
    .trim()
    .replace(/\s/g, '')
    .replace(/@gmail\.com$/i, '');

const getPasswordStrength = (password: string) => {
  let score = 0;

  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const normalizedScore = Math.min(score, 4);
  const levels = [
    { label: 'Too short', color: 'bg-slate-600', text: 'text-slate-400', width: 'w-1/12' },
    { label: 'Weak', color: 'bg-loss', text: 'text-loss-light', width: 'w-1/4' },
    { label: 'Fair', color: 'bg-gold-dark', text: 'text-gold-light', width: 'w-1/2' },
    { label: 'Good', color: 'bg-yellow-400', text: 'text-yellow-300', width: 'w-3/4' },
    { label: 'Strong', color: 'bg-profit', text: 'text-profit-light', width: 'w-full' },
  ];

  return levels[normalizedScore];
};

export function AuthForm({ initialMode = 'signup', onAuthenticated }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [gmailUsername, setGmailUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signInWithEmail = usePortfolioStore((state) => state.signInWithEmail);
  const signUpWithEmail = usePortfolioStore((state) => state.signUpWithEmail);
  const passwordStrength = getPasswordStrength(password);
  const isSignIn = mode === 'signin';

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    const email = `${getGmailUsername(gmailUsername)}${GMAIL_DOMAIN}`;

    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
        onAuthenticated?.();
      } else {
        const resultMessage = await signUpWithEmail(email.trim(), password);
        if (resultMessage) {
          setMessage(resultMessage);
          setMode('signin');
          setPassword('');
        } else {
          onAuthenticated?.();
        }
      }
    } catch (authError) {
      setError(getFriendlyAuthError(authError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-1.5 flex items-center gap-2 text-sm text-slate-300">
            <Mail className="h-4 w-4 text-slate-500" />
            Gmail
          </span>
          <div className="flex rounded-md border border-white/10 bg-navy-900/35 transition-colors focus-within:border-gold/45 focus-within:ring-1 focus-within:ring-gold/35">
            <input
              type="text"
              inputMode="email"
              autoComplete="username"
              required
              value={gmailUsername}
              onChange={(event) => setGmailUsername(getGmailUsername(event.target.value))}
              placeholder="yourname"
              className="h-11 min-w-0 flex-1 rounded-l-md bg-transparent px-4 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
            <div className="flex h-11 items-center rounded-r-md border-l border-white/10 bg-navy-900/50 px-4 text-sm text-slate-300">
              {GMAIL_DOMAIN}
            </div>
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-2 text-sm text-slate-300">
            <Lock className="h-4 w-4 text-slate-500" />
            Password
          </span>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete={isSignIn ? 'current-password' : 'new-password'}
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="6+ characters"
              className="h-11 bg-navy-900/35 px-4 pr-11 focus-visible:border-gold/45 focus-visible:ring-gold/35"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {!isSignIn && password.length > 0 && (
            <div className="mt-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full transition-all ${passwordStrength.width} ${passwordStrength.color}`} />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-slate-500">Password strength</span>
                <span className={passwordStrength.text}>{passwordStrength.label}</span>
              </div>
            </div>
          )}
        </label>

        {error && (
          <div className="rounded-md border border-loss/30 bg-loss/10 px-3 py-2 text-sm text-loss-light">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-md border border-profit/30 bg-profit/10 px-3 py-2 text-sm text-profit-light">
            {message}
          </div>
        )}

        <Button
          type="submit"
          variant="gold"
          className="h-12 w-full border-gold/40 bg-gold/25 text-base font-semibold shadow-[0_12px_32px_rgba(234,179,8,0.08)] hover:bg-gold/35"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isSignIn ? (
            <LogIn className="mr-2 h-4 w-4" />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          {isSignIn ? 'Sign in' : 'Create my portfolio'}
        </Button>

        {isSignIn && (
          <div className="text-center text-sm">
            <button
              type="button"
              className="font-medium text-slate-400 transition-colors hover:text-gold-light"
              onClick={() => switchMode('signup')}
            >
              Create an account
            </button>
          </div>
        )}
      </form>
    </>
  );
}
