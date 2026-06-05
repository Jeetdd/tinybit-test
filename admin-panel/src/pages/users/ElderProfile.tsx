import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Ban, Phone, Mail, MapPin, Calendar, Shield,
  Pill, Activity, BookOpen, AlertTriangle, Heart, FileText, User,
  UserCheck, Clock, TrendingUp,
} from 'lucide-react';
import { Card, Badge, Button, StatusBadge, HealthRiskBadge, InfoRow, ProgressBar, Tabs, Avatar, cn } from '../../components/ui';
import { HealthRadarChart, Sparkline } from '../../components/charts';
import { elders, medicines, wellnessLogs, sosAlerts, journalEntries, aiSessions } from '../../data/mockData';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'health', label: 'Health' },
  { id: 'medicines', label: 'Medicines' },
  { id: 'guardians', label: 'Guardians' },
  { id: 'journals', label: 'Journals' },
  { id: 'sos', label: 'SOS History' },
  { id: 'ai', label: 'AI Sessions' },
];

const healthRadarData = [
  { metric: 'Sleep', value: 72 },
  { metric: 'Hydration', value: 65 },
  { metric: 'Medication', value: 87 },
  { metric: 'BP Control', value: 58 },
  { metric: 'Activity', value: 44 },
  { metric: 'Mood', value: 80 },
];

const bpTrend = [142, 138, 145, 150, 143, 148, 142];
const hrTrend = [76, 74, 78, 75, 72, 76, 74];

export function ElderProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');

  const elder = elders.find(e => e.id === id) || elders[0];
  const elderMeds = medicines.filter(m => m.elderId === elder.id);
  const elderWellness = wellnessLogs.find(w => w.elderId === elder.id);
  const elderSOS = sosAlerts.filter(s => s.elderId === elder.id);
  const elderJournals = journalEntries.filter(j => j.elderId === elder.id);
  const elderAI = aiSessions.filter(a => a.elderId === elder.id);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/users/elders')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="page-title">{elder.name}</h1>
            <StatusBadge status={elder.status} />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Elder ID: {elder.id} · Registered {elder.createdAt}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<Edit2 className="w-4 h-4" />} size="sm">Edit</Button>
          <Button variant="danger" icon={<Ban className="w-4 h-4" />} size="sm">Suspend</Button>
        </div>
      </div>

      {/* Profile Card + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <div className="text-center pb-4 border-b border-slate-100 dark:border-slate-800">
            <Avatar name={elder.name} size="xl" className="mx-auto mb-3" />
            <h2 className="font-bold text-slate-900 dark:text-white">{elder.name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{elder.age} years old</p>
            <div className="mt-3">
              <HealthRiskBadge score={elder.healthRiskScore} />
            </div>
          </div>
          <div className="pt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="truncate text-xs">{elder.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-xs font-mono">{elder.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-xs">{elder.address}, {elder.city}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-xs">Born {elder.dateOfBirth}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-xs">Active {elder.lastActive}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Medical Conditions</p>
            <div className="flex flex-wrap gap-1.5">
              {elder.conditions.map(c => <Badge key={c} variant="warning" size="sm">{c}</Badge>)}
              {elder.conditions.length === 0 && <span className="text-xs text-slate-400">None recorded</span>}
            </div>
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Guardians Linked', value: elder.guardianCount, icon: <UserCheck className="w-5 h-5" />, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/30' },
            { label: 'Medicines Active', value: elderMeds.length, icon: <Pill className="w-5 h-5" />, color: 'text-brand-600', bg: 'bg-brand-50 dark:bg-brand-900/30' },
            { label: 'Avg. Adherence', value: `${elderMeds.length ? Math.round(elderMeds.reduce((s, m) => s + m.adherenceRate, 0) / elderMeds.length) : 0}%`, icon: <TrendingUp className="w-5 h-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
            { label: 'SOS Incidents', value: elderSOS.length, icon: <AlertTriangle className="w-5 h-5" />, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/30' },
            { label: 'Journal Entries', value: elderJournals.length, icon: <BookOpen className="w-5 h-5" />, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/30' },
            { label: 'AI Sessions', value: elderAI.length, icon: <Activity className="w-5 h-5" />, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30' },
          ].map(s => (
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <div className={cn('p-2.5 rounded-xl', s.bg, s.color)}>{s.icon}</div>
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Health Radar + BP/HR trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card title="Health Radar" subtitle="Holistic wellness score">
          <HealthRadarChart data={healthRadarData} />
        </Card>
        <Card title="Blood Pressure Trend" subtitle="7-day systolic reading">
          <div className="mt-2">
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{elderWellness?.systolic ?? '—'}<span className="text-base font-normal text-slate-500">/{elderWellness?.diastolic ?? '—'} mmHg</span></p>
            <Sparkline data={bpTrend} color="#ef4444" />
          </div>
        </Card>
        <Card title="Heart Rate Trend" subtitle="7-day average (bpm)">
          <div className="mt-2">
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{elderWellness?.heartRate ?? '—'}<span className="text-base font-normal text-slate-500"> bpm</span></p>
            <Sparkline data={hrTrend} color="#0284c7" />
          </div>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Card noPadding>
        <div className="px-6 pt-4">
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
        <div className="p-6">
          {/* Overview Tab */}
          {tab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Personal Information</h4>
                <InfoRow label="Full Name" value={elder.name} />
                <InfoRow label="Date of Birth" value={elder.dateOfBirth} />
                <InfoRow label="Age" value={`${elder.age} years`} />
                <InfoRow label="Phone" value={<span className="font-mono">{elder.phone}</span>} />
                <InfoRow label="Email" value={elder.email} />
                <InfoRow label="Address" value={`${elder.address}, ${elder.city}`} />
                <InfoRow label="Emergency Contact" value={<span className="font-mono text-red-600">{elder.emergencyContact}</span>} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Account Details</h4>
                <InfoRow label="Elder ID" value={<span className="font-mono text-brand-600">{elder.id}</span>} />
                <InfoRow label="Account Status" value={<StatusBadge status={elder.status} />} />
                <InfoRow label="Health Risk Score" value={<HealthRiskBadge score={elder.healthRiskScore} />} />
                <InfoRow label="Registered On" value={elder.createdAt} />
                <InfoRow label="Last Active" value={elder.lastActive} />
                <InfoRow label="Guardians" value={`${elder.guardianCount} linked`} />
                <InfoRow label="Medical Conditions" value={
                  elder.conditions.length ? (
                    <div className="flex flex-wrap gap-1">{elder.conditions.map(c => <Badge key={c} variant="warning" size="sm">{c}</Badge>)}</div>
                  ) : 'None'
                } />
              </div>
            </div>
          )}

          {/* Medicines Tab */}
          {tab === 'medicines' && (
            <div>
              {elderMeds.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No medicines prescribed</p>
              ) : (
                <div className="space-y-3">
                  {elderMeds.map(med => (
                    <div key={med.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                      <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-lg">
                        <Pill className="w-5 h-5 text-brand-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-white text-sm">{med.name} <span className="font-normal text-slate-500">{med.dosage}</span></p>
                          <Badge variant="teal" size="sm">{med.frequency}</Badge>
                          <StatusBadge status={med.refillStatus} />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{med.schedule} · Prescribed by {med.prescribedBy}</p>
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <span>Adherence Rate</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{med.adherenceRate}%</span>
                          </div>
                          <ProgressBar value={med.adherenceRate} color={med.adherenceRate >= 80 ? 'green' : med.adherenceRate >= 60 ? 'amber' : 'red'} size="sm" />
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        {med.lastTaken && <p>Last: <span className="text-slate-700 dark:text-slate-300 font-medium">{med.lastTaken}</span></p>}
                        {med.nextDue && <p className="mt-0.5">Next: <span className="text-slate-700 dark:text-slate-300 font-medium">{med.nextDue}</span></p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SOS Tab */}
          {tab === 'sos' && (
            <div className="space-y-3">
              {elderSOS.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No SOS incidents recorded</p>
              ) : (
                elderSOS.map(sos => (
                  <div key={sos.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={cn('w-4 h-4', sos.severity === 'critical' ? 'text-red-500' : sos.severity === 'high' ? 'text-amber-500' : 'text-brand-500')} />
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">{sos.description}</span>
                      </div>
                      <StatusBadge status={sos.status} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{sos.location.address} · {new Date(sos.time).toLocaleString()}</p>
                    {sos.resolvedAt && <p className="text-xs text-emerald-600 mt-1">Resolved: {new Date(sos.resolvedAt).toLocaleString()} by {sos.resolvedBy}</p>}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Journals Tab */}
          {tab === 'journals' && (
            <div className="space-y-3">
              {elderJournals.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No journal entries</p>
              ) : (
                elderJournals.map(j => (
                  <div key={j.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={j.type === 'voice' ? 'purple' : 'info'} dot>{j.type === 'voice' ? 'Voice' : 'Text'}</Badge>
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">{j.title}</span>
                      </div>
                      <span className="text-xs text-slate-400">{new Date(j.createdAt).toLocaleDateString()}</span>
                    </div>
                    {j.content && <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{j.content}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span>Mood: <span className="text-slate-600 dark:text-slate-300">{j.mood}</span></span>
                      {j.duration && <span>{Math.floor(j.duration / 60)}m {j.duration % 60}s</span>}
                      {j.wordCount && <span>{j.wordCount} words</span>}
                      {j.isShared && <Badge variant="teal" size="sm">Shared</Badge>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* AI Sessions Tab */}
          {tab === 'ai' && (
            <div className="space-y-3">
              {elderAI.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No AI sessions recorded</p>
              ) : (
                elderAI.map(ai => (
                  <div key={ai.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                    <Badge variant={ai.sessionType === 'voice' ? 'purple' : 'info'}>{ai.sessionType}</Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{ai.model}</p>
                      <p className="text-xs text-slate-500">{new Date(ai.startTime).toLocaleString()}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500 space-y-0.5">
                      <p>{ai.tokensUsed.toLocaleString()} tokens</p>
                      <p>{ai.duration} min · ${ai.cost.toFixed(3)}</p>
                    </div>
                    <Badge variant={ai.sentiment === 'positive' ? 'success' : ai.sentiment === 'negative' ? 'danger' : 'default'}>{ai.sentiment}</Badge>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Placeholder tabs */}
          {(tab === 'health' || tab === 'guardians') && (
            <div className="text-center py-12 text-slate-400">
              <Heart className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Detailed {tab} data visualization coming soon</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
