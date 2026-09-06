import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Target, CheckSquare, BookOpen, Zap, Briefcase, ArrowRight, Bot, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Progress } from '../../components/ui/Progress';
import { Badge } from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { getGreeting, formatDate, capitalize } from '../../lib/utils';
import type { DashboardData } from '../../../../shared/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [whatNext, setWhatNext] = useState<string | null>(null);
  const [wnLoading, setWnLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: DashboardData }>('/dashboard');
      return r.data.data;
    },
  });

  const { data: insight } = useQuery({
    queryKey: ['ai-insight'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: { insight: string | null } }>('/dashboard/ai-insight');
      return r.data.data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const handleWhatNext = async () => {
    setWnLoading(true);
    try {
      const r = await api.post<{ success: boolean; data: { recommendation: string } }>('/ai/what-next');
      setWhatNext(r.data.data.recommendation);
    } catch {
      setWhatNext('Could not get recommendation. Please try again.');
    } finally {
      setWnLoading(false);
    }
  };

  const name = data?.profile?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-10 w-64 bg-surface rounded-xl animate-pulse" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-primary">{getGreeting()}, {name}.</h1>
        {data?.profile?.careerInterest && (
          <p className="text-sm text-muted mt-0.5">Working toward: {data.profile.careerInterest}</p>
        )}
      </div>

      {insight?.insight && (
        <Card className="border-l-2 border-l-accent bg-accent/5" padding="sm">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-primary mb-0.5">AI Insight</p>
              <p className="text-sm text-primary leading-relaxed">{insight.insight}</p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-primary">What should I do next?</h2>
          </div>
          <Button size="sm" variant="accent" onClick={handleWhatNext} isLoading={wnLoading} leftIcon={<Bot className="w-3.5 h-3.5" />}>
            Ask AI
          </Button>
        </div>
        {whatNext ? (
          <div className="bg-surface rounded-xl p-4">
            <p className="text-sm text-primary leading-relaxed">{whatNext}</p>
          </div>
        ) : (
          <p className="text-sm text-muted">Click "Ask AI" and Learno will recommend your highest-value next action.</p>
        )}
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: CheckSquare, label: 'Tasks this week', value: stats?.tasksCompletedThisWeek || 0, unit: 'done' },
          { icon: TrendingUp, label: 'Test average', value: (stats?.averageTestScore || 0) + '%', unit: '' },
          { icon: Zap, label: 'Skills active', value: stats?.skillsInProgress || 0, unit: 'paths' },
          { icon: BookOpen, label: 'Tests taken', value: stats?.testsThisMonth || 0, unit: 'total' },
        ].map(s => (
          <Card key={s.label} padding="sm">
            <s.icon className="w-4 h-4 text-muted mb-2" />
            <p className="text-xl font-bold text-primary">
              {s.value}
              {s.unit && <span className="text-xs font-normal text-muted ml-1">{s.unit}</span>}
            </p>
            <p className="text-xs text-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-primary">Today's Tasks</h2>
            </div>
            <Link to="/app/tasks">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>All</Button>
            </Link>
          </div>
          <div className="space-y-2">
            {!data?.todayTasks?.length ? (
              <p className="text-sm text-muted py-2">No tasks today. <Link to="/app/tasks" className="text-primary underline">Add one</Link></p>
            ) : (
              data.todayTasks.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className={'w-2 h-2 rounded-full flex-shrink-0 ' + (t.priority === 'high' ? 'bg-red-400' : t.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400')} />
                  <p className="text-sm text-primary flex-1 truncate">{t.title}</p>
                  <Badge variant="muted" size="sm">{capitalize(t.category)}</Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-primary">Study Plans</h2>
            </div>
            <Link to="/app/study">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>All</Button>
            </Link>
          </div>
          <div className="space-y-3">
            {!data?.activePlans?.length ? (
              <p className="text-sm text-muted py-2">No active plans. <Link to="/app/study" className="text-primary underline">Create one</Link></p>
            ) : (
              (data.activePlans as Array<{ id: number; title: string; examDate?: string; progress?: number }>).slice(0, 3).map(p => (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-primary truncate">{p.title}</p>
                    {p.examDate && <span className="text-xs text-muted ml-2 flex-shrink-0">{formatDate(p.examDate)}</span>}
                  </div>
                  <Progress value={p.progress || 0} size="sm" variant="accent" />
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-primary">Skills</h2>
            </div>
            <Link to="/app/skills">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>All</Button>
            </Link>
          </div>
          <div className="space-y-3">
            {!data?.enrollments?.length ? (
              <p className="text-sm text-muted py-2">No skills yet. <Link to="/app/skills" className="text-primary underline">Browse roadmaps</Link></p>
            ) : (
              (data.enrollments as Array<{ id: number; pathTitle: string; progressPercent: number }>).slice(0, 3).map(e => (
                <div key={e.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-primary truncate">{e.pathTitle}</p>
                    <span className="text-xs text-muted ml-2">{Math.round(e.progressPercent)}%</span>
                  </div>
                  <Progress value={e.progressPercent} size="sm" />
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-primary">Featured Opportunity</h2>
            </div>
            <Link to="/app/opportunities">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>Browse</Button>
            </Link>
          </div>
          {data?.featuredOpportunity ? (
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-semibold text-primary">{data.featuredOpportunity.title}</p>
                  <p className="text-xs text-muted">{data.featuredOpportunity.company}</p>
                </div>
                <Badge variant="accent">{capitalize(String(data.featuredOpportunity.type).replace('_', ' '))}</Badge>
              </div>
              <p className="text-xs text-muted line-clamp-2 mb-3">{data.featuredOpportunity.description}</p>
              <Link to="/app/opportunities">
                <Button size="sm" variant="secondary" className="w-full">View details</Button>
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted py-2">Check back soon for matched opportunities.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
