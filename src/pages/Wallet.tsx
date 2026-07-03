import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Clock,
  Copy,
  Check,
  Loader2,
  HandCoins,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/hooks/use-api';
import type { WalletBalances, WalletMutationResponse, WalletTransaction } from '@/lib/types';
import { BalanceCardSkeleton, ErrorNotice, TransactionListSkeleton } from '@/components/Skeletons';

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */
const WALLET_ADDRESS = 'Hx3fK9mNpQr2sT5vW8xYzAbCdEfGhIjKlMnOpQrStUv9kL2';

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
function StatusBadge({ status }: { status: WalletTransaction['status'] }) {
  const styles: Record<WalletTransaction['status'], string> = {
    Completed: 'bg-[rgba(0,229,160,0.15)] text-positive',
    Pending: 'bg-[rgba(255,212,0,0.15)] text-[#FFD400]',
    Failed: 'bg-[rgba(255,77,77,0.15)] text-negative',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full font-mono text-[12px] tracking-[0.04em] ${styles[status]}`}>
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */
type WalletTab = 'send' | 'request' | 'receive' | 'convert' | 'history';

const TABS = [
  { key: 'send', label: 'Send', icon: ArrowUpRight },
  { key: 'request', label: 'Request', icon: HandCoins },
  { key: 'receive', label: 'Receive', icon: ArrowDownLeft },
  { key: 'convert', label: 'Convert', icon: RefreshCw },
  { key: 'history', label: 'History', icon: Clock },
] as const;

const VALID_TABS: WalletTab[] = ['send', 'request', 'receive', 'convert', 'history'];

/* ------------------------------------------------------------------ */
/*  Main Wallet component                                              */
/* ------------------------------------------------------------------ */
export default function Wallet() {
  const [searchParams, setSearchParams] = useSearchParams();

  /* A5 — ?action=send|request|convert (and receive/history) selects the tab.
     The URL is the single source of truth so deep links always win. */
  const actionParam = searchParams.get('action');
  const activeTab: WalletTab = VALID_TABS.includes(actionParam as WalletTab)
    ? (actionParam as WalletTab)
    : 'send';

  const selectTab = (tab: WalletTab) => {
    setSearchParams({ action: tab }, { replace: true });
  };

  /* API state */
  const balancesQuery = useApi<WalletBalances>('/wallet/balances');
  const transactionsQuery = useApi<WalletTransaction[]>('/wallet/transactions');
  const balances = balancesQuery.data;

  /* Form state */
  const [sendCurrency, setSendCurrency] = useState<'USD' | 'USDC'>('USD');
  const [sendAmount, setSendAmount] = useState('');
  const [sendRecipient, setSendRecipient] = useState('');
  const [requestCurrency, setRequestCurrency] = useState<'USD' | 'USDC'>('USD');
  const [requestAmount, setRequestAmount] = useState('');
  const [requestFrom, setRequestFrom] = useState('');
  const [copied, setCopied] = useState(false);
  const [convertFrom, setConvertFrom] = useState<'USD' | 'USDC'>('USD');
  const [convertAmount, setConvertAmount] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'All' | 'USD' | 'USDC'>('All');
  const [submitting, setSubmitting] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredTransactions = (transactionsQuery.data ?? []).filter((t) =>
    historyFilter === 'All' ? true : t.currency === historyFilter
  );

  const availableBalance = sendCurrency === 'USD' ? balances?.usd ?? 0 : balances?.usdc ?? 0;
  const amountNum = parseFloat(sendAmount) || 0;
  const hasEnough = amountNum > 0 && amountNum <= availableBalance;

  const requestNum = parseFloat(requestAmount) || 0;

  const convertNum = parseFloat(convertAmount) || 0;
  const convertAvailable = convertFrom === 'USD' ? balances?.usd ?? 0 : balances?.usdc ?? 0;
  const rate = 1.0;
  const convertedAmount = convertFrom === 'USD' ? convertNum / rate : convertNum * rate;
  const convertTo = convertFrom === 'USD' ? 'USDC' : 'USD';

  /* Mutations — refresh balances + history from the API response */
  const applyMutation = (result: WalletMutationResponse) => {
    balancesQuery.setData(result.balances);
    transactionsQuery.refresh();
  };

  const handleSend = async () => {
    setSubmitting(true);
    try {
      const result = await api.post<WalletMutationResponse>('/wallet/send', {
        currency: sendCurrency,
        amount: amountNum,
        recipient: sendRecipient,
      });
      applyMutation(result);
      toast.success(
        `Sent ${sendCurrency === 'USD' ? `$${amountNum.toLocaleString()}` : `${amountNum.toLocaleString()} USDC`} to ${sendRecipient}`,
      );
      setSendAmount('');
      setSendRecipient('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Transfer failed — try again');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequest = async () => {
    setSubmitting(true);
    try {
      const result = await api.post<WalletMutationResponse>('/wallet/request', {
        currency: requestCurrency,
        amount: requestNum,
        recipient: requestFrom,
      });
      applyMutation(result);
      toast.success(`Payment request sent to ${requestFrom}`);
      setRequestAmount('');
      setRequestFrom('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Request failed — try again');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvert = async () => {
    setSubmitting(true);
    try {
      const result = await api.post<WalletMutationResponse>('/wallet/convert', {
        from: convertFrom,
        amount: convertNum,
      });
      applyMutation(result);
      toast.success(`Converted ${convertNum.toLocaleString()} ${convertFrom} to ${convertTo}`);
      setConvertAmount('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Conversion failed — try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Balance Cards */}
      {balancesQuery.error ? (
        <div className="bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl">
          <ErrorNotice message={balancesQuery.error} onRetry={balancesQuery.refresh} />
        </div>
      ) : balancesQuery.loading || !balances ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BalanceCardSkeleton />
          <BalanceCardSkeleton />
        </div>
      ) : (
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
                onClick={() => selectTab('receive')}
                className="text-electric font-body text-[14px] font-medium hover:text-acid transition-colors"
              >
                Deposit
              </button>
            </div>
            <div className="font-mono text-[56px] font-medium tracking-[-0.02em] text-white leading-none mb-2">
              $<AnimatedNumber value={balances.usd} />
            </div>
            <div className="flex items-end justify-between">
              <span className="font-mono text-[12px] tracking-[0.04em] text-[rgba(255,255,255,0.42)]">Account ending 4821</span>
              <MiniSparkline data={balances.usdSparkline} color="#00D4FF" />
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
                onClick={() => selectTab('receive')}
                className="text-electric font-body text-[14px] font-medium hover:text-acid transition-colors"
              >
                Deposit
              </button>
            </div>
            <div className="font-mono text-[56px] font-medium tracking-[-0.02em] text-white leading-none mb-2">
              <AnimatedNumber value={balances.usdc} suffix=" USDC" />
            </div>
            <div className="flex items-end justify-between">
              <span className="font-mono text-[12px] tracking-[0.04em] text-[rgba(255,255,255,0.42)]">Solana Network</span>
              <MiniSparkline data={balances.usdcSparkline} color="#9B5DE5" />
            </div>
          </motion.div>
        </div>
      )}

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
              onClick={() => selectTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-body text-[14px] font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-acid text-void'
                  : 'text-[rgba(255,255,255,0.42)] hover:text-white'
              }`}
            >
              <tab.icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'send' && (
            <motion.div key="send" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <button onClick={() => setSendCurrency('USD')} className={`px-4 py-2 rounded-xl font-mono text-[14px] ${sendCurrency === 'USD' ? 'bg-acid text-void' : 'bg-panel2 text-white'}`}>USD</button>
                  <button onClick={() => setSendCurrency('USDC')} className={`px-4 py-2 rounded-xl font-mono text-[14px] ${sendCurrency === 'USDC' ? 'bg-acid text-void' : 'bg-panel2 text-white'}`}>USDC</button>
                </div>
                <input
                  type="number"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder={`Amount (${sendCurrency})`}
                  className="w-full bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-4 font-mono text-[24px] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-electric outline-none transition-colors"
                />
                <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">
                  Available: {sendCurrency === 'USD' ? `$${availableBalance.toLocaleString()}` : `${availableBalance.toLocaleString()} USDC`}
                </p>
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
                  disabled={!hasEnough || !sendRecipient || submitting}
                  onClick={handleSend}
                  className="w-full flex items-center justify-center gap-2 bg-acid text-void font-body text-[16px] font-semibold py-4 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting && <Loader2 size={18} className="animate-spin" />}
                  Send {sendCurrency}
                </motion.button>
              </div>
            </motion.div>
          )}

          {activeTab === 'request' && (
            <motion.div key="request" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <button onClick={() => setRequestCurrency('USD')} className={`px-4 py-2 rounded-xl font-mono text-[14px] ${requestCurrency === 'USD' ? 'bg-acid text-void' : 'bg-panel2 text-white'}`}>USD</button>
                  <button onClick={() => setRequestCurrency('USDC')} className={`px-4 py-2 rounded-xl font-mono text-[14px] ${requestCurrency === 'USDC' ? 'bg-acid text-void' : 'bg-panel2 text-white'}`}>USDC</button>
                </div>
                <input
                  type="number"
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  placeholder={`Amount (${requestCurrency})`}
                  className="w-full bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-4 font-mono text-[24px] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-electric outline-none transition-colors"
                />
                <input
                  type="text"
                  value={requestFrom}
                  onChange={(e) => setRequestFrom(e.target.value)}
                  placeholder="Request from (email, username, or address)"
                  className="w-full bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 font-body text-[16px] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-electric outline-none transition-colors"
                />
                <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">
                  They'll get a payment link — funds land in your {requestCurrency} wallet once paid.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={requestNum <= 0 || !requestFrom || submitting}
                  onClick={handleRequest}
                  className="w-full flex items-center justify-center gap-2 bg-acid text-void font-body text-[16px] font-semibold py-4 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting && <Loader2 size={18} className="animate-spin" />}
                  Request {requestCurrency}
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
                <code className="font-mono text-[14px] text-white bg-panel px-4 py-2 rounded-xl">{WALLET_ADDRESS.slice(0, 16)}...{WALLET_ADDRESS.slice(-4)}</code>
                <button onClick={() => handleCopy(WALLET_ADDRESS)} className="p-2 rounded-xl bg-panel text-[rgba(255,255,255,0.42)] hover:text-white transition-colors">
                  {copied ? <Check size={16} className="text-positive" /> : <Copy size={16} />}
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'convert' && (
            <motion.div key="convert" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <button onClick={() => setConvertFrom('USD')} className={`flex-1 py-3 rounded-xl font-mono text-[14px] ${convertFrom === 'USD' ? 'bg-acid text-void' : 'bg-panel2 text-white'}`}>USD → USDC</button>
                  <button onClick={() => setConvertFrom('USDC')} className={`flex-1 py-3 rounded-xl font-mono text-[14px] ${convertFrom === 'USDC' ? 'bg-acid text-void' : 'bg-panel2 text-white'}`}>USDC → USD</button>
                </div>
                <input
                  type="number"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  placeholder={`Amount in ${convertFrom}`}
                  className="w-full bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-4 font-mono text-[24px] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-electric outline-none transition-colors"
                />
                <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">
                  Available: {convertFrom === 'USD' ? `$${convertAvailable.toLocaleString()}` : `${convertAvailable.toLocaleString()} USDC`}
                </p>
                {convertNum > 0 && (
                  <p className="font-mono text-[14px] text-electric">
                    You'll receive: {convertedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {convertTo}
                  </p>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={convertNum <= 0 || convertNum > convertAvailable || submitting}
                  onClick={handleConvert}
                  className="w-full flex items-center justify-center gap-2 bg-acid text-void font-body text-[16px] font-semibold py-4 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting && <Loader2 size={18} className="animate-spin" />}
                  Convert
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
              {transactionsQuery.error ? (
                <ErrorNotice message={transactionsQuery.error} onRetry={transactionsQuery.refresh} />
              ) : transactionsQuery.loading || !transactionsQuery.data ? (
                <TransactionListSkeleton rows={6} />
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredTransactions.length === 0 ? (
                    <p className="text-center py-8 font-mono text-[12px] text-[rgba(255,255,255,0.42)]">
                      No {historyFilter !== 'All' ? historyFilter : ''} transactions yet
                    </p>
                  ) : (
                    filteredTransactions.map((tx) => (
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
                    ))
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
