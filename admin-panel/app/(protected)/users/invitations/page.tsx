'use client';
import { Placeholder } from '@/src/components/Placeholder';
import { Inbox } from 'lucide-react';
export default function InvitationsPage() {
  return <Placeholder title="Pending Invitations" description="Review and manage pending guardian invitation requests." icon={<Inbox className="w-8 h-8 text-brand-400" />} />;
}
