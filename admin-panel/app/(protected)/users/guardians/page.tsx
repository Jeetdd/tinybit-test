'use client';
import React, { useState } from 'react';
import { Search, UserPlus, Download, Eye, Ban, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Badge, Avatar, StatusBadge, Pagination } from '@/src/components/ui';
import { guardians } from '@/src/data/mockData';

export default function GuardiansPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filtered = guardians.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.email.toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const verifyIcons = {
    verified: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
    pending: <Clock className="w-3.5 h-3.5 text-amber-500" />,
    rejected: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Guardian Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{filtered.length} guardians registered</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary"><Download className="w-4 h-4" /> Export</button>
          <button className="btn-primary"><UserPlus className="w-4 h-4" /> Add Guardian</button>
        </div>
      </div>

      <div className="card p-4 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search guardians..."
            className="bg-transparent text-sm outline-none w-full text-slate-700 dark:text-slate-200 placeholder-slate-400"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Guardian</th>
                <th className="table-header">Relationship</th>
                <th className="table-header">Linked Elders</th>
                <th className="table-header">Verification</th>
                <th className="table-header">Status</th>
                <th className="table-header">Last Active</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(g => (
                <tr key={g.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <Avatar name={g.name} size="sm" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white text-sm">{g.name}</p>
                        <p className="text-xs text-slate-500">{g.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-sm">{g.relationship}</td>
                  <td className="table-cell">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-bold">
                      {g.linkedElderCount}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="flex items-center gap-1.5 text-sm capitalize">
                      {verifyIcons[g.verificationStatus]} {g.verificationStatus}
                    </span>
                  </td>
                  <td className="table-cell"><StatusBadge status={g.status} /></td>
                  <td className="table-cell text-xs text-slate-500">{g.lastActive}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1.5">
                      <button className="p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/30 text-brand-600 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-600 transition-colors"><Ban className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > pageSize && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
            <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
