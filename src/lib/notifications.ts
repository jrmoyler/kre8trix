/*
 * C5 — shared notification presentation helpers.
 *
 * Maps each NotificationType to its lucide icon + accent color, and
 * formats createdAt timestamps for the bell dropdown and the
 * /notifications-center page.
 */

import { DollarSign, Gauge, HandCoins, Info, Landmark, Plug, type LucideIcon } from 'lucide-react';
import type { NotificationType } from './types';

export interface NotificationTypeMeta {
  label: string;
  icon: LucideIcon;
  /** Hex accent color (design-token palette). */
  color: string;
}

export const NOTIFICATION_TYPE_META: Record<NotificationType, NotificationTypeMeta> = {
  payment: { label: 'Payment', icon: DollarSign, color: '#00E5A0' },
  advance: { label: 'Advance', icon: HandCoins, color: '#FF4D00' },
  ccs: { label: 'CCS', icon: Gauge, color: '#00D4FF' },
  tax: { label: 'Tax', icon: Landmark, color: '#FFD400' },
  platform: { label: 'Platform', icon: Plug, color: '#9B5DE5' },
  system: { label: 'System', icon: Info, color: '#C8FF00' },
};

export const NOTIFICATION_TYPES: NotificationType[] = [
  'payment',
  'advance',
  'ccs',
  'tax',
  'platform',
  'system',
];

/** Compact relative time, e.g. "just now", "5m ago", "2h ago", "3d ago". */
export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Day bucket label for grouped lists: "Today", "Yesterday", then "Mon, Oct 14". */
export function dayLabel(iso: string): string {
  const date = new Date(iso);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
