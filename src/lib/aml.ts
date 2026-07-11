/*
 * D2 — shared AML monitoring presentation helpers.
 *
 * Maps severities/statuses/reasons to label/color, mirroring the
 * pattern established by src/lib/notifications.ts.
 */

import type { AmlAlertReason, AmlAlertSeverity, AmlAlertStatus } from './types';

export interface AmlMeta {
  label: string;
  color: string;
  bg: string;
}

export const AML_SEVERITY_META: Record<AmlAlertSeverity, AmlMeta> = {
  low: { label: 'Low', color: 'rgb(var(--color-electric))', bg: 'rgba(var(--electric-rgb),0.15)' },
  medium: { label: 'Medium', color: 'rgb(var(--color-gold))', bg: 'rgba(var(--gold-rgb),0.15)' },
  high: { label: 'High', color: 'rgb(var(--color-ember))', bg: 'rgba(var(--ember-rgb),0.15)' },
  critical: { label: 'Critical', color: 'rgb(var(--color-negative))', bg: 'rgba(var(--negative-rgb),0.15)' },
};

export const AML_STATUS_META: Record<AmlAlertStatus, AmlMeta> = {
  open: { label: 'Open', color: 'rgb(var(--color-ember))', bg: 'rgba(var(--ember-rgb),0.15)' },
  under_review: { label: 'Under review', color: 'rgb(var(--color-gold))', bg: 'rgba(var(--gold-rgb),0.15)' },
  escalated: { label: 'Escalated', color: 'rgb(var(--color-negative))', bg: 'rgba(var(--negative-rgb),0.15)' },
  cleared: { label: 'Cleared', color: 'rgb(var(--color-positive))', bg: 'rgba(var(--positive-rgb),0.15)' },
  filed_sar: { label: 'SAR filed', color: 'rgb(var(--color-violet))', bg: 'rgba(var(--violet-rgb),0.15)' },
};

export const AML_REASON_LABELS: Record<AmlAlertReason, string> = {
  large_transaction: 'Large transaction',
  velocity: 'Transaction velocity',
  structuring: 'Possible structuring',
  cross_wallet_pattern: 'Cross-wallet pattern',
  high_risk_recipient: 'High-risk recipient',
  round_trip: 'Round-trip conversion',
};

export const AML_STATUS_OPTIONS: AmlAlertStatus[] = ['open', 'under_review', 'escalated', 'cleared', 'filed_sar'];
