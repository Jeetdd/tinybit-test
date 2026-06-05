'use client';
import { Placeholder } from '@/src/components/Placeholder';
import { Film } from 'lucide-react';
export default function VideosPage() {
  return <Placeholder title="Video Management" description="Manage health & wellness videos across YouTube, Vimeo and direct uploads." icon={<Film className="w-8 h-8 text-brand-400" />} />;
}
