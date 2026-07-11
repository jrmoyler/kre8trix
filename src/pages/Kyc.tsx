import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Camera,
  Check,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  User as UserIcon,
  Upload,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/hooks/use-api';
import { KYC_STEP_ORDER } from '@/lib/kyc';
import KycStatusBadge from '@/components/KycStatusBadge';
import { ErrorNotice, SkeletonBlock } from '@/components/Skeletons';
import type {
  KybBusinessInfo,
  KycDocument,
  KycDocumentType,
  KycPersonalInfo,
  KycProfile,
  KycStepKey,
} from '@/lib/types';

const inputClass =
  'w-full bg-surface border border-[rgba(var(--fg-rgb),0.1)] rounded-xl px-4 py-3 text-ink font-body focus:border-electric focus-visible:ring-2 focus-visible:ring-electric outline-none transition-colors';

const DOC_TYPE_OPTIONS: { value: KycDocumentType; label: string }[] = [
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'national_id', label: 'National ID' },
  { value: 'business_registration', label: 'Business Registration' },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Kyc() {
  const navigate = useNavigate();
  const kycQuery = useApi<KycProfile>('/kyc/status');
  const seededRef = useRef(false);

  const [entityType, setEntityType] = useState<'individual' | 'business' | null>(null);
  const [step, setStep] = useState<KycStepKey>('entity_type');
  const [personalInfo, setPersonalInfo] = useState<KycPersonalInfo>({
    legalName: '',
    dateOfBirth: '',
    address: '',
    country: '',
    ssnLast4: '',
  });
  const [businessInfo, setBusinessInfo] = useState<KybBusinessInfo>({
    legalBusinessName: '',
    ein: '',
    businessType: '',
    formationState: '',
  });
  const [documents, setDocuments] = useState<KycDocument[]>([]);
  const [docType, setDocType] = useState<KycDocumentType>('passport');
  const [selfie, setSelfie] = useState<KycProfile['selfie']>({ completed: false, matchScore: null, completedAt: null });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (seededRef.current || !kycQuery.data) return;
    seededRef.current = true;
    const profile = kycQuery.data;
    setEntityType(profile.entityType);
    setPersonalInfo(profile.personalInfo ?? { legalName: '', dateOfBirth: '', address: '', country: '', ssnLast4: '' });
    setBusinessInfo(profile.businessInfo ?? { legalBusinessName: '', ein: '', businessType: '', formationState: '' });
    setDocuments(profile.documents);
    setSelfie(profile.selfie);
    setStep(profile.currentStep);
  }, [kycQuery.data]);

  if (kycQuery.error) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6">
        <ErrorNotice message={kycQuery.error} onRetry={kycQuery.refresh} />
      </div>
    );
  }

  if (kycQuery.loading || !kycQuery.data) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6">
        <div className="w-full max-w-[560px] space-y-4">
          <SkeletonBlock className="h-10 w-64" />
          <SkeletonBlock className="h-40 w-full" />
        </div>
      </div>
    );
  }

  const profile = kycQuery.data;

  /* In-review, verified, and rejected all render an outcome screen instead
     of the wizard — there's nothing left for the user to fill in. */
  if (profile.status === 'in_review' || profile.status === 'verified' || profile.status === 'rejected') {
    return <KycOutcome profile={profile} />;
  }

  const visibleSteps = KYC_STEP_ORDER.filter((s) => s !== 'business_info' || entityType === 'business');
  const stepIndex = Math.max(0, visibleSteps.indexOf(step));

  const goToNext = (next: KycStepKey) => setStep(next);

  const submitEntityType = async (type: 'individual' | 'business') => {
    setSaving(true);
    try {
      const updated = await api.put<KycProfile>('/kyc/entity-type', { entityType: type });
      setEntityType(type);
      kycQuery.setData(updated);
      goToNext('personal_info');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save account type');
    } finally {
      setSaving(false);
    }
  };

  const submitPersonalInfo = async () => {
    setSaving(true);
    try {
      const updated = await api.put<KycProfile>('/kyc/personal-info', personalInfo);
      kycQuery.setData(updated);
      goToNext(entityType === 'business' ? 'business_info' : 'documents');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save personal information');
    } finally {
      setSaving(false);
    }
  };

  const submitBusinessInfo = async () => {
    setSaving(true);
    try {
      const updated = await api.put<KycProfile>('/kyc/business-info', businessInfo);
      kycQuery.setData(updated);
      goToNext('documents');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save business information');
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSaving(true);
    try {
      const updated = await api.post<KycProfile>('/kyc/documents', {
        type: docType,
        fileName: file.name,
        sizeBytes: file.size,
      });
      setDocuments(updated.documents);
      kycQuery.setData(updated);
      toast.success(`${file.name} uploaded`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const simulateSelfie = async () => {
    setSaving(true);
    try {
      const updated = await api.post<KycProfile>('/kyc/selfie', {});
      setSelfie(updated.selfie);
      kycQuery.setData(updated);
      goToNext('review');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Selfie match failed');
    } finally {
      setSaving(false);
    }
  };

  const submitForReview = async () => {
    setSaving(true);
    try {
      const updated = await api.post<KycProfile>('/kyc/submit', {});
      kycQuery.setData(updated);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Submission failed');
    } finally {
      setSaving(false);
    }
  };

  const stepBack = () => {
    const idx = visibleSteps.indexOf(step);
    if (idx > 0) setStep(visibleSteps[idx - 1]);
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-[560px]">
        <div className="flex items-center gap-2 mb-12">
          {visibleSteps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-[12px] font-medium transition-all ${
                  i <= stepIndex ? 'bg-acid text-void' : 'bg-panel text-[rgba(var(--fg-rgb),var(--muted-alpha))]'
                }`}
              >
                {i < stepIndex ? <Check size={14} /> : i + 1}
              </div>
              {i < visibleSteps.length - 1 && (
                <div className={`flex-1 h-1 rounded-full ${i < stepIndex ? 'bg-acid' : 'bg-panel'}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 'entity_type' && (
            <motion.div key="entity_type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h1 className="font-display text-[40px] tracking-[0.02em] text-ink mb-2">Identity Verification</h1>
              <p className="font-body text-[16px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] mb-8">
                Tell us whether you're verifying as an individual creator or a registered business
              </p>
              <div className="space-y-3">
                {[
                  { key: 'individual' as const, label: 'Individual Creator', desc: 'Verify with a government ID', icon: UserIcon },
                  { key: 'business' as const, label: 'Registered Business', desc: 'Verify with business registration + a responsible party', icon: Building2 },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    disabled={saving}
                    onClick={() => submitEntityType(opt.key)}
                    className="w-full text-left flex items-center gap-4 p-5 rounded-2xl border bg-panel border-[rgba(var(--fg-rgb),0.08)] hover:border-[rgba(var(--fg-rgb),0.14)] transition-all disabled:opacity-60"
                  >
                    <opt.icon size={22} className="text-electric flex-shrink-0" />
                    <div>
                      <p className="font-body text-[16px] text-ink font-medium">{opt.label}</p>
                      <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] mt-1">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'personal_info' && (
            <motion.div key="personal_info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h1 className="font-display text-[40px] tracking-[0.02em] text-ink mb-2">Personal Information</h1>
              <p className="font-body text-[16px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] mb-8">
                This must match the ID you'll upload next
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="kyc-legal-name" className="block font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em] mb-2">Legal Name</label>
                  <input id="kyc-legal-name" type="text" value={personalInfo.legalName} onChange={(e) => setPersonalInfo({ ...personalInfo, legalName: e.target.value })} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="kyc-dob" className="block font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em] mb-2">Date of Birth</label>
                    <input id="kyc-dob" type="date" value={personalInfo.dateOfBirth} onChange={(e) => setPersonalInfo({ ...personalInfo, dateOfBirth: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="kyc-ssn" className="block font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em] mb-2">SSN/ITIN (last 4)</label>
                    <input id="kyc-ssn" type="text" inputMode="numeric" maxLength={4} value={personalInfo.ssnLast4} onChange={(e) => setPersonalInfo({ ...personalInfo, ssnLast4: e.target.value.replace(/\D/g, '') })} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label htmlFor="kyc-address" className="block font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em] mb-2">Address</label>
                  <input id="kyc-address" type="text" value={personalInfo.address} onChange={(e) => setPersonalInfo({ ...personalInfo, address: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="kyc-country" className="block font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em] mb-2">Country</label>
                  <input id="kyc-country" type="text" value={personalInfo.country} onChange={(e) => setPersonalInfo({ ...personalInfo, country: e.target.value })} className={inputClass} />
                </div>
              </div>
            </motion.div>
          )}

          {step === 'business_info' && (
            <motion.div key="business_info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h1 className="font-display text-[40px] tracking-[0.02em] text-ink mb-2">Business Information</h1>
              <p className="font-body text-[16px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] mb-8">Tell us about your registered business</p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="kyb-name" className="block font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em] mb-2">Legal Business Name</label>
                  <input id="kyb-name" type="text" value={businessInfo.legalBusinessName} onChange={(e) => setBusinessInfo({ ...businessInfo, legalBusinessName: e.target.value })} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="kyb-ein" className="block font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em] mb-2">EIN</label>
                    <input id="kyb-ein" type="text" value={businessInfo.ein} onChange={(e) => setBusinessInfo({ ...businessInfo, ein: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="kyb-state" className="block font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em] mb-2">Formation State</label>
                    <input id="kyb-state" type="text" value={businessInfo.formationState} onChange={(e) => setBusinessInfo({ ...businessInfo, formationState: e.target.value })} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label htmlFor="kyb-type" className="block font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em] mb-2">Business Type</label>
                  <input id="kyb-type" type="text" placeholder="LLC, S-Corp, Sole Proprietorship…" value={businessInfo.businessType} onChange={(e) => setBusinessInfo({ ...businessInfo, businessType: e.target.value })} className={inputClass} />
                </div>
              </div>
            </motion.div>
          )}

          {step === 'documents' && (
            <motion.div key="documents" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h1 className="font-display text-[40px] tracking-[0.02em] text-ink mb-2">Upload Documents</h1>
              <p className="font-body text-[16px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] mb-8">
                Upload at least one government-issued ID (metadata only — files aren't stored in this demo)
              </p>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <select
                    aria-label="Document type"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as KycDocumentType)}
                    className={`${inputClass} flex-1`}
                  >
                    {DOC_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 px-5 py-3 rounded-xl bg-acid text-void font-body text-[14px] font-semibold cursor-pointer hover:brightness-110 transition-all">
                    <Upload size={16} />
                    Upload
                    <input type="file" className="sr-only" onChange={handleFileSelect} disabled={saving} />
                  </label>
                </div>
                <div className="space-y-2">
                  {documents.length === 0 ? (
                    <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] py-4 text-center">No documents uploaded yet</p>
                  ) : (
                    documents.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 p-4 rounded-2xl bg-panel border border-[rgba(var(--fg-rgb),0.08)]">
                        <FileText size={18} className="text-electric flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-[14px] text-ink truncate">{doc.fileName}</p>
                          <p className="font-mono text-[11px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">
                            {DOC_TYPE_OPTIONS.find((o) => o.value === doc.type)?.label} · {formatBytes(doc.sizeBytes)}
                          </p>
                        </div>
                        <Check size={16} className="text-positive flex-shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {step === 'selfie' && (
            <motion.div key="selfie" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h1 className="font-display text-[40px] tracking-[0.02em] text-ink mb-2">Selfie Match</h1>
              <p className="font-body text-[16px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] mb-8">
                Confirm you match the ID you uploaded
              </p>
              <div className="p-8 rounded-2xl bg-panel border border-[rgba(var(--fg-rgb),0.08)] flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-panel2 flex items-center justify-center">
                  <Camera size={32} className="text-[rgba(var(--fg-rgb),var(--muted-alpha))]" />
                </div>
                {selfie.completed ? (
                  <div className="text-center">
                    <p className="font-body text-[16px] text-positive font-medium mb-1">Match confirmed — {selfie.matchScore}% confidence</p>
                    <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">No camera footage is stored in this demo</p>
                  </div>
                ) : (
                  <button
                    onClick={simulateSelfie}
                    disabled={saving}
                    className="flex items-center gap-2 bg-acid text-void font-body text-[15px] font-semibold px-6 py-3 rounded-2xl disabled:opacity-60"
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    Simulate Capture
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {step === 'review' && (
            <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h1 className="font-display text-[40px] tracking-[0.02em] text-ink mb-2">Review &amp; Submit</h1>
              <p className="font-body text-[16px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] mb-8">Confirm everything looks right before submitting</p>
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-panel border border-[rgba(var(--fg-rgb),0.08)]">
                  <p className="font-mono text-[11px] tracking-[0.04em] text-[rgba(var(--fg-rgb),var(--muted-alpha))] mb-1">LEGAL NAME</p>
                  <p className="font-body text-[15px] text-ink">{personalInfo.legalName || '—'}</p>
                </div>
                {entityType === 'business' && (
                  <div className="p-4 rounded-2xl bg-panel border border-[rgba(var(--fg-rgb),0.08)]">
                    <p className="font-mono text-[11px] tracking-[0.04em] text-[rgba(var(--fg-rgb),var(--muted-alpha))] mb-1">BUSINESS</p>
                    <p className="font-body text-[15px] text-ink">{businessInfo.legalBusinessName || '—'}</p>
                  </div>
                )}
                <div className="p-4 rounded-2xl bg-panel border border-[rgba(var(--fg-rgb),0.08)]">
                  <p className="font-mono text-[11px] tracking-[0.04em] text-[rgba(var(--fg-rgb),var(--muted-alpha))] mb-1">DOCUMENTS</p>
                  <p className="font-body text-[15px] text-ink">{documents.length} uploaded</p>
                </div>
                <div className="p-4 rounded-2xl bg-panel border border-[rgba(var(--fg-rgb),0.08)]">
                  <p className="font-mono text-[11px] tracking-[0.04em] text-[rgba(var(--fg-rgb),var(--muted-alpha))] mb-1">SELFIE MATCH</p>
                  <p className="font-body text-[15px] text-ink">{selfie.matchScore}% confidence</p>
                </div>
              </div>
              <button
                onClick={submitForReview}
                disabled={saving}
                className="w-full mt-6 flex items-center justify-center gap-2 bg-acid text-void font-body text-[16px] font-semibold py-4 rounded-2xl disabled:opacity-60"
              >
                {saving && <Loader2 size={18} className="animate-spin" />}
                Submit for Verification
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mt-8">
          <button onClick={stepBack} disabled={stepIndex === 0} className="font-body text-[14px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] hover:text-ink disabled:opacity-30 transition-colors">
            Back
          </button>
          <div className="flex items-center gap-5">
            <button onClick={() => navigate(-1)} className="font-body text-[14px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] hover:text-ink transition-colors">
              Save &amp; exit
            </button>
            {step === 'personal_info' && (
              <button onClick={submitPersonalInfo} disabled={saving} className="flex items-center gap-2 bg-acid text-void font-body text-[16px] font-semibold px-6 py-3 rounded-2xl disabled:opacity-40">
                {saving && <Loader2 size={16} className="animate-spin" />}
                Continue <ChevronRight size={18} />
              </button>
            )}
            {step === 'business_info' && (
              <button onClick={submitBusinessInfo} disabled={saving} className="flex items-center gap-2 bg-acid text-void font-body text-[16px] font-semibold px-6 py-3 rounded-2xl disabled:opacity-40">
                {saving && <Loader2 size={16} className="animate-spin" />}
                Continue <ChevronRight size={18} />
              </button>
            )}
            {step === 'documents' && (
              <button onClick={() => goToNext('selfie')} disabled={documents.length === 0} className="flex items-center gap-2 bg-acid text-void font-body text-[16px] font-semibold px-6 py-3 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed">
                Continue <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KycOutcome({ profile }: { profile: KycProfile }) {
  const navigate = useNavigate();
  const [resetting, setResetting] = useState(false);

  const tryAgain = async () => {
    setResetting(true);
    try {
      await api.post('/kyc/reset');
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not reset verification');
      setResetting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-[480px] text-center">
        <div className="w-20 h-20 rounded-full bg-panel border border-[rgba(var(--fg-rgb),0.08)] flex items-center justify-center mx-auto mb-6">
          {profile.status === 'verified' && <Check size={32} className="text-positive" />}
          {profile.status === 'in_review' && <Clock size={32} className="text-[rgb(var(--color-gold))]" />}
          {profile.status === 'rejected' && <XCircle size={32} className="text-negative" />}
        </div>
        <div className="mb-4 flex justify-center">
          <KycStatusBadge status={profile.status} />
        </div>
        <h1 className="font-display text-[36px] tracking-[0.02em] text-ink mb-2">
          {profile.status === 'verified' && 'Identity Verified'}
          {profile.status === 'in_review' && 'Verification In Progress'}
          {profile.status === 'rejected' && 'Verification Rejected'}
        </h1>
        <p className="font-body text-[15px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] mb-8">
          {profile.status === 'verified' && 'Your identity has been verified. All account features are unlocked.'}
          {profile.status === 'in_review' && 'Our team is reviewing your submission — this usually takes a few minutes in this demo.'}
          {profile.status === 'rejected' && (profile.rejectionReason ?? 'Your submission could not be verified.')}
        </p>
        {profile.status === 'rejected' ? (
          <button
            onClick={tryAgain}
            disabled={resetting}
            className="flex items-center gap-2 mx-auto bg-acid text-void font-body text-[15px] font-semibold px-6 py-3 rounded-2xl disabled:opacity-60"
          >
            {resetting && <Loader2 size={16} className="animate-spin" />}
            Try Again
          </button>
        ) : (
          <button onClick={() => navigate('/dashboard')} className="bg-acid text-void font-body text-[15px] font-semibold px-6 py-3 rounded-2xl">
            Back to Dashboard
          </button>
        )}
      </div>
    </div>
  );
}
