import React, { useState } from 'react';
import {
  Users, UserCheck, Heart, Bell, ShieldAlert, Pill, ClipboardCheck,
  Bot, BookOpen, Activity, TrendingUp, TrendingDown, RefreshCw,
  Users2, AlertTriangle, CheckCircle2, MessageSquare, Zap,
} from 'lucide-react';
import { StatCard, Card, Badge, Button, cn } from '../components/ui';
import {
  UserGrowthChart, MedicineAdherenceChart, WellnessTrendsChart,
  SOSChart, AIUsageChart, DonutChart,
} from '../components/charts';
import {
  dashboardStats, userGrowthData, medicineAdherenceData, wellnessTrendData,
  sosByMonthData, aiUsageData, sosRegionData, healthRiskData, activityFeed,
} from '../data/mockData';

const TIME_RANGES = ['Today', '7 Days', '30 Days', '90 Days'];

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  sos_triggered: <AlertTriangle className="w-3.5 h-3.5" />,
  elder_registered: <Users2 className="w-3.5 h-3.5" />,
  medicine_missed: <Pill className="w-3.5 h-3.5" />,
  guardian_connected: <UserCheck className="w-3.5 h-3.5" />,
  checkin_submitted: <ClipboardCheck className="w-3.5 h-3.5" />,
  journal_created: <BookOpen className="w-3.5 h-3.5" />,
  ai_session: <Bot className="w-3.5 h-3.5" />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  sos_triggered: 'text-red-500 bg-red-50 dark:bg-red-900/30',
  elder_registered: 'text-brand-500 bg-brand-50 dark:bg-brand-900/30',
  medicine_missed: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30',
  guardian_connected: 'text-teal-500 bg-teal-50 dark:bg-teal-900/30',
  checkin_submitted: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30',
  journal_created: 'text-violet-500 bg-violet-50 dark:bg-violet-900/30',
  ai_session: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30',
};

export function Dashboard() {
  const [timeRange, setTimeRange] = useState('30 Days');
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1200));
    setRefreshing(false);
  }

  const stats = dashboardStats;

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time overview — <span className="text-emerald-600 dark:text-emerald-400 font-medium">● Live</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Time Range Picker */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
            {TIME_RANGES.map(t => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  timeRange === t
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            icon={<RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />}
            onClick={handleRefresh}
            size="sm"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-4 mb-6">
        <StatCard title="Total Elders" value={stats.totalElders} change={8.4} icon={<Users2 className="w-5 h-5" />} gradient="stat-card-gradient-blue" subtitle={`${stats.activeElders.toLocaleString()} active`} />
        <StatCard title="Total Guardians" value={stats.totalGuardians} change={5.2} icon={<UserCheck className="w-5 h-5" />} gradient="stat-card-gradient-teal" subtitle={`${stats.activeGuardians.toLocaleString()} active`} />
        <StatCard title="Daily Active Users" value={stats.dailyActiveUsers} change={3.1} icon={<Activity className="w-5 h-5" />} gradient="stat-card-gradient-indigo" subtitle={`${stats.monthlyActiveUsers.toLocaleString()} MAU`} />
        <StatCard title="Family Members" value={stats.connectedFamilyMembers} change={12.7} icon={<Users className="w-5 h-5" />} gradient="stat-card-gradient-emerald" />
        <StatCard title="SOS Today" value={stats.sosTriggeredToday} change={-28} icon={<ShieldAlert className="w-5 h-5" />} gradient="stat-card-gradient-red" subtitle="↓ down from yesterday" />
        <StatCard title="Medicines Taken" value={stats.medicinesTakenToday} change={2.3} icon={<Pill className="w-5 h-5" />} gradient="stat-card-gradient-teal" subtitle="Today's dose count" />
        <StatCard title="Missed Medicines" value={stats.missedMedicines} change={-5.1} icon={<Bell className="w-5 h-5" />} gradient="stat-card-gradient-amber" subtitle="Requires follow-up" />
        <StatCard title="Daily Check-ins" value={stats.dailyCheckIns} change={7.8} icon={<ClipboardCheck className="w-5 h-5" />} gradient="stat-card-gradient-indigo" />
        <StatCard title="Active AI Users" value={stats.activeAIUsers} change={15.3} icon={<Bot className="w-5 h-5" />} gradient="stat-card-gradient-purple" subtitle="Chat + Voice" />
        <StatCard title="Journal Entries" value={stats.totalJournalEntries} change={9.4} icon={<BookOpen className="w-5 h-5" />} gradient="stat-card-gradient-rose" subtitle="All time" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* User Growth */}
        <Card
          title="User Growth"
          subtitle="Elders & Guardians registered"
          className="lg:col-span-2"
          action={
            <Badge variant="success" dot>+8.4% this month</Badge>
          }
        >
          <UserGrowthChart data={userGrowthData as unknown as Record<string, unknown>[]} />
        </Card>

        {/* Health Risk Distribution */}
        <Card title="Health Risk Distribution" subtitle="Active elders by risk level">
          <DonutChart
            data={healthRiskData}
            colors={['#10b981', '#f59e0b', '#ef4444', '#dc2626']}
            height={220}
          />
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card title="Medicine Adherence" subtitle="Weekly dose compliance (%)">
          <MedicineAdherenceChart data={medicineAdherenceData as unknown as Record<string, unknown>[]} />
        </Card>
        <Card title="Wellness Trends" subtitle="Daily avg — Sleep, Water & Heart Rate">
          <WellnessTrendsChart data={wellnessTrendData as unknown as Record<string, unknown>[]} />
        </Card>
      </div>

      {/* Charts Row 3 + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* SOS Analytics */}
        <Card title="SOS Analytics" subtitle="Monthly emergency alerts">
          <SOSChart data={sosByMonthData as unknown as Record<string, unknown>[]} />
        </Card>

        {/* AI Usage */}
        <Card title="AI Usage" subtitle="Daily chat & voice sessions">
          <AIUsageChart data={aiUsageData as unknown as Record<string, unknown>[]} />
        </Card>

        {/* Activity Feed */}
        <Card
          title="Live Activity Feed"
          subtitle="Real-time events"
          noPadding
          action={<Badge variant="success" dot>Live</Badge>}
        >
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {activityFeed.map(item => (
              <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', ACTIVITY_COLORS[item.type])}>
                  {ACTIVITY_ICONS[item.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-snug">{item.message}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{item.time}</p>
                </div>
                {item.severity === 'critical' && <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5 animate-pulse flex-shrink-0" />}
                {item.severity === 'warning' && <span className="w-2 h-2 bg-amber-500 rounded-full mt-1.5 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* SOS Region Distribution + Quick Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-4">
        <Card title="SOS by Region" subtitle="Today's alerts distribution" className="lg:col-span-1">
          <DonutChart data={sosRegionData} height={180} innerRadius={40} />
        </Card>

        {/* Quick Metric Cards */}
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Avg. Response Time', value: '2m 34s', trend: -12, icon: <ShieldAlert className="w-5 h-5 text-brand-500" />, good: true },
            { label: 'Medicine Adherence', value: '86.4%', trend: 2, icon: <Pill className="w-5 h-5 text-teal-500" />, good: true },
            { label: 'AI Satisfaction', value: '94.2%', trend: 3, icon: <MessageSquare className="w-5 h-5 text-violet-500" />, good: true },
            { label: 'Tokens Today', value: '1.2M', trend: 8, icon: <Zap className="w-5 h-5 text-amber-500" />, good: false },
          ].map(metric => (
            <div key={metric.label} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">{metric.icon}</div>
                <div className={cn('flex items-center gap-1 text-xs font-medium', metric.trend > 0 ? (metric.good ? 'text-emerald-600' : 'text-red-500') : (metric.good ? 'text-red-500' : 'text-emerald-600'))}>
                  {metric.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(metric.trend)}%
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{metric.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
