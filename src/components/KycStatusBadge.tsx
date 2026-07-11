import { KYC_STATUS_META } from '@/lib/kyc';
import type { KycStatus } from '@/lib/types';

/** D1: small reusable identity-verification status pill. */
export default function KycStatusBadge({ status }: { status: KycStatus }) {
  const meta = KYC_STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] tracking-[0.04em]"
      style={{ backgroundColor: meta.bg, color: meta.color }}
    >
      <Icon size={12} />
      {meta.label}
    </span>
  );
}
