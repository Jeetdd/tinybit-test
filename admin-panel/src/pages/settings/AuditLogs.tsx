import React, { useState, useMemo } from 'react';
import { Search, Download, Filter, ScrollText, CheckCircle, XCircle, Shield } from 'lucide-react';
import { Card, Table, Badge, Button, Pagination, RoleBadge, cn } from '../../components/ui';
import type { Column } from '../../components/ui';
import { auditLogs } from '../../data/mockData';
import type { AuditLog } from '../../types';

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-brand-50 dark:bg-brand-900/30 text-brand-600',
  LOGIN_FAILED: 'bg-red-50 dark:bg-red-900/30 text-red-600',
  USER_STATUS_CHANGE: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600',
  EXPORT_DATA: 'bg-teal-50 dark:bg-teal-900/30 text-teal-600',
  SOS_ESCALATE: 'bg-red-50 dark:bg-red-900/30 text-red-600',
  VIDEO_PUBLISH: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600',
  EDIT_MEDICINE: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600',
  DELETE_RECORD: 'bg-red-50 dark:bg-red-900/30 text-red-600',
};

export function AuditLogs() {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filtered = useMemo(() => {
    let data = [...auditLogs];
    if (search) data = data.filter(l =>
      l.adminName.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase())
    );
    if (moduleFilter !== 'all') data = data.filter(l => l.module === moduleFilter);
    if (statusFilter !== 'all') data = data.filter(l => l.status === statusFilter);
    return data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [search, moduleFilter, statusFilter]);

  const modules = [...new Set(auditLogs.map(l => l.module))];

  const columns: Column<AuditLog>[] = [
    {
      key: 'adminName', header: 'Admin',
      render: row => (
        <div>
          <p className="font-medium text-slate-900 dark:text-white text-sm">{row.adminName}</p>
          <RoleBadge role={row.adminRole} />
        </div>
      ),
    },
    {
      key: 'action', header: 'Action',
      render: row => (
        <span className={cn('text-xs font-semibold px-2 py-1 rounded-md', ACTION_COLORS[row.action] || 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300')}>
          {row.action.replace(/_/g, ' ')}
        </span>
      ),
    },
    { key: 'module', header: 'Module', render: row => <Badge variant="default">{row.module}</Badge> },
    { key: 'details', header: 'Details', render: row => <span className="text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate block">{row.details}</span> },
    {
      key: 'status', header: 'Status',
      render: row => (
        <div className="flex items-center gap-1.5 text-xs">
          {row.status === 'success' ? (
            <><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-600 font-medium">Success</span></>
          ) : (
            <><XCircle className="w-3.5 h-3.5 text-red-500" /><span className="text-red-600 font-medium">Failed</span></>
          )}
        </div>
      ),
    },
    { key: 'ipAddress', header: 'IP Address', render: row => <span className="text-xs font-mono text-slate-500">{row.ipAddress}</span> },
    { key: 'timestamp', header: 'Timestamp', render: row => <span className="text-xs text-slate-500">{new Date(row.timestamp).toLocaleString()}</span> },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Complete record of all admin actions and system events</p>
        </div>
        <Button variant="secondary" icon={<Download className="w-4 h-4" />} size="sm">Export Logs</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Events (today)', value: auditLogs.length, icon: <ScrollText className="w-5 h-5" />, color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30' },
          { label: 'Successful', value: auditLogs.filter(l => l.status === 'success').length, icon: <CheckCircle className="w-5 h-5" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
          { label: 'Failed Actions', value: auditLogs.filter(l => l.status === 'failed').length, icon: <XCircle className="w-5 h-5" />, color: 'text-red-600 bg-red-50 dark:bg-red-900/30' },
          { label: 'Admin Users Active', value: new Set(auditLogs.map(l => l.adminId)).size, icon: <Shield className="w-5 h-5" />, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30' },
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

      <Card noPadding>
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 min-w-0 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search admin, action, details..." className="input-field pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select value={moduleFilter} onChange={e => { setModuleFilter(e.target.value); setPage(1); }} className="input-field !w-auto !py-1.5 text-xs">
            <option value="all">All Modules</option>
            {modules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field !w-auto !py-1.5 text-xs">
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <Table columns={columns} data={filtered.slice((page - 1) * pageSize, page * pageSize)} keyField="id" emptyMessage="No audit log entries found" />
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </Card>
    </div>
  );
}
