import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BrainCircuit } from 'lucide-react';

/* ── constants ────────────────────────────────────────────── */
const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ── forecast data (30/60/90) ────────────────────────────── */
const FORECAST_30 = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const isProjected = day > 18;
  const base = 420 + Math.sin(day * 0.3) * 150 + day * 12;
  return {
    day: `${day}`,
    actual: isProjected ? undefined : Math.round(base),
    projected: isProjected ? Math.round(base) : undefined,
    projectedLow: isProjected ? Math.round(base * 0.85) : undefined,
    projectedHigh: isProjected ? Math.round(base * 1.15) : undefined,
  };
});

const FORECAST_60 = Array.from({ length: 8 }, (_, i) => {
  const week = i + 1;
  const isProjected = week > 3;
  const base = 3200 + Math.sin(week * 0.8) * 800 + week * 300;
  return {
    day: `W${week}`,
    actual: isProjected ? undefined : Math.round(base),
    projected: isProjected ? Math.round(base) : undefined,
    projectedLow: isProjected ? Math.round(base * 0.8) : undefined,
    projectedHigh: isProjected ? Math.round(base * 1.2) : undefined,
  };
});

const FORECAST_90 = Array.from({ length: 12 }, (_, i) => {
  const week = i + 1;
  const isProjected = week > 5;
  const base = 2800 + Math.sin(week * 0.6) * 1000 + week * 200;
  return {
    day: `W${week}`,
    actual: isProjected ? undefined : Math.round(base),
    projected: isProjected ? Math.round(base) : undefined,
    projectedLow: isProjected ? Math.round(base * 0.75) : undefined,
    projectedHigh: isProjected ? Math.round(base * 1.25) : undefined,
  };
});

const FORECAST_TABS = [
  { label: '30D', data: FORECAST_30 },
  { label: '60D', data: FORECAST_60 },
  { label: '90D', data: FORECAST_90 },
];

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 1 — AI INSIGHT BANNER                             */
/* ═══════════════════════════════════════════════════════════ */
function AIInsightBanner() {
  const navigate = useNavigate();

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOutExpo }}
      className="w-full rounded-[20px] p-7 border border-[rgba(200,255,0,0.1)]"
      style={{
        background: 'linear-gradient(135deg, rgba(200,255,0,0.04), rgba(0,212,255,0.04))',
      }}
    >
      <div className="flex gap-4">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #C8FF00, #00D4FF)' }}
        >
          <BrainCircuit size={24} className="text-void" />
        </motion.div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h5 className="font-body text-[20px] font-semibold text-acid">Kre8trix AI</h5>
            <span className="font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em]">Just now</span>
          </div>
          <div className="border-l-[3px] border-acid pl-4">
            <p className="font-body text-[18px] text-[#E8E8F0] leading-relaxed">
              Your October looks tight. Q4 AdSense typically drops 23% for your category. Consider activating your equipment credit line.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              {
                label: 'Apply for a $5K advance',
                style: 'bg-[rgba(255,77,0,0.15)] text-[#FF4D00]',
                action: () => navigate('/advances'),
              },
              {
                label: 'Defer equipment purchase',
                style: 'bg-panel2 text-white',
                action: () => toast.success('Got it — equipment purchase deferred in your forecast'),
              },
              {
                label: 'Adjust tax withholding',
                style: 'bg-[rgba(0,212,255,0.15)] text-[#00D4FF]',
                action: () => toast.info('Tax withholding tools coming soon'),
              },
            ].map((chip) => (
              <button
                key={chip.label}
                onClick={chip.action}
                className={`px-4 py-2 rounded-full font-body text-[14px] font-medium transition-all hover:scale-105 ${chip.style}`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 2 — FORECAST CHART                                */
/* ═══════════════════════════════════════════════════════════ */
function ForecastChart() {
  const [activeTab, setActiveTab] = useState(0);
  const [showConfidence, setShowConfidence] = useState(true);
  const data = FORECAST_TABS[activeTab].data;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: easeOutExpo }}
      className="bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="font-display text-[48px] tracking-[0.02em] text-white">Income Forecast</h2>
        <div className="flex items-center gap-3">
          <div className="flex bg-[rgba(255,255,255,0.06)] rounded-xl p-1">
            {FORECAST_TABS.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2 rounded-lg font-mono text-[12px] font-medium transition-all ${i === activeTab ? 'bg-acid text-void' : 'text-[rgba(255,255,255,0.42)] hover:text-white'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showConfidence}
              onChange={(e) => setShowConfidence(e.target.checked)}
              className="w-4 h-4 accent-acid"
            />
            <span className="font-body text-[14px] text-[rgba(255,255,255,0.42)]">Confidence bands</span>
          </label>
        </div>
      </div>

      <div style={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C8FF00" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#C8FF00" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="projectedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00D4FF" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#00D4FF" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="confidenceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00D4FF" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#00D4FF" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 12, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 12, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
            <Tooltip
              contentStyle={{
                background: '#141428',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                fontFamily: 'JetBrains Mono',
                fontSize: '12px',
                color: '#fff',
              }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
            />
            {showConfidence && (
              <>
                <Area type="monotone" dataKey="projectedHigh" stroke="none" fill="url(#confidenceFill)" />
                <Area type="monotone" dataKey="projectedLow" stroke="none" fill="#06060E" />
              </>
            )}
            <Area type="monotone" dataKey="actual" stroke="#C8FF00" strokeWidth={2} fill="url(#actualFill)" connectNulls={false} dot={false} />
            <Area type="monotone" dataKey="projected" stroke="#00D4FF" strokeWidth={2} strokeDasharray="6 4" fill="url(#projectedFill)" connectNulls={false} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}

export default function CashFlow() {
  return (
    <div className="space-y-8">
      <AIInsightBanner />
      <ForecastChart />
    </div>
  );
}
