import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, ShieldCheck, ShieldX } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/hooks/use-api';
import { AUDIT_ACTION_LABELS, AUDIT_ACTOR_LABELS } from '@/lib/audit';
import { ErrorNotice, SkeletonBlock } from '@/components/Skeletons';
import ComplianceNav from './ComplianceNav';
import type { AuditAction, AuditActorType, AuditLogEntry } from '@/lib/types';

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function AuditLog() {
  const [actorFilter, setActorFilter] = useState<'all' | AuditActorType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; brokenAtId: string | null } | null>(null);

  const path = useMemo(
    () => (actorFilter === 'all' ? '/audit-log' : `/audit-log?actorType=${actorFilter}`),
    [actorFilter],
  );
  const entriesQuery = useApi<AuditLogEntry[]>(path);
  const entries = entriesQuery.data ?? [];

  const verifyChain = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await api.get<{ valid: boolean; brokenAtId: string | null }>('/audit-log/verify');
      setVerifyResult(result);
      if (result.valid) toast.success('Hash chain verified — no tampering detected');
      else toast.error(`Chain integrity broken at ${result.brokenAtId}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not verify the audit log');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOutExpo }}
        className="font-display text-[48px] tracking-[0.02em] text-ink"
      >
        Audit Log
      </motion.h2>

      <ComplianceNav active="audit-log" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          aria-label="Filter by actor type"
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value as 'all' | AuditActorType)}
          className="bg-surface border border-[rgba(var(--fg-rgb),0.1)] rounded-xl px-4 py-2 text-ink font-body text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-electric"
        >
          <option value="all">All actors</option>
          {(['user', 'system', 'compliance_officer'] as AuditActorType[]).map((a) => (
            <option key={a} value={a}>{AUDIT_ACTOR_LABELS[a]}</option>
          ))}
        </select>

        <div className="flex items-center gap-3">
          {verifyResult && (
            <span className={`flex items-center gap-1.5 font-mono text-[12px] ${verifyResult.valid ? 'text-positive' : 'text-negative'}`}>
              {verifyResult.valid ? <ShieldCheck size={14} /> : <ShieldX size={14} />}
              {verifyResult.valid ? 'Chain verified' : `Broken at ${verifyResult.brokenAtId}`}
            </span>
          )}
          <button
            onClick={verifyChain}
            disabled={verifying}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-panel2 border border-[rgba(var(--fg-rgb),0.08)] font-mono text-[12px] text-ink hover:border-[rgba(var(--fg-rgb),0.14)] transition-colors disabled:opacity-50"
          >
            {verifying ? 'Verifying…' : 'Verify chain integrity'}
          </button>
        </div>
      </div>

      <div className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl overflow-hidden">
        {entriesQuery.error ? (
          <ErrorNotice message={entriesQuery.error} onRetry={entriesQuery.refresh} />
        ) : entriesQuery.loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonBlock key={i} className="h-14 w-full" />)}
          </div>
        ) : entries.length === 0 ? (
          <p className="p-10 text-center font-body text-[14px] text-[rgba(var(--fg-rgb),0.42)]">No entries match these filters</p>
        ) : (
          <ul>
            {entries.map((entry) => {
              const expanded = expandedId === entry.id;
              return (
                <li key={entry.id} className="border-b border-[rgba(var(--fg-rgb),0.05)] last:border-b-0">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedId(expanded ? null : entry.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedId(expanded ? null : entry.id);
                      }
                    }}
                    className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-[rgba(var(--fg-rgb),0.03)] transition-colors"
                  >
                    {expanded ? (
                      <ChevronDown size={16} className="text-[rgba(var(--fg-rgb),0.42)] flex-shrink-0" />
                    ) : (
                      <ChevronRight size={16} className="text-[rgba(var(--fg-rgb),0.42)] flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-[14px] text-ink">
                        {AUDIT_ACTOR_LABELS[entry.actorType]} · {AUDIT_ACTION_LABELS[entry.action as AuditAction]}
                      </p>
                      <p className="font-mono text-[11px] text-[rgba(var(--fg-rgb),0.42)] mt-0.5">{entry.description}</p>
                    </div>
                    <span className="font-mono text-[11px] text-[rgba(var(--fg-rgb),0.42)] flex-shrink-0">
                      {new Date(entry.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  {expanded && (
                    <div className="px-6 pb-4 pl-14 space-y-1 font-mono text-[11px] text-[rgba(var(--fg-rgb),0.6)]">
                      <p>ID: {entry.id}</p>
                      <p>Prev hash: {entry.prevHash}</p>
                      <p>Hash: {entry.hash}</p>
                      {entry.relatedPath && <p>Related: {entry.relatedPath}</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
