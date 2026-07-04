/*
 * C4 — mock provider consent screen for the platform-connect OAuth
 * flow. Plays the role of accounts.google.com / tiktok.com /
 * connect.stripe.com: shows the requesting app, the scopes, and
 * Allow / Deny. Allow redirects (SPA navigate) to the client's
 * redirect_uri with ?code&state; Deny redirects with
 * ?error=access_denied.
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import { AlertTriangle, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { oauthProviderFromSlug } from '@/lib/oauth';
import type { OAuthDecisionPayload, OAuthDecisionResponse } from '@/lib/types';

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function OAuthAuthorize() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [deciding, setDeciding] = useState<'allow' | 'deny' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const provider = oauthProviderFromSlug(searchParams.get('platform'));
  const state = searchParams.get('state');
  const clientId = searchParams.get('client_id') ?? 'kre8trix-web';

  const decide = async (decision: 'allow' | 'deny') => {
    if (!state) return;
    setDeciding(decision);
    setError(null);
    try {
      const payload: OAuthDecisionPayload = { state, decision };
      const res = await api.post<OAuthDecisionResponse>('/oauth/authorize/decision', payload);
      navigate(res.redirect, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The authorization request failed');
      setDeciding(null);
    }
  };

  /* Malformed authorize URL — the provider would reject it outright. */
  if (!provider || !state) {
    return (
      <div className="min-h-[70dvh] flex items-center justify-center p-6">
        <div className="w-full max-w-[440px] bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 text-center">
          <AlertTriangle size={32} className="text-negative mx-auto mb-4" />
          <h1 className="font-display text-[28px] tracking-[0.02em] text-white mb-2">
            Invalid Authorization Request
          </h1>
          <p className="font-body text-[14px] text-[rgba(255,255,255,0.42)] mb-6">
            This authorization link is missing required OAuth parameters (platform or state).
            Start the connection again from Settings.
          </p>
          <button
            onClick={() => navigate('/settings?tab=connections')}
            className="bg-acid text-void font-body text-[14px] font-semibold px-6 py-3 rounded-2xl hover:brightness-110 transition-all"
          >
            Back to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70dvh] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOutExpo }}
        className="w-full max-w-[440px]"
      >
        {/* Fake provider address bar to sell the "you left the app" moment */}
        <div className="flex items-center gap-2 bg-deep border border-[rgba(255,255,255,0.08)] border-b-0 rounded-t-2xl px-4 py-2.5">
          <Lock size={12} className="text-positive" />
          <span className="font-mono text-[12px] text-[rgba(255,255,255,0.42)] truncate">
            https://{provider.authHost}/oauth/authorize
          </span>
        </div>

        <div className="bg-panel border border-[rgba(255,255,255,0.08)] rounded-b-2xl p-8">
          {/* Provider identity */}
          <div className="flex items-center gap-3 mb-6">
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: `${provider.color}20` }}
            >
              <span className="text-[16px] font-bold" style={{ color: provider.color }}>
                {provider.name[0]}
              </span>
            </span>
            <div>
              <p className="font-body text-[16px] text-white font-medium">{provider.name}</p>
              <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">Authorization request</p>
            </div>
          </div>

          <h1 className="font-display text-[28px] tracking-[0.02em] text-white mb-1">
            Kre8trix wants to access your {provider.name} account
          </h1>
          <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)] mb-6">
            {user ? `Signed in as ${user.email}` : 'Signed in'} · client: {clientId}
          </p>

          {/* Requested scopes */}
          <p className="font-mono text-[12px] tracking-[0.04em] text-[rgba(255,255,255,0.42)] uppercase mb-3">
            This will allow Kre8trix to
          </p>
          <div className="space-y-3 mb-8">
            {provider.scopes.map((scope) => (
              <div
                key={scope.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-panel2 border border-[rgba(255,255,255,0.06)]"
              >
                <ShieldCheck size={16} className="text-electric mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-body text-[14px] text-white">{scope.description}</p>
                  <p className="font-mono text-[11px] text-[rgba(255,255,255,0.42)]">{scope.id}</p>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p className="font-body text-[13px] text-negative mb-4" role="alert">
              {error}
            </p>
          )}

          {/* Decision */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => decide('deny')}
              disabled={deciding !== null}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-[rgba(255,255,255,0.14)] font-body text-[14px] text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors disabled:opacity-50"
            >
              {deciding === 'deny' && <Loader2 size={14} className="animate-spin" />}
              Deny
            </button>
            <button
              onClick={() => decide('allow')}
              disabled={deciding !== null}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-acid text-void font-body text-[14px] font-semibold hover:brightness-110 transition-all disabled:opacity-50"
            >
              {deciding === 'allow' && <Loader2 size={14} className="animate-spin" />}
              Allow
            </button>
          </div>

          <p className="font-mono text-[11px] text-[rgba(255,255,255,0.28)] mt-6 text-center">
            You can revoke access at any time from Kre8trix Settings → Connected Accounts.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
