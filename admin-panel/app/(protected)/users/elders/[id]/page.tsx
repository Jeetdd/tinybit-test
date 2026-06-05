import { elders } from '@/src/data/mockData';
import { ElderProfileClient } from './client';

export function generateStaticParams() {
  return elders.map(e => ({ id: e.id }));
}

export default function ElderProfilePage({ params }: { params: { id: string } }) {
  return <ElderProfileClient id={params.id} />;
}
