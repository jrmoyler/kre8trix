/*
 * D1 — shared KYC/KYB presentation helpers.
 *
 * Maps each KycStatus to its label/icon/color, mirroring the pattern
 * established by src/lib/notifications.ts for NotificationType.
 */

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileWarning,
  ShieldQuestion,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { KycStatus, KycStepKey } from './types';

export interface KycStatusMeta {
  label: string;
  icon: LucideIcon;
  /** Text color (design-token palette). */
  color: string;
  /** Matching translucent background for pills/badges. */
  bg: string;
}

export const KYC_STATUS_META: Record<KycStatus, KycStatusMeta> = {
  unverified: { label: 'Not started', icon: ShieldQuestion, color: 'rgba(var(--fg-rgb),0.6)', bg: 'rgba(var(--fg-rgb),0.1)' },
  pending: { label: 'Pending', icon: Clock, color: 'rgb(var(--color-gold))', bg: 'rgba(var(--gold-rgb),0.15)' },
  in_review: { label: 'In review', icon: Clock, color: 'rgb(var(--color-gold))', bg: 'rgba(var(--gold-rgb),0.15)' },
  verified: { label: 'Verified', icon: CheckCircle2, color: 'rgb(var(--color-positive))', bg: 'rgba(var(--positive-rgb),0.15)' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'rgb(var(--color-negative))', bg: 'rgba(var(--negative-rgb),0.15)' },
  action_required: { label: 'Action required', icon: AlertTriangle, color: 'rgb(var(--color-ember))', bg: 'rgba(var(--ember-rgb),0.15)' },
};

export const KYC_STEP_ORDER: KycStepKey[] = [
  'entity_type',
  'personal_info',
  'business_info',
  'documents',
  'selfie',
  'review',
];

export const KYC_STEP_LABELS: Record<KycStepKey, string> = {
  entity_type: 'Account Type',
  personal_info: 'Personal Info',
  business_info: 'Business Info',
  documents: 'Documents',
  selfie: 'Selfie Match',
  review: 'Review & Submit',
};

/** Icon used for a rejected upload — kept separate from the status meta above. */
export const DOCUMENT_REJECTED_ICON: LucideIcon = FileWarning;

/** True once the user has cleared identity verification for gated actions. */
export function isKycVerified(status: KycStatus | undefined): boolean {
  return status === 'verified';
}
