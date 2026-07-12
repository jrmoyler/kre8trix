import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
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
import { useAuth } from '@/lib/auth-context';
import { isKycVerified } from '@/lib/kyc';
import { SOLANA_ADDRESS_RE } from '@/lib/types';
import type {
  Creator,
  KycProfile,
  RecentRecipient,
  WalletBalances,
  WalletMutationResponse,
  WalletTransaction,
} from '@/lib/types';
import InitialsAvatar from '@/components/InitialsAvatar';
import {
  BalanceCardSkeleton,
  ErrorNotice,
  SkeletonBlock,
  TransactionListSkeleton,
} from '@/components/Skeletons';

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */
const WALLET_ADDRESS = 'Hx3fK9mNpQr2sT5vW8xYzAbCdEfGhIjKlMnOpQrStUv9kL2';

/* D1: sends at or above this amount require completed identity verification. */
const KYC_SEND_THRESHOLD = 1000;

/* The two balances are presented in plain money terms — the settlement
 * rails behind the instant balance stay an implementation detail. */
const BALANCE_LABELS: Record<'USD' | 'USDC', string> = {
  USD: 'Cash',
  USDC: 'Instant',
};

/* ------------------------------------------------------------------ */
/*  C1 — creator-to-creator payment helpers                            */
/* ------------------------------------------------------------------ */
function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

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
function MiniSparkline({ data, color = 'rgb(var(--color-electric))' }: { data: number[]; color?: string }) {
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
    Completed: 'bg-[rgba(var(--positive-rgb),0.15)] text-positive',
    Pending: 'bg-[rgba(var(--gold-rgb),0.15)] text-[rgb(var(--color-gold))]',
    Failed: 'bg-[rgba(var(--negative-rgb),0.15)] text-negative',
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
  { key: 'convert', label: 'Move', icon: RefreshCw },
  { key: 'history', label: 'History', icon: Clock },
] as const;

const VALID_TABS: WalletTab[] = ['send', 'request', 'receive', 'convert', 'history'];

/* ------------------------------------------------------------------ */
/*  Main Wallet component                                              */
/* ------------------------------------------------------------------ */
export default function Wallet() {
  const navigate = useNavigate();
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

  const { user } = useAuth();

  /* API state */
  const balancesQuery = useApi<WalletBalances>('/wallet/balances');
  const transactionsQuery = useApi<WalletTransaction[]>('/wallet/transactions');
  const recipientsQuery = useApi<RecentRecipient[]>('/wallet/recipients');
  /* D1: large sends are gated behind identity verification. */
  const kycQuery = useApi<KycProfile>('/kyc/status');
  const kycVerified = isKycVerified(kycQuery.data?.status);
  const balances = balancesQuery.data;

  /* Form state */
  const [sendCurrency, setSendCurrency] = useState<'USD' | 'USDC'>('USD');
  const [sendAmount, setSendAmount] = useState('');
  const [sendRecipient, setSendRecipient] = useState('');

  /* C1 — recipient lookup state */
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [creatorResults, setCreatorResults] = useState<Creator[]>([]);
  const [creatorSearching, setCreatorSearching] = useState(false);
  /** The query the current creatorResults were resolved for. */
  const [searchedQuery, setSearchedQuery] = useState('');
  const [recipientFocused, setRecipientFocused] = useState(false);
  const [requestCurrency, setRequestCurrency] = useState<'USD' | 'USDC'>('USD');
  const [requestAmount, setRequestAmount] = useState('');
  const [requestFrom, setRequestFrom] = useState('');
  const [copied, setCopied] = useState(false);
  const [convertFrom, setConvertFrom] = useState<'USD' | 'USDC'>('USD');
  const [convertAmount, setConvertAmount] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'All' | 'USD' | 'USDC'>('All');
  const [submitting, setSubmitting] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error('Could not copy to clipboard'));
  };

  const filteredTransactions = (transactionsQuery.data ?? []).filter((t) =>
    historyFilter === 'All' ? true : t.currency === historyFilter
  );

  const availableBalance = sendCurrency === 'USD' ? balances?.usd ?? 0 : balances?.usdc ?? 0;
  const amountNum = parseFloat(sendAmount) || 0;
  const hasEnough = amountNum > 0 && amountNum <= availableBalance;
  /* D1: soft-gate large sends behind identity verification. */
  const kycBlocked = amountNum >= KYC_SEND_THRESHOLD && !kycVerified;

  /* ── C1: recipient resolution & validation ─────────────────────── */
  const trimmedRecipient = sendRecipient.trim();
  const isHandleInput = trimmedRecipient.startsWith('@');
  const isValidAddress = SOLANA_ADDRESS_RE.test(trimmedRecipient);
  const isSelfSend =
    trimmedRecipient === WALLET_ADDRESS ||
    (user !== null && trimmedRecipient.toLowerCase() === user.handle.toLowerCase());

  /* A picked creator, or an exact handle match among search results. */
  const exactMatch = creatorResults.find(
    (c) => c.handle.toLowerCase() === trimmedRecipient.toLowerCase(),
  );
  const activeCreator =
    selectedCreator && selectedCreator.handle.toLowerCase() === trimmedRecipient.toLowerCase()
      ? selectedCreator
      : exactMatch ?? null;

  /* Debounced creator search while typing a handle or name. All state
     updates run inside the (async) timeout to avoid cascading renders. */
  useEffect(() => {
    const q = sendRecipient.trim();
    const shouldSearch =
      q.length >= 2 &&
      !SOLANA_ADDRESS_RE.test(q) &&
      !(selectedCreator && q.toLowerCase() === selectedCreator.handle.toLowerCase());
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!shouldSearch) {
        if (!cancelled) {
          setCreatorResults([]);
          setSearchedQuery(q);
          setCreatorSearching(false);
        }
        return;
      }
      if (!cancelled) setCreatorSearching(true);
      try {
        const results = await api.get<Creator[]>(`/creators/search?q=${encodeURIComponent(q)}`);
        if (!cancelled) setCreatorResults(results);
      } catch {
        if (!cancelled) setCreatorResults([]);
      } finally {
        if (!cancelled) {
          setSearchedQuery(q);
          setCreatorSearching(false);
        }
      }
    }, shouldSearch ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sendRecipient, selectedCreator]);

  /* Inline recipient error (self-send / malformed deposit ID). */
  const addressLooksWrong =
    !isHandleInput &&
    trimmedRecipient.length > 0 &&
    !isValidAddress &&
    sendCurrency === 'USDC' &&
    (trimmedRecipient.length >= 32 || !recipientFocused);
  const recipientError = isSelfSend
    ? "You can't send to yourself"
    : addressLooksWrong && !activeCreator
      ? "That deposit ID doesn't look right — paste the full ID, or type @ to find a creator"
      : null;

  const recipientValid =
    !isSelfSend &&
    (activeCreator !== null ||
      isValidAddress ||
      (sendCurrency === 'USD' && trimmedRecipient.length > 0 && !isHandleInput));

  /* True while a search is in flight or results are for a stale query. */
  const searchPending = creatorSearching || searchedQuery !== trimmedRecipient;

  const showCreatorDropdown =
    recipientFocused &&
    !activeCreator &&
    !isValidAddress &&
    trimmedRecipient.length >= 2 &&
    (searchPending || isHandleInput || creatorResults.length > 0);

  const pickCreator = (creator: Creator) => {
    setSelectedCreator(creator);
    setSendRecipient(creator.handle);
    setRecipientFocused(false);
  };

  const pickRecentRecipient = (recipient: RecentRecipient) => {
    if (recipient.handle) {
      setSelectedCreator({
        id: recipient.id,
        handle: recipient.handle,
        displayName: recipient.displayName,
        initials: '',
        walletAddress: recipient.walletAddress,
      });
      setSendRecipient(recipient.handle);
    } else {
      setSelectedCreator(null);
      setSendRecipient(recipient.walletAddress);
    }
  };
  /* ── end C1 recipient logic ────────────────────────────────────── */

  const requestNum = parseFloat(requestAmount) || 0;

  const convertNum = parseFloat(convertAmount) || 0;
  const convertAvailable = convertFrom === 'USD' ? balances?.usd ?? 0 : balances?.usdc ?? 0;
  const convertTo = convertFrom === 'USD' ? 'USDC' : 'USD';

  /* Mutations — refresh balances + history from the API response */
  const applyMutation = (result: WalletMutationResponse) => {
    balancesQuery.setData(result.balances);
    transactionsQuery.refresh();
  };

  const handleSend = async () => {
    if (kycBlocked) {
      toast.error(`Complete identity verification to send $${KYC_SEND_THRESHOLD.toLocaleString()} or more`);
      return;
    }
    setSubmitting(true);
    /* C1: send the handle when a creator is picked — the mock backend
       resolves it to their wallet address and records the recipient. */
    const recipient = activeCreator ? activeCreator.handle : trimmedRecipient;
    try {
      const result = await api.post<WalletMutationResponse>('/wallet/send', {
        currency: sendCurrency,
        amount: amountNum,
        recipient,
      });
      applyMutation(result);
      recipientsQuery.refresh();
      toast.success(`Sent $${amountNum.toLocaleString()} to ${recipient}`);
      setSendAmount('');
      setSendRecipient('');
      setSelectedCreator(null);
      setCreatorResults([]);
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
      toast.success(
        `Moved $${convertNum.toLocaleString()} to your ${BALANCE_LABELS[convertTo]} Balance`,
      );
      setConvertAmount('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Transfer failed — try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Balance Cards */}
      {balancesQuery.error ? (
        <div className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl">
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
              background: 'linear-gradient(135deg, rgb(var(--color-panel)) 0%, rgba(var(--electric-rgb),0.04) 100%)',
              border: '1px solid rgba(var(--electric-rgb),0.12)',
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[12px] tracking-[0.04em] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">Cash Balance</span>
                <span className="px-2 py-0.5 rounded-full bg-[rgba(var(--positive-rgb),0.15)] text-positive font-mono text-[11px]">Available</span>
              </div>
              <button
                onClick={() => selectTab('receive')}
                className="text-electric font-body text-[14px] font-medium hover:text-acid transition-colors"
              >
                Deposit
              </button>
            </div>
            <div className="font-mono text-[56px] font-medium tracking-[-0.02em] text-ink leading-none mb-2">
              $<AnimatedNumber value={balances.usd} />
            </div>
            <div className="flex items-end justify-between">
              <span className="font-mono text-[12px] tracking-[0.04em] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">Account ending 4821</span>
              <MiniSparkline data={balances.usdSparkline} color="rgb(var(--color-electric))" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="relative rounded-[20px] p-7 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--color-panel)) 0%, rgba(var(--violet-rgb),0.04) 100%)',
              border: '1px solid rgba(var(--violet-rgb),0.12)',
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[12px] tracking-[0.04em] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">Instant Balance</span>
                <span className="px-2 py-0.5 rounded-full bg-[rgba(var(--positive-rgb),0.15)] text-positive font-mono text-[11px]">Available</span>
              </div>
              <button
                onClick={() => selectTab('receive')}
                className="text-electric font-body text-[14px] font-medium hover:text-acid transition-colors"
              >
                Deposit
              </button>
            </div>
            <div className="font-mono text-[56px] font-medium tracking-[-0.02em] text-ink leading-none mb-2">
              $<AnimatedNumber value={balances.usdc} />
            </div>
            <div className="flex items-end justify-between">
              <span className="font-mono text-[12px] tracking-[0.04em] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">Instant transfers · 24/7</span>
              <MiniSparkline data={balances.usdcSparkline} color="rgb(var(--color-violet))" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Action Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-6"
      >
        <div className="flex bg-[rgba(var(--fg-rgb),0.06)] rounded-xl p-1 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => selectTab(tab.key)}
              aria-label={tab.label}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-body text-[14px] font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-acid text-void'
                  : 'text-[rgba(var(--fg-rgb),var(--muted-alpha))] hover:text-ink'
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
                  <button onClick={() => setSendCurrency('USD')} className={`px-4 py-2 rounded-xl font-mono text-[14px] ${sendCurrency === 'USD' ? 'bg-acid text-void' : 'bg-panel2 text-ink'}`}>Cash</button>
                  <button onClick={() => setSendCurrency('USDC')} className={`px-4 py-2 rounded-xl font-mono text-[14px] ${sendCurrency === 'USDC' ? 'bg-acid text-void' : 'bg-panel2 text-ink'}`}>Instant</button>
                </div>
                <input
                  type="number"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder="Amount ($)"
                  aria-label="Amount to send"
                  className="w-full bg-surface border border-[rgba(var(--fg-rgb),0.1)] rounded-xl px-4 py-4 font-mono text-[24px] text-ink placeholder:text-[rgba(var(--fg-rgb),0.2)] focus:border-electric focus-visible:ring-2 focus-visible:ring-electric outline-none transition-colors"
                />
                <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">
                  Available: ${availableBalance.toLocaleString()} ({BALANCE_LABELS[sendCurrency]} Balance)
                </p>

                {/* C1 — Recent recipients */}
                {(recipientsQuery.loading || recipientsQuery.error || (recipientsQuery.data?.length ?? 0) > 0) && (
                  <div className="space-y-2">
                    <p className="font-mono text-[12px] tracking-[0.04em] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">
                      Recent recipients
                    </p>
                    {recipientsQuery.error ? (
                      <ErrorNotice message={recipientsQuery.error} onRetry={recipientsQuery.refresh} />
                    ) : recipientsQuery.loading && !recipientsQuery.data ? (
                      <div className="flex gap-2">
                        {[0, 1, 2].map((i) => (
                          <SkeletonBlock key={i} className="h-9 w-32 rounded-full" />
                        ))}
                      </div>
                    ) : (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {(recipientsQuery.data ?? []).map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => pickRecentRecipient(r)}
                            className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-panel2 border border-[rgba(var(--fg-rgb),0.08)] hover:border-electric transition-colors flex-shrink-0"
                          >
                            <InitialsAvatar name={r.displayName} size={24} />
                            <span className="font-body text-[13px] text-ink whitespace-nowrap">
                              {r.handle ?? shortenAddress(r.walletAddress)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* C1 — Recipient combobox: @handle lookup or deposit ID */}
                <div className="relative">
                  <input
                    type="text"
                    value={sendRecipient}
                    onChange={(e) => {
                      setSendRecipient(e.target.value);
                      if (
                        selectedCreator &&
                        e.target.value.trim().toLowerCase() !== selectedCreator.handle.toLowerCase()
                      ) {
                        setSelectedCreator(null);
                      }
                    }}
                    onFocus={() => setRecipientFocused(true)}
                    onBlur={() => setRecipientFocused(false)}
                    placeholder="@handle or deposit ID"
                    aria-label="Recipient"
                    aria-invalid={recipientError !== null}
                    className={`w-full bg-surface border rounded-xl px-4 py-3 font-body text-[16px] text-ink placeholder:text-[rgba(var(--fg-rgb),0.2)] outline-none transition-colors ${
                      recipientError
                        ? 'border-negative focus:border-negative focus-visible:ring-2 focus-visible:ring-negative'
                        : 'border-[rgba(var(--fg-rgb),0.1)] focus:border-electric focus-visible:ring-2 focus-visible:ring-electric'
                    }`}
                  />
                  {showCreatorDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-2 z-20 bg-panel2 border border-[rgba(var(--fg-rgb),0.12)] rounded-xl shadow-xl overflow-hidden">
                      {searchPending ? (
                        <div className="flex items-center gap-2 px-4 py-3 font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">
                          <Loader2 size={14} className="animate-spin" />
                          Searching creators…
                        </div>
                      ) : creatorResults.length === 0 ? (
                        <p className="px-4 py-3 font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">
                          No creators match “{trimmedRecipient}”
                        </p>
                      ) : (
                        creatorResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => pickCreator(c)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[rgba(var(--fg-rgb),0.06)] transition-colors"
                          >
                            <InitialsAvatar name={c.displayName} size={32} />
                            <span className="flex-1 min-w-0">
                              <span className="block font-body text-[14px] font-medium text-ink truncate">
                                {c.displayName}
                              </span>
                              <span className="block font-mono text-[12px] text-electric truncate">
                                {c.handle}
                              </span>
                            </span>
                            <span className="font-mono text-[11px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">
                              {shortenAddress(c.walletAddress)}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {recipientError ? (
                  <p className="font-mono text-[12px] text-negative" role="alert">
                    {recipientError}
                  </p>
                ) : activeCreator ? (
                  <p className="font-mono text-[12px] text-positive">
                    Sends to {activeCreator.displayName} · {shortenAddress(activeCreator.walletAddress)}
                  </p>
                ) : null}

                {kycBlocked && (
                  <p className="font-mono text-[12px] text-[rgb(var(--color-ember))]" role="alert">
                    Sends of ${KYC_SEND_THRESHOLD.toLocaleString()} or more require identity verification —{' '}
                    <button type="button" onClick={() => navigate('/kyc')} className="underline hover:text-acid">
                      verify now
                    </button>
                  </p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!hasEnough || !recipientValid || kycBlocked || submitting}
                  onClick={handleSend}
                  className="w-full flex items-center justify-center gap-2 bg-acid text-void font-body text-[16px] font-semibold py-4 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting && <Loader2 size={18} className="animate-spin" />}
                  Send Money
                </motion.button>
              </div>
            </motion.div>
          )}

          {activeTab === 'request' && (
            <motion.div key="request" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <button onClick={() => setRequestCurrency('USD')} className={`px-4 py-2 rounded-xl font-mono text-[14px] ${requestCurrency === 'USD' ? 'bg-acid text-void' : 'bg-panel2 text-ink'}`}>Cash</button>
                  <button onClick={() => setRequestCurrency('USDC')} className={`px-4 py-2 rounded-xl font-mono text-[14px] ${requestCurrency === 'USDC' ? 'bg-acid text-void' : 'bg-panel2 text-ink'}`}>Instant</button>
                </div>
                <input
                  type="number"
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  placeholder="Amount ($)"
                  aria-label="Amount to request"
                  className="w-full bg-surface border border-[rgba(var(--fg-rgb),0.1)] rounded-xl px-4 py-4 font-mono text-[24px] text-ink placeholder:text-[rgba(var(--fg-rgb),0.2)] focus:border-electric focus-visible:ring-2 focus-visible:ring-electric outline-none transition-colors"
                />
                <input
                  type="text"
                  value={requestFrom}
                  onChange={(e) => setRequestFrom(e.target.value)}
                  placeholder="Request from (email or @handle)"
                  aria-label="Request from"
                  className="w-full bg-surface border border-[rgba(var(--fg-rgb),0.1)] rounded-xl px-4 py-3 font-body text-[16px] text-ink placeholder:text-[rgba(var(--fg-rgb),0.2)] focus:border-electric focus-visible:ring-2 focus-visible:ring-electric outline-none transition-colors"
                />
                <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">
                  They'll get a payment link — funds land in your {BALANCE_LABELS[requestCurrency]} Balance once paid.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={requestNum <= 0 || !requestFrom || submitting}
                  onClick={handleRequest}
                  className="w-full flex items-center justify-center gap-2 bg-acid text-void font-body text-[16px] font-semibold py-4 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting && <Loader2 size={18} className="animate-spin" />}
                  Request Payment
                </motion.button>
              </div>
            </motion.div>
          )}

          {activeTab === 'receive' && (
            <motion.div key="receive" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center py-8">
              <div className="inline-block bg-white p-4 rounded-2xl mb-4">
                <div className="w-[180px] h-[180px] bg-white rounded-xl grid grid-cols-7 grid-rows-7 gap-[2px]">
                  {Array.from({ length: 49 }).map((_, i) => (
                    <div key={i} className={`rounded-[1px] ${[0,1,2,3,4,6,7,13,14,16,18,20,21,22,25,27,28,32,34,35,38,39,40,41,42,44,46,48].includes(i) ? 'bg-[#06060E]' : 'bg-transparent'}`} />
                  ))}
                </div>
              </div>
              <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] mb-2">Your Deposit ID</p>
              <div className="flex items-center justify-center gap-2">
                <code className="font-mono text-[14px] text-ink bg-panel px-4 py-2 rounded-xl">{WALLET_ADDRESS.slice(0, 16)}...{WALLET_ADDRESS.slice(-4)}</code>
                <button onClick={() => handleCopy(WALLET_ADDRESS)} aria-label="Copy deposit ID" className="p-2 rounded-xl bg-panel text-[rgba(var(--fg-rgb),var(--muted-alpha))] hover:text-ink transition-colors">
                  {copied ? <Check size={16} className="text-positive" /> : <Copy size={16} />}
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'convert' && (
            <motion.div key="convert" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <button onClick={() => setConvertFrom('USD')} className={`flex-1 py-3 rounded-xl font-mono text-[14px] ${convertFrom === 'USD' ? 'bg-acid text-void' : 'bg-panel2 text-ink'}`}>Cash → Instant</button>
                  <button onClick={() => setConvertFrom('USDC')} className={`flex-1 py-3 rounded-xl font-mono text-[14px] ${convertFrom === 'USDC' ? 'bg-acid text-void' : 'bg-panel2 text-ink'}`}>Instant → Cash</button>
                </div>
                <input
                  type="number"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  placeholder="Amount ($)"
                  aria-label="Amount to move"
                  className="w-full bg-surface border border-[rgba(var(--fg-rgb),0.1)] rounded-xl px-4 py-4 font-mono text-[24px] text-ink placeholder:text-[rgba(var(--fg-rgb),0.2)] focus:border-electric focus-visible:ring-2 focus-visible:ring-electric outline-none transition-colors"
                />
                <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">
                  Available: ${convertAvailable.toLocaleString()} ({BALANCE_LABELS[convertFrom]} Balance)
                </p>
                {convertNum > 0 && (
                  <p className="font-mono text-[14px] text-electric">
                    Your {BALANCE_LABELS[convertTo]} Balance receives ${convertNum.toLocaleString('en-US', { minimumFractionDigits: 2 })} — no fees
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
                  Move Money
                </motion.button>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex gap-2 mb-4">
                {(['All', 'USD', 'USDC'] as const).map((f) => (
                  <button key={f} onClick={() => setHistoryFilter(f)} className={`px-4 py-2 rounded-lg font-mono text-[12px] ${historyFilter === f ? 'bg-acid text-void' : 'bg-panel2 text-[rgba(var(--fg-rgb),var(--muted-alpha))]'}`}>
                    {f === 'All' ? 'All' : BALANCE_LABELS[f]}
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
                    <p className="text-center py-8 font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">
                      No {historyFilter !== 'All' ? `${BALANCE_LABELS[historyFilter].toLowerCase()} ` : ''}transactions yet
                    </p>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-panel2">
                        <div>
                          <p className="font-body text-[14px] text-ink">{tx.description}</p>
                          <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">{tx.date} • {tx.type}</p>
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
