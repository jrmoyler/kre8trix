import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, FileWarning, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/hooks/use-api';
import { AML_REASON_LABELS, AML_SEVERITY_META, AML_STATUS_META, AML_STATUS_OPTIONS } from '@/lib/aml';
import { ErrorNotice, SkeletonBlock } from '@/components/Skeletons';
import ComplianceNav from './ComplianceNav';
import type { AmlAlert, AmlAlertSeverity, AmlAlertStatus, AmlSummary } from '@/lib/types';

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl p-5 bg-panel border border-[rgba(var(--fg-rgb),0.08)]">
      <p className="font-mono text-[11px] tracking-[0.04em] text-[rgba(var(--fg-rgb),0.42)] mb-2">{label}</p>
      <p className="font-display text-[32px] tracking-[0.02em]" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
    </div>
  );
}

function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full font-mono text-[11px] tracking-[0.04em]"
      style={{ backgroundColor: bg, color }}
    >
      {label}
    </span>
  );
}

export default function AmlMonitoring() {
  const [statusFilter, setStatusFilter] = useState<'all' | AmlAlertStatus>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | AmlAlertSeverity>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState('');
  const [sarNarrative, setSarNarrative] = useState('');
  const [busy, setBusy] = useState(false);

  const alertsPath = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (severityFilter !== 'all') params.set('severity', severityFilter);
    const qs = params.toString();
    return `/aml/alerts${qs ? `?${qs}` : ''}`;
  }, [statusFilter, severityFilter]);

  const alertsQuery = useApi<AmlAlert[]>(alertsPath);
  const summaryQuery = useApi<AmlSummary>('/aml/summary');

  const alerts = alertsQuery.data ?? [];
  const selected = alerts.find((a) => a.id === selectedId) ?? null;

  const setAlertStatus = async (id: string, status: AmlAlertStatus) => {
    setBusy(true);
    try {
      await api.put<AmlAlert>(`/aml/alerts/${id}/status`, { status });
      alertsQuery.refresh();
      summaryQuery.refresh();
      toast.success(`Alert marked ${AML_STATUS_META[status].label.toLowerCase()}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update alert status');
    } finally {
      setBusy(false);
    }
  };

  const addNote = async (id: string) => {
    if (!noteBody.trim()) return;
    setBusy(true);
    try {
      await api.post<AmlAlert>(`/aml/alerts/${id}/notes`, { body: noteBody.trim() });
      setNoteBody('');
      alertsQuery.refresh();
      toast.success('Note added');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not add note');
    } finally {
      setBusy(false);
    }
  };

  const fileSar = async (id: string) => {
    if (!sarNarrative.trim()) {
      toast.error('Add a filing narrative first');
      return;
    }
    setBusy(true);
    try {
      await api.post<AmlAlert>(`/aml/alerts/${id}/sar`, { narrative: sarNarrative.trim() });
      setSarNarrative('');
      alertsQuery.refresh();
      summaryQuery.refresh();
      toast.success('SAR filed (mock — no real FinCEN submission)');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not file SAR');
    } finally {
      setBusy(false);
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
        AML Monitoring
      </motion.h2>

      <ComplianceNav active="aml" />

      {summaryQuery.error ? (
        <ErrorNotice message={summaryQuery.error} onRetry={summaryQuery.refresh} />
      ) : summaryQuery.loading || !summaryQuery.data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard label="OPEN ALERTS" value={String(summaryQuery.data.openAlerts)} accent="rgb(var(--color-ember))" />
          <SummaryCard label="CRITICAL" value={String(summaryQuery.data.criticalAlerts)} accent="rgb(var(--color-negative))" />
          <SummaryCard label="SARS FILED YTD" value={String(summaryQuery.data.sarsFiledYtd)} />
          <SummaryCard label="30D MONITORED VOLUME" value={`$${summaryQuery.data.monitoredVolume30d.toLocaleString()}`} />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | AmlAlertStatus)}
          className="bg-surface border border-[rgba(var(--fg-rgb),0.1)] rounded-xl px-4 py-2 text-ink font-body text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-electric"
        >
          <option value="all">All statuses</option>
          {AML_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{AML_STATUS_META[s].label}</option>
          ))}
        </select>
        <select
          aria-label="Filter by severity"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as 'all' | AmlAlertSeverity)}
          className="bg-surface border border-[rgba(var(--fg-rgb),0.1)] rounded-xl px-4 py-2 text-ink font-body text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-electric"
        >
          <option value="all">All severities</option>
          {(['low', 'medium', 'high', 'critical'] as AmlAlertSeverity[]).map((s) => (
            <option key={s} value={s}>{AML_SEVERITY_META[s].label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl overflow-hidden">
          {alertsQuery.error ? (
            <ErrorNotice message={alertsQuery.error} onRetry={alertsQuery.refresh} />
          ) : alertsQuery.loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-16 w-full" />)}
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-10 text-center">
              <ShieldCheck size={28} className="text-positive mx-auto mb-3" />
              <p className="font-body text-[14px] text-[rgba(var(--fg-rgb),0.42)]">No alerts match these filters</p>
            </div>
          ) : (
            <ul>
              {alerts.map((alert) => (
                <li key={alert.id} className="border-b border-[rgba(var(--fg-rgb),0.05)] last:border-b-0">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(alert.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedId(alert.id);
                      }
                    }}
                    className={`flex items-start gap-4 p-5 cursor-pointer transition-colors hover:bg-[rgba(var(--fg-rgb),0.03)] ${
                      selectedId === alert.id ? 'bg-[rgba(var(--acid-rgb),0.05)]' : ''
                    }`}
                  >
                    <AlertTriangle size={18} className="text-[rgba(var(--fg-rgb),0.42)] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Pill label={AML_SEVERITY_META[alert.severity].label} color={AML_SEVERITY_META[alert.severity].color} bg={AML_SEVERITY_META[alert.severity].bg} />
                        <Pill label={AML_STATUS_META[alert.status].label} color={AML_STATUS_META[alert.status].color} bg={AML_STATUS_META[alert.status].bg} />
                        <span className="font-mono text-[11px] text-[rgba(var(--fg-rgb),0.42)]">{AML_REASON_LABELS[alert.reason]}</span>
                      </div>
                      <p className="font-body text-[14px] text-ink">{alert.summary}</p>
                      <p className="font-mono text-[11px] text-[rgba(var(--fg-rgb),0.42)] mt-1">
                        {alert.subjectHandle} · ${alert.amountInvolved.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-6">
          {!selected ? (
            <p className="font-body text-[13px] text-[rgba(var(--fg-rgb),0.42)]">Select an alert to view details</p>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="font-mono text-[11px] tracking-[0.04em] text-[rgba(var(--fg-rgb),0.42)] mb-1">ALERT {selected.id}</p>
                <p className="font-body text-[14px] text-ink">{selected.summary}</p>
              </div>
              <div>
                <p className="font-mono text-[11px] tracking-[0.04em] text-[rgba(var(--fg-rgb),0.42)] mb-2">STATUS</p>
                <select
                  aria-label="Change alert status"
                  value={selected.status}
                  disabled={busy}
                  onChange={(e) => setAlertStatus(selected.id, e.target.value as AmlAlertStatus)}
                  className="w-full bg-surface border border-[rgba(var(--fg-rgb),0.1)] rounded-xl px-3 py-2 text-ink font-body text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-electric"
                >
                  {AML_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{AML_STATUS_META[s].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="font-mono text-[11px] tracking-[0.04em] text-[rgba(var(--fg-rgb),0.42)] mb-2">RELATED TRANSACTIONS</p>
                <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.6)]">{selected.relatedTransactionIds.join(', ')}</p>
              </div>
              <div>
                <p className="font-mono text-[11px] tracking-[0.04em] text-[rgba(var(--fg-rgb),0.42)] mb-2">NOTES</p>
                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                  {selected.notes.length === 0 ? (
                    <p className="font-body text-[12px] text-[rgba(var(--fg-rgb),0.42)]">No notes yet</p>
                  ) : (
                    selected.notes.map((note) => (
                      <div key={note.id} className="p-3 rounded-lg bg-panel2">
                        <p className="font-body text-[12px] text-ink">{note.body}</p>
                        <p className="font-mono text-[10px] text-[rgba(var(--fg-rgb),0.42)] mt-1">{note.author}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    aria-label="Add a note"
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    placeholder="Add a note…"
                    className="flex-1 bg-surface border border-[rgba(var(--fg-rgb),0.1)] rounded-xl px-3 py-2 text-ink font-body text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-electric"
                  />
                  <button
                    onClick={() => addNote(selected.id)}
                    disabled={busy || !noteBody.trim()}
                    className="px-4 py-2 rounded-xl bg-panel2 border border-[rgba(var(--fg-rgb),0.08)] font-mono text-[12px] text-ink disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </div>

              {selected.sar ? (
                <div className="p-4 rounded-xl bg-[rgba(var(--violet-rgb),0.08)] border border-[rgba(var(--violet-rgb),0.2)]">
                  <p className="font-mono text-[12px] text-violet">SAR filed: {selected.sar.filingRef}</p>
                  <p className="font-body text-[12px] text-[rgba(var(--fg-rgb),0.6)] mt-1">{selected.sar.narrative}</p>
                </div>
              ) : (
                <div>
                  <p className="font-mono text-[11px] tracking-[0.04em] text-[rgba(var(--fg-rgb),0.42)] mb-2">FILE SUSPICIOUS ACTIVITY REPORT</p>
                  <p className="font-mono text-[10px] text-[rgba(var(--fg-rgb),0.42)] mb-2">Mock filing — no real FinCEN submission</p>
                  <textarea
                    aria-label="SAR filing narrative"
                    value={sarNarrative}
                    onChange={(e) => setSarNarrative(e.target.value)}
                    placeholder="Filing narrative…"
                    rows={3}
                    className="w-full bg-surface border border-[rgba(var(--fg-rgb),0.1)] rounded-xl px-3 py-2 text-ink font-body text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-electric mb-2"
                  />
                  <button
                    onClick={() => fileSar(selected.id)}
                    disabled={busy || !sarNarrative.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-ember text-white font-body text-[13px] font-semibold py-2.5 rounded-xl disabled:opacity-40"
                  >
                    {busy && <Loader2 size={14} className="animate-spin" />}
                    <FileWarning size={14} />
                    File SAR
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
