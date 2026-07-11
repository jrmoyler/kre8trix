/*
 * C5 — Notification Center (/notifications-center).
 *
 * Full-page view of everything behind the bell: grouped by day,
 * filterable by type, per-notification read/unread toggling, and the
 * same 60s polling so new mock notifications appear while it is open.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { BellOff, CheckCheck, Circle, CircleCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/hooks/use-api';
import { dayLabel, NOTIFICATION_TYPE_META, NOTIFICATION_TYPES, timeAgo } from '@/lib/notifications';
import type { AppNotification, NotificationType } from '@/lib/types';
import { ErrorNotice, SkeletonBlock } from '@/components/Skeletons';

const POLL_INTERVAL_MS = 60_000;

type Filter = 'all' | NotificationType;

function NotificationsSkeleton() {
  return (
    <div className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-6 space-y-5">
      <SkeletonBlock className="h-3 w-20" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="animate-pulse w-10 h-10 rounded-xl bg-[rgba(var(--fg-rgb),0.06)] flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-3.5 w-48" />
            <SkeletonBlock className="h-2.5 w-72" />
          </div>
          <SkeletonBlock className="h-2.5 w-14" />
        </div>
      ))}
    </div>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { data: notifications, loading, error, refresh, setData } =
    useApi<AppNotification[]>('/notifications');

  useEffect(() => {
    const id = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  const typeCounts = useMemo(() => {
    const counts = new Map<NotificationType, number>();
    for (const n of notifications ?? []) counts.set(n.type, (counts.get(n.type) ?? 0) + 1);
    return counts;
  }, [notifications]);

  /** Filtered notifications bucketed by day label, newest bucket first. */
  const groups = useMemo(() => {
    const filtered = (notifications ?? []).filter((n) => filter === 'all' || n.type === filter);
    const map = new Map<string, AppNotification[]>();
    for (const n of filtered) {
      const label = dayLabel(n.createdAt);
      const bucket = map.get(label);
      if (bucket) bucket.push(n);
      else map.set(label, [n]);
    }
    return [...map.entries()];
  }, [notifications, filter]);

  const markAllRead = async () => {
    if (markingAllRead) return;
    setMarkingAllRead(true);
    try {
      const updated = await api.post<AppNotification[]>('/notifications/read-all');
      setData(updated);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not mark notifications read');
    } finally {
      setMarkingAllRead(false);
    }
  };

  const toggleRead = async (notification: AppNotification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (togglingId) return;
    setTogglingId(notification.id);
    try {
      const updated = await api.post<AppNotification[]>(
        `/notifications/${notification.id}/${notification.read ? 'unread' : 'read'}`,
      );
      setData(updated);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update notification');
    } finally {
      setTogglingId(null);
    }
  };

  const openNotification = (notification: AppNotification) => {
    if (!notification.read && notifications) {
      setData(notifications.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
      api
        .post<AppNotification[]>(`/notifications/${notification.id}/read`)
        .then(setData)
        .catch(() => refresh());
    }
    navigate(notification.actionPath);
  };

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: notifications?.length ?? 0 },
    ...NOTIFICATION_TYPES.map((type) => ({
      key: type as Filter,
      label: NOTIFICATION_TYPE_META[type].label,
      count: typeCounts.get(type) ?? 0,
    })),
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-display text-[48px] tracking-[0.02em] text-ink leading-none">
            Notification Center
          </h2>
          <p className="font-body text-[14px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] mt-3">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
              : 'You’re all caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAllRead}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(var(--fg-rgb),0.06)] hover:bg-[rgba(var(--fg-rgb),0.1)] font-mono text-[12px] tracking-[0.04em] text-electric hover:text-acid transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {/* Type filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const active = filter === f.key;
          const accent = f.key === 'all' ? 'rgb(var(--color-acid))' : NOTIFICATION_TYPE_META[f.key].color;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-[12px] tracking-[0.04em] border transition-colors ${
                active
                  ? 'text-void'
                  : 'text-[rgba(var(--fg-rgb),0.55)] border-[rgba(var(--fg-rgb),0.1)] hover:text-ink hover:border-[rgba(var(--fg-rgb),0.25)]'
              }`}
              style={active ? { background: accent, borderColor: accent } : undefined}
            >
              {f.label}
              <span className={active ? 'opacity-70' : 'opacity-50'}>{f.count}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {error ? (
        <div className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl">
          <ErrorNotice message={error} onRetry={refresh} />
        </div>
      ) : loading && !notifications ? (
        <NotificationsSkeleton />
      ) : groups.length === 0 ? (
        <div className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl flex flex-col items-center justify-center gap-3 py-16">
          <BellOff size={28} className="text-[rgba(var(--fg-rgb),0.25)]" />
          <p className="font-body text-[14px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">
            {filter === 'all' ? 'No notifications yet' : `No ${NOTIFICATION_TYPE_META[filter].label.toLowerCase()} notifications`}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(([label, items]) => (
            <div key={label}>
              <h3 className="font-mono text-[12px] tracking-[0.12em] uppercase text-[rgba(var(--fg-rgb),var(--muted-alpha))] mb-3 px-1">
                {label}
              </h3>
              <div className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl overflow-hidden">
                {items.map((n, i) => {
                  const meta = NOTIFICATION_TYPE_META[n.type] ?? NOTIFICATION_TYPE_META.system;
                  const Icon = meta.icon;
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                      className={`group flex items-start gap-4 px-6 py-5 border-b border-[rgba(var(--fg-rgb),0.05)] last:border-b-0 hover:bg-[rgba(var(--fg-rgb),0.03)] transition-colors ${
                        n.read ? '' : 'bg-[rgba(var(--fg-rgb),0.015)]'
                      }`}
                    >
                      <div
                        onClick={() => openNotification(n)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openNotification(n);
                          }
                        }}
                        className="flex items-start gap-4 flex-1 min-w-0 cursor-pointer"
                      >
                        <span
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{
                            background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
                            color: meta.color,
                            opacity: n.read ? 0.45 : 1,
                          }}
                        >
                          <Icon size={18} />
                        </span>
                        <div className={`flex-1 min-w-0 ${n.read ? 'opacity-60' : ''}`}>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <p className="font-body text-[14px] font-semibold text-ink">{n.title}</p>
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] tracking-[0.06em]"
                              style={{ background: `color-mix(in srgb, ${meta.color} 12%, transparent)`, color: meta.color }}
                            >
                              {meta.label}
                            </span>
                            {!n.read && (
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                            )}
                          </div>
                          <p className="font-body text-[13px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] mt-1">{n.body}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="font-mono text-[11px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">
                          {timeAgo(n.createdAt)}
                        </span>
                        <button
                          onClick={(e) => toggleRead(n, e)}
                          disabled={togglingId === n.id}
                          aria-label={n.read ? 'Mark unread' : 'Mark read'}
                          className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.04em] text-[rgba(var(--fg-rgb),0.35)] hover:text-electric opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all disabled:opacity-50"
                        >
                          {n.read ? <Circle size={12} /> : <CircleCheck size={12} />}
                          {n.read ? 'Mark unread' : 'Mark read'}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
