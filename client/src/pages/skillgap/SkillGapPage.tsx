import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, TrendingUp, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Progress } from '../../components/ui/Progress';
import { api } from '../../lib/api';

interface Match {
  id: number;
  title: string;
  company: string;
  type: string;
  matchPercent: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export default function SkillGapPage() {
  const { data: matches = [], isLoading, error } = useQuery({
    queryKey: ['skill-gap'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: Match[] }>('/opportunities/matches');
      return r.data.data || [];
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: { currentSkills?: string } }>('/profile');
      return r.data.data;
    },
  });

  const { data: mySkills = [] } = useQuery({
    queryKey: ['my-skills'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: unknown[] }>('/skills/my-skills');
      return r.data.data || [];
    },
  });

  const allMissingSkills = (matches as Match[]).flatMap(m => m.missingSkills || []);
  const skillFreq = allMissingSkills.reduce((acc: Record<string, number>, skill) => {
    acc[skill] = (acc[skill] || 0) + 1;
    return acc;
  }, {});
  const topMissing = Object.entries(skillFreq).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const avgMatch = (matches as Match[]).length > 0
    ? Math.round((matches as Match[]).reduce((a, m) => a + (m.matchPercent || 0), 0) / (matches as Match[]).length)
    : 0;

  const currentSkills = profile?.currentSkills
    ? profile.currentSkills.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  const learningSkills = (mySkills as Array<Record<string, unknown>>).map(s => String(s.pathTitle || ''));
  const allSkills = [...currentSkills, ...learningSkills].filter(Boolean);

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-primary">Skill Gap Analysis</h1>
        <p className="text-sm text-muted mt-0.5">See exactly which skills you need for the opportunities you want</p>
      </div>

      {isLoading && (
        <Card className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted">Analyzing your skills against opportunities...</p>
          </div>
        </Card>
      )}

      {!isLoading && (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <Card padding="sm" className="text-center">
              <p className="text-3xl font-bold text-primary">{avgMatch}%</p>
              <p className="text-xs text-muted mt-1">Average match score</p>
            </Card>
            <Card padding="sm" className="text-center">
              <p className="text-3xl font-bold text-primary">{allSkills.length}</p>
              <p className="text-xs text-muted mt-1">Skills you have</p>
            </Card>
            <Card padding="sm" className="text-center">
              <p className="text-3xl font-bold text-primary">{topMissing.length}</p>
              <p className="text-xs text-muted mt-1">In-demand skills to learn</p>
            </Card>
          </div>

          {topMissing.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-primary">Most In-Demand Skills You Are Missing</h2>
              </div>
              <div className="space-y-3 mb-4">
                {topMissing.map(([skill, count]) => (
                  <div key={skill} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-primary font-medium">{skill}</span>
                      <span className="text-xs text-muted">
                        Needed for {count} {count === 1 ? 'opportunity' : 'opportunities'}
                      </span>
                    </div>
                    <Progress
                      value={(matches as Match[]).length > 0 ? (count / (matches as Match[]).length) * 100 : 0}
                      size="sm"
                      variant="accent"
                    />
                  </div>
                ))}
              </div>
              <Link to="/app/skills">
                <Button variant="accent" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Browse skill roadmaps to close these gaps
                </Button>
              </Link>
            </Card>
          )}

          {allSkills.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-primary">Your Current Skills</h2>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allSkills.map(skill => (
                  <span key={skill} className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    {skill}
                  </span>
                ))}
              </div>
            </Card>
          )}

          <div>
            <h2 className="text-sm font-semibold text-primary mb-3">
              Opportunity Matches ({(matches as Match[]).length})
            </h2>
            {(matches as Match[]).length === 0 ? (
              <Card>
                <p className="text-sm text-muted text-center py-6">
                  No opportunities found to match against. Check your Opportunities page.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {(matches as Match[]).map(m => (
                  <Card key={m.id} padding="sm">
                    <div className="flex items-start gap-3">
                      <div className={'w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ' +
                        (m.matchPercent >= 80 ? 'bg-green-50 text-green-700' :
                          m.matchPercent >= 60 ? 'bg-yellow-50 text-yellow-700' :
                            'bg-red-50 text-red-600')}>
                        {m.matchPercent}%
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary">{m.title}</p>
                        <p className="text-xs text-muted mb-2">{m.company}</p>
                        <div className="flex flex-wrap gap-1">
                          {(m.matchedSkills || []).map(s => (
                            <span key={s} className="flex items-center gap-0.5 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-2.5 h-2.5" /> {s}
                            </span>
                          ))}
                          {(m.missingSkills || []).map(s => (
                            <span key={s} className="flex items-center gap-0.5 text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full">
                              <XCircle className="w-2.5 h-2.5" /> {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
