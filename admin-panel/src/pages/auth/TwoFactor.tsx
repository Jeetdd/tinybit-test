import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, RefreshCw, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui';

export function TwoFactor() {
  const { verifyOtp, requiresTwoFactor } = useAuth();
  const navigate = useNavigate();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const refs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));

  useEffect(() => {
    if (!requiresTwoFactor) navigate('/auth/login');
  }, [requiresTwoFactor]);

  useEffect(() => {
    refs[0].current?.focus();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');
    if (value && index < 5) refs[index + 1].current?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) refs[index - 1].current?.focus();
    if (e.key === 'ArrowRight' && index < 5) refs[index + 1].current?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(''));
      refs[5].current?.focus();
    }
  }

  async function handleVerify() {
    const code = otp.join('');
    if (code.length !== 6) { setError('Please enter the 6-digit OTP'); return; }
    setLoading(true);
    setError('');
    try {
      const ok = await verifyOtp(code);
      if (ok) navigate('/');
      else setError('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    await new Promise(r => setTimeout(r, 1000));
    setResending(false);
    setCountdown(30);
    setOtp(['', '', '', '', '', '']);
    refs[0].current?.focus();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-brand-600 dark:text-brand-400" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Two-Factor Authentication</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
              Enter the 6-digit code sent to<br />
              <span className="font-medium text-slate-700 dark:text-slate-200">+91 ••••• •3210</span>
            </p>
          </div>

          {/* OTP Input */}
          <div className="flex gap-2.5 justify-center mb-6">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={refs[i]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={handlePaste}
                className={`w-11 h-12 text-center text-lg font-bold rounded-xl border-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none transition-all ${
                  error ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-brand-500 dark:focus:border-brand-400'
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-center text-sm text-red-500 mb-4">{error}</p>
          )}

          <Button
            variant="primary"
            loading={loading}
            onClick={handleVerify}
            className="w-full justify-center py-2.5 mb-4"
          >
            {loading ? 'Verifying...' : 'Verify & Sign In'}
          </Button>

          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Resend OTP in <span className="font-semibold text-slate-700 dark:text-slate-200">{countdown}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1.5 mx-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                {resending ? 'Resending...' : 'Resend OTP'}
              </button>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-center">
            <button
              onClick={() => navigate('/auth/login')}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
