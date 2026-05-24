import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, Truck } from 'lucide-react';
import haulierService from '../../api/haulierService';

const DIAL_CODES = [
  { flag: '🇬🇧', name: 'UK',           code: '+44',  currency: 'GBP' },
  { flag: '🇺🇸', name: 'US',           code: '+1',   currency: 'USD' },
  { flag: '🇮🇳', name: 'India',        code: '+91',  currency: 'INR' },
  { flag: '🇵🇰', name: 'Pakistan',     code: '+92',  currency: 'PKR' },
  { flag: '🇧🇩', name: 'Bangladesh',   code: '+880', currency: 'BDT' },
  { flag: '🇳🇬', name: 'Nigeria',      code: '+234', currency: 'NGN' },
  { flag: '🇬🇭', name: 'Ghana',        code: '+233', currency: 'GHS' },
  { flag: '🇿🇦', name: 'South Africa', code: '+27',  currency: 'ZAR' },
  { flag: '🇵🇱', name: 'Poland',       code: '+48',  currency: 'PLN' },
  { flag: '🇷🇴', name: 'Romania',      code: '+40',  currency: 'RON' },
  { flag: '🇧🇬', name: 'Bulgaria',     code: '+359', currency: 'BGN' },
  { flag: '🇱🇹', name: 'Lithuania',    code: '+370', currency: 'EUR' },
  { flag: '🇱🇻', name: 'Latvia',       code: '+371', currency: 'EUR' },
  { flag: '🇩🇪', name: 'Germany',      code: '+49',  currency: 'EUR' },
  { flag: '🇫🇷', name: 'France',       code: '+33',  currency: 'EUR' },
  { flag: '🇮🇪', name: 'Ireland',      code: '+353', currency: 'EUR' },
  { flag: '🇳🇱', name: 'Netherlands',  code: '+31',  currency: 'EUR' },
  { flag: '🇧🇪', name: 'Belgium',      code: '+32',  currency: 'EUR' },
  { flag: '🇪🇸', name: 'Spain',        code: '+34',  currency: 'EUR' },
  { flag: '🇮🇹', name: 'Italy',        code: '+39',  currency: 'EUR' },
  { flag: '🇵🇹', name: 'Portugal',     code: '+351', currency: 'EUR' },
  { flag: '🇺🇦', name: 'Ukraine',      code: '+380', currency: 'UAH' },
  { flag: '🇵🇭', name: 'Philippines',  code: '+63',  currency: 'PHP' },
  { flag: '🇦🇺', name: 'Australia',    code: '+61',  currency: 'AUD' },
  { flag: '🇸🇬', name: 'Singapore',    code: '+65',  currency: 'SGD' },
  { flag: '🇦🇪', name: 'UAE',          code: '+971', currency: 'AED' },
  { flag: '🇸🇦', name: 'Saudi Arabia', code: '+966', currency: 'SAR' },
];

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    companyName: '',
    address: '',
    password: '',
    confirmPassword: '',
  });
  const [selectedDial, setSelectedDial] = useState(DIAL_CODES[0]);
  const dialCode = selectedDial.code;
  const [localPhone, setLocalPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const getRegistrationError = (err: unknown) => {
    if (!axios.isAxiosError(err)) {
      return 'Registration failed. Please try again.';
    }

    const data = err.response?.data;
    const fieldErrors = data?.data?.errors;
    if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
      return fieldErrors
        .map((item) => item?.message)
        .filter(Boolean)
        .join('. ');
    }

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
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(form.password)) {
      setError('Password must contain an uppercase letter.');
      return;
    }
    if (!/\d/.test(form.password)) {
      setError('Password must contain a digit.');
      return;
    }

    const fullPhone = `${dialCode}${phoneDigits}`;

    setIsSubmitting(true);
    try {
      await haulierService.register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: fullPhone,
        currency: selectedDial.currency,
        companyName: form.companyName.trim() || undefined,
        address: form.address.trim() || undefined,
        password: form.password,
        role: 'HAULIER',
      });
      const email = form.email.trim().toLowerCase();
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(getRegistrationError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface w-full py-10">
      <div className="bg-white p-5 sm:p-8 rounded-xl shadow-lg border border-gray-100 w-full max-w-lg">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-navy p-3 rounded-full mb-4">
            <Truck className="text-[#1066b1]" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-navy">Create Haulier Account</h1>
          <p className="text-gray-500 text-sm mt-1">FlexiShift Logistics Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#1066b1] focus:ring-2 focus:ring-[#1066b1]/20 outline-none transition-all"
                placeholder="John Smith"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Company Name</label>
              <input
                type="text"
                value={form.companyName}
                onChange={set('companyName')}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#1066b1] focus:ring-2 focus:ring-[#1066b1]/20 outline-none transition-all"
                placeholder="Smith Haulage Ltd"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-navy mb-2">Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#1066b1] focus:ring-2 focus:ring-[#1066b1]/20 outline-none transition-all"
              placeholder="john@smithhaulage.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-navy mb-2">Phone Number</label>
            <div className="flex rounded-lg border border-gray-200 focus-within:border-[#1066b1] focus-within:ring-2 focus-within:ring-[#1066b1]/20 transition-all overflow-hidden">
              <select
                value={dialCode}
                onChange={e => {
                  const found = DIAL_CODES.find(c => c.code === e.target.value) ?? DIAL_CODES[0];
                  setSelectedDial(found);
                }}
                className="bg-gray-50 border-r border-gray-200 px-3 py-3 text-sm font-semibold text-navy outline-none cursor-pointer shrink-0"
                style={{minWidth: '120px'}}
              >
                {DIAL_CODES.map(c => (
                  <option key={c.name + c.code} value={c.code}>
                    {c.flag} {c.name} ({c.code})
                  </option>
                ))}
              </select>
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
                Full number: {dialCode}{localPhone.replace(/\D/g, '')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-navy mb-2">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={set('address')}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#1066b1] focus:ring-2 focus:ring-[#1066b1]/20 outline-none transition-all"
              placeholder="123 Logistics Park, Manchester, M1 1AB"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  className="w-full px-4 py-3 pr-11 rounded-lg border border-gray-200 focus:border-[#1066b1] focus:ring-2 focus:ring-[#1066b1]/20 outline-none transition-all"
                  placeholder="Min. 8 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  className="w-full px-4 py-3 pr-11 rounded-lg border border-gray-200 focus:border-[#1066b1] focus:ring-2 focus:ring-[#1066b1]/20 outline-none transition-all"
                  placeholder="Repeat password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-navy text-white font-bold py-3 rounded-lg hover:bg-navy/90 transition-colors shadow-md disabled:opacity-60"
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-navy hover:underline">
              Sign In
            </Link>
          </p>
          <p className="text-sm text-gray-500">
            Registered but not verified?{' '}
            <Link to="/verify-email" className="font-semibold text-navy hover:underline">
              Verify Email
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
