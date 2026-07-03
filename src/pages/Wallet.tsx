import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Clock,
  Copy,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  Send,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */
const USD_BALANCE = 24850.00;
const USDC_BALANCE = 12450.00;

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: 'Income' | 'Expense' | 'Convert';
  currency: 'USD' | 'USDC';
  amount: number;
  status: 'Completed' | 'Pending';
}

const TRANSACTIONS: Transaction[] = [
  { id: '1', date: 'Oct 15, 2024', description: 'YouTube Ad Revenue', type: 'Income', currency: 'USD', amount: 4850.00, status: 'Completed' },
  { id: '2', date: 'Oct 15, 2024', description: 'USDC → USD', type: 'Convert', currency: 'USD', amount: 500.00, status: 'Completed' },
  { id: '3', date: 'Oct 14, 2024', description: 'TikTok Creator Fund', type: 'Income', currency: 'USD', amount: 1240.00, status: 'Completed' },
  { id: '4', date: 'Oct 13, 2024', description: 'Shopify Store Sales', type: 'Income', currency: 'USD', amount: 2180.00, status: 'Completed' },
  { id: '5', date: 'Oct 12, 2024', description: 'Equipment Purchase', type: 'Expense', currency: 'USD', amount: -1299.00, status: 'Completed' },
  { id: '6', date: 'Oct 12, 2024', description: 'USD → USDC', type: 'Convert', currency: 'USDC', amount: 850.00, status: 'Completed' },
  { id: '7', date: 'Oct 11, 2024', description: 'Advance Repayment', type: 'Expense', currency: 'USD', amount: -1850.00, status: 'Completed' },
  { id: '8', date: 'Oct 10, 2024', description: 'Stripe Payout', type: 'Income', currency: 'USD', amount: 3450.00, status: 'Pending' },
  { id: '9', date: 'Oct 10, 2024', description: 'Patreon Subscriptions', type: 'Income', currency: 'USD', amount: 890.00, status: 'Completed' },
  { id: '10', date: 'Oct 9, 2024', description: 'USDC Deposit (Solana)', type: 'Income', currency: 'USDC', amount: 2000.00, status: 'Completed' },
  { id: '11', date: 'Oct 8, 2024', description: 'Card Subscription', type: 'Expense', currency: 'USD', amount: -29.00, status: 'Completed' },
  { id: '12', date: 'Oct 7, 2024', description: 'Brand Sponsorship', type: 'Income', currency: 'USD', amount: 5000.00, status: 'Completed' },
];

const RECIPIENTS = [
  { name: 'Editor Mike', avatar: 'M', color: '#00D4FF' },
  { name: 'Tax Account', avatar: 'T', color: '#C8FF00' },
  { name: 'Equipment Vendor', avatar: 'E', color: '#FF4D00' },
  { name: 'Studio Rent', avatar: 'S', color: '#9B5DE5' },
];

const SPARKLINE_USD = [22000, 22500, 23200, 22800, 23500, 24000, 23800, 24200, 24850];

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
/*  Tab button                                                         */
/* ------------------------------------------------------------------ */
const TABS = [
  { key: 'send', label: 'Send', icon: ArrowUpRight },
  { key: 'receive', label: 'Receive', icon: ArrowDownLeft },
  { key: 'convert', label: 'Convert', icon: RefreshCw },
  { key: 'history', label: 'History', icon: Clock },
] as const;

/* ------------------------------------------------------------------ */
/*  Main Wallet component                                              */
/* ------------------------------------------------------------------ */
export default function Wallet() {
  const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'convert' | 'history'>('send');
  const [sendCurrency, setSendCurrency] = useState<'USD' | 'USDC'>('USD');
  const [sendAmount, setSendAmount] = useState('');
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendNote, setSendNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [convertFrom, setConvertFrom] = useState<'USD' | 'USDC'>('USD');
  const [convertAmount, setConvertAmount] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'All' | 'USD' | 'USDC'>('All');

  const walletAddress = 'Hx3fK9mNpQr2sT5vW8xYzAbCdEfGhIjKlMnOpQrStUv9kL2';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredTransactions = TRANSACTIONS.filter((t) =>
    historyFilter === 'All' ? true : t.currency === historyFilter
  );

  const availableBalance = sendCurrency === 'USD' ? USD_BALANCE : USDC_BALANCE;
  const amountNum = parseFloat(sendAmount) || 0;
  const hasEnough = amountNum > 0 && amountNum <= availableBalance;

  const convertNum = parseFloat(convertAmount) || 0;
  const rate = 1.0;
  const convertedAmount = convertFrom === 'USD' ? convertNum / rate : convertNum * rate;
  const convertTo = convertFrom === 'USD' ? 'USDC' : 'USD';

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
            <button className="text-electric font-body text-[14px] font-medium hover:text-acid transition-colors">
              Deposit
            </button>
          </div>
          <div className="font-mono text-[56px] font-medium tracking-[-0.02em] text-white leading-none mb-2">
            $<AnimatedNumber value={USD_BALANCE} />
          </div>
          <div className="flex items-end justify-between">
            <span className="font-mono text-[12px] tracking-[0.04em] text-[rgba(255,255,255,0.42)]">Account ending 4821</span>
            <MiniSparkline data={SPARKLINE_USD} color="#00D4FF" />
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
            <button className="text-electric font-body text-[14px] font-medium hover:text-acid transition-colors">
              Deposit
            </button>
          </div>
          <div className="font-mono text-[56px] font-medium tracking-[-0.02em] text-white leading-none mb-2">
            <AnimatedNumber value={USDC_BALANCE} suffix=" USDC" />
          </div>
          <div className="flex items-end justify-between">
            <span className="font-mono text-[12px] tracking-[0.04em] text-[rgba(255,255,255,0.42)]">Solana Network</span>
            <MiniSparkline data={[4200, 5100, 5800, 6200, 7400, 8900, 10200, 11500, 12450]} color="#9B5DE5" />
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
                  Available: {sendCurrency === 'USD' ? `$${USD_BALANCE.toLocaleString()}` : `${USDC_BALANCE.toLocaleString()} USDC`}
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
                  disabled={!hasEnough || !sendRecipient}
                  className="w-full bg-acid text-void font-body text-[16px] font-semibold py-4 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Send {sendCurrency}
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
                {convertNum > 0 && (
                  <p className="font-mono text-[14px] text-electric">
                    You'll receive: {convertedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {convertTo}
                  </p>
                )}
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full bg-acid text-void font-body text-[16px] font-semibold py-4 rounded-2xl">
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
