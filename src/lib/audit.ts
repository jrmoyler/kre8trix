/*
 * D3 — immutable audit log helpers.
 *
 * A small FNV-1a hash chain gives a demoable "tamper-evident log" —
 * each entry's hash depends on the previous entry's hash, so editing
 * or removing a historical entry breaks every hash after it. This is
 * a realistic-looking mock, not real cryptographic tamper-proofing.
 */

import type { AuditAction, AuditActorType } from './types';

export const AUDIT_GENESIS_HASH = 'genesis';

/** 32-bit FNV-1a — fast, deterministic, good enough for a demo hash chain. */
export function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Hash of an entry given the previous entry's hash — everything but `hash` itself. */
export function computeEntryHash(prevHash: string, entryWithoutHash: Record<string, unknown>): string {
  return fnv1a(prevHash + JSON.stringify(entryWithoutHash));
}

export const AUDIT_ACTOR_LABELS: Record<AuditActorType, string> = {
  user: 'You',
  system: 'System',
  compliance_officer: 'Compliance Officer',
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  login: 'Signed in',
  logout: 'Signed out',
  signup: 'Account created',
  send_funds: 'Sent funds',
  convert_funds: 'Converted currency',
  request_funds: 'Requested funds',
  update_profile: 'Updated profile',
  update_settings: 'Updated settings',
  connect_platform: 'Connected platform',
  disconnect_platform: 'Disconnected platform',
  apply_advance: 'Applied for advance',
  apply_deal: 'Applied to brand deal',
  kyc_submit: 'Submitted identity verification',
  kyc_status_change: 'Identity verification status changed',
  aml_alert_status_change: 'AML alert status changed',
  aml_sar_filed: 'SAR filed',
  export_tax_data: 'Exported tax data',
  connect_turbotax: 'Connected TurboTax',
};
