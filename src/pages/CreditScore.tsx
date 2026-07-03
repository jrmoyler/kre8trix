import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
} from 'recharts';
import {
  TrendingUp,
  Layers,
  Shield,
  TrendingDown,
  ChevronUp,
  CheckCircle2,
  Star,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

/* ── constants ────────────────────────────────────────────── */
const TARGET_SCORE = 850;
const CURRENT_SCORE = 612;
const RADIUS = 120;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const SIGNALS = [
  { name: 'Income Consistency', weight: 22, score: 720, color: '#C8FF00' },
  { name: 'Monetization Diversification', weight: 18, score: 580, color: '#00D4FF' },
  { name: 'Audience Durability', weight: 17, score: 640, color: '#9B5DE5' },
  { name: 'Financial Behavior', weight: 16, score: 510, color: '#FF4D00' },
  { name: 'Platform Risk', weight: 13, score: 680, color: '#FF4D4D' },
  { name: 'Business Maturity', weight: 10, score: 490, color: '#FFD400' },
  { name: 'Growth Trajectory', weight: 4, score: 620, color: '#00E5A0' },
];

const SCORE_HISTORY = [
  { month: 'May', score: 550 },
  { month: 'Jun', score: 565 },
  { month: 'Jul', score: 558 },
  { month: 'Aug', score: 578 },
  { month: 'Sep', score: 595 },
  { month: 'Oct', score: 612 },
];

const TIERS = [
  { name: 'Emerging', range: '300-499', color: '#9B5DE5', benefits: ['Basic wallet', 'Standard advances up to $1K'] },
  { name: 'Rising', range: '500-649', color: '#00D4FF', benefits: ['Priority payouts', 'Advances up to $5K', '1% cashback'] },
  { name: 'Stable', range: '650-749', color: '#C8FF00', benefits: ['Instant advances up to $15K', '2% cashback', 'Lower fees'] },
  { name: 'Prime', range: '750-850', color: '#FFD400', benefits: ['Unlimited advances', '3% cashback', 'White-glove support'] },
];

/* ── animated counter hook ────────────────────────────────── */
function useAnimatedValue(target: number, duration: number, delay = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf: number;
    const startTime = performance.now() + delay;
    const tick = (now: number) => {
      if (now < startTime) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay]);
  return value;
}

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 1 — HERO SCORE RING                               */
/* ═══════════════════════════════════════════════════════════ */
function HeroScoreRing() {
  const animatedScore = useAnimatedValue(CURRENT_SCORE, 1800, 200);
  const progress = CURRENT_SCORE / TARGET_SCORE;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <section
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(200,255,0,0.03) 0%, transparent 70%)',
      }}
    >
      <div className="flex flex-col items-center justify-center py-12 md:py-16">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="font-mono text-[12px] tracking-[0.15em] uppercase text-[rgba(255,255,255,0.42)] mb-8"
        >
          YOUR CREATOR CREDIT SCORE
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: easeOutExpo }}
          className="relative"
          style={{ filter: 'drop-shadow(0 0 40px rgba(200,255,0,0.2))' }}
        >
          <svg width="320" height="320" viewBox="0 0 320 320" className="transform -rotate-90">
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C8FF00" />
                <stop offset="100%" stopColor="#00D4FF" />
              </linearGradient>
            </defs>
            <circle cx="160" cy="160" r={RADIUS} stroke="rgba(255,255,255,0.06)" strokeWidth="16" fill="none" />
            <motion.circle
              cx="160" cy="160" r={RADIUS}
              stroke="url(#scoreGradient)"
              strokeWidth="16"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              initial={{ strokeDashoffset: CIRCUMFERENCE }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1.8, ease: easeOutExpo, delay: 0.2 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-[80px] md:text-[120px] font-medium text-white leading-none tracking-[-0.02em]">
              {animatedScore}
            </span>
            <div className="w-10 h-px bg-[rgba(255,255,255,0.1)] my-2" />
            <span className="font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em]">
              out of {TARGET_SCORE}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: easeOutExpo, delay: 2.0 }}
          className="mt-6 flex items-center gap-2 px-4 py-1.5 rounded-full"
          style={{ background: 'rgba(0,212,255,0.15)' }}
        >
          <ChevronUp size={16} style={{ color: '#00D4FF' }} />
          <span className="font-mono text-[12px] font-medium tracking-[0.04em]" style={{ color: '#00D4FF' }}>
            RISING CREATOR
          </span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 0.3 }}
          className="mt-3 font-body text-[14px] text-[rgba(255,255,255,0.42)]"
        >
          Top 34% of creators on Kre8trix
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 0.3 }}
          className="mt-2 flex items-center gap-1 text-[#00E5A0]"
        >
          <TrendingUp size={14} />
          <span className="font-body text-[14px] font-medium">+47 points this quarter</span>
        </motion.div>
      </div>
    </section>
  );
}

export default function CreditScore() {
  return (
    <div className="space-y-8">
      <HeroScoreRing />
    </div>
  );
}
