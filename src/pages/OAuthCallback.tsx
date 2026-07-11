/*
 * C4 — OAuth redirect_uri handler. Validates the CSRF state token
 * against the value persisted when the flow started (sessionStorage),
 * exchanges the authorization code via POST /oauth/token, then returns
 * to wherever the flow began (Settings or Onboarding). Surfaces clear
 * states for user denial, state mismatch, and expired/unknown codes.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, Loader2, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import {
  clearPendingOAuth,
  OAUTH_CLIENT_ID,
  OAUTH_PROVIDERS,
  OAUTH_REDIRECT_PATH,
  readPendingOAuth,
} from '@/lib/oauth';
import type { OAuthTokenPayload, OAuthTokenResponse } from '@/lib/types';

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

type Phase = 'exchanging' | 'success' | 'denied' | 'error';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [phase, setPhase] = useState<Phase>('exchanging');
  const [message, setMessage] = useState('');
  const [platformName, setPlatformName] = useState<string | null>(null);
  const [returnTo, setReturnTo] = useState('/settings?tab=connections');
  const ranRef = useRef(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const run = async () => {
      const errorParam = searchParams.get('error');
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      const pending = readPendingOAuth();
      const backTo = pending?.returnTo ?? '/settings?tab=connections';
      const provider = pending ? OAUTH_PROVIDERS[pending.platform] : null;
      setReturnTo(backTo);
      if (provider) setPlatformName(provider.name);

      /* 1. User denied consent on the provider screen. */
      if (errorParam) {
        clearPendingOAuth();
        setPhase('denied');
        setMessage(
          errorParam === 'access_denied'
            ? 'You denied the authorization request, so no account was connected.'
            : `The provider returned an error: ${errorParam}`,
        );
        return;
      }

      /* 2. CSRF check — the returned state must match what we stored. */
      if (!pending || !state || state !== pending.state) {
        clearPendingOAuth();
        setPhase('error');
        setMessage(
          'State token mismatch — this redirect could not be verified against the request we started (possible CSRF). No account was connected.',
        );
        return;
      }

      if (!code) {
        clearPendingOAuth();
        setPhase('error');
        setMessage('The provider redirect is missing the authorization code. Restart the connect flow.');
        return;
      }

      /* 3. Exchange the authorization code for tokens. */
      try {
        const payload: OAuthTokenPayload = {
          grant_type: 'authorization_code',
          code,
          redirect_uri: OAUTH_REDIRECT_PATH,
          client_id: OAUTH_CLIENT_ID,
        };
        const res = await api.post<OAuthTokenResponse>('/oauth/token', payload);
        clearPendingOAuth();
        const name = OAUTH_PROVIDERS[res.platform].name;
        setPlatformName(name);
        setPhase('success');
        toast.success(`${name} connected`);
        redirectTimer.current = setTimeout(() => navigate(backTo, { replace: true }), 1400);
      } catch (err) {
        clearPendingOAuth();
        setPhase('error');
        setMessage(
          err instanceof ApiError ? err.message : 'The token exchange failed. Restart the connect flow.',
        );
      }
    };

    run();
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, [searchParams, navigate]);

  return (
    <div className="min-h-[70dvh] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOutExpo }}
        className="w-full max-w-[440px] bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-8 text-center"
      >
        {phase === 'exchanging' && (
          <>
            <Loader2 size={32} className="animate-spin text-electric mx-auto mb-4" />
            <h1 className="font-display text-[28px] tracking-[0.02em] text-ink mb-2">
              Completing Connection
            </h1>
            <p className="font-body text-[14px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">
              Verifying the state token and exchanging the authorization code…
            </p>
          </>
        )}

        {phase === 'success' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="w-14 h-14 rounded-full bg-[rgba(var(--positive-rgb),0.15)] flex items-center justify-center mx-auto mb-4"
            >
              <Check size={28} className="text-positive" />
            </motion.div>
            <h1 className="font-display text-[28px] tracking-[0.02em] text-ink mb-2">
              {platformName ?? 'Platform'} Connected
            </h1>
            <p className="font-body text-[14px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] mb-6">
              Access granted. Taking you back…
            </p>
            <button
              onClick={() => navigate(returnTo, { replace: true })}
              className="bg-acid text-void font-body text-[14px] font-semibold px-6 py-3 rounded-2xl hover:brightness-110 transition-all"
            >
              Continue
            </button>
          </>
        )}

        {phase === 'denied' && (
          <>
            <div className="w-14 h-14 rounded-full bg-[rgba(var(--gold-rgb),0.12)] flex items-center justify-center mx-auto mb-4">
              <ShieldOff size={26} className="text-[rgb(var(--color-gold))]" />
            </div>
            <h1 className="font-display text-[28px] tracking-[0.02em] text-ink mb-2">
              Access Denied
            </h1>
            <p className="font-body text-[14px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] mb-6">{message}</p>
            <button
              onClick={() => navigate(returnTo, { replace: true })}
              className="bg-acid text-void font-body text-[14px] font-semibold px-6 py-3 rounded-2xl hover:brightness-110 transition-all"
            >
              Back to {returnTo.startsWith('/onboarding') ? 'Onboarding' : 'Settings'}
            </button>
          </>
        )}

        {phase === 'error' && (
          <>
            <div className="w-14 h-14 rounded-full bg-[rgba(var(--negative-rgb),0.12)] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={26} className="text-negative" />
            </div>
            <h1 className="font-display text-[28px] tracking-[0.02em] text-ink mb-2">
              Connection Failed
            </h1>
            <p className="font-body text-[14px] text-negative mb-6" role="alert">
              {message}
            </p>
            <button
              onClick={() => navigate(returnTo, { replace: true })}
              className="bg-acid text-void font-body text-[14px] font-semibold px-6 py-3 rounded-2xl hover:brightness-110 transition-all"
            >
              Back to {returnTo.startsWith('/onboarding') ? 'Onboarding' : 'Settings'}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
