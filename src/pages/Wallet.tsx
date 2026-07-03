import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Clock,
  Copy,
  Check,
  Info,
} from 'lucide-react';
import { ApiError } from '@/lib/api/index';
import {
  fetchWalletBalances,
  fetchWalletTransactions,
  sendFunds,
  convertFunds,
} from '@/lib/api/wallet';
import type { Balance, Currency, Transaction } from '@/lib/api/types';

export const RECIPIENTS = [
  { name: 'Editor Mike', avatar: 'M', color: '#00D4FF' },
  { name: 'Tax Account', avatar: 'T', color: '#C8FF00' },
  { name: 'Equipment Vendor', avatar: 'E', color: '#FF4D00' },
  { name: 'Studio Rent', avatar: 'S', color: '#9B5DE5' },
];

/* ------------------------------------------------------------------ */
/*  Animated number component                                          */
/* ------------------------------------------------------------------ */
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 2 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => {
    const sign = v < 0 ? '-' : '';
    const abs = Math.abs(v);
    return `${prefix}${sign}${abs.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
  });

  useEffect(() => {
    const controls = animate(motionVal, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] });
    return controls.stop;
  }, [value, motionVal]);

  useEffect(() => {
    return rounded.on('change', (v) => {
      if (ref.current) ref.current.textContent = v;
    });
  }, [rounded]);

  return <span ref={ref}>{`${prefix}0${suffix}`}</span>;
}

/* ------------------------------------------------------------------ */
/*  Mini sparkline (SVG)                                               */
/* ------------------------------------------------------------------ */
function MiniSparkline({ data, color = '#00D4FF' }: { data: number[]; color?: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 120;
  const h = 40;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-70">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={h - ((data[data.length - 1] - min) / range) * h} r="3" fill={color} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }: { status: 'Completed' | 'Pending' }) {
  const isCompleted = status === 'Completed';
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full font-mono text-[12px] tracking-[0.04em] ${
      isCompleted
        ? 'bg-[rgba(0,229,160,0.15)] text-positive'
        : 'bg-[rgba(255,212,0,0.15)] text-[#FFD400]'
    }`}>
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading / error states                                             */
/* ------------------------------------------------------------------ */
function WalletSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="animate-pulse bg-surface rounded-[20px] h-[186px]" />
        <div className="animate-pulse bg-surface rounded-[20px] h-[186px]" />
      </div>
      <div className="bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 space-y-6">
        <div className="animate-pulse bg-surface rounded-xl h-[52px]" />
        <div className="space-y-4">
          <div className="animate-pulse bg-surface rounded-xl h-[40px] w-[160px]" />
          <div className="animate-pulse bg-surface rounded-xl h-[64px]" />
          <div className="animate-pulse bg-surface rounded-xl h-[50px]" />
          <div className="animate-pulse bg-surface rounded-2xl h-[56px]" />
        </div>
      </div>
    </div>
  );
}

function WalletError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-panel border border-[rgba(255,77,0,0.25)] rounded-2xl p-12 flex flex-col items-center text-center gap-4">
      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,77,0,0.12)' }}>
        <Info size={22} className="text-ember" />
      </div>
      <div>
        <p className="font-display text-[28px] tracking-[0.02em] text-white">
          Couldn't load your wallet
        </p>
        <p className="font-body text-[14px] text-[rgba(255,255,255,0.42)] mt-1">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="mt-2 px-6 py-2.5 rounded-xl bg-acid text-black font-body text-[14px] font-semibold hover:opacity-90 transition-opacity duration-200 flex items-center gap-2"
      >
        <RefreshCw size={16} />
        Retry
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab button                                                         */
/* ------------------------------------------------------------------ */
const TABS = [
  { key: 'send', label: 'Send', icon: ArrowUpRight },
  { key: 'receive', label: 'Receive', icon: ArrowDownLeft },
  { key: 'convert', label: 'Convert', icon: RefreshCw },
  { key: 'history', label: 'History', icon: Clock },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const ACTION_TO_TAB: Record<string, TabKey> = {
  send: 'send',
  request: 'receive',
  receive: 'receive',
  convert: 'convert',
  history: 'history',
};

/* ------------------------------------------------------------------ */
/*  Main Wallet component                                              */
/* ------------------------------------------------------------------ */
export default function Wallet() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const action = searchParams.get('action');
    return (action && ACTION_TO_TAB[action]) || 'send';
  });
  const [sendCurrency, setSendCurrency] = useState<Currency>('USD');
  const [sendAmount, setSendAmount] = useState('');
  const [sendRecipient, setSendRecipient] = useState('');
  const [copied, setCopied] = useState(false);
  const [convertFrom, setConvertFrom] = useState<Currency>('USD');
  const [convertAmount, setConvertAmount] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'All' | 'USD' | 'USDC'>('All');

  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);

  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    Promise.all([fetchWalletBalances(), fetchWalletTransactions()])
      .then(([balancesRes, txRes]) => {
        if (cancelled) return;
        setBalances(balancesRes);
        setTransactions(txRes);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      });
    return () => {
      cancelled = true;
    };
  }, [loadKey]);

  const walletAddress = 'Hx3fK9mNpQr2sT5vW8xYzAbCdEfGhIjKlMnOpQrStUv9kL2';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loadError) {
    return <WalletError message={loadError} onRetry={() => setLoadKey((k) => k + 1)} />;
  }

  if (!balances || !transactions) {
    return <WalletSkeleton />;
  }

  const usdBalance = balances.find((b) => b.currency === 'USD')?.amount ?? 0;
  const usdcBalance = balances.find((b) => b.currency === 'USDC')?.amount ?? 0;
  const usdSparkline = balances.find((b) => b.currency === 'USD')?.sparkline ?? [];
  const usdcSparkline = balances.find((b) => b.currency === 'USDC')?.sparkline ?? [];

  const filteredTransactions = transactions.filter((t) =>
    historyFilter === 'All' ? true : t.currency === historyFilter
  );

  const availableBalance = sendCurrency === 'USD' ? usdBalance : usdcBalance;
  const amountNum = parseFloat(sendAmount) || 0;
  const sendInsufficient = amountNum > availableBalance;
  const hasEnough = amountNum > 0 && !sendInsufficient;

  const convertNum = parseFloat(convertAmount) || 0;
  const rate = 1.0;
  const convertedAmount = convertFrom === 'USD' ? convertNum / rate : convertNum * rate;
  const convertTo: Currency = convertFrom === 'USD' ? 'USDC' : 'USD';
  const convertBalance = convertFrom === 'USD' ? usdBalance : usdcBalance;
  const convertInsufficient = convertNum > convertBalance;
  const canConvert = convertNum > 0 && !convertInsufficient;

  const applyBalance = (updated: Balance) => {
    setBalances((prev) => prev?.map((b) => (b.currency === updated.currency ? updated : b)) ?? prev);
  };

  const handleSend = async () => {
    setSendError(null);
    setIsSending(true);
    try {
      const res = await sendFunds({ recipient: sendRecipient, amount: amountNum, currency: sendCurrency });
      applyBalance(res.balance);
      setTransactions((prev) => (prev ? [res.transaction, ...prev] : prev));
      const newBalance = res.balance.amount.toLocaleString('en-US', { minimumFractionDigits: 2 });
      toast.success(
        `Sent ${sendCurrency === 'USD' ? `$${amountNum.toLocaleString()}` : `${amountNum.toLocaleString()} USDC`} to ${sendRecipient} — new balance: ${sendCurrency === 'USD' ? `$${newBalance}` : `${newBalance} USDC`}`
      );
      setSendAmount('');
      setSendRecipient('');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INSUFFICIENT_FUNDS') {
        setSendError(err.message);
      } else {
        toast.error(err instanceof Error ? err.message : 'Send failed. Please try again.');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleConvert = async () => {
    setConvertError(null);
    setIsConverting(true);
    try {
      const res = await convertFunds({ from: convertFrom, to: convertTo, amount: convertNum, rate });
      setBalances(res.balances);
      setTransactions((prev) => (prev ? [res.transaction, ...prev] : prev));
      const newBalance = (res.balances.find((b) => b.currency === convertTo)?.amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
      toast.success(
        `Converted ${convertNum.toLocaleString()} ${convertFrom} to ${res.transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${convertTo} — ${convertTo} balance: ${convertTo === 'USD' ? `$${newBalance}` : `${newBalance} USDC`}`
      );
      setConvertAmount('');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INSUFFICIENT_FUNDS') {
        setConvertError(err.message);
      } else {
        toast.error(err instanceof Error ? err.message : 'Conversion failed. Please try again.');
      }
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="relative rounded-[20px] p-7 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0F0F1E 0%, rgba(0,212,255,0.04) 100%)',
            border: '1px solid rgba(0,212,255,0.12)',
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[12px] tracking-[0.04em] text-[rgba(255,255,255,0.42)]">USD Wallet</span>
              <span className="px-2 py-0.5 rounded-full bg-[rgba(0,229,160,0.15)] text-positive font-mono text-[11px]">Available</span>
            </div>
            <button
              onClick={() => setActiveTab('receive')}
              className="text-electric font-body text-[14px] font-medium hover:text-acid transition-colors"
            >
              Deposit
            </button>
          </div>
          <div className="font-mono text-[56px] font-medium tracking-[-0.02em] text-white leading-none mb-2">
            $<AnimatedNumber value={usdBalance} />
          </div>
          <div className="flex items-end justify-between">
            <span className="font-mono text-[12px] tracking-[0.04em] text-[rgba(255,255,255,0.42)]">Account ending 4821</span>
            {usdSparkline.length > 1 && <MiniSparkline data={usdSparkline} color="#00D4FF" />}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="relative rounded-[20px] p-7 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0F0F1E 0%, rgba(155,93,229,0.04) 100%)',
            border: '1px solid rgba(155,93,229,0.12)',
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[12px] tracking-[0.04em] text-[rgba(255,255,255,0.42)]">USDC Wallet</span>
              <span className="px-2 py-0.5 rounded-full bg-[rgba(0,229,160,0.15)] text-positive font-mono text-[11px]">Available</span>
            </div>
            <button
              onClick={() => setActiveTab('receive')}
              className="text-electric font-body text-[14px] font-medium hover:text-acid transition-colors"
            >
              Deposit
            </button>
          </div>
          <div className="font-mono text-[56px] font-medium tracking-[-0.02em] text-white leading-none mb-2">
            <AnimatedNumber value={usdcBalance} suffix=" USDC" />
          </div>
          <div className="flex items-end justify-between">
            <span className="font-mono text-[12px] tracking-[0.04em] text-[rgba(255,255,255,0.42)]">Solana Network</span>
            {usdcSparkline.length > 1 && <MiniSparkline data={usdcSparkline} color="#9B5DE5" />}
          </div>
        </motion.div>
      </div>

      {/* Action Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl p-6"
      >
        <div className="flex bg-[rgba(255,255,255,0.06)] rounded-xl p-1 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-body text-[14px] font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-acid text-void'
                  : 'text-[rgba(255,255,255,0.42)] hover:text-white'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'send' && (
            <motion.div key="send" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <button onClick={() => { setSendCurrency('USD'); setSendError(null); }} className={`px-4 py-2 rounded-xl font-mono text-[14px] ${sendCurrency === 'USD' ? 'bg-acid text-void' : 'bg-panel2 text-white'}`}>USD</button>
                  <button onClick={() => { setSendCurrency('USDC'); setSendError(null); }} className={`px-4 py-2 rounded-xl font-mono text-[14px] ${sendCurrency === 'USDC' ? 'bg-acid text-void' : 'bg-panel2 text-white'}`}>USDC</button>
                </div>
                <input
                  type="number"
                  value={sendAmount}
                  onChange={(e) => { setSendAmount(e.target.value); setSendError(null); }}
                  placeholder={`Amount (${sendCurrency})`}
                  className="w-full bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-4 font-mono text-[24px] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-electric outline-none transition-colors"
                />
                <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">
                  Available: {sendCurrency === 'USD' ? `$${usdBalance.toLocaleString()}` : `${usdcBalance.toLocaleString()} USDC`}
                </p>
                {(sendError || sendInsufficient) && (
                  <p className="font-mono text-[12px] text-negative">
                    {sendError ?? `Insufficient funds — you can send up to ${sendCurrency === 'USD' ? `$${availableBalance.toLocaleString()}` : `${availableBalance.toLocaleString()} USDC`}.`}
                  </p>
                )}
                <input
                  type="text"
                  value={sendRecipient}
                  onChange={(e) => setSendRecipient(e.target.value)}
                  placeholder="Recipient address or username"
                  className="w-full bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 font-body text-[16px] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-electric outline-none transition-colors"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!hasEnough || !sendRecipient || isSending}
                  onClick={handleSend}
                  className="w-full bg-acid text-void font-body text-[16px] font-semibold py-4 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSending ? 'Sending…' : `Send ${sendCurrency}`}
                </motion.button>
              </div>
            </motion.div>
          )}

          {activeTab === 'receive' && (
            <motion.div key="receive" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center py-8">
              <div className="inline-block bg-white p-4 rounded-2xl mb-4">
                <div className="w-[180px] h-[180px] bg-void rounded-xl grid grid-cols-7 grid-rows-7 gap-[2px]">
                  {Array.from({ length: 49 }).map((_, i) => (
                    <div key={i} className={`rounded-[1px] ${[0,1,2,3,4,6,7,13,14,16,18,20,21,22,25,27,28,32,34,35,38,39,40,41,42,44,46,48].includes(i) ? 'bg-void' : 'bg-transparent'}`} />
                  ))}
                </div>
              </div>
              <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)] mb-2">Your Wallet Address</p>
              <div className="flex items-center justify-center gap-2">
                <code className="font-mono text-[14px] text-white bg-panel px-4 py-2 rounded-xl">{walletAddress.slice(0, 16)}...{walletAddress.slice(-4)}</code>
                <button onClick={() => handleCopy(walletAddress)} className="p-2 rounded-xl bg-panel text-[rgba(255,255,255,0.42)] hover:text-white transition-colors">
                  {copied ? <Check size={16} className="text-positive" /> : <Copy size={16} />}
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'convert' && (
            <motion.div key="convert" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <button onClick={() => { setConvertFrom('USD'); setConvertError(null); }} className={`flex-1 py-3 rounded-xl font-mono text-[14px] ${convertFrom === 'USD' ? 'bg-acid text-void' : 'bg-panel2 text-white'}`}>USD → USDC</button>
                  <button onClick={() => { setConvertFrom('USDC'); setConvertError(null); }} className={`flex-1 py-3 rounded-xl font-mono text-[14px] ${convertFrom === 'USDC' ? 'bg-acid text-void' : 'bg-panel2 text-white'}`}>USDC → USD</button>
                </div>
                <input
                  type="number"
                  value={convertAmount}
                  onChange={(e) => { setConvertAmount(e.target.value); setConvertError(null); }}
                  placeholder={`Amount in ${convertFrom}`}
                  className="w-full bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-4 font-mono text-[24px] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-electric outline-none transition-colors"
                />
                {convertNum > 0 && !convertInsufficient && (
                  <p className="font-mono text-[14px] text-electric">
                    You'll receive: {convertedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {convertTo}
                  </p>
                )}
                {(convertError || convertInsufficient) && (
                  <p className="font-mono text-[12px] text-negative">
                    {convertError ?? `Insufficient funds — you can convert up to ${convertFrom === 'USD' ? `$${convertBalance.toLocaleString()}` : `${convertBalance.toLocaleString()} USDC`}.`}
                  </p>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!canConvert || isConverting}
                  onClick={handleConvert}
                  className="w-full bg-acid text-void font-body text-[16px] font-semibold py-4 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isConverting ? 'Converting…' : 'Convert'}
                </motion.button>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex gap-2 mb-4">
                {(['All', 'USD', 'USDC'] as const).map((f) => (
                  <button key={f} onClick={() => setHistoryFilter(f)} className={`px-4 py-2 rounded-lg font-mono text-[12px] ${historyFilter === f ? 'bg-acid text-void' : 'bg-panel2 text-[rgba(255,255,255,0.42)]'}`}>
                    {f}
                  </button>
                ))}
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-panel2">
                    <div>
                      <p className="font-body text-[14px] text-white">{tx.description}</p>
                      <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">{tx.date} • {tx.type}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono text-[14px] ${tx.amount >= 0 ? 'text-positive' : 'text-negative'}`}>
                        {tx.amount >= 0 ? '+' : '-'}${Math.abs(tx.amount).toLocaleString()}
                      </p>
                      <StatusBadge status={tx.status} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
