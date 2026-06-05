import React, { useState } from 'react';
import { BarChart3, Download, FileText, Users2, Heart, Pill, ShieldAlert, Bot, Calendar } from 'lucide-react';
import { Card, Button, Badge, Select, cn } from '../../components/ui';
import { UserGrowthChart, MedicineAdherenceChart, SOSChart, AIUsageChart, DonutChart } from '../../components/charts';
import { userGrowthData, medicineAdherenceData, sosByMonthData, aiUsageData, healthRiskData } from '../../data/mockData';

const REPORT_TYPES = [
  { id: 'user', label: 'User Report', description: 'Elder & guardian registration, activity, retention', icon: <Users2 className="w-5 h-5" />, color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30', badge: 'PDF, CSV, XLSX' },
  { id: 'health', label: 'Health Report', description: 'Wellness trends, check-ins, vitals analysis', icon: <Heart className="w-5 h-5" />, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30', badge: 'PDF, CSV' },
  { id: 'medication', label: 'Medication Report', description: 'Adherence rates, missed doses, refill tracking', icon: <Pill className="w-5 h-5" />, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30', badge: 'PDF, CSV' },
  { id: 'sos', label: 'SOS / Emergency Report', description: 'Incident history, response times, escalation stats', icon: <ShieldAlert className="w-5 h-5" />, color: 'text-red-600 bg-red-50 dark:bg-red-900/30', badge: 'PDF, CSV' },
  { id: 'ai', label: 'AI Analytics Report', description: 'Token usage, cost breakdown, session analytics', icon: <Bot className="w-5 h-5" />, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30', badge: 'PDF, CSV, XLSX' },
];

export function Reports() {
  const [period, setPeriod] = useState('monthly');
  const [dateFrom, setDateFrom] = useState('2026-05-01');
  const [dateTo, setDateTo] = useState('2026-06-05');
  const [generating, setGenerating] = useState<string | null>(null);

  async function handleGenerate(type: string, format: string) {
    setGenerating(`${type}-${format}`);
    await new Promise(r => setTimeout(r, 1500));
    setGenerating(null);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Generate and download comprehensive reports</p>
        </div>
      </div>

      {/* Date Range Picker */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
            {['weekly', 'monthly', 'quarterly', 'yearly'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all', period === p ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700')}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field !w-36 !py-1.5 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field !w-36 !py-1.5 text-xs" />
            </div>
          </div>
          <Button variant="primary" icon={<Calendar className="w-4 h-4" />} size="sm">Apply</Button>
        </div>
      </Card>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {REPORT_TYPES.map(rt => (
          <Card key={rt.id}>
            <div className="flex items-start gap-3 mb-4">
              <div className={cn('p-3 rounded-xl flex-shrink-0', rt.color)}>{rt.icon}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{rt.label}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{rt.description}</p>
                <Badge variant="default" size="sm" className="mt-1.5">{rt.badge}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {['PDF', 'CSV', 'Excel'].map(fmt => (
                <Button
                  key={fmt}
                  variant="secondary"
                  size="xs"
                  icon={<Download className="w-3 h-3" />}
                  loading={generating === `${rt.id}-${fmt}`}
                  onClick={() => handleGenerate(rt.id, fmt)}
                >
                  {fmt}
                </Button>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Preview Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card title="User Growth (Preview)" subtitle="Jun 2025 – Jun 2026"
          action={<Button variant="secondary" size="xs" icon={<Download className="w-3 h-3" />}>Export</Button>}>
          <UserGrowthChart data={userGrowthData as unknown as Record<string, unknown>[]} />
        </Card>
        <Card title="SOS Analytics (Preview)" subtitle="Monthly incidents"
          action={<Button variant="secondary" size="xs" icon={<Download className="w-3 h-3" />}>Export</Button>}>
          <SOSChart data={sosByMonthData as unknown as Record<string, unknown>[]} />
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Medicine Adherence" subtitle="Weekly compliance">
          <MedicineAdherenceChart data={medicineAdherenceData as unknown as Record<string, unknown>[]} />
        </Card>
        <Card title="AI Usage Trends" subtitle="Sessions per day">
          <AIUsageChart data={aiUsageData as unknown as Record<string, unknown>[]} />
        </Card>
        <Card title="Health Risk Distribution" subtitle="Current elder risk levels">
          <DonutChart data={healthRiskData} colors={['#10b981', '#f59e0b', '#ef4444', '#dc2626']} height={220} />
        </Card>
      </div>
    </div>
  );
}
