import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Truck } from 'lucide-react';
import haulierService from '../../api/haulierService';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    address: '',
    password: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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

    setIsSubmitting(true);
    try {
      await haulierService.register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
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
          <p className="text-gray-500 text-sm mt-1">FreightFlex Logistics Portal</p>
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
            <label className="block text-sm font-semibold text-navy mb-2">Phone Number <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#1066b1] focus:ring-2 focus:ring-[#1066b1]/20 outline-none transition-all"
              placeholder="+44 7700 900000"
            />
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
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#1066b1] focus:ring-2 focus:ring-[#1066b1]/20 outline-none transition-all"
                placeholder="Min. 8 characters"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Confirm Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#1066b1] focus:ring-2 focus:ring-[#1066b1]/20 outline-none transition-all"
                placeholder="Repeat password"
                required
              />
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
