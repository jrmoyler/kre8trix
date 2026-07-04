import { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  Snowflake,
  Monitor,
  Code,
  Plane,
  UtensilsCrossed,
  Megaphone,
  ShoppingBag,
  CreditCard,
  Wifi,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */
const CARD_NUMBER = '4821 8392 1047 4821';
const CARD_EXPIRY = '12/27';
const CARD_CVV = '847';
const CARDHOLDER = 'ALEX RIVERA';

interface SpendCategory {
  name: string;
  icon: React.ElementType;
  current: number;
  limit: number;
  color: string;
}

const SPEND_CATEGORIES: SpendCategory[] = [
  { name: 'Equipment', icon: Monitor, current: 1299, limit: 2000, color: 'rgb(var(--color-acid))' },
  { name: 'Software', icon: Code, current: 89, limit: 200, color: 'rgb(var(--color-electric))' },
  { name: 'Travel', icon: Plane, current: 450, limit: 1000, color: 'rgb(var(--color-violet))' },
  { name: 'Dining', icon: UtensilsCrossed, current: 120, limit: 300, color: 'rgb(var(--color-ember))' },
  { name: 'Advertising', icon: Megaphone, current: 340, limit: 500, color: 'rgb(var(--color-ember))' },
  { name: 'Daily Spend', icon: ShoppingBag, current: 280, limit: 500, color: 'rgb(var(--color-electric))' },
];

/* ------------------------------------------------------------------ */
/*  3D Tilt Card                                                       */
/* ------------------------------------------------------------------ */
function TiltCard({ src, alt, frozen, showDetails }: { src: string; alt: string; frozen: boolean; showDetails: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });
  const rotateX = useTransform(springY, [0, 1], [12, -12]);
  const rotateY = useTransform(springX, [0, 1], [-12, 12]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width);
    y.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    x.set(0.5);
    y.set(0.5);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex items-center justify-center py-8"
      style={{ perspective: 800 }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(var(--acid-rgb),0.06) 0%, transparent 60%)',
        }}
      />
      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="relative"
      >
        <motion.div
          animate={frozen ? { filter: 'grayscale(1) brightness(0.7)' } : { filter: 'grayscale(0) brightness(1)' }}
          transition={{ duration: 0.4 }}
          className="relative rounded-2xl overflow-hidden"
          style={{
            boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(var(--fg-rgb),0.05)',
          }}
        >
          <img src={src} alt={alt} className="w-[320px] h-[200px] object-cover rounded-2xl" />
          <AnimatePresence>
            {frozen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 bg-gradient-to-b from-white/20 to-white/5 flex items-center justify-center"
              >
                <div className="flex items-center gap-2 text-white/80">
                  <Snowflake size={24} />
                  <span className="font-display text-[20px] tracking-[0.02em]">FROZEN</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="absolute inset-0 flex flex-col justify-between p-5 pointer-events-none">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={20} className="text-[#C8FF00]" />
                <span className="font-display text-[14px] tracking-[0.02em] text-[#C8FF00]">KRE8TRIX</span>
              </div>
              <Wifi size={24} className="text-white/60" />
            </div>
            <div>
              <div className="font-mono text-[18px] tracking-[0.15em] text-white mb-2">
                {showDetails ? CARD_NUMBER : '•••• •••• •••• 4821'}
              </div>
              <div className="flex items-end justify-between">
                <div className="space-y-0.5">
                  <div className="font-mono text-[10px] tracking-[0.04em] text-[rgba(255,255,255,0.42)]">VALID THRU {showDetails ? CARD_EXPIRY : '••/••'}</div>
                  <div className="font-mono text-[12px] tracking-[0.04em] text-white uppercase">{CARDHOLDER}</div>
                </div>
                {showDetails && (
                  <div className="font-mono text-[12px] text-[rgba(255,255,255,0.6)]">
                    CVV: {CARD_CVV}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main CardManager component                                         */
/* ------------------------------------------------------------------ */
export default function CardManager() {
  const [frozen, setFrozen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [categories] = useState(SPEND_CATEGORIES);

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(CARD_NUMBER);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Card Visual */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-6"
      >
        <TiltCard src="/card-metal.png" alt="Kre8trix Card" frozen={frozen} showDetails={showDetails} />

        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-panel2 text-ink hover:bg-panel transition-colors"
          >
            {showDetails ? <EyeOff size={16} /> : <Eye size={16} />}
            <span className="font-body text-[14px]">{showDetails ? 'Hide' : 'Show'} Details</span>
          </button>
          <button
            onClick={handleCopyNumber}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-panel2 text-ink hover:bg-panel transition-colors"
          >
            {copied ? <Check size={16} className="text-positive" /> : <Copy size={16} />}
            <span className="font-body text-[14px]">{copied ? 'Copied!' : 'Copy Number'}</span>
          </button>
          <button
            onClick={() => setFrozen(!frozen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
              frozen ? 'bg-[rgba(var(--negative-rgb),0.15)] text-negative' : 'bg-panel2 text-ink hover:bg-panel'
            }`}
          >
            <Snowflake size={16} />
            <span className="font-body text-[14px]">{frozen ? 'Unfreeze' : 'Freeze'}</span>
          </button>
        </div>
      </motion.div>

      {/* Spend Categories */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-6"
      >
        <h3 className="font-display text-[36px] tracking-[0.02em] text-ink mb-6">Spend Categories</h3>
        <div className="space-y-4">
          {categories.map((cat, i) => {
            const percent = (cat.current / cat.limit) * 100;
            return (
              <div key={cat.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <cat.icon size={16} style={{ color: cat.color }} />
                    <span className="font-body text-[14px] text-ink">{cat.name}</span>
                  </div>
                  <span className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)]">
                    ${cat.current} / ${cat.limit}
                  </span>
                </div>
                <div className="h-2 bg-[rgba(var(--fg-rgb),0.06)] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(percent, 100)}%` }}
                    transition={{ duration: 0.6, delay: i * 0.05 }}
                    className="h-full rounded-full"
                    style={{ background: cat.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
