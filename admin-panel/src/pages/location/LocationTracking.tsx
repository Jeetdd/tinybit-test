import React, { useState } from 'react';
import { MapPin, Navigation, Shield, AlertTriangle, Eye, Clock, Users2 } from 'lucide-react';
import { Card, Badge, Button, Avatar, Tabs, cn } from '../../components/ui';

const LIVE_LOCATIONS = [
  { id: 'e001', name: 'Ramesh Kumar', age: 74, address: 'Marine Lines, Mumbai', lat: 19.076, lng: 72.877, lastSeen: '2 min ago', status: 'safe', battery: 82 },
  { id: 'e002', name: 'Savita Devi', age: 78, address: 'Nehru Nagar, Delhi', lat: 28.644, lng: 77.216, lastSeen: '5 min ago', status: 'sos', battery: 34 },
  { id: 'e003', name: 'Mohan Lal', age: 69, address: 'Koramangala, Bangalore', lat: 12.971, lng: 77.594, lastSeen: '8 min ago', status: 'safe', battery: 91 },
  { id: 'e004', name: 'Geeta Verma', age: 81, address: 'Anna Nagar, Delhi', lat: 28.679, lng: 77.069, lastSeen: '12 min ago', status: 'warning', battery: 18 },
  { id: 'e006', name: 'Sunita Rao', age: 71, address: 'Banjara Hills, Hyderabad', lat: 17.415, lng: 78.448, lastSeen: '3 min ago', status: 'safe', battery: 67 },
];

const GEOFENCES = [
  { id: 'gf1', name: 'Home Zone — Ramesh Kumar', radius: '200m', type: 'home', status: 'active', alerts: 0 },
  { id: 'gf2', name: 'Danger Zone — Mumbai Highway', radius: '500m', type: 'danger', status: 'active', alerts: 2 },
  { id: 'gf3', name: 'Medical Area — Apollo Hospital', radius: '300m', type: 'medical', status: 'active', alerts: 0 },
  { id: 'gf4', name: 'Park Zone — Cubbon Park', radius: '400m', type: 'safe', status: 'active', alerts: 0 },
];

export function LocationTracking() {
  const [tab, setTab] = useState('live');

  const tabs = [
    { id: 'live', label: 'Live Locations' },
    { id: 'history', label: 'Movement History' },
    { id: 'geofencing', label: 'Geofencing' },
  ];

  const statusColors: Record<string, string> = {
    safe: 'text-emerald-600 bg-emerald-500',
    sos: 'text-red-600 bg-red-500',
    warning: 'text-amber-600 bg-amber-500',
  };

  const fenceColors: Record<string, string> = {
    home: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30',
    danger: 'text-red-600 bg-red-50 dark:bg-red-900/30',
    medical: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30',
    safe: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Location Tracking</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Real-time GPS tracking and geofencing management</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" dot>Live Tracking Active</Badge>
          <Button variant="primary" icon={<Shield className="w-4 h-4" />} size="sm">Manage Geofences</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tracked Now', value: LIVE_LOCATIONS.length, icon: <Navigation className="w-5 h-5" />, color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30' },
          { label: 'In Safe Zone', value: LIVE_LOCATIONS.filter(l => l.status === 'safe').length, icon: <Shield className="w-5 h-5" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
          { label: 'SOS / Warning', value: LIVE_LOCATIONS.filter(l => l.status !== 'safe').length, icon: <AlertTriangle className="w-5 h-5" />, color: 'text-red-600 bg-red-50 dark:bg-red-900/30' },
          { label: 'Active Geofences', value: GEOFENCES.filter(g => g.status === 'active').length, icon: <MapPin className="w-5 h-5" />, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30' },
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
        <div className="px-4 pt-4 border-b border-slate-100 dark:border-slate-800">
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
        </div>

        {tab === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800">
            {/* Elder List */}
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {LIVE_LOCATIONS.map(loc => (
                <div key={loc.id} className="flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                  <div className="relative">
                    <Avatar name={loc.name} size="sm" />
                    <span className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900', statusColors[loc.status].split(' ')[1])} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 dark:text-white">{loc.name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 flex-shrink-0" />{loc.address}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="w-3 h-3" />{loc.lastSeen}
                      </div>
                      <div className={cn('text-[10px] font-medium', loc.battery < 20 ? 'text-red-500' : loc.battery < 40 ? 'text-amber-500' : 'text-emerald-500')}>
                        🔋 {loc.battery}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-brand-600 transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {loc.status === 'sos' && (
                      <Badge variant="danger" size="sm">SOS</Badge>
                    )}
                    {loc.status === 'warning' && (
                      <Badge variant="warning" size="sm">Low Bat</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Map Placeholder */}
            <div className="lg:col-span-2 relative min-h-[480px] bg-slate-100 dark:bg-slate-800">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-brand-500" />
                  </div>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">Google Maps Integration</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                    Connect Google Maps API key in settings to enable live GPS tracking visualization
                  </p>
                  <Button variant="primary" className="mt-4" size="sm" icon={<MapPin className="w-4 h-4" />}>Configure Maps API</Button>
                </div>
              </div>
              {/* Decorative map grid overlay */}
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #64748b 0, #64748b 1px, transparent 0, transparent 50%), repeating-linear-gradient(90deg, #64748b 0, #64748b 1px, transparent 0, transparent 50%)', backgroundSize: '40px 40px' }} />
              {/* Mock location pins */}
              {LIVE_LOCATIONS.slice(0, 3).map((loc, i) => (
                <div
                  key={loc.id}
                  className={cn('absolute w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 shadow-lg flex items-center justify-center', loc.status === 'sos' ? 'bg-red-500 animate-pulse' : loc.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500')}
                  style={{ left: `${25 + i * 25}%`, top: `${30 + (i % 2) * 25}%` }}
                  title={loc.name}
                />
              ))}
            </div>
          </div>
        )}

        {tab === 'geofencing' && (
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {GEOFENCES.map(fence => (
                <div key={fence.id} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className={cn('p-2.5 rounded-xl', fenceColors[fence.type])}>
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">{fence.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Radius: {fence.radius}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={fence.status === 'active' ? 'success' : 'default'} dot>{fence.status}</Badge>
                    {fence.alerts > 0 && <p className="text-xs text-red-500 font-medium mt-1">{fence.alerts} alerts</p>}
                  </div>
                </div>
              ))}
              <button className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors">
                <MapPin className="w-5 h-5" />
                <span className="text-sm font-medium">Add New Geofence</span>
              </button>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-slate-400" />
            </div>
            <p className="font-medium text-slate-700 dark:text-slate-200">Movement History</p>
            <p className="text-sm text-slate-500 mt-1">Select an elder to view their location history on the map</p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {LIVE_LOCATIONS.map(loc => (
                <button key={loc.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-brand-400 transition-colors">
                  <Avatar name={loc.name} size="xs" />
                  {loc.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
