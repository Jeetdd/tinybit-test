import React, { useState } from 'react';
import { BookOpen, Mic, FileText, Share2, Search, Play, Download, Eye } from 'lucide-react';
import { Card, Table, Badge, Button, Pagination, Avatar, Tabs, cn } from '../../components/ui';
import type { Column } from '../../components/ui';
import { journalEntries } from '../../data/mockData';
import type { JournalEntry } from '../../types';

export function JournalManagement() {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const tabs = [
    { id: 'all', label: 'All Journals', count: journalEntries.length },
    { id: 'voice', label: 'Voice', count: journalEntries.filter(j => j.type === 'voice').length },
    { id: 'text', label: 'Text', count: journalEntries.filter(j => j.type === 'text').length },
    { id: 'shared', label: 'Shared', count: journalEntries.filter(j => j.isShared).length },
  ];

  const filtered = journalEntries.filter(j => {
    if (tab === 'voice' && j.type !== 'voice') return false;
    if (tab === 'text' && j.type !== 'text') return false;
    if (tab === 'shared' && !j.isShared) return false;
    if (search && !j.elderName.toLowerCase().includes(search.toLowerCase()) && !j.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const moodColors: Record<string, string> = {
    Happy: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30',
    Nostalgic: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30',
    Grateful: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30',
    Joyful: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
    Calm: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30',
  };

  const columns: Column<JournalEntry>[] = [
    {
      key: 'elderName', header: 'Elder',
      render: row => (
        <div className="flex items-center gap-3">
          <Avatar name={row.elderName} size="sm" />
          <span className="font-medium text-sm text-slate-900 dark:text-white">{row.elderName}</span>
        </div>
      ),
    },
    {
      key: 'type', header: 'Type',
      render: row => (
        <div className="flex items-center gap-1.5">
          <div className={cn('p-1.5 rounded-lg', row.type === 'voice' ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-600' : 'bg-brand-50 dark:bg-brand-900/30 text-brand-600')}>
            {row.type === 'voice' ? <Mic className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
          </div>
          <span className="text-xs font-medium capitalize">{row.type}</span>
        </div>
      ),
    },
    {
      key: 'title', header: 'Title',
      render: row => (
        <div>
          <p className="font-medium text-sm text-slate-900 dark:text-white">{row.title}</p>
          {row.content && <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{row.content}</p>}
        </div>
      ),
    },
    {
      key: 'mood', header: 'Mood',
      render: row => (
        <span className={cn('text-xs font-medium px-2 py-1 rounded-full', moodColors[row.mood] || 'bg-slate-50 text-slate-600')}>
          {row.mood}
        </span>
      ),
    },
    {
      key: 'isShared', header: 'Shared',
      render: row => row.isShared ? (
        <div className="flex items-center gap-1 text-teal-600 text-xs">
          <Share2 className="w-3.5 h-3.5" /> Shared
        </div>
      ) : <span className="text-xs text-slate-400">Private</span>,
    },
    {
      key: 'duration', header: 'Length',
      render: row => row.duration
        ? <span className="text-xs text-slate-600 dark:text-slate-300">{Math.floor(row.duration / 60)}m {row.duration % 60}s</span>
        : row.wordCount
          ? <span className="text-xs text-slate-600 dark:text-slate-300">{row.wordCount} words</span>
          : <span className="text-xs text-slate-400">—</span>,
    },
    { key: 'createdAt', header: 'Created', render: row => <span className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</span> },
    {
      key: 'actions', header: 'Actions',
      render: row => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {row.type === 'voice' && (
            <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-violet-600 transition-colors" title="Play">
              <Play className="w-3.5 h-3.5" />
            </button>
          )}
          <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-brand-600 transition-colors" title="View">
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-teal-600 transition-colors" title="Export PDF">
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Journal Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">View and manage voice and text journals from elders</p>
        </div>
        <Button variant="secondary" icon={<Download className="w-4 h-4" />} size="sm">Export All</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Journals', value: 45672, icon: <BookOpen className="w-5 h-5" />, color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30' },
          { label: 'Voice Journals', value: 28940, icon: <Mic className="w-5 h-5" />, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30' },
          { label: 'Text Journals', value: 16732, icon: <FileText className="w-5 h-5" />, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30' },
          { label: 'Shared Entries', value: 8341, icon: <Share2 className="w-5 h-5" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
        ].map(s => (
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
        <div className="px-4 pt-4 border-b border-slate-100 dark:border-slate-800">
          <Tabs tabs={tabs} active={tab} onChange={t => { setTab(t); setPage(1); }} />
        </div>
        <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search by elder or title..." className="input-field pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
        <Table columns={columns} data={filtered.slice((page - 1) * 10, page * 10)} keyField="id" emptyMessage="No journal entries found" />
        <Pagination page={page} pageSize={10} total={filtered.length} onPageChange={setPage} />
      </Card>
    </div>
  );
}
