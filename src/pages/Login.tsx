import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { EMAIL_RE } from '@/lib/types';

type Mode = 'login' | 'signup';

const inputClass =
  'w-full bg-surface border border-[rgba(var(--fg-rgb),0.1)] rounded-xl pl-11 pr-4 py-3.5 font-body text-[15px] text-ink placeholder:text-[rgba(var(--fg-rgb),0.25)] focus:border-electric outline-none transition-colors';

export default function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from || '/dashboard';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    // Client-side validation mirroring the API boundary rules.
    if (mode === 'signup' && !name.trim()) {
      setError('Name is required');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(name, email, password);
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong — try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-void flex items-center justify-center p-6">
      <div className="noise-overlay" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="w-full max-w-[440px]"
      >
        <div className="text-center mb-8">
          <span className="font-display text-[36px] tracking-[0.02em] text-acid">KRE8TRIX</span>
          <p className="font-body text-[14px] text-[rgba(var(--fg-rgb),0.42)] mt-1">
            The financial OS for creators
          </p>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--color-panel)) 0%, rgba(var(--acid-rgb),0.03) 100%)',
            border: '1px solid rgba(var(--fg-rgb),0.08)',
          }}
        >
          {/* Mode toggle */}
          <div className="flex bg-[rgba(var(--fg-rgb),0.06)] rounded-xl p-1 mb-6">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`flex-1 py-2.5 rounded-lg font-body text-[14px] font-medium transition-all ${
                  mode === m ? 'bg-acid text-void' : 'text-[rgba(var(--fg-rgb),0.42)] hover:text-ink'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence initial={false}>
              {mode === 'signup' && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative overflow-hidden"
                >
                  <User size={16} className="absolute left-4 top-[18px] text-[rgba(var(--fg-rgb),0.42)]" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    className={inputClass}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail size={16} className="absolute left-4 top-[18px] text-[rgba(var(--fg-rgb),0.42)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                autoComplete="email"
                className={inputClass}
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-4 top-[18px] text-[rgba(var(--fg-rgb),0.42)]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className={inputClass}
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="font-body text-[13px] text-negative"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-acid text-void font-body text-[16px] font-semibold py-3.5 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {submitting && <Loader2 size={18} className="animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </motion.button>
          </form>

          <p className="font-mono text-[11px] text-[rgba(var(--fg-rgb),0.3)] tracking-[0.04em] text-center mt-6">
            Demo environment — any email and a 6+ character password works
          </p>
        </div>
      </motion.div>
    </div>
  );
}
