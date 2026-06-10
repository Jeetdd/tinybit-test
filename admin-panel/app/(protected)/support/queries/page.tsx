'use client';
import { Placeholder } from '@/src/components/Placeholder';
import { MessageSquare } from 'lucide-react';
export default function UserQueriesPage() {
  return <Placeholder title="User Queries" description="Browse and respond to general user queries submitted through the in-app help form." icon={<MessageSquare className="w-8 h-8 text-brand-400" />} />;
}
