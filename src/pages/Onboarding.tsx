import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check, Link, Loader2, Wallet, Shield, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
/* C4: OAuth connect flow for YouTube / TikTok / Stripe */
import { oauthSlugForConnection, startOAuthFlow } from '@/lib/oauth';
import { useApi } from '@/hooks/use-api';
import type { PlatformConnection } from '@/lib/types';

/* ── steps ────────────────────────────────────────────────── */
const STEPS = [
  { key: 'connect', label: 'Connect Platforms', icon: Link },
  { key: 'wallet', label: 'Setup Wallet', icon: Wallet },
  { key: 'verify', label: 'Verify Identity', icon: Shield },
  { key: 'complete', label: 'Ready', icon: Sparkles },
];

const PLATFORMS = [
  { name: 'YouTube', color: '#FF0000' },
  { name: 'TikTok', color: '#FF0050' },
  { name: 'Shopify', color: '#96BF48' },
  { name: 'Stripe', color: '#635BFF' },
  { name: 'Patreon', color: '#FF424D' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [connected, setConnected] = useState<string[]>([]);
  const [walletType, setWalletType] = useState<'new' | 'existing'>('new');
  /* C4: platform whose OAuth flow is being started (button spinner). */
  const [startingOAuth, setStartingOAuth] = useState<string | null>(null);

  /* C4: seed the connected list from the server once, so returning from
   * the OAuth redirect shows the platform as connected. */
  const connectionsQuery = useApi<PlatformConnection[]>('/profile/connections');
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !connectionsQuery.data) return;
    seededRef.current = true;
    setConnected(connectionsQuery.data.filter((c) => c.connected).map((c) => c.name));
  }, [connectionsQuery.data]);

  const connectPlatform = async (name: string) => {
    const isConnected = connected.includes(name);
    const oauthSlug = oauthSlugForConnection(name);

    /* C4: connecting an OAuth platform goes through the real
     * authorization-code flow; the callback returns here afterwards. */
    if (!isConnected && oauthSlug) {
      setStartingOAuth(name);
      try {
        const authorizeUrl = await startOAuthFlow(oauthSlug, '/onboarding');
        navigate(authorizeUrl);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : `Could not start the ${name} connect flow`);
        setStartingOAuth(null);
      }
      return;
    }

    setConnected((prev) => (isConnected ? prev.filter((n) => n !== name) : [...prev, name]));
    // Persist to the creator profile so Settings → Connected Accounts reflects it.
    api
      .put<PlatformConnection[]>('/profile/connections', { name, connected: !isConnected })
      .catch(() => {
        /* non-blocking during onboarding */
      });
  };

  const canProceed = () => {
    if (step === 0) return connected.length >= 1;
    if (step === 1) return true;
    if (step === 2) return true;
    return true;
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-[560px]">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-12">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-[12px] font-medium transition-all ${
                  i <= step ? 'bg-acid text-void' : 'bg-panel text-[rgba(var(--fg-rgb),0.42)]'
                }`}
              >
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-1 rounded-full ${i < step ? 'bg-acid' : 'bg-panel'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="connect"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h1 className="font-display text-[48px] tracking-[0.02em] text-ink mb-2">
                Connect Platforms
              </h1>
              <p className="font-body text-[16px] text-[rgba(var(--fg-rgb),0.42)] mb-8">
                Link your income sources to build your Creator Credit Score
              </p>
              <div className="space-y-3">
                {PLATFORMS.map((p) => {
                  const isConnected = connected.includes(p.name);
                  return (
                    <motion.button
                      key={p.name}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => connectPlatform(p.name)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        isConnected
                          ? 'bg-panel border-acid/30'
                          : 'bg-panel border-[rgba(var(--fg-rgb),0.08)] hover:border-[rgba(var(--fg-rgb),0.14)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${p.color}20` }}>
                          <span className="text-[12px] font-bold" style={{ color: p.color }}>{p.name[0]}</span>
                        </span>
                        <span className="font-body text-[16px] text-ink">{p.name}</span>
                      </div>
                      {isConnected ? (
                        <span className="flex items-center gap-1 text-positive font-mono text-[12px]">
                          <Check size={14} /> Connected
                        </span>
                      ) : startingOAuth === p.name ? (
                        <span className="flex items-center gap-1 font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)]">
                          <Loader2 size={14} className="animate-spin" /> Redirecting…
                        </span>
                      ) : (
                        <span className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)]">Connect</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h1 className="font-display text-[48px] tracking-[0.02em] text-ink mb-2">
                Setup Wallet
              </h1>
              <p className="font-body text-[16px] text-[rgba(var(--fg-rgb),0.42)] mb-8">
                Choose how you want to receive funds
              </p>
              <div className="space-y-3">
                {[
                  { key: 'new', label: 'Create New Wallet', desc: 'USDC on Solana — instant, low fees' },
                  { key: 'existing', label: 'Use Existing Wallet', desc: 'Connect your current crypto wallet' },
                ].map((w) => (
                  <button
                    key={w.key}
                    onClick={() => setWalletType(w.key as 'new' | 'existing')}
                    className={`w-full text-left p-5 rounded-2xl border transition-all ${
                      walletType === w.key
                        ? 'bg-panel border-acid/30'
                        : 'bg-panel border-[rgba(var(--fg-rgb),0.08)] hover:border-[rgba(var(--fg-rgb),0.14)]'
                    }`}
                  >
                    <p className="font-body text-[16px] text-ink font-medium">{w.label}</p>
                    <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)] mt-1">{w.desc}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h1 className="font-display text-[48px] tracking-[0.02em] text-ink mb-2">
                Verify Identity
              </h1>
              <p className="font-body text-[16px] text-[rgba(var(--fg-rgb),0.42)] mb-8">
                Secure your account to unlock all features
              </p>
              <div className="space-y-3">
                {[
                  { label: 'Email Verified', status: 'completed' },
                  { label: 'Phone Number', status: 'pending' },
                  { label: 'Government ID', status: 'pending' },
                  { label: 'Creator Profile Review', status: 'pending' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-4 rounded-2xl bg-panel border border-[rgba(var(--fg-rgb),0.08)]"
                  >
                    <span className="font-body text-[14px] text-ink">{item.label}</span>
                    <span
                      className={`font-mono text-[12px] px-3 py-1 rounded-full ${
                        item.status === 'completed'
                          ? 'bg-[rgba(var(--positive-rgb),0.15)] text-positive'
                          : 'bg-[rgba(var(--gold-rgb),0.15)] text-[rgb(var(--color-gold))]'
                      }`}
                    >
                      {item.status === 'completed' ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-acid to-electric flex items-center justify-center mx-auto mb-6"
              >
                <Sparkles size={36} className="text-void" />
              </motion.div>
              <h1 className="font-display text-[48px] tracking-[0.02em] text-ink mb-2">
                You're All Set!
              </h1>
              <p className="font-body text-[16px] text-[rgba(var(--fg-rgb),0.42)] mb-8">
                Your Creator Credit Score is being calculated. Check back in a few minutes.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/dashboard')}
                className="bg-acid text-void font-body text-[16px] font-semibold px-8 py-4 rounded-2xl"
              >
                Go to Dashboard
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        {step < 3 && (
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="font-body text-[14px] text-[rgba(var(--fg-rgb),0.42)] hover:text-ink disabled:opacity-30 transition-colors"
            >
              Back
            </button>
            <div className="flex items-center gap-5">
              <button
                onClick={() => navigate('/dashboard')}
                className="font-body text-[14px] text-[rgba(var(--fg-rgb),0.42)] hover:text-ink transition-colors"
              >
                Skip for now
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 bg-acid text-void font-body text-[16px] font-semibold px-6 py-3 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
                <ChevronRight size={18} />
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
