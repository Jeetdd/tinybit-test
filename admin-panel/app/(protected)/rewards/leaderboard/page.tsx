'use client';
import React, { useState } from 'react';
import { Medal, Trophy, Zap, TrendingUp, Crown } from 'lucide-react';
import { cn } from '@/src/components/ui';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  userType: 'Elder' | 'Guardian';
  city: string;
  points: number;
  streak: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  change: 'up' | 'down' | 'same';
}

const leaderboard: LeaderboardEntry[] = [
  { rank: 1, userId: 'e003', name: 'Mohan Lal', userType: 'Elder', city: 'Bangalore', points: 4850, streak: 28, tier: 'Platinum', change: 'same' },
  { rank: 2, userId: 'e006', name: 'Sunita Rao', userType: 'Elder', city: 'Hyderabad', points: 4620, streak: 21, tier: 'Platinum', change: 'up' },
  { rank: 3, userId: 'e010', name: 'Manjula Nair', userType: 'Elder', city: 'Bangalore', points: 4310, streak: 18, tier: 'Gold', change: 'up' },
  { rank: 4, userId: 'e001', name: 'Ramesh Kumar', userType: 'Elder', city: 'Mumbai', points: 3980, streak: 14, tier: 'Gold', change: 'down' },
  { rank: 5, userId: 'g006', name: 'Kavita Reddy', userType: 'Guardian', city: 'Hyderabad', points: 3720, streak: 12, tier: 'Gold', change: 'up' },
  { rank: 6, userId: 'e008', name: 'Kamala Bai', userType: 'Elder', city: 'Mumbai', points: 3450, streak: 9, tier: 'Silver', change: 'same' },
  { rank: 7, userId: 'g001', name: 'Ankit Patel', userType: 'Guardian', city: 'Mumbai', points: 3180, streak: 8, tier: 'Silver', change: 'down' },
  { rank: 8, userId: 'e005', name: 'Baldev Singh', userType: 'Elder', city: 'Kolkata', points: 2940, streak: 7, tier: 'Silver', change: 'up' },
  { rank: 9, userId: 'g002', name: 'Neha Singh', userType: 'Guardian', city: 'Delhi', points: 2680, streak: 5, tier: 'Bronze', change: 'same' },
  { rank: 10, userId: 'e002', name: 'Savita Devi', userType: 'Elder', city: 'Delhi', points: 2410, streak: 4, tier: 'Bronze', change: 'down' },
];

const tierConfig: Record<string, { color: string; bg: string }> = {
  Platinum: { color: 'text-violet-700 dark:text-violet-300', bg: 'bg-violet-50 dark:bg-violet-900/20' },
  Gold: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  Silver: { color: 'text-slate-500 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800' },
  Bronze: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
};

const rankColors = ['text-amber-500', 'text-slate-400', 'text-orange-600'];

export default function LeaderboardPage() {
  const [view, setView] = useState<'all' | 'elders' | 'guardians'>('all');

  const filtered = leaderboard.filter(e => view === 'all' || e.userType.toLowerCase() === view.replace('s', ''));

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Trophy className="w-6 h-6 text-amber-500" /> Leaderboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Top users ranked by engagement points and streaks</p>
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-4">
        {[leaderboard[1], leaderboard[0], leaderboard[2]].map((entry, i) => {
          const podiumRank = [2, 1, 3][i];
          const heightClass = ['h-28', 'h-36', 'h-24'][i];
          const crownColors = ['text-slate-400', 'text-amber-500', 'text-orange-500'][i];
          return (
            <div key={entry.userId} className={cn('card p-5 flex flex-col items-center text-center', heightClass, 'justify-end')}>
              {podiumRank === 1 && <Crown className={cn('w-6 h-6 mb-2', crownColors)} />}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-400 to-teal-400 flex items-center justify-center text-white font-bold text-sm mb-2">
                {entry.name.split(' ').map(n => n[0]).join('')}
              </div>
              <p className="font-semibold text-slate-800 dark:text-white text-sm truncate w-full">{entry.name}</p>
              <p className="text-xs text-slate-400">{entry.points.toLocaleString()} pts</p>
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full mt-1', tierConfig[entry.tier].bg, tierConfig[entry.tier].color)}>
                #{podiumRank} · {entry.tier}
              </span>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {(['all', 'elders', 'guardians'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors border',
              view === v
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-400'
            )}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Full Ranking Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-5 py-3">Rank</th>
              <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3">User</th>
              <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3">Tier</th>
              <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3">Streak</th>
              <th className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400 px-5 py-3">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map(entry => (
              <tr key={entry.userId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('text-sm font-bold', entry.rank <= 3 ? rankColors[entry.rank - 1] : 'text-slate-400')}>
                      #{entry.rank}
                    </span>
                    <span className={cn('text-xs', entry.change === 'up' ? 'text-emerald-500' : entry.change === 'down' ? 'text-red-400' : 'text-slate-300')}>
                      {entry.change === 'up' ? '↑' : entry.change === 'down' ? '↓' : '—'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-teal-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {entry.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{entry.name}</p>
                      <p className="text-xs text-slate-400">{entry.userType} · {entry.city}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', tierConfig[entry.tier].bg, tierConfig[entry.tier].color)}>
                    {entry.tier}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-amber-600">
                    <Zap className="w-3.5 h-3.5" />
                    {entry.streak}d
                  </div>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-sm font-bold text-brand-600">{entry.points.toLocaleString()}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
