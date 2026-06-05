import React, { useState } from 'react';
import { Bot, MessageSquare, Mic, TrendingUp, DollarSign, Zap, Search, Filter } from 'lucide-react';
import { Card, Table, Badge, Button, Pagination, Avatar, cn } from '../../components/ui';
import type { Column } from '../../components/ui';
import { aiSessions, aiUsageData } from '../../data/mockData';
import type { AISession } from '../../types';
import { AIUsageChart, DonutChart } from '../../components/charts';

const MODEL_DIST = [
  { name: 'GPT-4o-mini', value: 7820 },
  { name: 'Whisper', value: 2340 },
  { name: 'TTS Nova', value: 1560 },
];

const SENTIMENT_DIST = [
  { name: 'Positive', value: 68 },
  { name: 'Neutral', value: 24 },
  { name: 'Negative', value: 8 },
];

export function AIManagement() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);

  const filtered = aiSessions.filter(s => {
    if (search && !s.elderName.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && s.sessionType !== typeFilter) return false;
    return true;
  });

  const totalTokens = aiSessions.reduce((s, a) => s + a.tokensUsed, 0);
  const totalCost = aiSessions.reduce((s, a) => s + a.cost, 0);
  const avgDuration = Math.round(aiSessions.reduce((s, a) => s + a.duration, 0) / aiSessions.length);

  const columns: Column<AISession>[] = [
    {
      key: 'elderName', header: 'Elder',
      render: row => (
        <div className="flex items-center gap-3">
          <Avatar name={row.elderName} size="sm" />
          <div>
            <p className="font-medium text-slate-900 dark:text-white text-sm">{row.elderName}</p>
            <p className="text-xs text-slate-400">{row.elderId}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'sessionType', header: 'Type',
      render: row => <Badge variant={row.sessionType === 'voice' ? 'purple' : 'info'} dot>{row.sessionType === 'voice' ? 'Voice' : 'Chat'}</Badge>,
    },
    { key: 'model', header: 'Model', render: row => <Badge variant="default" size="sm">{row.model}</Badge> },
    { key: 'startTime', header: 'Started', render: row => <span className="text-xs text-slate-500">{new Date(row.startTime).toLocaleString()}</span> },
    { key: 'duration', header: 'Duration', render: row => <span className="text-sm">{row.duration} min</span> },
    { key: 'tokensUsed', header: 'Tokens', render: row => <span className="text-sm font-mono">{row.tokensUsed.toLocaleString()}</span> },
    { key: 'cost', header: 'Cost', render: row => <span className="text-sm text-emerald-600 font-semibold">${row.cost.toFixed(3)}</span> },
    {
      key: 'sentiment', header: 'Sentiment',
      render: row => <Badge variant={row.sentiment === 'positive' ? 'success' : row.sentiment === 'negative' ? 'danger' : 'default'}>{row.sentiment}</Badge>,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Monitor AI usage, costs and conversation analytics</p>
        </div>
        <Button variant="primary" icon={<Bot className="w-4 h-4" />} size="sm">Configure AI Limits</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Sessions (today)', value: 892, icon: <MessageSquare className="w-5 h-5" />, color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30' },
          { label: 'Voice Sessions', value: 340, icon: <Mic className="w-5 h-5" />, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30' },
          { label: 'Total Tokens (today)', value: '1.2M', icon: <Zap className="w-5 h-5" />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
          { label: 'Est. Cost (today)', value: '$38.40', icon: <DollarSign className="w-5 h-5" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={cn('p-2.5 rounded-xl', s.color)}>{s.icon}</div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card title="Daily AI Usage" subtitle="Chat & Voice sessions this week" className="lg:col-span-2">
          <AIUsageChart data={aiUsageData as unknown as Record<string, unknown>[]} />
        </Card>
        <div className="grid grid-rows-2 gap-4">
          <Card title="Model Distribution" noPadding={false}>
            <DonutChart data={MODEL_DIST} height={130} innerRadius={35} showLegend={false} />
          </Card>
          <Card title="Sentiment Distribution" noPadding={false}>
            <DonutChart data={SENTIMENT_DIST} colors={['#10b981', '#94a3b8', '#ef4444']} height={130} innerRadius={35} showLegend={false} />
          </Card>
        </div>
      </div>

      {/* Cost Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {[
          { label: 'Avg Cost Per User', value: '$0.043', change: '+12%', description: 'Daily avg per active user' },
          { label: 'Avg Cost Per Session', value: '$0.118', change: '-3%', description: 'All session types combined' },
          { label: 'Monthly Projection', value: '$1,152', change: '+8%', description: 'Based on current usage trend' },
        ].map(m => (
          <Card key={m.label}>
            <p className="text-xs text-slate-500 dark:text-slate-400">{m.label}</p>
            <div className="flex items-end justify-between mt-1">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{m.value}</p>
              <Badge variant={m.change.startsWith('+') ? 'danger' : 'success'} size="sm">{m.change}</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">{m.description}</p>
          </Card>
        ))}
      </div>

      {/* Sessions Table */}
      <Card noPadding>
        <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="section-title flex-1">Recent Sessions</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search elder..." className="input-field pl-9 !w-48" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-field !w-auto !py-1.5 text-xs">
            <option value="all">All Types</option>
            <option value="chat">Chat</option>
            <option value="voice">Voice</option>
          </select>
        </div>
        <Table columns={columns} data={filtered.slice((page - 1) * 10, page * 10)} keyField="id" emptyMessage="No AI sessions found" />
        <Pagination page={page} pageSize={10} total={filtered.length} onPageChange={setPage} />
      </Card>
    </div>
  );
}
