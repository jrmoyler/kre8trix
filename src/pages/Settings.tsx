import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import {
  User,
  Bell,
  Shield,
  Wallet,
  Link,
  ChevronRight,
  Loader2,
  Save,
  Check,
  Monitor,
  Moon,
  Sun,
  SunMoon,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
/* C4: OAuth connect flow for YouTube / TikTok / Stripe */
import { oauthSlugForConnection, startOAuthFlow } from '@/lib/oauth';
import { useApi } from '@/hooks/use-api';
import { useTheme, type ThemePreference } from '@/lib/theme-context';
import type { AppSettings, AuditLogEntry, KycProfile, PlatformConnection, Profile } from '@/lib/types';
import { ErrorNotice, SkeletonBlock } from '@/components/Skeletons';
import KycStatusBadge from '@/components/KycStatusBadge';

/* ── constants ────────────────────────────────────────────── */
const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

const SETTINGS_TABS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'display', label: 'Display', icon: SunMoon },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'wallet', label: 'Wallet', icon: Wallet },
  { key: 'connections', label: 'Connected Accounts', icon: Link },
];

const inputClass =
  'w-full bg-surface border border-[rgba(var(--fg-rgb),0.1)] rounded-xl px-4 py-3 text-ink font-body focus:border-electric focus-visible:ring-2 focus-visible:ring-electric outline-none transition-colors';

function ContentSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonBlock className="h-7 w-40 mb-6" />
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonBlock key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  /* C4: honor ?tab=… so the OAuth flow can return to Connected Accounts. */
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    SETTINGS_TABS.some((t) => t.key === requestedTab) ? (requestedTab as string) : 'profile',
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  const profileQuery = useApi<Profile>('/profile');
  const settingsQuery = useApi<AppSettings>('/settings');
  const connectionsQuery = useApi<PlatformConnection[]>('/profile/connections');
  /* D1: identity verification status, fetched once the Security tab is visible. */
  const kycQuery = useApi<KycProfile>('/kyc/status', activeTab === 'security');
  /* D3: personal activity feed — the same audit log the Compliance Console
   * uses, filtered client-side to the entries this account's actions produced. */
  const auditQuery = useApi<AuditLogEntry[]>('/audit-log', activeTab === 'security');

  /* Local edits overlay the API data until saved */
  const [profileEdits, setProfileEdits] = useState<Profile | null>(null);
  const [settingsEdits, setSettingsEdits] = useState<AppSettings | null>(null);
  const [togglingPlatform, setTogglingPlatform] = useState<string | null>(null);

  const profile = profileEdits ?? profileQuery.data ?? null;
  const settings = settingsEdits ?? settingsQuery.data ?? null;
  const setProfile = setProfileEdits;
  const setSettings = setSettingsEdits;

  const handleSave = async () => {
    if (!profile || !settings) return;
    setSaving(true);
    try {
      const [profileResult, settingsResult] = await Promise.allSettled([
        api.put<Profile>('/profile', profile),
        api.put<AppSettings>('/settings', settings),
      ]);

      if (profileResult.status === 'fulfilled') setProfile(profileResult.value);
      if (settingsResult.status === 'fulfilled') setSettings(settingsResult.value);

      if (profileResult.status === 'fulfilled' && settingsResult.status === 'fulfilled') {
        setSaved(true);
        toast.success('Settings saved');
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => setSaved(false), 2000);
      } else if (profileResult.status === 'rejected' && settingsResult.status === 'rejected') {
        toast.error('Could not save settings');
      } else if (profileResult.status === 'rejected') {
        const reason = profileResult.reason;
        toast.error(reason instanceof ApiError ? reason.message : 'Could not save profile');
      } else if (settingsResult.status === 'rejected') {
        const reason = settingsResult.reason;
        toast.error(reason instanceof ApiError ? reason.message : 'Could not save settings');
      }
    } finally {
      setSaving(false);
    }
  };

  /* C4: OAuth platforms connect via the authorization-code flow; the
   * rest (and every disconnect) keep the direct toggle endpoint. */
  const connectViaOAuth = async (platform: PlatformConnection) => {
    const slug = oauthSlugForConnection(platform.name);
    if (!slug) return;
    setTogglingPlatform(platform.name);
    try {
      const authorizeUrl = await startOAuthFlow(slug, '/settings?tab=connections');
      navigate(authorizeUrl);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `Could not start the ${platform.name} connect flow`);
      setTogglingPlatform(null);
    }
  };

  const toggleConnection = async (platform: PlatformConnection) => {
    setTogglingPlatform(platform.name);
    try {
      const updated = await api.put<PlatformConnection[]>('/profile/connections', {
        name: platform.name,
        connected: !platform.connected,
      });
      connectionsQuery.setData(updated);
      toast.success(`${platform.name} ${platform.connected ? 'disconnected' : 'connected'}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update connection');
    } finally {
      setTogglingPlatform(null);
    }
  };

  const setNotification = (key: string, enabled: boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      notifications: settings.notifications.map((n) => (n.key === key ? { ...n, enabled } : n)),
    });
  };

  const loading = profileQuery.loading || settingsQuery.loading;
  const loadError = profileQuery.error || settingsQuery.error;

  return (
    <div className="space-y-6">
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOutExpo }}
        className="font-display text-[48px] tracking-[0.02em] text-ink"
      >
        Settings
      </motion.h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: easeOutExpo }}
          className="space-y-1"
        >
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === tab.key
                  ? 'bg-panel text-acid border-l-2 border-acid'
                  : 'text-[rgba(var(--fg-rgb),var(--muted-alpha))] hover:text-ink hover:bg-[rgba(var(--fg-rgb),0.04)]'
              }`}
            >
              <tab.icon size={18} />
              <span className="font-body text-[14px]">{tab.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easeOutExpo, delay: 0.1 }}
          className="lg:col-span-3 bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-6"
        >
          {loadError ? (
            <ErrorNotice
              message={loadError}
              onRetry={() => {
                profileQuery.refresh();
                settingsQuery.refresh();
              }}
            />
          ) : loading || !profile || !settings ? (
            <ContentSkeleton />
          ) : (
            <>
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h3 className="font-display text-[28px] tracking-[0.02em] text-ink">Profile</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="settings-name" className="block font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em] mb-2">Display Name</label>
                      <input
                        id="settings-name"
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="settings-email" className="block font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em] mb-2">Email</label>
                      <input
                        id="settings-email"
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="settings-phone" className="block font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em] mb-2">Phone</label>
                      <input
                        id="settings-phone"
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="settings-handle" className="block font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em] mb-2">Creator Handle</label>
                      <input
                        id="settings-handle"
                        type="text"
                        value={profile.handle}
                        onChange={(e) => setProfile({ ...profile, handle: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'display' && <DisplayTab />}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h3 className="font-display text-[28px] tracking-[0.02em] text-ink">Notifications</h3>
                  <div className="space-y-4">
                    {settings.notifications.map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-body text-[14px] text-ink">{item.label}</p>
                          <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">{item.description}</p>
                        </div>
                        <Toggle on={item.enabled} onChange={(v) => setNotification(item.key, v)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h3 className="font-display text-[28px] tracking-[0.02em] text-ink">Security</h3>
                  <div className="space-y-4">
                    <button
                      onClick={() => navigate('/kyc')}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-panel2 border border-[rgba(var(--fg-rgb),0.08)] hover:border-[rgba(var(--fg-rgb),0.14)] transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-body text-[14px] text-ink">Identity Verification</p>
                        <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">Required for advances and large transfers</p>
                      </div>
                      {kycQuery.data ? <KycStatusBadge status={kycQuery.data.status} /> : <ChevronRight size={16} className="text-[rgba(var(--fg-rgb),var(--muted-alpha))]" />}
                    </button>
                    <button
                      onClick={() => toast('Password reset isn’t available in this demo yet')}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-panel2 border border-[rgba(var(--fg-rgb),0.08)] hover:border-[rgba(var(--fg-rgb),0.14)] transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-body text-[14px] text-ink">Change Password</p>
                        <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">Last changed 30 days ago</p>
                      </div>
                      <ChevronRight size={16} className="text-[rgba(var(--fg-rgb),var(--muted-alpha))]" />
                    </button>
                    <button
                      onClick={() => toast('Two-factor authentication is managed in your authenticator app')}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-panel2 border border-[rgba(var(--fg-rgb),0.08)] hover:border-[rgba(var(--fg-rgb),0.14)] transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-body text-[14px] text-ink">Two-Factor Authentication</p>
                        <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">Enabled via authenticator app</p>
                      </div>
                      <span className="text-positive font-mono text-[12px]">Enabled</span>
                    </button>
                  </div>

                  {/* D3: personal activity feed, backed by the same audit log the Compliance Console reads */}
                  <div>
                    <h4 className="font-body text-[16px] text-ink font-medium mb-3">Recent Activity</h4>
                    {auditQuery.error ? (
                      <ErrorNotice message={auditQuery.error} onRetry={auditQuery.refresh} />
                    ) : auditQuery.loading || !auditQuery.data ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => <SkeletonBlock key={i} className="h-12 w-full" />)}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {auditQuery.data
                          .filter((entry) => entry.actorName === profile?.name || entry.actorType === 'user')
                          .slice(0, 10)
                          .map((entry) => (
                            <div key={entry.id} className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-panel2">
                              <p className="font-body text-[13px] text-ink">{entry.description}</p>
                              <p className="font-mono text-[11px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] flex-shrink-0 ml-3">
                                {new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'wallet' && (
                <div className="space-y-6">
                  <h3 className="font-display text-[28px] tracking-[0.02em] text-ink">Wallet Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-panel2">
                      <div>
                        <p className="font-body text-[14px] text-ink">Auto-Convert USDC to USD</p>
                        <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">On payout day</p>
                      </div>
                      <Toggle
                        on={settings.autoConvertUsdc}
                        onChange={(v) => setSettings({ ...settings, autoConvertUsdc: v })}
                      />
                    </div>
                    <button
                      onClick={() => {
                        const next = settings.defaultPayoutWallet === 'USDC (Solana)' ? 'USD (Bank ····4821)' : 'USDC (Solana)';
                        setSettings({ ...settings, defaultPayoutWallet: next });
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-panel2 hover:bg-[rgba(var(--fg-rgb),0.08)] transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-body text-[14px] text-ink">Default Payout Wallet</p>
                        <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">{settings.defaultPayoutWallet}</p>
                      </div>
                      <ChevronRight size={16} className="text-[rgba(var(--fg-rgb),var(--muted-alpha))]" />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'connections' && (
                <div className="space-y-6">
                  <h3 className="font-display text-[28px] tracking-[0.02em] text-ink">Connected Accounts</h3>
                  {connectionsQuery.error ? (
                    <ErrorNotice message={connectionsQuery.error} onRetry={connectionsQuery.refresh} />
                  ) : connectionsQuery.loading || !connectionsQuery.data ? (
                    <ContentSkeleton />
                  ) : (
                    <div className="space-y-3">
                      {connectionsQuery.data.map((account) => (
                        <div key={account.name} className="flex items-center justify-between p-4 rounded-xl bg-panel2">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-panel flex items-center justify-center font-body text-[12px] text-ink">
                              {account.name[0]}
                            </span>
                            <div>
                              <p className="font-body text-[14px] text-ink">{account.name}</p>
                              {account.user && account.connected && (
                                <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">{account.user}</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              !account.connected && oauthSlugForConnection(account.name)
                                ? connectViaOAuth(account)
                                : toggleConnection(account)
                            }
                            disabled={togglingPlatform === account.name}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-[12px] transition-all disabled:opacity-50 ${
                              account.connected
                                ? 'bg-[rgba(var(--negative-rgb),0.1)] text-negative hover:bg-[rgba(var(--negative-rgb),0.2)]'
                                : 'bg-acid text-void hover:brightness-110'
                            }`}
                          >
                            {togglingPlatform === account.name && <Loader2 size={12} className="animate-spin" />}
                            {account.connected ? 'Disconnect' : 'Connect'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-[rgba(var(--fg-rgb),0.08)]">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-acid text-void font-body text-[16px] font-semibold px-6 py-3 rounded-2xl disabled:opacity-60"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : saved ? <Check size={18} /> : <Save size={18} />}
                  {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
                </motion.button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

/* ── C7: Display tab — dark/light/system theme control ─────── */
const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
  description: string;
}[] = [
  { value: 'dark', label: 'Dark', icon: Moon, description: 'The default Kre8trix look' },
  { value: 'light', label: 'Light', icon: Sun, description: 'Bright, high-contrast palette' },
  { value: 'system', label: 'System', icon: Monitor, description: 'Follows your OS appearance setting' },
];

function DisplayTab() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="space-y-6">
      <h3 className="font-display text-[28px] tracking-[0.02em] text-ink">Display</h3>
      <div>
        <p className="font-body text-[14px] text-ink mb-1">Theme</p>
        <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] mb-4">
          Applies instantly and is remembered on this device
        </p>
        <div className="inline-flex p-1 rounded-xl bg-panel2 border border-[rgba(var(--fg-rgb),0.08)]">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              aria-pressed={theme === option.value}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-body text-[14px] font-medium transition-all ${
                theme === option.value
                  ? 'bg-acid text-void'
                  : 'text-[rgba(var(--fg-rgb),var(--muted-alpha))] hover:text-ink'
              }`}
            >
              <option.icon size={15} />
              {option.label}
            </button>
          ))}
        </div>
        <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] mt-3">
          {THEME_OPTIONS.find((o) => o.value === theme)?.description}
        </p>
      </div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      className={`relative w-[44px] h-[24px] rounded-full transition-colors ${on ? 'bg-acid' : 'bg-[rgba(var(--fg-rgb),0.12)]'}`}
    >
      <motion.div
        animate={{ x: on ? 20 : 4 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-[2px] w-[20px] h-[20px] rounded-full bg-white"
      />
    </button>
  );
}
