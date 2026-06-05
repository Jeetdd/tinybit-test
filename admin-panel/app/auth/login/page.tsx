'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('admin@tinybit.care');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const ok = await login(email, password);
      if (ok) {
        router.replace('/auth/2fa');
      } else {
        setError('Invalid email or password. Try admin@tinybit.care / Admin@123');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-brand-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-teal-500 flex items-center justify-center shadow-2xl mb-4">
            <span className="text-white font-bold text-2xl">TB</span>
          </div>
          <h1 className="text-2xl font-bold text-white">TinyBit Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Elder Care Management Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Welcome back</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Sign in to your admin account</p>

          {error && (
            <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-5 text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@tinybit.care"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-10"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 rounded text-brand-600" defaultChecked />
                <span className="text-xs text-slate-600 dark:text-slate-400">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => router.push('/auth/forgot-password')}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <div className="mt-5 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-1">Demo Credentials</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">Email: <span className="font-mono">admin@tinybit.care</span></p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">Password: <span className="font-mono">Admin@123</span></p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          © 2026 TinyBit. All rights reserved. v2.0.0
        </p>
      </div>
    </div>
  );
}
