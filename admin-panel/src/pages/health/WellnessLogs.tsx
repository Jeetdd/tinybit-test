import React, { useState } from 'react';
import { Activity, Droplets, Moon, Heart, Thermometer, Weight, Zap } from 'lucide-react';
import { Card, Table, Badge, Button, Pagination, Avatar, cn } from '../../components/ui';
import type { Column } from '../../components/ui';
import { wellnessLogs, wellnessTrendData } from '../../data/mockData';
import type { WellnessLog } from '../../types';
import { WellnessTrendsChart } from '../../components/charts';

function VitalBadge({ value, low, high, unit }: { value: number; low: number; high: number; unit: string }) {
  const isLow = value < low;
  const isHigh = value > high;
  const color = isLow || isHigh ? (isHigh ? 'text-red-600 bg-red-50 dark:bg-red-900/30' : 'text-amber-600 bg-amber-50 dark:bg-amber-900/30') : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30';
  return <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', color)}>{value} {unit}</span>;
}

export function WellnessLogs() {
  const [page, setPage] = useState(1);

  const columns: Column<WellnessLog>[] = [
    {
      key: 'elderName', header: 'Elder',
      render: row => (
        <div className="flex items-center gap-3">
          <Avatar name={row.elderName} size="sm" />
          <div>
            <p className="font-medium text-sm text-slate-900 dark:text-white">{row.elderName}</p>
            <p className="text-xs text-slate-400">{row.date}</p>
          </div>
        </div>
      ),
    },
    { key: 'waterIntake', header: 'Water', render: row => <VitalBadge value={row.waterIntake} low={6} high={12} unit="glasses" /> },
    { key: 'sleepHours', header: 'Sleep', render: row => <VitalBadge value={row.sleepHours} low={6} high={9} unit="hrs" /> },
    {
      key: 'systolic', header: 'Blood Pressure',
      render: row => {
        const isHigh = row.systolic > 140 || row.diastolic > 90;
        return <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', isHigh ? 'text-red-600 bg-red-50 dark:bg-red-900/30' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30')}>{row.systolic}/{row.diastolic} mmHg</span>;
      },
    },
    { key: 'heartRate', header: 'Heart Rate', render: row => <VitalBadge value={row.heartRate} low={60} high={100} unit="bpm" /> },
    { key: 'bloodSugar', header: 'Blood Sugar', render: row => <VitalBadge value={row.bloodSugar} low={70} high={140} unit="mg/dL" /> },
    { key: 'spo2', header: 'SpO₂', render: row => <VitalBadge value={row.spo2} low={95} high={100} unit="%" /> },
    { key: 'temperature', header: 'Temp', render: row => <VitalBadge value={row.temperature} low={97} high={99} unit="°F" /> },
    { key: 'weight', header: 'Weight', render: row => <span className="text-xs text-slate-600 dark:text-slate-300">{row.weight} kg</span> },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Wellness Logs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Daily vitals and wellness data from elder check-ins</p>
        </div>
        <Button variant="secondary" size="sm">Export Report</Button>
      </div>

      {/* Vital KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {[
          { label: 'Avg Water', value: '6.2 gl', icon: <Droplets className="w-4 h-4" />, color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30' },
          { label: 'Avg Sleep', value: '7.1 hrs', icon: <Moon className="w-4 h-4" />, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30' },
          { label: 'Avg HR', value: '74 bpm', icon: <Heart className="w-4 h-4" />, color: 'text-red-600 bg-red-50 dark:bg-red-900/30' },
          { label: 'Avg BP', value: '138/87', icon: <Activity className="w-4 h-4" />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
          { label: 'Avg SpO₂', value: '96.4%', icon: <Zap className="w-4 h-4" />, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30' },
          { label: 'Avg Sugar', value: '142 mg', icon: <Activity className="w-4 h-4" />, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30' },
          { label: 'Avg Temp', value: '98.6°F', icon: <Thermometer className="w-4 h-4" />, color: 'text-pink-600 bg-pink-50 dark:bg-pink-900/30' },
          { label: 'Avg Weight', value: '64 kg', icon: <Weight className="w-4 h-4" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
        ].map(s => (
          <div key={s.label} className="card p-3 flex flex-col items-center text-center gap-1.5">
            <div className={cn('p-2 rounded-lg', s.color)}>{s.icon}</div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{s.value}</p>
            <p className="text-[10px] text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <Card title="Wellness Trends (7-day avg)" subtitle="Sleep, water intake & heart rate" className="mb-4">
        <WellnessTrendsChart data={wellnessTrendData as unknown as Record<string, unknown>[]} />
      </Card>

      {/* Anomaly Alerts */}
      <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-2">⚠ Anomaly Alerts (Today)</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { elder: 'Geeta Verma', metric: 'Blood Pressure', value: '165/98 mmHg', note: 'Above threshold (>140/90)' },
            { elder: 'Savita Devi', metric: 'SpO₂', value: '93%', note: 'Below threshold (<95%)' },
            { elder: 'Priya Sharma', metric: 'Blood Sugar', value: '195 mg/dL', note: 'Above normal range' },
          ].map(a => (
            <div key={a.elder} className="bg-white dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{a.elder}</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">{a.metric}: {a.value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{a.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card noPadding>
        <Table columns={columns} data={wellnessLogs.slice((page - 1) * 10, page * 10)} keyField="id" emptyMessage="No wellness logs found" />
        <Pagination page={page} pageSize={10} total={wellnessLogs.length} onPageChange={setPage} />
      </Card>
    </div>
  );
}
