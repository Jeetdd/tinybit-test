'use client';
import { Placeholder } from '@/src/components/Placeholder';
import { MessageCircle } from 'lucide-react';
export default function ChatSupportPage() {
  return <Placeholder title="Chat Support" description="Manage live chat support sessions with users. View active conversations and agent assignments." icon={<MessageCircle className="w-8 h-8 text-brand-400" />} />;
}
