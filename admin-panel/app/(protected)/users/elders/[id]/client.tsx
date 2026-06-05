'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Heart, Pill, Activity, ShieldAlert } from 'lucide-react';
import { Badge, HealthRiskBadge, StatusBadge, InfoRow } from '@/src/components/ui';
import { elders, medicines, sosAlerts, wellnessLogs } from '@/src/data/mockData';

export function ElderProfileClient({ id }: { id: string }) {
  const router = useRouter();
  const elder = elders.find(e => e.id === id);

  if (!elder) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400">
        <p className="text-lg font-medium">Elder not found</p>
        <button onClick={() => router.back()} className="btn-primary mt-4">Go Back</button>
      </div>
    );
  }

  const elderMeds = medicines.filter(m => m.elderId === id);
  const elderSOS = sosAlerts.filter(s => s.elderId === id);
  const elderWellness = wellnessLogs.find(w => w.elderId === id);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="btn-secondary p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="page-title">{elder.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Elder Profile · ID: {elder.id}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={elder.status} />
          <HealthRiskBadge score={elder.healthRiskScore} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Profile Card */}
          <div className="card p-6 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 to-teal-500 flex items-center justify-center text-white text-2xl font-bold mb-3">
              {elder.name.split(' ').map(n => n[0]).join('')}
            </div>
            <h2 className="font-bold text-slate-900 dark:text-white text-lg">{elder.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{elder.age} years old</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Member since {elder.createdAt}</p>
            <div className="mt-3 flex gap-2">
              <span className="text-[11px] font-semibold text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2.5 py-1 rounded-full">
                {elder.guardianCount} Guardian{elder.guardianCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Contact */}
          <div className="card p-5 space-y-1">
            <h3 className="section-title text-sm mb-3">Contact Information</h3>
            <InfoRow label="Phone" value={elder.phone} />
            <InfoRow label="Email" value={elder.email} />
            <InfoRow label="City" value={elder.city} />
            <InfoRow label="Address" value={elder.address} />
            <InfoRow label="Date of Birth" value={elder.dateOfBirth} />
            <InfoRow label="Emergency Contact" value={elder.emergencyContact} />
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Medical Conditions */}
          <div className="card p-5">
            <h3 className="section-title mb-3 flex items-center gap-2"><Heart className="w-4 h-4 text-red-500" /> Medical Conditions</h3>
            <div className="flex flex-wrap gap-2">
              {elder.conditions.map(c => (
                <Badge key={c} variant="danger">{c}</Badge>
              ))}
              {elder.conditions.length === 0 && <span className="text-sm text-slate-400">No conditions recorded</span>}
            </div>
          </div>

          {/* Wellness Today */}
          {elderWellness && (
            <div className="card p-5">
              <h3 className="section-title mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-teal-500" /> Today&apos;s Wellness</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Blood Pressure', value: `${elderWellness.systolic}/${elderWellness.diastolic}`, color: elderWellness.systolic > 140 ? 'text-red-500' : 'text-emerald-500' },
                  { label: 'Heart Rate', value: `${elderWellness.heartRate} bpm`, color: 'text-rose-500' },
                  { label: 'SpO2', value: `${elderWellness.spo2}%`, color: elderWellness.spo2 < 95 ? 'text-red-500' : 'text-brand-500' },
                  { label: 'Blood Sugar', value: `${elderWellness.bloodSugar} mg/dL`, color: elderWellness.bloodSugar > 140 ? 'text-amber-500' : 'text-emerald-500' },
                  { label: 'Sleep', value: `${elderWellness.sleepHours}h`, color: 'text-violet-500' },
                  { label: 'Water', value: `${elderWellness.waterIntake} glasses`, color: 'text-brand-500' },
                  { label: 'Weight', value: `${elderWellness.weight} kg`, color: 'text-slate-600' },
                  { label: 'Temperature', value: `${elderWellness.temperature}°F`, color: elderWellness.temperature > 99 ? 'text-amber-500' : 'text-emerald-500' },
                ].map(item => (
                  <div key={item.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                    <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medicines */}
          <div className="card p-5">
            <h3 className="section-title mb-3 flex items-center gap-2"><Pill className="w-4 h-4 text-purple-500" /> Medications ({elderMeds.length})</h3>
            {elderMeds.length > 0 ? (
              <div className="space-y-2">
                {elderMeds.map(med => (
                  <div key={med.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{med.name} <span className="text-slate-500 text-xs">{med.dosage}</span></p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{med.schedule} · {med.prescribedBy}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">{med.adherenceRate}%</p>
                      <p className="text-xs text-slate-400">adherence</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400">No medications recorded</p>}
          </div>

          {/* SOS History */}
          {elderSOS.length > 0 && (
            <div className="card p-5">
              <h3 className="section-title mb-3 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-red-500" /> SOS History ({elderSOS.length})</h3>
              <div className="space-y-2">
                {elderSOS.map(sos => (
                  <div key={sos.id} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/40">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">{sos.description}</p>
                      <p className="text-xs text-red-500/70 mt-0.5">{sos.location.address}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{new Date(sos.time).toLocaleString()}</p>
                    </div>
                    <Badge variant={sos.status === 'active' ? 'danger' : sos.status === 'resolved' ? 'success' : 'warning'}>
                      {sos.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
