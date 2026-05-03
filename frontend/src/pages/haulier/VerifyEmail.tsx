import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Truck } from 'lucide-react';
import haulierService from '../../api/haulierService';

const RESEND_COOLDOWN = 60;

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailFromQuery = searchParams.get('email') ?? '';

  const [email, setEmail] = useState(emailFromQuery);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const code = otp.join('');
    if (code.length < 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setIsSubmitting(true);
    try {
      await haulierService.verifyEmail({ email: email.trim().toLowerCase(), otp: code });
      setSuccess('Email verified! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message || err.response?.data?.detail;
        setError(msg || 'Verification failed. Check the code and try again.');
      } else {
        setError('Verification failed. Please try again.');
      }
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    if (!email.trim()) {
      setError('Enter your email first.');
      return;
    }
    setError('');
    setIsResending(true);
    try {
      await haulierService.resendOTP(email.trim().toLowerCase());
      setSuccess('A new code has been sent to your email.');
      setCooldown(RESEND_COOLDOWN);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to resend code.');
      } else {
        setError('Failed to resend code.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface w-full">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-navy p-3 rounded-full mb-4">
            <Truck className="text-amber" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-navy">Verify Your Email</h1>
          <p className="text-gray-500 text-sm mt-1 text-center">
            {email
              ? `Enter the 6-digit code sent to ${email}`
              : 'Enter your email and the 6-digit code we sent you'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!emailFromQuery && (
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-amber focus:ring-2 focus:ring-amber/20 outline-none transition-all"
                placeholder="your@email.com"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-navy mb-3 text-center">Verification Code</label>
            <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-black text-navy rounded-lg border-2 border-gray-200 focus:border-amber focus:ring-2 focus:ring-amber/20 outline-none transition-all"
                />
              ))}
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              {success}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-navy text-white font-bold py-3 rounded-lg hover:bg-navy/90 transition-colors shadow-md disabled:opacity-60"
          >
            {isSubmitting ? 'Verifying...' : 'Verify Email'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={cooldown > 0 || isResending}
              className="text-sm font-semibold text-navy hover:underline disabled:opacity-40 disabled:no-underline"
            >
              {isResending
                ? 'Sending...'
                : cooldown > 0
                ? `Resend code in ${cooldown}s`
                : "Didn't receive a code? Resend"}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-500">
            <Link to="/login" className="font-semibold text-navy hover:underline">
              ← Back to Sign In
            </Link>
          </p>
          <p className="text-sm text-gray-500">
            Need an account?{' '}
            <Link to="/register" className="font-semibold text-navy hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
