import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, Plus, Eye, Edit2, UserCheck, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Table, Card, Badge, Button, Pagination, Avatar, StatusBadge, cn } from '../../components/ui';
import type { Column } from '../../components/ui';
import { guardians } from '../../data/mockData';
import type { Guardian } from '../../types';

export function Guardians() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verifyFilter, setVerifyFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    let data = [...guardians];
    if (search) data = data.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) || g.email.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== 'all') data = data.filter(g => g.status === statusFilter);
    if (verifyFilter !== 'all') data = data.filter(g => g.verificationStatus === verifyFilter);
    return data;
  }, [search, statusFilter, verifyFilter]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = [
    { label: 'Total Guardians', value: 3156, icon: <UserCheck className="w-5 h-5" />, color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30' },
    { label: 'Verified', value: 2780, icon: <CheckCircle className="w-5 h-5" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
    { label: 'Pending Verification', value: 310, icon: <Clock className="w-5 h-5" />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
    { label: 'Rejected', value: 66, icon: <XCircle className="w-5 h-5" />, color: 'text-red-600 bg-red-50 dark:bg-red-900/30' },
  ];

  const columns: Column<Guardian>[] = [
    {
      key: 'name', header: 'Guardian', sortable: true,
      render: row => (
        <div className="flex items-center gap-3">
          <Avatar name={row.name} size="sm" />
          <div>
            <p className="font-medium text-slate-900 dark:text-white text-sm">{row.name}</p>
            <p className="text-xs text-slate-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: row => <span className="text-xs font-mono text-slate-600 dark:text-slate-300">{row.phone}</span> },
    { key: 'relationship', header: 'Relationship', render: row => <Badge variant="default">{row.relationship}</Badge> },
    {
      key: 'linkedElderCount', header: 'Elders Linked', sortable: true,
      render: row => <Badge variant={row.linkedElderCount === 0 ? 'danger' : row.linkedElderCount >= 2 ? 'info' : 'teal'}>{row.linkedElderCount} elders</Badge>,
    },
    {
      key: 'verificationStatus', header: 'Verification',
      render: row => <StatusBadge status={row.verificationStatus} />,
    },
    {
      key: 'status', header: 'Status',
      render: row => <StatusBadge status={row.status} />,
    },
    { key: 'lastActive', header: 'Last Active', render: row => <span className="text-xs text-slate-500">{row.lastActive}</span> },
    {
      key: 'actions', header: 'Actions',
      render: () => (
        <div className="flex items-center gap-1">
          <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-brand-600 transition-colors">
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-teal-600 transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Guardians</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage guardian accounts and elder linkages</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<Download className="w-4 h-4" />} size="sm">Export</Button>
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} size="sm">Invite Guardian</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={cn('p-2.5 rounded-xl', s.color)}>{s.icon}</div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{s.value.toLocaleString()}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <Card noPadding>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search guardians..."
              className="input-field pl-9"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field !w-auto !py-1.5 text-xs">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select value={verifyFilter} onChange={e => { setVerifyFilter(e.target.value); setPage(1); }} className="input-field !w-auto !py-1.5 text-xs">
              <option value="all">All Verification</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        <Table columns={columns} data={paginated} keyField="id" emptyMessage="No guardians match your filters" />
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </Card>
    </div>
  );
}
