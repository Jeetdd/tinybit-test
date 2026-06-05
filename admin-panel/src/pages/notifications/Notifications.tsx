import React, { useState } from 'react';
import { Bell, Send, Clock, FileText, Plus, Search, Mail, MessageSquare, Smartphone, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { Card, Table, Badge, Button, Pagination, StatusBadge, Modal, Input, Select, cn } from '../../components/ui';
import type { Column } from '../../components/ui';
import { notifications } from '../../data/mockData';
import type { Notification } from '../../types';

const TYPES = [
  { id: 'push', label: 'Push', icon: <Smartphone className="w-4 h-4" />, color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30' },
  { id: 'email', label: 'Email', icon: <Mail className="w-4 h-4" />, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30' },
  { id: 'sms', label: 'SMS', icon: <MessageSquare className="w-4 h-4" />, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30' },
];

export function Notifications() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'push', target: 'all', schedule: '' });

  const filtered = notifications.filter(n =>
    !search || n.title.toLowerCase().includes(search.toLowerCase())
  );

  const sent = notifications.filter(n => n.status === 'sent').length;
  const scheduled = notifications.filter(n => n.status === 'scheduled').length;
  const totalReached = notifications.filter(n => n.status === 'sent').reduce((s, n) => s + n.recipientCount, 0);
  const avgOpenRate = Math.round(notifications.filter(n => n.openRate).reduce((s, n) => s + (n.openRate || 0), 0) / notifications.filter(n => n.openRate).length);

  const columns: Column<Notification>[] = [
    {
      key: 'title', header: 'Notification',
      render: row => (
        <div>
          <p className="font-semibold text-sm text-slate-900 dark:text-white">{row.title}</p>
          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{row.message}</p>
        </div>
      ),
    },
    {
      key: 'type', header: 'Channel',
      render: row => {
        const t = TYPES.find(x => x.id === row.type);
        return (
          <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium', t?.color)}>
            {t?.icon} {t?.label}
          </div>
        );
      },
    },
    {
      key: 'target', header: 'Target',
      render: row => <Badge variant="default">{row.target === 'all' ? 'All Users' : row.target.charAt(0).toUpperCase() + row.target.slice(1)}</Badge>,
    },
    { key: 'status', header: 'Status', render: row => <StatusBadge status={row.status} /> },
    {
      key: 'recipientCount', header: 'Recipients',
      render: row => <span className="text-sm font-medium">{row.recipientCount > 0 ? row.recipientCount.toLocaleString() : '—'}</span>,
    },
    {
      key: 'openRate', header: 'Open Rate',
      render: row => row.openRate ? (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${row.openRate}%` }} />
          </div>
          <span className="text-xs font-medium text-emerald-600">{row.openRate}%</span>
        </div>
      ) : <span className="text-xs text-slate-400">—</span>,
    },
    {
      key: 'sentAt', header: 'Sent / Scheduled',
      render: row => <span className="text-xs text-slate-500">{row.sentAt ? new Date(row.sentAt).toLocaleString() : row.scheduledAt ? `Sched: ${new Date(row.scheduledAt).toLocaleString()}` : '—'}</span>,
    },
    { key: 'createdBy', header: 'Created By', render: row => <span className="text-xs text-slate-500">{row.createdBy}</span> },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Send push, email and SMS notifications to users</p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setComposeOpen(true)}>
          New Notification
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Sent Today', value: sent, icon: <CheckCircle className="w-5 h-5" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
          { label: 'Scheduled', value: scheduled, icon: <Clock className="w-5 h-5" />, color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30' },
          { label: 'Total Reached', value: totalReached.toLocaleString(), icon: <Bell className="w-5 h-5" />, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30' },
          { label: 'Avg Open Rate', value: `${avgOpenRate}%`, icon: <Send className="w-5 h-5" />, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30' },
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

      {/* Channel Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {TYPES.map(t => {
          const channelNotifs = notifications.filter(n => n.type === t.id && n.status === 'sent');
          const avgRate = channelNotifs.length ? Math.round(channelNotifs.reduce((s, n) => s + (n.openRate || 0), 0) / channelNotifs.length) : 0;
          return (
            <Card key={t.id}>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('p-2.5 rounded-xl', t.color)}>{t.icon}</div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{t.label} Notifications</p>
                  <p className="text-xs text-slate-500">{channelNotifs.length} sent</p>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{avgRate}%</p>
                  <p className="text-xs text-slate-500">Avg open rate</p>
                </div>
                <Badge variant={avgRate > 70 ? 'success' : avgRate > 50 ? 'warning' : 'danger'}>
                  {avgRate > 70 ? 'Excellent' : avgRate > 50 ? 'Good' : 'Low'}
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      <Card noPadding>
        <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search notifications..." className="input-field pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <Table columns={columns} data={filtered.slice((page - 1) * 10, page * 10)} keyField="id" emptyMessage="No notifications found" />
        <Pagination page={page} pageSize={10} total={filtered.length} onPageChange={setPage} />
      </Card>

      {/* Compose Modal */}
      <Modal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        title="Compose Notification"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button variant="secondary" icon={<FileText className="w-4 h-4" />}>Save as Draft</Button>
            <Button variant="primary" icon={<Send className="w-4 h-4" />}>Send Now</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="Notification title"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Message</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Write your notification message..."
              value={form.message}
              onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Channel"
              value={form.type}
              onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              options={[{ value: 'push', label: 'Push Notification' }, { value: 'email', label: 'Email' }, { value: 'sms', label: 'SMS' }]}
            />
            <Select
              label="Target Audience"
              value={form.target}
              onChange={e => setForm(p => ({ ...p, target: e.target.value }))}
              options={[
                { value: 'all', label: 'All Users' },
                { value: 'elders', label: 'Elders Only' },
                { value: 'guardians', label: 'Guardians Only' },
                { value: 'specific', label: 'Specific Group' },
              ]}
            />
          </div>
          <Input
            label="Schedule (optional)"
            type="datetime-local"
            value={form.schedule}
            onChange={e => setForm(p => ({ ...p, schedule: e.target.value }))}
            icon={<Calendar className="w-4 h-4" />}
          />
        </div>
      </Modal>
    </div>
  );
}
