'use client';
import { Placeholder } from '@/src/components/Placeholder';
import { Clock } from 'lucide-react';
export default function ScheduledNotificationsPage() {
  return <Placeholder title="Scheduled Notifications" description="View and manage notifications scheduled for future delivery. Cancel or reschedule pending items." icon={<Clock className="w-8 h-8 text-brand-400" />} />;
}
