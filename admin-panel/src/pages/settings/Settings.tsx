import React, { useState } from 'react';
import { Settings as SettingsIcon, Globe, Palette, Key, Bell, Shield, Moon, Sun, Check, Copy, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Card, Button, Badge, Tabs, Input, Select, cn } from '../../components/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

const API_KEYS = [
  { id: 'openai', name: 'OpenAI API Key', key: 'sk-••••••••••••••••••••••••••••••Xk9Z', status: 'active', lastUsed: '2 min ago' },
  { id: 'supabase', name: 'Supabase Anon Key', key: 'eyJ••••••••••••••••••••••••••••••Abc', status: 'active', lastUsed: '5 min ago' },
  { id: 'maps', name: 'Google Maps API Key', key: 'AIza••••••••••••••••••••••••••••', status: 'inactive', lastUsed: 'Never' },
];

const LANGUAGES = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'hi', label: 'हिंदी (Hindi)', flag: '🇮🇳' },
  { value: 'gu', label: 'ગુજરાતી (Gujarati)', flag: '🇮🇳' },
  { value: 'ta', label: 'தமிழ் (Tamil)', flag: '🇮🇳' },
  { value: 'bn', label: 'বাংলা (Bengali)', flag: '🇮🇳' },
  { value: 'mr', label: 'मराठी (Marathi)', flag: '🇮🇳' },
];

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [tab, setTab] = useState('general');
  const [saved, setSaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<string | null>(null);

  const [generalForm, setGeneralForm] = useState({
    appName: 'TinyBit',
    supportEmail: 'support@tinybit.care',
    timezone: 'Asia/Kolkata',
    language: 'en',
    maintenanceMode: false,
    twoFactorRequired: true,
    sessionTimeout: '8',
  });

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'language', label: 'Language' },
    { id: 'api', label: 'API Keys' },
    { id: 'security', label: 'Security' },
    { id: 'notifications', label: 'Alerts' },
  ];

  async function handleSave() {
    await new Promise(r => setTimeout(r, 600));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function copyKey(id: string, key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage platform configuration and preferences</p>
        </div>
        <Button variant="primary" icon={saved ? <Check className="w-4 h-4" /> : <SettingsIcon className="w-4 h-4" />} onClick={handleSave}>
          {saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>

      <Card noPadding>
        <div className="px-6 pt-4 border-b border-slate-100 dark:border-slate-800">
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
        </div>
        <div className="p-6">

          {/* General Settings */}
          {tab === 'general' && (
            <div className="max-w-2xl space-y-5">
              <Input label="Application Name" value={generalForm.appName} onChange={e => setGeneralForm(p => ({ ...p, appName: e.target.value }))} />
              <Input label="Support Email" type="email" value={generalForm.supportEmail} onChange={e => setGeneralForm(p => ({ ...p, supportEmail: e.target.value }))} />
              <Select
                label="Timezone"
                value={generalForm.timezone}
                onChange={e => setGeneralForm(p => ({ ...p, timezone: e.target.value }))}
                options={[
                  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+5:30)' },
                  { value: 'UTC', label: 'UTC' },
                  { value: 'America/New_York', label: 'America/New_York (EST)' },
                ]}
              />
              <Select
                label="Session Timeout"
                value={generalForm.sessionTimeout}
                onChange={e => setGeneralForm(p => ({ ...p, sessionTimeout: e.target.value }))}
                options={[
                  { value: '1', label: '1 hour' },
                  { value: '4', label: '4 hours' },
                  { value: '8', label: '8 hours' },
                  { value: '24', label: '24 hours' },
                ]}
              />
              <div className="space-y-3 pt-2">
                {[
                  { key: 'maintenanceMode', label: 'Maintenance Mode', desc: 'Temporarily disable app access for users' },
                  { key: 'twoFactorRequired', label: 'Require 2FA for Admins', desc: 'Enforce two-factor authentication for all admin logins' },
                ].map(toggle => (
                  <div key={toggle.key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{toggle.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{toggle.desc}</p>
                    </div>
                    <button
                      onClick={() => setGeneralForm(p => ({ ...p, [toggle.key]: !p[toggle.key as keyof typeof p] }))}
                      className={cn('relative w-10 h-5.5 rounded-full transition-colors', (generalForm as Record<string, unknown>)[toggle.key] ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600')}
                      style={{ height: '22px' }}
                    >
                      <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', (generalForm as Record<string, unknown>)[toggle.key] ? 'translate-x-5' : 'translate-x-0.5')} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Appearance */}
          {tab === 'appearance' && (
            <div className="max-w-xl space-y-6">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Color Theme</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'light', label: 'Light Mode', icon: <Sun className="w-5 h-5" />, desc: 'Clean white interface' },
                    { id: 'dark', label: 'Dark Mode', icon: <Moon className="w-5 h-5" />, desc: 'Easy on the eyes at night' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => t.id !== theme && toggleTheme()}
                      className={cn(
                        'flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all',
                        theme === t.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      )}
                    >
                      <div className={cn('p-2 rounded-lg', theme === t.id ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500')}>
                        {t.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{t.label}</p>
                        <p className="text-xs text-slate-500">{t.desc}</p>
                      </div>
                      {theme === t.id && <Check className="w-4 h-4 text-brand-600 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Accent Color</p>
                <div className="flex items-center gap-3">
                  {['#0284c7', '#0d9488', '#6366f1', '#059669', '#dc2626', '#7c3aed'].map(color => (
                    <button key={color} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 shadow transition-transform hover:scale-110" style={{ background: color }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Language */}
          {tab === 'language' && (
            <div className="max-w-xl">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Select the default language for the admin panel and notifications</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.value}
                    onClick={() => setGeneralForm(p => ({ ...p, language: lang.value }))}
                    className={cn(
                      'flex items-center gap-2.5 p-3.5 rounded-xl border-2 text-left transition-all',
                      generalForm.language === lang.value ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    )}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{lang.label}</span>
                    {generalForm.language === lang.value && <Check className="w-4 h-4 text-brand-600 ml-auto" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* API Keys */}
          {tab === 'api' && (
            <div className="max-w-2xl space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Manage API keys for external service integrations</p>
              {API_KEYS.map(apiKey => (
                <div key={apiKey.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm text-slate-900 dark:text-white">{apiKey.name}</p>
                      <Badge variant={apiKey.status === 'active' ? 'success' : 'default'} dot>{apiKey.status}</Badge>
                    </div>
                    <code className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {showKey === apiKey.id ? apiKey.key : apiKey.key.replace(/[^•]/g, '•').slice(0, 32) + '••••'}
                    </code>
                    <p className="text-[10px] text-slate-400 mt-1">Last used: {apiKey.lastUsed}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setShowKey(s => s === apiKey.id ? null : apiKey.id)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                      {showKey === apiKey.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => copyKey(apiKey.id, apiKey.key)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                      {copiedKey === apiKey.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <Button variant="secondary" icon={<Key className="w-4 h-4" />} size="sm">Add New API Key</Button>
            </div>
          )}

          {/* Security */}
          {tab === 'security' && (
            <div className="max-w-xl space-y-4">
              {[
                { label: 'Two-Factor Authentication', desc: 'Current admin requires OTP on every login', enabled: true, icon: <Shield className="w-5 h-5" /> },
                { label: 'IP Whitelist', desc: 'Restrict admin access to specific IP ranges', enabled: false, icon: <Shield className="w-5 h-5" /> },
                { label: 'Login Notifications', desc: 'Email alert on every admin login', enabled: true, icon: <Bell className="w-5 h-5" /> },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className={cn('p-2.5 rounded-xl', item.enabled ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/30' : 'text-slate-400 bg-slate-100 dark:bg-slate-700')}>
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                  <Badge variant={item.enabled ? 'success' : 'default'} dot>{item.enabled ? 'Enabled' : 'Disabled'}</Badge>
                </div>
              ))}
            </div>
          )}

          {/* Notifications Settings */}
          {tab === 'notifications' && (
            <div className="max-w-xl space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Configure which events trigger admin notifications</p>
              {[
                { label: 'SOS Alert Triggered', desc: 'Notify immediately when any elder triggers SOS', enabled: true },
                { label: 'High Risk Elder Activity', desc: 'Alert when a critical-risk elder is inactive for 4+ hours', enabled: true },
                { label: 'Missed Critical Medication', desc: 'Alert when an elder misses cardiac or diabetes medication', enabled: true },
                { label: 'New Elder Registration', desc: 'Notify when a new elder joins the platform', enabled: false },
                { label: 'Guardian Invitation Expired', desc: 'Alert when a pending invitation expires after 7 days', enabled: false },
                { label: 'AI Cost Threshold', desc: 'Notify when daily AI costs exceed $50', enabled: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                  <button
                    className={cn('relative w-10 rounded-full transition-colors flex-shrink-0', item.enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600')}
                    style={{ height: '22px' }}
                  >
                    <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', item.enabled ? 'translate-x-5' : 'translate-x-0.5')} />
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      </Card>
    </div>
  );
}
