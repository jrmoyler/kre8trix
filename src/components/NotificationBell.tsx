import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/hooks/use-api';
import type { AppNotification } from '@/lib/types';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: notifications, setData } = useApi<AppNotification[]>('/notifications');

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markAllRead = async () => {
    const updated = await api.post<AppNotification[]>('/notifications/read-all');
    setData(updated);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        className="relative w-10 h-10 rounded-xl flex items-center justify-center text-[rgba(var(--fg-rgb),0.42)] hover:text-ink hover:bg-[rgba(var(--fg-rgb),0.06)] transition-all duration-200"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-negative rounded-full" />
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
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-5 py-4 border-b border-[rgba(var(--fg-rgb),0.04)] last:border-b-0 ${
                      n.read ? 'opacity-60' : ''
                    }`}
                  >
                    <span
                      className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: n.read ? 'rgba(var(--fg-rgb),0.2)' : n.accentColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-body text-[13px] font-medium text-ink truncate">{n.title}</p>
                        <span className="font-mono text-[10px] text-[rgba(var(--fg-rgb),0.42)] flex-shrink-0">
                          {n.time}
                        </span>
                      </div>
                      <p className="font-body text-[12px] text-[rgba(var(--fg-rgb),0.42)] mt-0.5">{n.body}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
