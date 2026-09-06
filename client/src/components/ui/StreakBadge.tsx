import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flame } from 'lucide-react';
import { api } from '../../lib/api';

export function StreakBadge() {
  const { data } = useQuery({
    queryKey: ['streak'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: { streak: number; todayActivity: number } }>('/streak');
      return r.data.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  if (!data || data.streak === 0) return null;

  return (
    <div className={'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ' + (data.streak >= 7 ? 'bg-orange-100 text-orange-700' : 'bg-accent/20 text-primary')}>
      <Flame className={'w-4 h-4 ' + (data.streak >= 7 ? 'text-orange-500' : 'text-primary')} />
      {data.streak} day streak
    </div>
  );
}
