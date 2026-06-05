import React, { useState, useMemo } from 'react';
import { Search, Plus, Download, Pill, TrendingUp, AlertCircle, Package, Filter } from 'lucide-react';
import { Card, Table, Badge, Button, Pagination, Avatar, StatusBadge, ProgressBar, cn } from '../../components/ui';
import type { Column } from '../../components/ui';
import { medicines } from '../../data/mockData';
import type { Medicine } from '../../types';
import { MedicineAdherenceChart } from '../../components/charts';
import { medicineAdherenceData } from '../../data/mockData';

export function MedicineManagement() {
  const [search, setSearch] = useState('');
  const [refillFilter, setRefillFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    let data = [...medicines];
    if (search) data = data.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.elderName.toLowerCase().includes(search.toLowerCase()));
    if (refillFilter !== 'all') data = data.filter(m => m.refillStatus === refillFilter);
    return data;
  }, [search, refillFilter]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const avgAdherence = Math.round(medicines.reduce((s, m) => s + m.adherenceRate, 0) / medicines.length);
  const lowStock = medicines.filter(m => m.refillStatus === 'low').length;
  const emptyStock = medicines.filter(m => m.refillStatus === 'empty').length;

  const columns: Column<Medicine>[] = [
    {
      key: 'name', header: 'Medicine',
      render: row => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-lg">
            <Pill className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-900 dark:text-white">{row.name}</p>
            <p className="text-xs text-slate-500">{row.dosage} · {row.frequency}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'elderName', header: 'Elder',
      render: row => (
        <div className="flex items-center gap-2">
          <Avatar name={row.elderName} size="xs" />
          <span className="text-sm text-slate-700 dark:text-slate-200">{row.elderName}</span>
        </div>
      ),
    },
    { key: 'schedule', header: 'Schedule', render: row => <span className="text-xs text-slate-600 dark:text-slate-300">{row.schedule}</span> },
    { key: 'prescribedBy', header: 'Prescribed By', render: row => <span className="text-xs text-slate-600 dark:text-slate-300">{row.prescribedBy}</span> },
    {
      key: 'adherenceRate', header: 'Adherence', sortable: true,
      render: row => (
        <div className="w-28">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={cn('font-medium', row.adherenceRate >= 80 ? 'text-emerald-600' : row.adherenceRate >= 60 ? 'text-amber-600' : 'text-red-600')}>{row.adherenceRate}%</span>
          </div>
          <ProgressBar value={row.adherenceRate} color={row.adherenceRate >= 80 ? 'green' : row.adherenceRate >= 60 ? 'amber' : 'red'} size="sm" />
        </div>
      ),
    },
    { key: 'refillStatus', header: 'Refill Status', render: row => <StatusBadge status={row.refillStatus} /> },
    {
      key: 'nextDue', header: 'Next Due',
      render: row => <span className="text-xs text-slate-500">{row.nextDue || '—'}</span>,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Medicine Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Track prescriptions, adherence and refills</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<Download className="w-4 h-4" />} size="sm">Export</Button>
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} size="sm">Add Medicine</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active Medicines', value: medicines.filter(m => m.status === 'active').length, icon: <Pill className="w-5 h-5" />, color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30' },
          { label: 'Avg. Adherence', value: `${avgAdherence}%`, icon: <TrendingUp className="w-5 h-5" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
          { label: 'Low Stock', value: lowStock, icon: <AlertCircle className="w-5 h-5" />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
          { label: 'Out of Stock', value: emptyStock, icon: <Package className="w-5 h-5" />, color: 'text-red-600 bg-red-50 dark:bg-red-900/30' },
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

      {/* Chart + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card title="Weekly Adherence Trends" subtitle="Taken vs Missed vs Delayed (%)" className="lg:col-span-2">
          <MedicineAdherenceChart data={medicineAdherenceData as unknown as Record<string, unknown>[]} />
        </Card>
        <Card title="Refill Status Overview" subtitle="Current stock levels">
          <div className="space-y-4 mt-2">
            {[
              { label: 'Well Stocked (OK)', value: medicines.filter(m => m.refillStatus === 'ok').length, total: medicines.length, color: 'green' as const },
              { label: 'Low Stock', value: lowStock, total: medicines.length, color: 'amber' as const },
              { label: 'Out of Stock', value: emptyStock, total: medicines.length, color: 'red' as const },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 mb-1.5">
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.value} / {item.total}</span>
                </div>
                <ProgressBar value={item.value} max={item.total} color={item.color} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card noPadding>
        <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search medicines or elder name..." className="input-field pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select value={refillFilter} onChange={e => { setRefillFilter(e.target.value); setPage(1); }} className="input-field !w-auto !py-1.5 text-xs">
            <option value="all">All Refill Status</option>
            <option value="ok">OK</option>
            <option value="low">Low Stock</option>
            <option value="empty">Out of Stock</option>
          </select>
        </div>
        <Table columns={columns} data={paginated} keyField="id" emptyMessage="No medicines found" />
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </Card>
    </div>
  );
}
