import React, { useState } from 'react';
import { Film, Plus, Search, Eye, Edit2, Trash2, Play, Youtube, ExternalLink } from 'lucide-react';
import { Card, Badge, Button, Pagination, StatusBadge, Modal, cn } from '../../components/ui';
import { videos } from '../../data/mockData';
import type { Video } from '../../types';

const CATEGORIES = ['All', 'Health', 'Wellness', 'Memory Training', 'Tutorials', 'Motivation'];

export function VideoManagement() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Video | null>(null);
  const PAGE_SIZE = 6;

  const filtered = videos.filter(v => {
    if (search && !v.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== 'All' && v.category !== category) return false;
    return true;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const platformIcon = (platform: string) => platform === 'youtube' ? '▶' : platform === 'vimeo' ? '◆' : '◉';
  const platformColor = (platform: string) => platform === 'youtube' ? 'text-red-500' : platform === 'vimeo' ? 'text-brand-500' : 'text-teal-500';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Video Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage health and wellness videos for elder users</p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />}>Upload Video</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Videos', value: videos.length, color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30' },
          { label: 'Active', value: videos.filter(v => v.status === 'active').length, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
          { label: 'Processing', value: videos.filter(v => v.status === 'processing').length, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
          { label: 'Total Views', value: videos.reduce((s, v) => s + v.views, 0).toLocaleString(), color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30' },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={cn('p-2.5 rounded-xl', s.color)}>
              <Film className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search videos..." className="input-field pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => { setCategory(c); setPage(1); }}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-all', category === c ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700')}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
        {paginated.map(video => (
          <div key={video.id} className="card overflow-hidden group">
            {/* Thumbnail */}
            <div className="relative aspect-video bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={e => { (e.target as HTMLImageElement).src = ''; }}
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button onClick={() => setSelected(video)} className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 text-slate-900 ml-0.5" />
                </button>
              </div>
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-mono">{video.duration}</div>
              <div className="absolute top-2 left-2"><StatusBadge status={video.status} /></div>
            </div>
            {/* Content */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white leading-snug flex-1">{video.title}</h3>
                <span className={cn('text-sm font-bold flex-shrink-0', platformColor(video.platform))}>{platformIcon(video.platform)}</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="info" size="sm">{video.category}</Badge>
                <Badge variant="default" size="sm">{video.language}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{video.views.toLocaleString()}</span>
                  <span>{new Date(video.uploadedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-brand-600 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="card">
        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
      </div>

      {/* Video Preview Modal */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={selected.title} size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
              <Button variant="primary" icon={<ExternalLink className="w-4 h-4" />}>Open in Player</Button>
            </>
          }
        >
          <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center mb-4">
            <div className="text-center text-white">
              <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm opacity-60">Video player integration required</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">{selected.category}</Badge>
            <Badge variant="default">{selected.language}</Badge>
            <Badge variant={selected.status === 'active' ? 'success' : selected.status === 'processing' ? 'warning' : 'default'}>{selected.status}</Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-3">{selected.description}</p>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Views', value: selected.views.toLocaleString() },
              { label: 'Duration', value: selected.duration },
              { label: 'Platform', value: selected.platform },
            ].map(m => (
              <div key={m.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                <p className="font-bold text-slate-900 dark:text-white">{m.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
