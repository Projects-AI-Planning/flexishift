import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, Truck } from 'lucide-react';
import haulierService from '../../api/haulierService';

const COUNTRIES = [
  { flag: '🇬🇧', name: 'United Kingdom',  code: '+44',  currency: 'GBP' },
  { flag: '🇺🇸', name: 'United States',   code: '+1',   currency: 'USD' },
  { flag: '🇨🇦', name: 'Canada',          code: '+1',   currency: 'CAD' },
  { flag: '🇮🇳', name: 'India',           code: '+91',  currency: 'INR' },
  { flag: '🇵🇰', name: 'Pakistan',        code: '+92',  currency: 'PKR' },
  { flag: '🇧🇩', name: 'Bangladesh',      code: '+880', currency: 'BDT' },
  { flag: '🇳🇬', name: 'Nigeria',         code: '+234', currency: 'NGN' },
  { flag: '🇬🇭', name: 'Ghana',           code: '+233', currency: 'GHS' },
  { flag: '🇿🇦', name: 'South Africa',    code: '+27',  currency: 'ZAR' },
  { flag: '🇵🇱', name: 'Poland',          code: '+48',  currency: 'PLN' },
  { flag: '🇷🇴', name: 'Romania',         code: '+40',  currency: 'RON' },
  { flag: '🇧🇬', name: 'Bulgaria',        code: '+359', currency: 'BGN' },
  { flag: '🇱🇹', name: 'Lithuania',       code: '+370', currency: 'EUR' },
  { flag: '🇱🇻', name: 'Latvia',          code: '+371', currency: 'EUR' },
  { flag: '🇩🇪', name: 'Germany',         code: '+49',  currency: 'EUR' },
  { flag: '🇫🇷', name: 'France',          code: '+33',  currency: 'EUR' },
  { flag: '🇮🇪', name: 'Ireland',         code: '+353', currency: 'EUR' },
  { flag: '🇳🇱', name: 'Netherlands',     code: '+31',  currency: 'EUR' },
  { flag: '🇧🇪', name: 'Belgium',         code: '+32',  currency: 'EUR' },
  { flag: '🇪🇸', name: 'Spain',           code: '+34',  currency: 'EUR' },
  { flag: '🇮🇹', name: 'Italy',           code: '+39',  currency: 'EUR' },
  { flag: '🇵🇹', name: 'Portugal',        code: '+351', currency: 'EUR' },
  { flag: '🇺🇦', name: 'Ukraine',         code: '+380', currency: 'UAH' },
  { flag: '🇵🇭', name: 'Philippines',     code: '+63',  currency: 'PHP' },
  { flag: '🇦🇺', name: 'Australia',       code: '+61',  currency: 'AUD' },
  { flag: '🇸🇬', name: 'Singapore',       code: '+65',  currency: 'SGD' },
  { flag: '🇦🇪', name: 'UAE',             code: '+971', currency: 'AED' },
  { flag: '🇸🇦', name: 'Saudi Arabia',    code: '+966', currency: 'SAR' },
];

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', companyName: '', address: '', password: '', confirmPassword: '' });
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [localPhone, setLocalPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = COUNTRIES.find(c => c.name === e.target.value) ?? COUNTRIES[0];
    setSelectedCountry(found);
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
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(form.password)) { setError('Password must contain an uppercase letter.'); return; }
    if (!/\d/.test(form.password)) { setError('Password must contain a digit.'); return; }

    setIsSubmitting(true);
    try {
      await haulierService.register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: `${selectedCountry.code}${phoneDigits}`,
        currency: selectedCountry.currency,
        companyName: form.companyName.trim() || undefined,
        address: form.address.trim() || undefined,
        password: form.password,
        role: 'HAULIER',
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
              <label className="block text-sm font-semibold text-navy mb-2">Full Name</label>
              <input type="text" value={form.name} onChange={set('name')} className={inputCls} placeholder="John Smith" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Company Name</label>
              <input type="text" value={form.companyName} onChange={set('companyName')} className={inputCls} placeholder="Smith Haulage Ltd" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-2">Email Address</label>
            <input type="email" value={form.email} onChange={set('email')} className={inputCls} placeholder="john@smithhaulage.com" required />
          </div>

          {/* Country selector — drives currency */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-2">Country</label>
            <select
              value={selectedCountry.name}
              onChange={handleCountryChange}
              className={inputCls}
            >
              {COUNTRIES.map(c => (
                <option key={c.name} value={c.name}>
                  {c.flag}  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Phone — local number only, dial code from country */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-2">Phone Number</label>
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
            <label className="block text-sm font-semibold text-navy mb-2">Address</label>
            <input type="text" value={form.address} onChange={set('address')} className={inputCls} placeholder="123 Logistics Park, Manchester" required />
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Password</label>
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
              <label className="block text-sm font-semibold text-navy mb-2">Confirm Password</label>
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
