import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Download, Plus, Eye, Edit2, Ban, MoreVertical, Users2, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Table, Badge, Button, Pagination, Avatar, StatusBadge, HealthRiskBadge, Card, Input, Select, cn } from '../../components/ui';
import type { Column } from '../../components/ui';
import { elders } from '../../data/mockData';
import type { Elder } from '../../types';

const STATS = [
  { label: 'Total Elders', value: 2847, icon: <Users2 className="w-5 h-5" />, color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30' },
  { label: 'Active', value: 2341, icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
  { label: 'High Risk', value: 537, icon: <AlertTriangle className="w-5 h-5" />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
  { label: 'Critical Risk', value: 157, icon: <Shield className="w-5 h-5" />, color: 'text-red-600 bg-red-50 dark:bg-red-900/30' },
];

export function Elders() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let data = [...elders];
    if (search) data = data.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase()) || e.phone.includes(search));
    if (statusFilter !== 'all') data = data.filter(e => e.status === statusFilter);
    if (cityFilter !== 'all') data = data.filter(e => e.city === cityFilter);
    if (riskFilter === 'critical') data = data.filter(e => e.healthRiskScore >= 80);
    else if (riskFilter === 'high') data = data.filter(e => e.healthRiskScore >= 60 && e.healthRiskScore < 80);
    else if (riskFilter === 'medium') data = data.filter(e => e.healthRiskScore >= 40 && e.healthRiskScore < 60);
    else if (riskFilter === 'low') data = data.filter(e => e.healthRiskScore < 40);

    data.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortKey];
      const bVal = (b as unknown as Record<string, unknown>)[sortKey];
      const cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return data;
  }, [search, statusFilter, cityFilter, riskFilter, sortKey, sortDir]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const cities = [...new Set(elders.map(e => e.city))];

  function handleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const columns: Column<Elder>[] = [
    {
      key: 'select', header: '',
      render: row => (
        <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)}
          className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" onClick={e => e.stopPropagation()} />
      ),
    },
    {
      key: 'name', header: 'Elder', sortable: true,
      render: row => (
        <div className="flex items-center gap-3">
          <Avatar name={row.name} size="sm" />
          <div>
            <p className="font-medium text-slate-900 dark:text-white text-sm">{row.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'age', header: 'Age', sortable: true, render: row => <span className="font-medium">{row.age} yrs</span> },
    { key: 'phone', header: 'Phone', render: row => <span className="text-slate-600 dark:text-slate-300 text-xs font-mono">{row.phone}</span> },
    { key: 'city', header: 'City', sortable: true },
    {
      key: 'status', header: 'Status',
      render: row => <StatusBadge status={row.status} />,
    },
    {
      key: 'guardianCount', header: 'Guardians', sortable: true,
      render: row => <Badge variant={row.guardianCount === 0 ? 'danger' : row.guardianCount >= 2 ? 'success' : 'warning'}>{row.guardianCount} linked</Badge>,
    },
    {
      key: 'healthRiskScore', header: 'Risk Score', sortable: true,
      render: row => <HealthRiskBadge score={row.healthRiskScore} />,
    },
    {
      key: 'lastActive', header: 'Last Active', sortable: true,
      render: row => <span className="text-xs text-slate-500">{row.lastActive}</span>,
    },
    {
      key: 'actions', header: 'Actions',
      render: row => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => navigate(`/users/elders/${row.id}`)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-brand-600 transition-colors" title="View Profile">
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-teal-600 transition-colors" title="Edit">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-red-500 transition-colors" title="Suspend">
            <Ban className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Elders</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage and monitor all registered elder users</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<Download className="w-4 h-4" />} size="sm">Export</Button>
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} size="sm">Add Elder</Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {STATS.map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={cn('p-2.5 rounded-xl', s.color)}>{s.icon}</div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{s.value.toLocaleString()}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <Card noPadding>
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 min-w-0 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              className="input-field pl-9"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              icon={<Filter className="w-4 h-4" />}
              size="sm"
              onClick={() => setShowFilters(p => !p)}
            >
              Filters {(statusFilter !== 'all' || cityFilter !== 'all' || riskFilter !== 'all') && <Badge variant="info" size="sm">{[statusFilter !== 'all', cityFilter !== 'all', riskFilter !== 'all'].filter(Boolean).length}</Badge>}
            </Button>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="info">{selectedIds.size} selected</Badge>
                <Button variant="secondary" size="xs">Bulk Export</Button>
                <Button variant="danger" size="xs">Suspend</Button>
              </div>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="flex flex-wrap items-end gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 animate-fade-in">
            <Select
              label="Status"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              options={[{ value: 'all', label: 'All Statuses' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'suspended', label: 'Suspended' }]}
              className="w-36"
            />
            <Select
              label="City"
              value={cityFilter}
              onChange={e => { setCityFilter(e.target.value); setPage(1); }}
              options={[{ value: 'all', label: 'All Cities' }, ...cities.map(c => ({ value: c, label: c }))]}
              className="w-36"
            />
            <Select
              label="Health Risk"
              value={riskFilter}
              onChange={e => { setRiskFilter(e.target.value); setPage(1); }}
              options={[
                { value: 'all', label: 'All Risks' },
                { value: 'critical', label: 'Critical (≥80)' },
                { value: 'high', label: 'High (60–79)' },
                { value: 'medium', label: 'Medium (40–59)' },
                { value: 'low', label: 'Low (<40)' },
              ]}
              className="w-40"
            />
            <Button variant="ghost" size="sm" onClick={() => { setStatusFilter('all'); setCityFilter('all'); setRiskFilter('all'); setPage(1); }}>
              Clear All
            </Button>
          </div>
        )}

        <Table
          columns={columns}
          data={paginated}
          keyField="id"
          onRowClick={row => navigate(`/users/elders/${row.id}`)}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          emptyMessage="No elders match your filters"
        />
        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </Card>
    </div>
  );
}
