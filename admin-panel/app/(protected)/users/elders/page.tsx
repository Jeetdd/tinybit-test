'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Filter, Download, UserPlus, Eye, Ban, Trash2 } from 'lucide-react';
import { Badge, Avatar, HealthRiskBadge, StatusBadge, Pagination, cn } from '@/src/components/ui';
import { elders } from '@/src/data/mockData';

export default function EldersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filtered = elders.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.city.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Elder Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{total} elders registered</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary"><Download className="w-4 h-4" /> Export</button>
          <button className="btn-primary"><UserPlus className="w-4 h-4" /> Add Elder</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-64 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, city..."
            className="bg-transparent text-sm outline-none w-full text-slate-700 dark:text-slate-200 placeholder-slate-400"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-field w-40"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
        <button className="btn-secondary"><Filter className="w-4 h-4" /> Filters</button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header rounded-tl-xl">Elder</th>
                <th className="table-header">Age / City</th>
                <th className="table-header">Health Risk</th>
                <th className="table-header">Guardians</th>
                <th className="table-header">Conditions</th>
                <th className="table-header">Status</th>
                <th className="table-header">Last Active</th>
                <th className="table-header rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(elder => (
                <tr key={elder.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <Avatar name={elder.name} size="sm" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white text-sm">{elder.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{elder.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <p className="text-sm">{elder.age} yrs</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{elder.city}</p>
                  </td>
                  <td className="table-cell">
                    <HealthRiskBadge score={elder.healthRiskScore} />
                  </td>
                  <td className="table-cell">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 text-xs font-bold">
                      {elder.guardianCount}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-1">
                      {elder.conditions.slice(0, 2).map(c => (
                        <Badge key={c} variant="default" size="sm">{c}</Badge>
                      ))}
                      {elder.conditions.length > 2 && (
                        <Badge variant="default" size="sm">+{elder.conditions.length - 2}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">
                    <StatusBadge status={elder.status} />
                  </td>
                  <td className="table-cell text-xs text-slate-500 dark:text-slate-400">
                    {elder.lastActive}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/users/elders/${elder.id}`}>
                        <button className="p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/30 text-brand-600 transition-colors" title="View profile">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                      <button className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-600 transition-colors" title="Suspend">
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total === 0 && (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500">No elders found matching your search.</div>
        )}
        {total > pageSize && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
