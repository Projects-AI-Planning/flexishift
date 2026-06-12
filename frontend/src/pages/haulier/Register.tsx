import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, Truck } from 'lucide-react';
import haulierService from '../../api/haulierService';

const COUNTRIES = [
  { flag: '🇬🇧', name: 'United Kingdom',  iso: 'GB', code: '+44',  currency: 'GBP' },
  { flag: '🇺🇸', name: 'United States',   iso: 'US', code: '+1',   currency: 'USD' },
  { flag: '🇨🇦', name: 'Canada',          iso: 'CA', code: '+1',   currency: 'CAD' },
  { flag: '🇮🇳', name: 'India',           iso: 'IN', code: '+91',  currency: 'INR' },
  { flag: '🇵🇰', name: 'Pakistan',        iso: 'PK', code: '+92',  currency: 'PKR' },
  { flag: '🇧🇩', name: 'Bangladesh',      iso: 'BD', code: '+880', currency: 'BDT' },
  { flag: '🇳🇬', name: 'Nigeria',         iso: 'NG', code: '+234', currency: 'NGN' },
  { flag: '🇬🇭', name: 'Ghana',           iso: 'GH', code: '+233', currency: 'GHS' },
  { flag: '🇿🇦', name: 'South Africa',    iso: 'ZA', code: '+27',  currency: 'ZAR' },
  { flag: '🇵🇱', name: 'Poland',          iso: 'PL', code: '+48',  currency: 'PLN' },
  { flag: '🇷🇴', name: 'Romania',         iso: 'RO', code: '+40',  currency: 'RON' },
  { flag: '🇧🇬', name: 'Bulgaria',        iso: 'BG', code: '+359', currency: 'BGN' },
  { flag: '🇱🇹', name: 'Lithuania',       iso: 'LT', code: '+370', currency: 'EUR' },
  { flag: '🇱🇻', name: 'Latvia',          iso: 'LV', code: '+371', currency: 'EUR' },
  { flag: '🇩🇪', name: 'Germany',         iso: 'DE', code: '+49',  currency: 'EUR' },
  { flag: '🇫🇷', name: 'France',          iso: 'FR', code: '+33',  currency: 'EUR' },
  { flag: '🇮🇪', name: 'Ireland',         iso: 'IE', code: '+353', currency: 'EUR' },
  { flag: '🇳🇱', name: 'Netherlands',     iso: 'NL', code: '+31',  currency: 'EUR' },
  { flag: '🇧🇪', name: 'Belgium',         iso: 'BE', code: '+32',  currency: 'EUR' },
  { flag: '🇪🇸', name: 'Spain',           iso: 'ES', code: '+34',  currency: 'EUR' },
  { flag: '🇮🇹', name: 'Italy',           iso: 'IT', code: '+39',  currency: 'EUR' },
  { flag: '🇵🇹', name: 'Portugal',        iso: 'PT', code: '+351', currency: 'EUR' },
  { flag: '🇺🇦', name: 'Ukraine',         iso: 'UA', code: '+380', currency: 'UAH' },
  { flag: '🇵🇭', name: 'Philippines',     iso: 'PH', code: '+63',  currency: 'PHP' },
  { flag: '🇦🇺', name: 'Australia',       iso: 'AU', code: '+61',  currency: 'AUD' },
  { flag: '🇸🇬', name: 'Singapore',       iso: 'SG', code: '+65',  currency: 'SGD' },
  { flag: '🇦🇪', name: 'UAE',             iso: 'AE', code: '+971', currency: 'AED' },
  { flag: '🇸🇦', name: 'Saudi Arabia',    iso: 'SA', code: '+966', currency: 'SAR' },
  { flag: '🇳🇴', name: 'Norway',          iso: 'NO', code: '+47',  currency: 'NOK' },
  { flag: '🇸🇪', name: 'Sweden',          iso: 'SE', code: '+46',  currency: 'SEK' },
];

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', companyName: '', address: '',
    password: '', confirmPassword: '',
    vatNumber: '', organisationNumber: '',
  });
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [localPhone, setLocalPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // E-Signature state
  const esigCanvasRef = useRef<HTMLCanvasElement>(null);
  const esigDrawing = useRef(false);
  const esigLastPoint = useRef<{ x: number; y: number } | null>(null);
  const [esigHasStrokes, setEsigHasStrokes] = useState(false);
  const [orgDocFile, setOrgDocFile] = useState<File | null>(null);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = COUNTRIES.find(c => c.name === e.target.value) ?? COUNTRIES[0];
    setSelectedCountry(found);
  };

  // ── E-Signature helpers ────────────────────────────────────────────────
  const esigGetPos = (e: React.MouseEvent | React.TouchEvent) => {
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

  const getRegistrationError = (err: unknown) => {
    if (!axios.isAxiosError(err)) return 'Registration failed. Please try again.';
    const data = err.response?.data;
    const fieldErrors = data?.data?.errors;
    if (Array.isArray(fieldErrors) && fieldErrors.length > 0)
      return fieldErrors.map((i: { message?: string }) => i?.message).filter(Boolean).join('. ');
    return data?.message || data?.detail || 'Registration failed. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const phoneDigits = localPhone.replace(/\D/g, '');
    if (phoneDigits.length < 6 || phoneDigits.length > 12) {
      setError('Enter a valid local phone number (6–12 digits after the country code).');
      return;
    }
    if (!form.organisationNumber.trim()) {
      setError('Organisation Number is required.');
      return;
    }
    if (!esigHasStrokes) {
      setError('Please draw your e-signature before registering.');
      return;
    }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(form.password)) { setError('Password must contain an uppercase letter.'); return; }
    if (!/\d/.test(form.password)) { setError('Password must contain a digit.'); return; }

    const esignatureData = esigCanvasRef.current!.toDataURL('image/png');

    setIsSubmitting(true);
    try {
      // Optional: upload the organisation registration document first, then pass its URL.
      let organisationDocUrl: string | undefined;
      if (orgDocFile) {
        try {
          const fd = new FormData();
          fd.append('file', orgDocFile);
          const res = await haulierService.uploadOrganisationDocument(fd);
          organisationDocUrl = res?.fileUrl;
        } catch {
          setError('Failed to upload the organisation document. Please try again or remove it.');
          setIsSubmitting(false);
          return;
        }
      }
      await haulierService.register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: `${selectedCountry.code}${phoneDigits}`,
        country: selectedCountry.iso,
        currency: selectedCountry.currency,
        companyName: form.companyName.trim() || undefined,
        address: form.address.trim() || undefined,
        password: form.password,
        role: 'HAULIER',
        organisationNumber: form.organisationNumber.trim(),
        vatNumber: form.vatNumber.trim() || undefined,
        esignatureData,
        organisationDocUrl,
      });
      navigate(`/verify-email?email=${encodeURIComponent(form.email.trim().toLowerCase())}`);
    } catch (err) {
      setError(getRegistrationError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = 'w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#1066b1] focus:ring-2 focus:ring-[#1066b1]/20 outline-none transition-all text-sm';

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface w-full py-10">
      <div className="bg-white p-5 sm:p-8 rounded-xl shadow-lg border border-gray-100 w-full max-w-lg">

        <div className="flex flex-col items-center mb-8">
          <div className="bg-navy p-3 rounded-full mb-4">
            <Truck className="text-[#1066b1]" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-navy">Create Haulier Account</h1>
          <p className="text-gray-500 text-sm mt-1">FreightFlex Logistics Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Name + Company */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Full Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={set('name')} className={inputCls} placeholder="John Smith" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Company Name</label>
              <input type="text" value={form.companyName} onChange={set('companyName')} className={inputCls} placeholder="Smith Haulage Ltd" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-2">Email Address <span className="text-red-500">*</span></label>
            <input type="email" value={form.email} onChange={set('email')} className={inputCls} placeholder="john@smithhaulage.com" required />
          </div>

          {/* Country selector */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-2">Country</label>
            <select value={selectedCountry.name} onChange={handleCountryChange} className={inputCls}>
              {COUNTRIES.map(c => (
                <option key={c.name} value={c.name}>{c.flag}  {c.name}</option>
              ))}
            </select>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-2">Phone Number <span className="text-red-500">*</span></label>
            <div className="flex rounded-lg border border-gray-200 focus-within:border-[#1066b1] focus-within:ring-2 focus-within:ring-[#1066b1]/20 transition-all overflow-hidden">
              <div className="bg-gray-50 border-r border-gray-200 px-3 py-3 text-sm font-semibold text-navy shrink-0 flex items-center gap-1.5">
                <span>{selectedCountry.flag}</span>
                <span>{selectedCountry.code}</span>
              </div>
              <input
                type="tel"
                value={localPhone}
                onChange={e => setLocalPhone(e.target.value.replace(/[^\d\s\-]/g, ''))}
                className="flex-1 px-4 py-3 outline-none text-sm"
                placeholder="Local number"
                required
              />
            </div>
            {localPhone.replace(/\D/g, '').length > 0 && (
              <p className="text-xs text-[#1066b1] font-semibold mt-1 ml-1">
                Full: {selectedCountry.code}{localPhone.replace(/\D/g, '')}
              </p>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-2">Address <span className="text-red-500">*</span></label>
            <input type="text" value={form.address} onChange={set('address')} className={inputCls} placeholder="123 Logistics Park, Manchester" required />
          </div>

          {/* Organisation Number + VAT Number */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">
                Organisation Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.organisationNumber}
                onChange={set('organisationNumber')}
                className={inputCls}
                placeholder="e.g. 12345678"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Company registration / org number</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">
                VAT Number
                <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={form.vatNumber}
                onChange={set('vatNumber')}
                className={inputCls}
                placeholder="e.g. GB123456789"
              />
              <p className="text-xs text-gray-400 mt-1">Leave blank if not VAT registered</p>
            </div>
          </div>

          {/* Organisation Registration Document (optional) */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-2">
              Organisation Registration Document
              <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
            </label>
            {orgDocFile ? (
              <div className="flex items-center justify-between rounded-lg border border-[#1066b1]/30 bg-[#1066b1]/5 px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-medium text-navy truncate">
                  <span className="material-symbols-outlined text-[18px] text-[#1066b1]">description</span>
                  <span className="truncate">{orgDocFile.name}</span>
                </span>
                <button type="button" onClick={() => setOrgDocFile(null)} className="ml-3 shrink-0 text-xs font-bold text-red-500 hover:text-red-700">
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-[#1066b1] hover:bg-slate-50 transition-colors">
                <span className="material-symbols-outlined text-[18px] text-gray-400">upload_file</span>
                Upload your organisation registration document
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setOrgDocFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
            <p className="text-xs text-gray-400 mt-1">PDF or image. Optional — if added, it will be sent to admin for verification.</p>
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')}
                  className={`${inputCls} pr-11`} placeholder="Min. 8 characters" required />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Confirm Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type={showConfirmPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={set('confirmPassword')}
                  className={`${inputCls} pr-11`} placeholder="Repeat password" required />
                <button type="button" onClick={() => setShowConfirmPassword(v => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* E-Signature — mandatory */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-1">
              E-Signature <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Draw your signature below. This will be used for handover sign-offs and can be updated later in your profile.
            </p>

            <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 focus-within:border-[#1066b1]">
              <canvas
                ref={esigCanvasRef}
                width={480}
                height={140}
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
                <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-300 select-none">
                  Draw your signature here
                </p>
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              {esigHasStrokes ? (
                <span className="text-xs font-semibold text-emerald-600">✓ Signature drawn</span>
              ) : (
                <span className="text-xs text-red-400">Signature required</span>
              )}
              <button
                type="button"
                onClick={esigClear}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Terms notice */}
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500">
            By creating an account you agree to the{' '}
            <Link to="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1066b1] hover:underline">
              Terms &amp; Conditions
            </Link>.
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
          )}

          <button type="submit" disabled={isSubmitting}
            className="w-full bg-navy text-white font-bold py-3 rounded-lg hover:bg-navy/90 transition-colors shadow-md disabled:opacity-60">
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-navy hover:underline">Sign In</Link>
          </p>
          <p className="text-sm text-gray-500">
            Registered but not verified?{' '}
            <Link to="/verify-email" className="font-semibold text-navy hover:underline">Verify Email</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
