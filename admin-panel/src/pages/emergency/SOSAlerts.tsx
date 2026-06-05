import React, { useState, useMemo } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, Clock, MapPin, Phone, Eye, ChevronUp, RefreshCw, Filter } from 'lucide-react';
import { Card, Badge, Button, Table, Pagination, Avatar, StatusBadge, SeverityBadge, Modal, InfoRow, cn } from '../../components/ui';
import type { Column } from '../../components/ui';
import { sosAlerts } from '../../data/mockData';
import type { SOSAlert } from '../../types';

export function SOSAlerts() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selected, setSelected] = useState<SOSAlert | null>(null);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    let data = [...sosAlerts];
    if (statusFilter !== 'all') data = data.filter(s => s.status === statusFilter);
    if (severityFilter !== 'all') data = data.filter(s => s.severity === severityFilter);
    return data;
  }, [statusFilter, severityFilter]);

  const active = sosAlerts.filter(s => s.status === 'active');
  const escalated = sosAlerts.filter(s => s.status === 'escalated');
  const resolved = sosAlerts.filter(s => s.status === 'resolved');

  async function handleRefresh() {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1000));
    setRefreshing(false);
  }

  const columns: Column<SOSAlert>[] = [
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
    { key: 'guardianName', header: 'Guardian', render: row => <span className="text-sm text-slate-600 dark:text-slate-300">{row.guardianName}</span> },
    { key: 'time', header: 'Time', render: row => <span className="text-xs text-slate-500">{new Date(row.time).toLocaleString()}</span> },
    {
      key: 'location', header: 'Location',
      render: row => (
        <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
          <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
          <span className="truncate max-w-[140px]">{row.location.address}</span>
        </div>
      ),
    },
    { key: 'severity', header: 'Severity', render: row => <SeverityBadge severity={row.severity} /> },
    { key: 'status', header: 'Status', render: row => <StatusBadge status={row.status} /> },
    {
      key: 'actions', header: 'Actions',
      render: row => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="xs" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => setSelected(row)}>View</Button>
          {row.status === 'active' && (
            <>
              <Button variant="secondary" size="xs" icon={<Phone className="w-3.5 h-3.5" />}>Call</Button>
              <Button variant="danger" size="xs" icon={<ChevronUp className="w-3.5 h-3.5" />}>Escalate</Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">SOS Alerts</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Real-time emergency monitoring</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />} onClick={handleRefresh}>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Live Active Alerts */}
      {active.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <h3 className="font-bold text-red-700 dark:text-red-400 text-sm">{active.length} ACTIVE EMERGENCY ALERT{active.length > 1 ? 'S' : ''}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {active.map(alert => (
              <div key={alert.id} className="flex items-start gap-3 bg-white dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 cursor-pointer hover:border-red-400 transition-colors" onClick={() => setSelected(alert)}>
                <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm text-red-800 dark:text-red-300">{alert.elderName}</p>
                    <SeverityBadge severity={alert.severity} />
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{alert.description}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{alert.location.address}
                  </p>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <Button variant="danger" size="xs" icon={<Phone className="w-3 h-3" />}>Call</Button>
                  <Button variant="secondary" size="xs">Resolve</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active Now', value: active.length, icon: <ShieldAlert className="w-5 h-5" />, color: 'text-red-600 bg-red-50 dark:bg-red-900/30' },
          { label: 'Escalated', value: escalated.length, icon: <AlertTriangle className="w-5 h-5" />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
          { label: 'Resolved Today', value: resolved.length, icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
          { label: 'Avg Response', value: '2m 34s', icon: <Clock className="w-5 h-5" />, color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30' },
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

      {/* Table */}
      <Card noPadding>
        <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="section-title flex-1">All Alerts</h3>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field !w-auto !py-1.5 text-xs">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="escalated">Escalated</option>
            <option value="false_alarm">False Alarm</option>
          </select>
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="input-field !w-auto !py-1.5 text-xs">
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <Table columns={columns} data={filtered.slice((page - 1) * 10, page * 10)} keyField="id" onRowClick={setSelected} />
        <Pagination page={page} pageSize={10} total={filtered.length} onPageChange={setPage} />
      </Card>

      {/* Detail Modal */}
      {selected && (
        <Modal
          open={!!selected}
          onClose={() => setSelected(null)}
          title="SOS Alert Details"
          size="md"
          footer={
            <>
              <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
              {selected.status === 'active' && (
                <>
                  <Button variant="teal" icon={<Phone className="w-4 h-4" />}>Call Guardian</Button>
                  <Button variant="danger" icon={<ChevronUp className="w-4 h-4" />}>Escalate</Button>
                </>
              )}
            </>
          }
        >
          <div className="space-y-1">
            <InfoRow label="Elder" value={
              <div className="flex items-center gap-2">
                <Avatar name={selected.elderName} size="xs" />
                <span>{selected.elderName}</span>
              </div>
            } />
            <InfoRow label="Guardian" value={selected.guardianName} />
            <InfoRow label="Time" value={new Date(selected.time).toLocaleString()} />
            <InfoRow label="Status" value={<StatusBadge status={selected.status} />} />
            <InfoRow label="Severity" value={<SeverityBadge severity={selected.severity} />} />
            <InfoRow label="Location" value={
              <div>
                <p>{selected.location.address}</p>
                <p className="text-xs text-slate-400 font-mono">Lat: {selected.location.lat}, Lng: {selected.location.lng}</p>
              </div>
            } />
            {selected.description && <InfoRow label="Description" value={selected.description} />}
            {selected.resolvedAt && (
              <>
                <InfoRow label="Resolved At" value={new Date(selected.resolvedAt).toLocaleString()} />
                <InfoRow label="Resolved By" value={selected.resolvedBy || '—'} />
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
