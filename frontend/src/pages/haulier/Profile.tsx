import { useCallback, useEffect, useRef, useState } from 'react';
import haulierService from '../../api/haulierService';

const DIAL_CODES = [
  { code: 'GB', dialCode: '+44', name: 'United Kingdom' },
  { code: 'US', dialCode: '+1',  name: 'United States' },
  { code: 'CA', dialCode: '+1',  name: 'Canada' },
  { code: 'AU', dialCode: '+61', name: 'Australia' },
  { code: 'NZ', dialCode: '+64', name: 'New Zealand' },
  { code: 'IE', dialCode: '+353',name: 'Ireland' },
  { code: 'DE', dialCode: '+49', name: 'Germany' },
  { code: 'FR', dialCode: '+33', name: 'France' },
  { code: 'ES', dialCode: '+34', name: 'Spain' },
  { code: 'IT', dialCode: '+39', name: 'Italy' },
  { code: 'NL', dialCode: '+31', name: 'Netherlands' },
  { code: 'BE', dialCode: '+32', name: 'Belgium' },
  { code: 'AT', dialCode: '+43', name: 'Austria' },
  { code: 'PT', dialCode: '+351',name: 'Portugal' },
  { code: 'GR', dialCode: '+30', name: 'Greece' },
  { code: 'CH', dialCode: '+41', name: 'Switzerland' },
  { code: 'SE', dialCode: '+46', name: 'Sweden' },
  { code: 'NO', dialCode: '+47', name: 'Norway' },
  { code: 'DK', dialCode: '+45', name: 'Denmark' },
  { code: 'PL', dialCode: '+48', name: 'Poland' },
  { code: 'SG', dialCode: '+65', name: 'Singapore' },
  { code: 'HK', dialCode: '+852',name: 'Hong Kong' },
  { code: 'JP', dialCode: '+81', name: 'Japan' },
  { code: 'IN', dialCode: '+91', name: 'India' },
  { code: 'PK', dialCode: '+92', name: 'Pakistan' },
  { code: 'BD', dialCode: '+880',name: 'Bangladesh' },
  { code: 'LK', dialCode: '+94', name: 'Sri Lanka' },
  { code: 'NG', dialCode: '+234',name: 'Nigeria' },
  { code: 'GH', dialCode: '+233',name: 'Ghana' },
  { code: 'KE', dialCode: '+254',name: 'Kenya' },
  { code: 'ZA', dialCode: '+27', name: 'South Africa' },
  { code: 'AE', dialCode: '+971',name: 'UAE' },
  { code: 'SA', dialCode: '+966',name: 'Saudi Arabia' },
  { code: 'QA', dialCode: '+974',name: 'Qatar' },
  { code: 'KW', dialCode: '+965',name: 'Kuwait' },
  { code: 'BH', dialCode: '+973',name: 'Bahrain' },
  { code: 'OM', dialCode: '+968',name: 'Oman' },
  { code: 'EG', dialCode: '+20', name: 'Egypt' },
  { code: 'MA', dialCode: '+212',name: 'Morocco' },
  { code: 'TZ', dialCode: '+255',name: 'Tanzania' },
  { code: 'UG', dialCode: '+256',name: 'Uganda' },
  { code: 'ET', dialCode: '+251',name: 'Ethiopia' },
  { code: 'MX', dialCode: '+52', name: 'Mexico' },
  { code: 'BR', dialCode: '+55', name: 'Brazil' },
  { code: 'TR', dialCode: '+90', name: 'Turkey' },
  { code: 'TH', dialCode: '+66', name: 'Thailand' },
  { code: 'MY', dialCode: '+60', name: 'Malaysia' },
  { code: 'ID', dialCode: '+62', name: 'Indonesia' },
  { code: 'PH', dialCode: '+63', name: 'Philippines' },
  { code: 'VN', dialCode: '+84', name: 'Vietnam' },
  { code: 'CN', dialCode: '+86', name: 'China' },
  { code: 'KR', dialCode: '+82', name: 'South Korea' },
];

const COUNTRY_DIAL: Record<string, string> = Object.fromEntries(
  DIAL_CODES.map(d => [d.code, d.dialCode])
);

function splitPhone(raw: string): { dialCode: string; number: string } {
  if (!raw) return { dialCode: '+44', number: '' };
  const sorted = [...DIAL_CODES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const d of sorted) {
    if (raw.startsWith(d.dialCode)) {
      return { dialCode: d.dialCode, number: raw.slice(d.dialCode.length).trimStart() };
    }
  }
  return { dialCode: '', number: raw };
}

type HaulierProfile = {
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  country?: string | null;
  currency?: string | null;
  role?: string;
  profileComplete?: boolean;
  isVerified?: boolean;
  profile?: {
    photoUrl?: string | null;
    companyName?: string | null;
    companyAddress?: string | null;
    vatNumber?: string | null;
    organisationNumber?: string | null;
    coverageArea?: string | null;
    vehicleType?: string | null;
    vehicleRegistration?: string | null;
    licenceNumber?: string | null;
    esignatureData?: string | null;
  } | null;
};


const COUNTRY_NAMES: Record<string, string> = {
  GB: 'United Kingdom', US: 'United States', CA: 'Canada', AU: 'Australia',
  NZ: 'New Zealand', IE: 'Ireland', DE: 'Germany', FR: 'France', ES: 'Spain',
  IT: 'Italy', NL: 'Netherlands', BE: 'Belgium', AT: 'Austria', FI: 'Finland',
  PT: 'Portugal', GR: 'Greece', LU: 'Luxembourg', SK: 'Slovakia', SI: 'Slovenia',
  EE: 'Estonia', LV: 'Latvia', LT: 'Lithuania', CY: 'Cyprus', MT: 'Malta',
  HR: 'Croatia', SG: 'Singapore', HK: 'Hong Kong', JP: 'Japan', IN: 'India',
  PK: 'Pakistan', BD: 'Bangladesh', LK: 'Sri Lanka', NG: 'Nigeria', GH: 'Ghana',
  KE: 'Kenya', ZA: 'South Africa', AE: 'United Arab Emirates', SA: 'Saudi Arabia',
  QA: 'Qatar', KW: 'Kuwait', BH: 'Bahrain', OM: 'Oman', EG: 'Egypt',
  MA: 'Morocco', TZ: 'Tanzania', UG: 'Uganda', ET: 'Ethiopia', MX: 'Mexico',
  BR: 'Brazil', AR: 'Argentina', CL: 'Chile', CO: 'Colombia', PE: 'Peru',
  TR: 'Turkey', IL: 'Israel', TH: 'Thailand', MY: 'Malaysia', ID: 'Indonesia',
  PH: 'Philippines', VN: 'Vietnam', CN: 'China', KR: 'South Korea', TW: 'Taiwan',
  CH: 'Switzerland', SE: 'Sweden', NO: 'Norway', DK: 'Denmark', PL: 'Poland',
  CZ: 'Czech Republic', HU: 'Hungary', RO: 'Romania', RU: 'Russia', UA: 'Ukraine',
};

export default function HaulierProfilePage() {
  const [profile, setProfile] = useState<HaulierProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [phoneDialCode, setPhoneDialCode] = useState('+44');
  const [phoneNumber, setPhoneNumber] = useState('');

  // E-Signature state
  const [showEsigDraw, setShowEsigDraw] = useState(false);
  const [esigSaving, setEsigSaving] = useState(false);
  const [esigError, setEsigError] = useState('');
  const [esigSuccess, setEsigSuccess] = useState(false);
  const esigCanvasRef = useRef<HTMLCanvasElement>(null);
  const esigDrawing = useRef(false);
  const esigLastPoint = useRef<{ x: number; y: number } | null>(null);
  const [esigHasStrokes, setEsigHasStrokes] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await haulierService.getMe();
      setProfile(data);
      if (data?.profile?.photoUrl) setPhotoPreview(data.profile.photoUrl);
      const parsed = splitPhone(data?.phone ?? '');
      setPhoneDialCode(
        parsed.dialCode || (data?.country ? (COUNTRY_DIAL[data.country] ?? '+44') : '+44')
      );
      setPhoneNumber(parsed.number);
      setError(null);
    } catch {
      setError('Failed to load profile from the backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const updateField = (field: string, value: string) => {
    setProfile((current) => {
      if (!current) return current;
      if (['name', 'phone', 'country', 'currency'].includes(field)) {
        return { ...current, [field]: value };
      }
      return {
        ...current,
        profile: {
          ...(current.profile ?? {}),
          [field]: value,
        },
      };
    });
  };


  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setSuccess(false);
    try {
      const combinedPhone = phoneNumber.trim()
        ? `${phoneDialCode}${phoneNumber.trim()}`
        : '';
      await haulierService.updateProfile({
        name: profile.name,
        phone: combinedPhone,
        country: profile.country ?? '',
        currency: profile.currency ?? '',
        companyName: profile.profile?.companyName ?? '',
        companyAddress: profile.profile?.companyAddress ?? '',
        vatNumber: profile.profile?.vatNumber ?? '',
        organisationNumber: profile.profile?.organisationNumber ?? '',
      });
      await fetchProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  // ── E-Signature helpers ────────────────────────────────────────────────────
  const esigGetPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = esigCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    };
  };

  const esigStartDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    esigDrawing.current = true;
    esigLastPoint.current = esigGetPos(e);
    setEsigHasStrokes(true);
  };

  const esigDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!esigDrawing.current || !esigCanvasRef.current) return;
    const ctx = esigCanvasRef.current.getContext('2d')!;
    const pos = esigGetPos(e);
    ctx.beginPath();
    ctx.moveTo(esigLastPoint.current!.x, esigLastPoint.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    esigLastPoint.current = pos;
  };

  const esigEndDraw = () => {
    esigDrawing.current = false;
    esigLastPoint.current = null;
  };

  const esigClear = () => {
    const canvas = esigCanvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setEsigHasStrokes(false);
  };

  const saveEsignature = async () => {
    if (!esigCanvasRef.current || !esigHasStrokes) return;
    const dataUrl = esigCanvasRef.current.toDataURL('image/png');
    setEsigSaving(true);
    setEsigError('');
    try {
      await haulierService.saveEsignature(dataUrl);
      setProfile(curr => curr ? {
        ...curr,
        profile: { ...(curr.profile ?? {}), esignatureData: dataUrl },
      } : curr);
      setShowEsigDraw(false);
      setEsigHasStrokes(false);
      setEsigSuccess(true);
      setTimeout(() => setEsigSuccess(false), 3000);
    } catch {
      setEsigError('Failed to save e-signature. Please try again.');
    } finally {
      setEsigSaving(false);
    }
  };

  const deleteEsignature = async () => {
    if (!window.confirm('Remove your saved e-signature?')) return;
    try {
      await haulierService.deleteEsignature();
      setProfile(curr => curr ? {
        ...curr,
        profile: { ...(curr.profile ?? {}), esignatureData: null },
      } : curr);
    } catch { /* ignore */ }
  };

  const uploadPhoto = async (file: File) => {
    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);
    setUploading(true);
    try {
      const result = await haulierService.uploadProfilePhoto(file);
      // Use the returned URL if available, otherwise keep local preview
      if (result?.photoUrl) setPhotoPreview(result.photoUrl);
      await fetchProfile();
    } catch (err: unknown) {
      setPhotoPreview(null);
      const response = err as { response?: { data?: { message?: string; detail?: string } } };
      const message = response.response?.data?.message || response.response?.data?.detail;
      setError(message ? `Failed to upload profile photo: ${message}` : 'Failed to upload profile photo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Haulier Settings</p>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-primary">Profile</h1>
        <p className="text-on-surface-variant font-medium">Manage your personal details, company info, and regional settings.</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Profile saved successfully.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* ── Left card: avatar + photo upload ── */}
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          {/* Avatar */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-[#1066b1]/20 shadow-md">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#1066b1] text-4xl font-black text-white">
                    {profile?.name?.charAt(0)?.toUpperCase() || 'H'}
                  </div>
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white animate-spin text-2xl">progress_activity</span>
                </div>
              )}
            </div>
            <h2 className="text-xl font-black text-primary">{profile?.name ?? 'Haulier account'}</h2>
            <p className="text-sm font-bold text-slate-500 mb-1">{profile?.email}</p>
            <p className="text-xs font-black uppercase tracking-widest text-[#1066b1]">
              {profile?.profileComplete ? 'Profile Complete' : 'Profile Incomplete'}
            </p>
          </div>

          {/* Hidden file input */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadPhoto(f); e.target.value = ''; }}
          />

          {/* Upload button */}
          <div className="mt-5">
            <button
              type="button"
              disabled={uploading}
              onClick={() => galleryInputRef.current?.click()}
              className="w-full flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-[#1066b1]/30 bg-[#1066b1]/5 px-3 py-4 text-[#1066b1] hover:bg-[#1066b1]/10 hover:border-[#1066b1]/50 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-2xl">photo_library</span>
              <span className="text-[10px] font-black uppercase tracking-widest">Choose Photo</span>
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400 font-medium">
            {uploading ? 'Uploading...' : 'Select a photo from your device'}
          </p>

          {/* Country + currency badges */}
          {(profile?.country || profile?.currency) && (
            <div className="mt-5 flex flex-wrap gap-2 justify-center">
              {profile.country && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#1066b1]/20 bg-[#1066b1]/5 px-3 py-1.5 text-xs font-black text-[#1066b1]">
                  <span className="material-icons-outlined text-[14px]">public</span>
                  {COUNTRY_NAMES[profile.country] ?? profile.country}
                </span>
              )}
              {profile.currency && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                  <span className="material-icons-outlined text-[14px]">payments</span>
                  {profile.currency}
                </span>
              )}
            </div>
          )}
        </section>

        {/* ── Right card: editable fields ── */}
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">

          {/* Personal Details */}
          <div>
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-[#1066b1]">Personal Details</p>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name</span>
                <input
                  value={profile?.name ?? ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="space-y-2">
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Email Address</span>
                <input
                  value={profile?.email ?? ''}
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500 outline-none"
                />
              </label>
              <div className="space-y-2">
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Phone</span>
                <div className="flex items-stretch gap-0 rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                  <select
                    value={phoneDialCode}
                    onChange={(e) => setPhoneDialCode(e.target.value)}
                    className="shrink-0 border-r border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black text-primary outline-none cursor-pointer"
                  >
                    {DIAL_CODES.map((d) => (
                      <option key={d.code} value={d.dialCode}>
                        {d.dialCode} ({d.code})
                      </option>
                    ))}
                  </select>
                  <input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="7123 456789"
                    className="flex-1 min-w-0 px-4 py-3 text-sm font-bold text-primary outline-none bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Regional Settings */}
          <div>
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-[#1066b1]">Regional Settings</p>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Country
                  <span className="ml-1 text-[9px] normal-case font-medium text-slate-400">(set at registration — cannot be changed)</span>
                </span>
                <div className="flex items-center gap-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-primary">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">lock</span>
                  {profile?.country
                    ? `${COUNTRY_NAMES[profile.country] ?? profile.country} (${profile.country})`
                    : <span className="text-slate-400 font-normal">Not set</span>}
                </div>
              </label>
              <label className="space-y-2">
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Currency
                  <span className="ml-1 text-[9px] normal-case font-medium text-slate-400">(auto-set by country)</span>
                </span>
                <div className="flex items-center gap-2">
                  <input
                    value={profile?.currency ?? ''}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none"
                    placeholder="Select a country above"
                  />
                  {profile?.currency && (
                    <span className="flex-shrink-0 rounded-lg bg-emerald-100 px-3 py-3 text-xs font-black text-emerald-700">
                      {profile.currency}
                    </span>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Company Details */}
          <div>
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-[#1066b1]">Company Details</p>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Company Name</span>
                <input
                  value={profile?.profile?.companyName ?? ''}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Company Address</span>
                <input
                  value={profile?.profile?.companyAddress ?? ''}
                  onChange={(e) => updateField('companyAddress', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="space-y-2">
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Organisation Number <span className="text-rose-500">*</span>
                </span>
                <input
                  value={profile?.profile?.organisationNumber ?? ''}
                  onChange={(e) => updateField('organisationNumber', e.target.value)}
                  placeholder="e.g. 12345678"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="block text-[10px] text-slate-400">Company registration / org number</span>
              </label>
              <label className="space-y-2">
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
                  VAT Number
                  <span className="ml-1 font-normal text-slate-400">(optional)</span>
                </span>
                <input
                  value={profile?.profile?.vatNumber ?? ''}
                  onChange={(e) => updateField('vatNumber', e.target.value)}
                  placeholder="e.g. GB123456789"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="block text-[10px] text-slate-400">Leave blank if not VAT registered</span>
              </label>
            </div>
          </div>

          {/* E-Signature */}
          <div>
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-[#1066b1]">E-Signature</p>
            <p className="mb-4 text-xs text-slate-500">
              Save your signature once — it will auto-fill whenever you need to sign a handover.
            </p>

            {esigSuccess && (
              <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                ✓ E-signature saved successfully.
              </div>
            )}

            {/* Saved signature preview */}
            {profile?.profile?.esignatureData && !showEsigDraw && (
              <div className="mb-4 overflow-hidden rounded-2xl border-2 border-[#1066b1]/30 bg-slate-50">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Saved Signature</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowEsigDraw(true); setEsigHasStrokes(false); }}
                      className="text-xs font-black text-[#1066b1] hover:underline"
                    >
                      Update
                    </button>
                    <button
                      onClick={() => void deleteEsignature()}
                      className="text-xs font-black text-rose-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <img
                  src={profile.profile.esignatureData}
                  alt="Your saved e-signature"
                  className="max-h-28 w-full object-contain p-4"
                />
              </div>
            )}

            {/* Canvas drawing area */}
            {(showEsigDraw || !profile?.profile?.esignatureData) && (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">
                  <canvas
                    ref={esigCanvasRef}
                    width={480}
                    height={160}
                    className="w-full cursor-crosshair touch-none"
                    onMouseDown={esigStartDraw}
                    onMouseMove={esigDraw}
                    onMouseUp={esigEndDraw}
                    onMouseLeave={esigEndDraw}
                    onTouchStart={esigStartDraw}
                    onTouchMove={esigDraw}
                    onTouchEnd={esigEndDraw}
                  />
                  {!esigHasStrokes && (
                    <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-300 select-none">
                      Draw your signature here
                    </p>
                  )}
                </div>

                {esigError && (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                    {esigError}
                  </p>
                )}

                <div className="flex gap-3">
                  {showEsigDraw && (
                    <button
                      onClick={() => { setShowEsigDraw(false); setEsigHasStrokes(false); }}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-black text-[#44474C] hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={esigClear}
                    disabled={esigSaving}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-black text-[#44474C] hover:bg-slate-50 disabled:opacity-50"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => void saveEsignature()}
                    disabled={esigSaving || !esigHasStrokes}
                    className="flex-[2] rounded-xl bg-[#1066b1] py-2.5 text-xs font-black text-white shadow-md shadow-[#1066b1]/20 hover:bg-[#0e57a0] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {esigSaving ? 'Saving…' : 'Save E-Signature'}
                  </button>
                </div>
              </div>
            )}

            {/* Button to draw new when no canvas shown yet but sig exists */}
            {!showEsigDraw && profile?.profile?.esignatureData && (
              <div /> // spacer — buttons already shown in preview header
            )}
          </div>

          <div className="flex items-center justify-end gap-4 border-t border-slate-100 pt-4">
            <button
              onClick={() => void saveProfile()}
              disabled={saving || loading}
              className="rounded-xl bg-primary px-6 py-3 text-xs font-black text-white shadow-md shadow-primary/20 transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
