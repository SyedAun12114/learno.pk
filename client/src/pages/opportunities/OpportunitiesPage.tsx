import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Bookmark, BookmarkCheck, ExternalLink, Search, CheckCircle2, XCircle, MapPin, Wifi } from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { useToast } from '../../hooks/useToast';
import { capitalize, formatDate } from '../../lib/utils';
import type { Opportunity } from '../../../../shared/types';

const TYPES = [
  { value: '', label: 'All types' }, { value: 'internship', label: 'Internship' },
  { value: 'freelance', label: 'Freelance' }, { value: 'part_time', label: 'Part-time' },
  { value: 'full_time', label: 'Full-time' }, { value: 'apprenticeship', label: 'Apprenticeship' },
];

const TYPE_COLORS: Record<string, string> = {
  internship: 'bg-blue-50 text-blue-700 border-blue-200',
  freelance: 'bg-purple-50 text-purple-700 border-purple-200',
  part_time: 'bg-green-50 text-green-700 border-green-200',
  full_time: 'bg-orange-50 text-orange-700 border-orange-200',
  apprenticeship: 'bg-pink-50 text-pink-700 border-pink-200',
};

export default function OpportunitiesPage() {
  const [tab, setTab] = useState<'browse' | 'matches' | 'saved'>('browse');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const toast = useToast();
  const qc = useQueryClient();

  const { data: opps = [], isLoading } = useQuery({
    queryKey: ['opportunities', tab, search, type],
    queryFn: async () => {
      if (tab === 'saved') {
        const r = await api.get<{ success: boolean; data: Opportunity[] }>('/opportunities/saved');
        return r.data.data;
      }
      if (tab === 'matches') {
        const r = await api.get<{ success: boolean; data: Opportunity[] }>('/opportunities/matches');
        return r.data.data;
      }
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      if (type) p.set('type', type);
      const r = await api.get<{ success: boolean; data: Opportunity[] }>('/opportunities?' + p.toString());
      return r.data.data;
    },
  });

  const save = useMutation({
    mutationFn: async ({ id, saved }: { id: number; saved: boolean }) =>
      saved ? api.delete('/opportunities/' + id + '/save') : api.post('/opportunities/' + id + '/save'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opportunities'] }),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="space-y-5 pb-16 md:pb-0">
      <h1 className="text-2xl font-bold text-primary">Opportunities</h1>

      <div className="flex gap-1 bg-surface rounded-xl p-1 w-fit overflow-x-auto">
        {[{ k: 'browse', l: 'Browse' }, { k: 'matches', l: 'My Matches' }, { k: 'saved', l: 'Saved' }].map(t => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as 'browse' | 'matches' | 'saved')}
            className={'px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ' + (tab === t.k ? 'bg-card text-primary shadow-sm' : 'text-muted hover:text-primary')}
          >
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'browse' && (
        <div className="flex gap-3">
          <div className="flex-1">
            <Input placeholder="Search opportunities..." value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
          </div>
          <div className="w-40">
            <Select options={TYPES} value={type} onChange={e => setType(e.target.value)} />
          </div>
        </div>
      )}

      {tab === 'matches' && (
        <Card className="bg-accent/5 border-accent/30">
          <p className="text-xs text-primary">Match percentage is based on your current skills and skills you are currently learning.</p>
        </Card>
      )}

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : opps.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="w-5 h-5" />}
          title={tab === 'saved' ? 'No saved opportunities' : tab === 'matches' ? 'No matches yet' : 'No opportunities found'}
          description={tab === 'saved' ? 'Save opportunities to view them here.' : tab === 'matches' ? 'Complete your profile to see personalized matches.' : 'Try a different search.'}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {(opps as Opportunity[]).map(opp => (
            <Card key={opp.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-primary text-sm leading-tight mb-1">{opp.title}</h3>
                  <p className="text-xs text-muted font-medium">{opp.company}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {tab === 'matches' && opp.matchPercent !== undefined && (
                    <span className={'text-xs font-bold px-2 py-1 rounded-lg ' + (opp.matchPercent >= 80 ? 'bg-green-50 text-green-700' : opp.matchPercent >= 60 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-600')}>
                      {opp.matchPercent}% match
                    </span>
                  )}
                  <button
                    onClick={() => save.mutate({ id: opp.id, saved: Boolean(opp.isSaved) })}
                    className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-primary transition-colors"
                  >
                    {opp.isSaved ? <BookmarkCheck className="w-4 h-4 text-accent" /> : <Bookmark className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className={'text-xs font-medium px-2 py-0.5 rounded-full border ' + (TYPE_COLORS[opp.type] || 'bg-surface text-muted border-border')}>
                  {capitalize(opp.type.replace('_', ' '))}
                </span>
                {opp.isRemote && (
                  <span className="flex items-center gap-1 text-xs text-muted px-2 py-0.5 rounded-full border border-border">
                    <Wifi className="w-2.5 h-2.5" /> Remote
                  </span>
                )}
                {opp.location && !opp.isRemote && (
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <MapPin className="w-2.5 h-2.5" /> {opp.location}
                  </span>
                )}
                {opp.deadline && <span className="text-xs text-muted">Due: {formatDate(opp.deadline)}</span>}
              </div>

              <p className="text-xs text-muted line-clamp-3 mb-3 flex-1">{opp.description}</p>

              {tab === 'matches' && opp.matchedSkills && (
                <div className="mb-3 space-y-2">
                  {opp.matchedSkills.length > 0 && (
                    <div>
                      <p className="text-xs text-muted mb-1">You have:</p>
                      <div className="flex flex-wrap gap-1">
                        {opp.matchedSkills.map(sk => (
                          <span key={sk} className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {(opp.missingSkills || []).length > 0 && (
                    <div>
                      <p className="text-xs text-muted mb-1">Still need:</p>
                      <div className="flex flex-wrap gap-1">
                        {(opp.missingSkills || []).map(sk => (
                          <span key={sk} className="flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" /> {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 mt-auto pt-2 border-t border-border">
                {opp.applicationUrl && (
                  <a href={opp.applicationUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button size="sm" variant="accent" className="w-full" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>Apply</Button>
                  </a>
                )}
                {tab === 'matches' && (opp.missingSkills || []).length > 0 && (
                  <a href="/app/skills" className="flex-1">
                    <Button size="sm" variant="secondary" className="w-full">Close skill gap</Button>
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
