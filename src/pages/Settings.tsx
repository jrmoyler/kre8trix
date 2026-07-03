import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  User,
  Bell,
  Shield,
  Wallet,
  Link,
  ChevronRight,
  Save,
  Check,
} from 'lucide-react';

/* ── constants ────────────────────────────────────────────── */
const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

const SETTINGS_TABS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'wallet', label: 'Wallet', icon: Wallet },
  { key: 'connections', label: 'Connected Accounts', icon: Link },
];

const INITIAL_ACCOUNTS = [
  { name: 'YouTube', user: 'Alex Creates', connected: true },
  { name: 'TikTok', user: '@alexcreates', connected: true },
  { name: 'Shopify', user: 'alexcreates.store', connected: true },
  { name: 'Stripe', user: 'alex@kre8trix.app', connected: false },
  { name: 'Patreon', user: '', connected: false },
];

const PAYOUT_WALLETS = ['USDC (Solana)', 'USD (Bank ···· 4821)'];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [payoutWalletIndex, setPayoutWalletIndex] = useState(0);
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChangePassword = () => {
    toast.success('Password reset link sent to alex@kre8trix.app');
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

  const handleToggleAccount = (name: string) => {
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.name !== name) return a;
        const connected = !a.connected;
        toast.success(connected ? `${a.name} connected` : `${a.name} disconnected`);
        return { ...a, connected };
      })
    );
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
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h3 className="font-display text-[28px] tracking-[0.02em] text-white">Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em] mb-2">Display Name</label>
                  <input type="text" defaultValue="Alex Chen" className="w-full bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white font-body focus:border-electric outline-none transition-colors" />
                </div>
                <div>
                  <label className="block font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em] mb-2">Email</label>
                  <input type="email" defaultValue="alex@kre8trix.app" className="w-full bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white font-body focus:border-electric outline-none transition-colors" />
                </div>
                <div>
                  <label className="block font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em] mb-2">Phone</label>
                  <input type="tel" defaultValue="+1 (555) 123-4567" className="w-full bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white font-body focus:border-electric outline-none transition-colors" />
                </div>
                <div>
                  <label className="block font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em] mb-2">Creator Handle</label>
                  <input type="text" defaultValue="@alexcreates" className="w-full bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white font-body focus:border-electric outline-none transition-colors" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="font-display text-[28px] tracking-[0.02em] text-white">Notifications</h3>
              <div className="space-y-4">
                {[
                  { label: 'Payment received', desc: 'Get notified when you receive a payment', defaultOn: true },
                  { label: 'Advance due', desc: 'Reminder before advance repayment', defaultOn: true },
                  { label: 'Score changes', desc: 'When your CCS score updates', defaultOn: true },
                  { label: 'Platform disconnect', desc: 'If a connected platform loses sync', defaultOn: false },
                  { label: 'Marketing emails', desc: 'Product updates and tips', defaultOn: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-body text-[14px] text-white">{item.label}</p>
                      <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">{item.desc}</p>
                    </div>
                    <Toggle defaultOn={item.defaultOn} />
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

          {activeTab === 'connections' && (
            <div className="space-y-6">
              <h3 className="font-display text-[28px] tracking-[0.02em] text-white">Connected Accounts</h3>
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div key={account.name} className="flex items-center justify-between p-4 rounded-xl bg-panel2">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-panel flex items-center justify-center font-body text-[12px] text-white">
                        {account.name[0]}
                      </span>
                      <div>
                        <p className="font-body text-[14px] text-white">{account.name}</p>
                        {account.user && <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">{account.user}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleAccount(account.name)}
                      className={`px-4 py-2 rounded-lg font-mono text-[12px] transition-all ${
                        account.connected
                          ? 'bg-[rgba(255,77,77,0.1)] text-negative hover:bg-[rgba(255,77,77,0.2)]'
                          : 'bg-acid text-void hover:brightness-110'
                      }`}
                    >
                      {account.connected ? 'Disconnect' : 'Connect'}
                    </button>
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
              className="flex items-center gap-2 bg-acid text-void font-body text-[16px] font-semibold px-6 py-3 rounded-2xl"
            >
              {saved ? <Check size={18} /> : <Save size={18} />}
              {saved ? 'Saved!' : 'Save Changes'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      onClick={() => setOn(!on)}
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
