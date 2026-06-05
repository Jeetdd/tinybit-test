import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield, ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui';

export function Login() {
  const { login, requiresTwoFactor } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@tinybit.care');
  const [password, setPassword] = useState('Admin@123');
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const ok = await login(email, password);
      if (!ok) setError('Invalid credentials. Try admin@tinybit.care / Admin@123');
      else if (requiresTwoFactor) navigate('/auth/2fa');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-brand-600 to-teal-600" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full bg-teal-300 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-brand-300 blur-3xl" />
        </div>
        <div className="relative flex flex-col justify-between p-12 text-white w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <span className="font-bold text-lg">TB</span>
            </div>
            <div>
              <p className="font-bold text-lg leading-none">TinyBit</p>
              <p className="text-xs opacity-70 font-medium">Admin Console</p>
            </div>
          </div>

          {/* Hero content */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm font-medium mb-6">
              <Shield className="w-3.5 h-3.5" />
              Enterprise-grade Elder Care Management
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-4">
              Manage Elder Care<br />at Scale
            </h1>
            <p className="text-lg opacity-80 max-w-sm leading-relaxed">
              Comprehensive platform for monitoring health, managing medicines, responding to emergencies, and tracking wellness in real time.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Elders Monitored', value: '2,847' },
              { label: 'Active Guardians', value: '2,891' },
              { label: 'SOS Response', value: '<3 min' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs opacity-70 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-teal-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">TB</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-white">TinyBit Admin</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">Sign in to your admin account to continue</p>
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
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                <button type="button" onClick={() => navigate('/auth/forgot-password')} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                Remember me for 30 days
              </label>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <Lock className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <Button
              variant="primary"
              type="submit"
              loading={loading}
              className="w-full justify-center py-2.5"
              iconRight={!loading ? <ArrowRight className="w-4 h-4" /> : undefined}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-brand-500" /> Demo Credentials
            </p>
            <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <p><span className="text-slate-700 dark:text-slate-300">Email:</span> admin@tinybit.care</p>
              <p><span className="text-slate-700 dark:text-slate-300">Password:</span> Admin@123</p>
              <p><span className="text-slate-700 dark:text-slate-300">OTP:</span> Any 6-digit code</p>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Protected by 256-bit SSL encryption & 2FA
          </p>
        </div>
      </div>
    </div>
  );
}
