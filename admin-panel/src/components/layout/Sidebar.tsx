'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, UserCheck, Heart, Pill, Activity, FileText,
  AlertTriangle, Phone, ShieldAlert, Bot, MessageSquare, BookOpen,
  Calendar, MapPin, Video, Bell, BarChart3, Settings, LogOut,
  ChevronDown, ChevronRight, ChevronLeft, UserPlus, Inbox,
  Stethoscope, ClipboardList, TrendingUp, Trophy, Award,
  Zap, Map, Film, HelpCircle, Wind, Gift, Key, ScrollText,
  Layers, DollarSign, Users2,
} from 'lucide-react';
import { cn } from '../ui';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: NavItem[];
  badge?: { text: string; variant: 'danger' | 'warning' | 'info' };
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, path: '/dashboard' },
  {
    id: 'users', label: 'User Management', icon: <Users className="w-4 h-4" />,
    children: [
      { id: 'elders', label: 'Elders', icon: <Users2 className="w-4 h-4" />, path: '/users/elders' },
      { id: 'guardians', label: 'Guardians', icon: <UserCheck className="w-4 h-4" />, path: '/users/guardians' },
      { id: 'family-circle', label: 'Family Circle', icon: <Users className="w-4 h-4" />, path: '/users/family-circle' },
      { id: 'invitations', label: 'Pending Invitations', icon: <Inbox className="w-4 h-4" />, path: '/users/invitations', badge: { text: '12', variant: 'warning' } },
    ],
  },
  {
    id: 'health', label: 'Health Management', icon: <Heart className="w-4 h-4" />,
    children: [
      { id: 'medicines', label: 'Medicine Management', icon: <Pill className="w-4 h-4" />, path: '/health/medicines' },
      { id: 'wellness', label: 'Wellness Logs', icon: <Activity className="w-4 h-4" />, path: '/health/wellness' },
      { id: 'checkins', label: 'Daily Check-ins', icon: <ClipboardList className="w-4 h-4" />, path: '/health/checkins' },
      { id: 'vault', label: 'Health Vault', icon: <FileText className="w-4 h-4" />, path: '/health/vault' },
      { id: 'conditions', label: 'Medical Conditions', icon: <Stethoscope className="w-4 h-4" />, path: '/health/conditions' },
    ],
  },
  {
    id: 'emergency', label: 'Emergency Management', icon: <AlertTriangle className="w-4 h-4" />,
    children: [
      { id: 'sos', label: 'SOS Alerts', icon: <ShieldAlert className="w-4 h-4" />, path: '/emergency/sos', badge: { text: '7', variant: 'danger' } },
      { id: 'emergency-contacts', label: 'Emergency Contacts', icon: <Phone className="w-4 h-4" />, path: '/emergency/contacts' },
      { id: 'incidents', label: 'Incident Reports', icon: <FileText className="w-4 h-4" />, path: '/emergency/incidents' },
    ],
  },
  {
    id: 'ai', label: 'AI Management', icon: <Bot className="w-4 h-4" />,
    children: [
      { id: 'ai-usage', label: 'AI Chat Usage', icon: <MessageSquare className="w-4 h-4" />, path: '/ai/usage' },
      { id: 'ai-analytics', label: 'Token Analytics', icon: <TrendingUp className="w-4 h-4" />, path: '/ai/analytics' },
      { id: 'ai-conversations', label: 'Conversations', icon: <Layers className="w-4 h-4" />, path: '/ai/conversations' },
      { id: 'prompt-templates', label: 'Prompt Templates', icon: <FileText className="w-4 h-4" />, path: '/ai/prompts' },
      { id: 'ai-costs', label: 'AI Cost Tracking', icon: <DollarSign className="w-4 h-4" />, path: '/ai/costs' },
    ],
  },
  {
    id: 'journal', label: 'Journal Management', icon: <BookOpen className="w-4 h-4" />,
    children: [
      { id: 'voice-journals', label: 'Voice Journals', icon: <Zap className="w-4 h-4" />, path: '/journal/voice' },
      { id: 'text-journals', label: 'Text Journals', icon: <FileText className="w-4 h-4" />, path: '/journal/text' },
      { id: 'shared-journals', label: 'Shared Journals', icon: <Users className="w-4 h-4" />, path: '/journal/shared' },
    ],
  },
  {
    id: 'care', label: 'Care Management', icon: <Calendar className="w-4 h-4" />,
    children: [
      { id: 'care-calendar', label: 'Care Calendar', icon: <Calendar className="w-4 h-4" />, path: '/care/calendar' },
      { id: 'appointments', label: 'Appointments', icon: <UserPlus className="w-4 h-4" />, path: '/care/appointments' },
      { id: 'family-events', label: 'Family Events', icon: <Gift className="w-4 h-4" />, path: '/care/family-events' },
      { id: 'doctors', label: 'Doctor Records', icon: <Stethoscope className="w-4 h-4" />, path: '/care/doctors' },
    ],
  },
  {
    id: 'location', label: 'Location Tracking', icon: <MapPin className="w-4 h-4" />,
    children: [
      { id: 'live-location', label: 'Live Locations', icon: <Map className="w-4 h-4" />, path: '/location/live' },
      { id: 'movement-history', label: 'Movement History', icon: <Activity className="w-4 h-4" />, path: '/location/history' },
      { id: 'geofencing', label: 'Geofencing', icon: <MapPin className="w-4 h-4" />, path: '/location/geofencing' },
    ],
  },
  {
    id: 'content', label: 'Content Management', icon: <Video className="w-4 h-4" />,
    children: [
      { id: 'videos', label: 'Videos', icon: <Film className="w-4 h-4" />, path: '/content/videos' },
      { id: 'tutorials', label: 'Tutorials', icon: <HelpCircle className="w-4 h-4" />, path: '/content/tutorials' },
      { id: 'breathing', label: 'Breathing Programs', icon: <Wind className="w-4 h-4" />, path: '/content/breathing' },
    ],
  },
  { id: 'reports', label: 'Reports & Analytics', icon: <BarChart3 className="w-4 h-4" />, path: '/reports' },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, path: '/notifications' },
  {
    id: 'rewards', label: 'Rewards & Gamification', icon: <Trophy className="w-4 h-4" />,
    children: [
      { id: 'streaks', label: 'Streaks', icon: <Zap className="w-4 h-4" />, path: '/rewards/streaks' },
      { id: 'badges', label: 'Badges', icon: <Award className="w-4 h-4" />, path: '/rewards/badges' },
      { id: 'achievements', label: 'Achievements', icon: <Trophy className="w-4 h-4" />, path: '/rewards/achievements' },
    ],
  },
  {
    id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" />,
    children: [
      { id: 'general-settings', label: 'General Settings', icon: <Settings className="w-4 h-4" />, path: '/settings/general' },
      { id: 'api-keys', label: 'API Keys', icon: <Key className="w-4 h-4" />, path: '/settings/api-keys' },
      { id: 'audit-logs', label: 'Audit Logs', icon: <ScrollText className="w-4 h-4" />, path: '/settings/audit-logs' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    const set = new Set<string>();
    NAV_ITEMS.forEach(item => {
      if (item.children?.some(child => pathname === child.path || pathname.startsWith((child.path || '') + '/'))) {
        set.add(item.id);
      }
    });
    return set;
  });

  function toggleSection(id: string) {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function isActiveParent(item: NavItem): boolean {
    return item.children?.some(child => pathname === child.path || pathname.startsWith((child.path || '') + '/')) ?? false;
  }

  function isActivePath(path: string): boolean {
    return pathname === path || pathname.startsWith(path + '/');
  }

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    operations_admin: 'Operations Admin',
    healthcare_admin: 'Healthcare Admin',
    content_manager: 'Content Manager',
    support_manager: 'Support Manager',
    moderator: 'Moderator',
  };

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-screen z-40 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out',
      collapsed ? 'w-[68px]' : 'w-[260px]'
    )}>
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-white font-bold text-sm">TB</span>
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white text-sm">TinyBit</span>
              <span className="ml-1.5 text-[10px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-1.5 py-0.5 rounded">ADMIN</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-teal-500 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">TB</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className={cn('p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors', collapsed && 'hidden')}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(item => {
          const isOpen = openSections.has(item.id);
          const isActive = isActiveParent(item);

          if (!item.children) {
            const active = isActivePath(item.path!);
            return (
              <Link
                key={item.id}
                href={item.path!}
                title={collapsed ? item.label : undefined}
                className={cn('sidebar-link', active && 'active')}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                {!collapsed && item.badge && (
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', item.badge.variant === 'danger' ? 'bg-red-500 text-white' : item.badge.variant === 'warning' ? 'bg-amber-500 text-white' : 'bg-brand-500 text-white')}>
                    {item.badge.text}
                  </span>
                )}
              </Link>
            );
          }

          return (
            <div key={item.id}>
              <button
                onClick={() => !collapsed && toggleSection(item.id)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'sidebar-link w-full',
                  isActive && !isOpen && 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400',
                  collapsed && 'justify-center'
                )}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate text-left">{item.label}</span>
                    <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0', isOpen && 'rotate-180')} />
                  </>
                )}
              </button>

              {!collapsed && isOpen && (
                <div className="ml-3 mt-0.5 pl-3 border-l border-slate-200 dark:border-slate-700 space-y-0.5 animate-fade-in">
                  {item.children.map(child => {
                    const childActive = isActivePath(child.path!);
                    return (
                      <Link
                        key={child.id}
                        href={child.path!}
                        className={cn('sidebar-link text-xs py-1.5', childActive && 'active')}
                      >
                        <span className="flex-shrink-0 opacity-70">{child.icon}</span>
                        <span className="flex-1 truncate">{child.label}</span>
                        {child.badge && (
                          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', child.badge.variant === 'danger' ? 'bg-red-500 text-white' : child.badge.variant === 'warning' ? 'bg-amber-500 text-white' : 'bg-brand-500 text-white')}>
                            {child.badge.text}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className={cn('flex-shrink-0 border-t border-slate-200 dark:border-slate-800 p-3', collapsed ? 'flex flex-col items-center gap-2' : '')}>
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{roleLabels[user.role]}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={logout}
          title="Logout"
          className={cn('sidebar-link w-full text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600', collapsed && 'justify-center')}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
