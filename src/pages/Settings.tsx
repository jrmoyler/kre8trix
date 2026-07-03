import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  User,
  Bell,
  Shield,
  Wallet,
  Link,
  FileText,
  ChevronRight,
  Save,
  Check,
} from 'lucide-react';
import {
  fetchProfile,
  fetchPlatforms,
  fetchTaxInfo,
  fetchNotificationPrefs,
  updateProfile,
  updateTaxInfo,
  updateNotificationPrefs,
  connectPlatform,
  disconnectPlatform,
} from '@/lib/api/profile';
import type { ConnectedPlatform, NotificationPrefs, SettingsProfile, TaxInfo } from '@/lib/api/profile';

/* ── constants ────────────────────────────────────────────── */
const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

const SETTINGS_TABS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'wallet', label: 'Wallet', icon: Wallet },
  { key: 'tax', label: 'Tax Info', icon: FileText },
  { key: 'connections', label: 'Connected Accounts', icon: Link },
];

const NOTIFICATION_ITEMS: { key: keyof NotificationPrefs; label: string; desc: string }[] = [
  { key: 'paymentReceived', label: 'Payment received', desc: 'Get notified when you receive a payment' },
  { key: 'advanceDue', label: 'Advance due', desc: 'Reminder before advance repayment' },
  { key: 'scoreChanges', label: 'Score changes', desc: 'When your CCS score updates' },
  { key: 'platformDisconnect', label: 'Platform disconnect', desc: 'If a connected platform loses sync' },
  { key: 'marketingEmails', label: 'Marketing emails', desc: 'Product updates and tips' },
];

const PAYOUT_WALLETS = ['USDC (Solana)', 'USD (Bank ···· 4821)'];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [payoutWalletIndex, setPayoutWalletIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profile, setProfile] = useState<SettingsProfile | null>(null);
  const [taxInfo, setTaxInfo] = useState<TaxInfo | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [accounts, setAccounts] = useState<ConnectedPlatform[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [profileData, platforms, tax, notifications] = await Promise.all([
        fetchProfile(),
        fetchPlatforms(),
        fetchTaxInfo(),
        fetchNotificationPrefs(),
      ]);
      setProfile(profileData);
      setAccounts(platforms);
      setTaxInfo(tax);
      setPrefs(notifications);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      if (activeTab === 'profile' && profile) {
        const { name, email, phone, handle } = profile;
        setProfile(await updateProfile({ name, email, phone, handle }));
        toast.success('Profile saved');
      } else if (activeTab === 'notifications' && prefs) {
        setPrefs(await updateNotificationPrefs(prefs));
        toast.success('Notification preferences saved');
      } else if (activeTab === 'tax' && taxInfo) {
        setTaxInfo(await updateTaxInfo(taxInfo));
        toast.success('Tax info saved');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = () => {
    toast.success(`Password reset link sent to ${profile?.email ?? 'alex@kre8trix.app'}`);
  };

  const handleToggleTwoFactor = () => {
    setTwoFactorEnabled((prev) => {
      const next = !prev;
      toast.success(next ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled');
      return next;
    });
  };

  const handleCyclePayoutWallet = () => {
    setPayoutWalletIndex((prev) => {
      const next = (prev + 1) % PAYOUT_WALLETS.length;
      toast.success(`Default payout wallet set to ${PAYOUT_WALLETS[next]}`);
      return next;
    });
  };

  const handleToggleAccount = async (account: ConnectedPlatform) => {
    try {
      const updated = account.connected
        ? await disconnectPlatform(account.id)
        : await connectPlatform(account.id);
      setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      toast.success(updated.connected ? `${updated.name} connected` : `${updated.name} disconnected`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to update ${account.name}.`);
    }
  };

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
          {loading && (
            <div className="space-y-6">
              <div className="animate-pulse bg-surface rounded-xl h-[34px] w-[180px]" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="animate-pulse bg-surface rounded h-[14px] w-[120px]" />
                    <div className="animate-pulse bg-surface rounded-xl h-[50px] w-full" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && loadError && (
            <div className="py-12 flex flex-col items-center gap-4 text-center">
              <p className="font-body text-[14px] text-negative">{loadError}</p>
              <button
                onClick={load}
                className="px-4 py-2 rounded-lg bg-acid text-void font-mono text-[12px] hover:brightness-110 transition-all"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !loadError && (
            <>
              {activeTab === 'profile' && profile && (
                <div className="space-y-6">
                  <h3 className="font-display text-[28px] tracking-[0.02em] text-white">Profile</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em] mb-2">Display Name</label>
                      <input type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="w-full bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white font-body focus:border-electric outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em] mb-2">Email</label>
                      <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="w-full bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white font-body focus:border-electric outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em] mb-2">Phone</label>
                      <input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="w-full bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white font-body focus:border-electric outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em] mb-2">Creator Handle</label>
                      <input type="text" value={profile.handle} onChange={(e) => setProfile({ ...profile, handle: e.target.value })} className="w-full bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white font-body focus:border-electric outline-none transition-colors" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && prefs && (
                <div className="space-y-6">
                  <h3 className="font-display text-[28px] tracking-[0.02em] text-white">Notifications</h3>
                  <div className="space-y-4">
                    {NOTIFICATION_ITEMS.map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-body text-[14px] text-white">{item.label}</p>
                          <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">{item.desc}</p>
                        </div>
                        <Toggle on={prefs[item.key]} onChange={(on) => setPrefs({ ...prefs, [item.key]: on })} />
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
                      onClick={handleChangePassword}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-panel2 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.14)] transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-body text-[14px] text-white">Change Password</p>
                        <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">Last changed 30 days ago</p>
                      </div>
                      <ChevronRight size={16} className="text-[rgba(255,255,255,0.42)]" />
                    </button>
                    <button
                      onClick={handleToggleTwoFactor}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-panel2 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.14)] transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-body text-[14px] text-white">Two-Factor Authentication</p>
                        <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">
                          {twoFactorEnabled ? 'Enabled via authenticator app' : 'Tap to re-enable'}
                        </p>
                      </div>
                      <span className={`font-mono text-[12px] ${twoFactorEnabled ? 'text-positive' : 'text-negative'}`}>
                        {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                      </span>
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
                      <Toggle defaultOn={true} />
                    </div>
                    <button
                      onClick={handleCyclePayoutWallet}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-panel2 hover:bg-panel transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-body text-[14px] text-white">Default Payout Wallet</p>
                        <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">{PAYOUT_WALLETS[payoutWalletIndex]}</p>
                      </div>
                      <ChevronRight size={16} className="text-[rgba(255,255,255,0.42)]" />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'tax' && taxInfo && (
                <div className="space-y-6">
                  <h3 className="font-display text-[28px] tracking-[0.02em] text-white">Tax Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em] mb-2">Legal Name</label>
                      <input type="text" value={taxInfo.legalName} onChange={(e) => setTaxInfo({ ...taxInfo, legalName: e.target.value })} className="w-full bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white font-body focus:border-electric outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em] mb-2">Tax ID (SSN / EIN)</label>
                      <input type="text" value={taxInfo.taxId} onChange={(e) => setTaxInfo({ ...taxInfo, taxId: e.target.value })} className="w-full bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white font-body focus:border-electric outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em] mb-2">Tax Classification</label>
                      <input type="text" value={taxInfo.taxClassification} onChange={(e) => setTaxInfo({ ...taxInfo, taxClassification: e.target.value })} className="w-full bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white font-body focus:border-electric outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em] mb-2">Country</label>
                      <input type="text" value={taxInfo.country} onChange={(e) => setTaxInfo({ ...taxInfo, country: e.target.value })} className="w-full bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white font-body focus:border-electric outline-none transition-colors" />
                    </div>
                  </div>
                  <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">
                    Used for 1099 reporting. Changes may require re-verification.
                  </p>
                </div>
              )}

              {activeTab === 'connections' && (
                <div className="space-y-6">
                  <h3 className="font-display text-[28px] tracking-[0.02em] text-white">Connected Accounts</h3>
                  <div className="space-y-3">
                    {accounts.map((account) => (
                      <div key={account.id} className="flex items-center justify-between p-4 rounded-xl bg-panel2">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-panel flex items-center justify-center font-body text-[12px] text-white">
                            {account.name[0]}
                          </span>
                          <div>
                            <p className="font-body text-[14px] text-white">{account.name}</p>
                            {account.user && <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">{account.user}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {account.connected && account.revenueShare > 0 && (
                            <span className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">{account.revenueShare}% of revenue</span>
                          )}
                          <button
                            onClick={() => handleToggleAccount(account)}
                            className={`px-4 py-2 rounded-lg font-mono text-[12px] transition-all ${
                              account.connected
                                ? 'bg-[rgba(255,77,77,0.1)] text-negative hover:bg-[rgba(255,77,77,0.2)]'
                                : 'bg-acid text-void hover:brightness-110'
                            }`}
                          >
                            {account.connected ? 'Disconnect' : 'Connect'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
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
                  {saved ? <Check size={18} /> : <Save size={18} />}
                  {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
                </motion.button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function Toggle({
  on,
  defaultOn = false,
  onChange,
}: {
  /** Controlled state; leave undefined for uncontrolled use with `defaultOn`. */
  on?: boolean;
  defaultOn?: boolean;
  onChange?: (on: boolean) => void;
}) {
  const [internal, setInternal] = useState(defaultOn);
  const isOn = on ?? internal;
  const handleClick = () => {
    if (on === undefined) setInternal(!isOn);
    onChange?.(!isOn);
  };
  return (
    <button
      onClick={handleClick}
      className={`relative w-[44px] h-[24px] rounded-full transition-colors ${isOn ? 'bg-acid' : 'bg-[rgba(255,255,255,0.12)]'}`}
    >
      <motion.div
        animate={{ x: isOn ? 20 : 4 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-[2px] w-[20px] h-[20px] rounded-full bg-white"
      />
    </button>
  );
}
