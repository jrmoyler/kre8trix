import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Bell, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApi } from '@/hooks/use-api';
import { NOTIFICATION_TYPE_META, timeAgo } from '@/lib/notifications';
import type { AppNotification } from '@/lib/types';

/** C5: poll cadence while the app is open, so new mock notifications surface. */
const POLL_INTERVAL_MS = 60_000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: notifications, setData, refresh } = useApi<AppNotification[]>('/notifications');

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;
  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);

  useEffect(() => {
    const id = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const markAllRead = async () => {
    try {
      const updated = await api.post<AppNotification[]>('/notifications/read-all');
      setData(updated);
    } catch {
      toast.error('Could not mark notifications as read');
    }
  };

  const openNotification = (notification: AppNotification) => {
    setOpen(false);
    if (!notification.read && notifications) {
      // Optimistic local flip; the POST response reconciles.
      setData(notifications.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
      api
        .post<AppNotification[]>(`/notifications/${notification.id}/read`)
        .then(setData)
        .catch(() => refresh());
    }
    navigate(notification.actionPath);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative w-10 h-10 rounded-xl flex items-center justify-center text-[rgba(var(--fg-rgb),0.42)] hover:text-ink hover:bg-[rgba(var(--fg-rgb),0.06)] transition-all duration-200"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-negative text-white font-mono text-[9px] font-bold leading-4 text-center">
            {badgeLabel}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-[360px] bg-panel border border-[rgba(var(--fg-rgb),0.1)] rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-[70]"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(var(--fg-rgb),0.08)]">
              <span className="font-body text-[14px] font-semibold text-ink">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.04em] text-electric hover:text-acid transition-colors"
                >
                  <CheckCheck size={13} />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[320px] overflow-y-auto">
              {!notifications ? (
                <div className="px-5 py-8 text-center font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)]">
                  Loading…
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-5 py-8 text-center font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)]">
                  You're all caught up
                </div>
              ) : (
                notifications.map((n) => {
                  const meta = NOTIFICATION_TYPE_META[n.type] ?? NOTIFICATION_TYPE_META.system;
                  const Icon = meta.icon;
                  return (
                    <button
                      key={n.id}
                      onClick={() => openNotification(n)}
                      className="w-full text-left flex gap-3 px-5 py-4 border-b border-[rgba(var(--fg-rgb),0.04)] last:border-b-0 hover:bg-[rgba(var(--fg-rgb),0.04)] transition-colors"
                    >
                      <span
                        className="mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
                          color: meta.color,
                          opacity: n.read ? 0.45 : 1,
                        }}
                      >
                        <Icon size={15} />
                      </span>
                      <div className={`flex-1 min-w-0 ${n.read ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-body text-[13px] font-medium text-ink truncate">{n.title}</p>
                          <span className="font-mono text-[10px] text-[rgba(var(--fg-rgb),0.42)] flex-shrink-0">
                            {timeAgo(n.createdAt)}
                          </span>
                        </div>
                        <p className="font-body text-[12px] text-[rgba(var(--fg-rgb),0.42)] mt-0.5">{n.body}</p>
                      </div>
                      {!n.read && (
                        <span
                          className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: meta.color }}
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <Link
              to="/notifications-center"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 px-5 py-3 border-t border-[rgba(var(--fg-rgb),0.08)] font-mono text-[11px] tracking-[0.04em] text-electric hover:text-acid transition-colors"
            >
              View all
              <ArrowRight size={12} />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
