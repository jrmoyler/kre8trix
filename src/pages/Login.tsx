import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2, Lock, Mail, User as UserIcon } from 'lucide-react';
import { ApiError } from '@/lib/api/index';
import { useAuth } from '@/lib/auth-context';

type Mode = 'login' | 'signup';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClasses =
  'w-full h-12 pl-11 pr-4 rounded-2xl bg-panel border border-[rgba(255,255,255,0.08)] font-body text-[15px] text-white placeholder:text-[rgba(255,255,255,0.28)] outline-none transition-colors focus:border-acid/50 hover:border-[rgba(255,255,255,0.14)]';

const labelClasses =
  'block font-mono text-[11px] tracking-[0.08em] uppercase text-[rgba(255,255,255,0.42)] mb-2';

export default function Login() {
  const { user, loading, login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/dashboard';

  /* Already signed in — nothing to do here */
  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address';
    if (password.length < 8) errors.password = 'Password must be at least 8 characters';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setFormError(null);
    setFieldErrors({});
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await signup(email.trim(), password, name.trim() || undefined);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        {/* Wordmark */}
        <div className="flex items-center gap-3 mb-10">
          <span className="w-9 h-9 rounded-xl bg-acid flex items-center justify-center font-display text-[20px] text-void">
            K8
          </span>
          <span className="font-display text-[24px] tracking-[0.04em] text-white">KRE8TRIX</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h1 className="font-display text-[48px] tracking-[0.02em] text-white mb-2">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="font-body text-[16px] text-[rgba(255,255,255,0.42)] mb-8">
              {mode === 'login'
                ? 'Sign in to your creator finance HQ'
                : 'Start building your Creator Credit Score'}
            </p>

            {formError && (
              <div className="flex items-start gap-3 p-4 mb-6 rounded-2xl bg-negative/10 border border-negative/30">
                <AlertCircle size={18} className="text-negative flex-shrink-0 mt-0.5" />
                <p className="font-body text-[14px] text-negative">{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {mode === 'signup' && (
                <div>
                  <label htmlFor="name" className={labelClasses}>
                    Name
                  </label>
                  <div className="relative">
                    <UserIcon
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.28)]"
                    />
                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Alex Creates"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClasses}
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className={labelClasses}>
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.28)]"
                  />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="alex@creates.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${inputClasses} ${fieldErrors.email ? 'border-negative/50' : ''}`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-2 font-mono text-[12px] text-negative">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className={labelClasses}>
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.28)]"
                  />
                  <input
                    id="password"
                    type="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClasses} ${fieldErrors.password ? 'border-negative/50' : ''}`}
                  />
                </div>
                {fieldErrors.password && (
                  <p className="mt-2 font-mono text-[12px] text-negative">{fieldErrors.password}</p>
                )}
              </div>

              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={{ scale: submitting ? 1 : 1.01 }}
                whileTap={{ scale: submitting ? 1 : 0.99 }}
                className="w-full h-12 rounded-2xl bg-acid text-void font-body text-[15px] font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting
                  ? mode === 'login'
                    ? 'Signing in…'
                    : 'Creating account…'
                  : mode === 'login'
                    ? 'Sign In'
                    : 'Create Account'}
              </motion.button>
            </form>

            <p className="mt-8 text-center font-body text-[14px] text-[rgba(255,255,255,0.42)]">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                className="text-electric hover:text-acid transition-colors font-medium"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
