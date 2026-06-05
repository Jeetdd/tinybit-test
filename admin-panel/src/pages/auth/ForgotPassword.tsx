import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
          {sent ? (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Check your email</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                We sent a password reset link to<br />
                <span className="font-medium text-slate-700 dark:text-slate-200">{email}</span>
              </p>
              <Button variant="primary" className="w-full justify-center" onClick={() => navigate('/auth/login')}>
                Back to Login
              </Button>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center">
                  <Mail className="w-8 h-8 text-brand-600 dark:text-brand-400" />
                </div>
              </div>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Forgot Password?</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Enter your email and we'll send a reset link</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="admin@tinybit.care"
                    required
                  />
                </div>
                <Button variant="primary" type="submit" loading={loading} className="w-full justify-center py-2.5">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => navigate('/auth/login')}
                  className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
