import { useState } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
/* C4: OAuth connect flow for YouTube / TikTok / Stripe */
import { oauthSlugForConnection, startOAuthFlow } from '@/lib/oauth';
import { useApi } from '@/hooks/use-api';
import type { AppSettings, PlatformConnection, Profile } from '@/lib/types';
import { ErrorNotice, SkeletonBlock } from '@/components/Skeletons';

/* ── constants ────────────────────────────────────────────── */
const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

const SETTINGS_TABS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'wallet', label: 'Wallet', icon: Wallet },
  { key: 'connections', label: 'Connected Accounts', icon: Link },
];

const inputClass =
  'w-full bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white font-body focus:border-electric outline-none transition-colors';

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

  const profileQuery = useApi<Profile>('/profile');
  const settingsQuery = useApi<AppSettings>('/settings');
  const connectionsQuery = useApi<PlatformConnection[]>('/profile/connections');

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
      const [savedProfile, savedSettings] = await Promise.all([
        api.put<Profile>('/profile', profile),
        api.put<AppSettings>('/settings', settings),
      ]);
      setProfile(savedProfile);
      setSettings(savedSettings);
      setSaved(true);
      toast.success('Settings saved');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save settings');
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
        className="font-display text-[48px] tracking-[0.02em] text-white"
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
                  : 'text-[rgba(255,255,255,0.42)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]'
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
          className="lg:col-span-3 bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl p-6"
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
                  <h3 className="font-display text-[28px] tracking-[0.02em] text-white">Profile</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em] mb-2">Display Name</label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em] mb-2">Email</label>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em] mb-2">Phone</label>
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em] mb-2">Creator Handle</label>
                      <input
                        type="text"
                        value={profile.handle}
                        onChange={(e) => setProfile({ ...profile, handle: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h3 className="font-display text-[28px] tracking-[0.02em] text-white">Notifications</h3>
                  <div className="space-y-4">
                    {settings.notifications.map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-body text-[14px] text-white">{item.label}</p>
                          <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">{item.description}</p>
                        </div>
                        <Toggle on={item.enabled} onChange={(v) => setNotification(item.key, v)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h3 className="font-display text-[28px] tracking-[0.02em] text-white">Security</h3>
                  <div className="space-y-4">
                    <button
                      onClick={() => toast.success(`Password reset link sent to ${profile.email}`)}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-panel2 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.14)] transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-body text-[14px] text-white">Change Password</p>
                        <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">Last changed 30 days ago</p>
                      </div>
                      <ChevronRight size={16} className="text-[rgba(255,255,255,0.42)]" />
                    </button>
                    <button
                      onClick={() => toast('Two-factor authentication is managed in your authenticator app')}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-panel2 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.14)] transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-body text-[14px] text-white">Two-Factor Authentication</p>
                        <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">Enabled via authenticator app</p>
                      </div>
                      <span className="text-positive font-mono text-[12px]">Enabled</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'wallet' && (
                <div className="space-y-6">
                  <h3 className="font-display text-[28px] tracking-[0.02em] text-white">Wallet Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-panel2">
                      <div>
                        <p className="font-body text-[14px] text-white">Auto-Convert USDC to USD</p>
                        <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">On payout day</p>
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
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-panel2 hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-body text-[14px] text-white">Default Payout Wallet</p>
                        <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">{settings.defaultPayoutWallet}</p>
                      </div>
                      <ChevronRight size={16} className="text-[rgba(255,255,255,0.42)]" />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'connections' && (
                <div className="space-y-6">
                  <h3 className="font-display text-[28px] tracking-[0.02em] text-white">Connected Accounts</h3>
                  {connectionsQuery.error ? (
                    <ErrorNotice message={connectionsQuery.error} onRetry={connectionsQuery.refresh} />
                  ) : connectionsQuery.loading || !connectionsQuery.data ? (
                    <ContentSkeleton />
                  ) : (
                    <div className="space-y-3">
                      {connectionsQuery.data.map((account) => (
                        <div key={account.name} className="flex items-center justify-between p-4 rounded-xl bg-panel2">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-panel flex items-center justify-center font-body text-[12px] text-white">
                              {account.name[0]}
                            </span>
                            <div>
                              <p className="font-body text-[14px] text-white">{account.name}</p>
                              {account.user && account.connected && (
                                <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">{account.user}</p>
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
                                ? 'bg-[rgba(255,77,77,0.1)] text-negative hover:bg-[rgba(255,77,77,0.2)]'
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

              <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.08)]">
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

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative w-[44px] h-[24px] rounded-full transition-colors ${on ? 'bg-acid' : 'bg-[rgba(255,255,255,0.12)]'}`}
    >
      <motion.div
        animate={{ x: on ? 20 : 4 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-[2px] w-[20px] h-[20px] rounded-full bg-white"
      />
    </button>
  );
}
