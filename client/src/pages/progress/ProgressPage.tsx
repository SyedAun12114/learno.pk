import { useQuery } from '@tanstack/react-query';
import { Award, CheckSquare, TestTube2, Zap, BookOpen, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Progress } from '../../components/ui/Progress';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { formatRelative } from '../../lib/utils';
import type { DashboardData } from '../../../../shared/types';

export default function ProgressPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: DashboardData }>('/dashboard');
      return r.data.data;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ['test-history'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: unknown[] }>('/tests/attempts');
      return r.data.data;
    },
  });

  const { data: mySkills = [] } = useQuery({
    queryKey: ['my-skills'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: unknown[] }>('/skills/my-skills');
      return r.data.data;
    },
  });

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  }

  const stats = data?.stats;

  const readiness = (() => {
    let s = 0;
    if (data?.profile?.currentSkills) s += 20;
    if (data?.profile?.careerGoal) s += 10;
    if ((mySkills as unknown[]).length > 0) s += 20;
    if (history.length > 0) s += 20;
    if ((data?.activePlans || []).length > 0) s += 15;
    if (history.length > 2) s += 15;
    return Math.min(100, s);
  })();

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <h1 className="text-2xl font-bold text-primary">Progress</h1>

      <Card className="border-accent/30 bg-accent/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center">
            <Award className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-primary">Career Readiness Score</h2>
            <p className="text-xs text-muted">Based on skills, study activity, and goal completion</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-4xl font-bold text-primary">{readiness}%</div>
          <div className="flex-1">
            <Progress value={readiness} size="lg" variant="accent" />
            <p className="text-xs text-muted mt-1">
              {readiness < 40 ? 'Keep building your skills.' : readiness < 70 ? 'Good progress! Continue your roadmaps.' : 'Excellent career readiness!'}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted/70 mt-3">Score = Profile + Active skills + Test history + Study plans + Goals</p>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { icon: CheckSquare, label: 'Tasks this week', value: stats?.tasksCompletedThisWeek || 0 },
          { icon: TestTube2, label: 'Tests taken', value: stats?.testsThisMonth || 0 },
          { icon: TrendingUp, label: 'Avg test score', value: (stats?.averageTestScore || 0) + '%' },
          { icon: Zap, label: 'Skills active', value: stats?.skillsInProgress || 0 },
          { icon: BookOpen, label: 'Study plans', value: (data?.activePlans || []).length },
        ].map(s => (
          <Card key={s.label} padding="sm">
            <s.icon className="w-4 h-4 text-muted mb-2" />
            <p className="text-2xl font-bold text-primary">{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      {(mySkills as Array<Record<string, unknown>>).length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-primary mb-3">Skill Progress</h2>
          <div className="space-y-3">
            {(mySkills as Array<Record<string, unknown>>).map(s => (
              <Card key={s.id as number} padding="sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-primary">{s.pathTitle as string}</p>
                  <span className="text-sm font-bold text-primary">{Math.round(s.progressPercent as number)}%</span>
                </div>
                <Progress value={s.progressPercent as number} size="md" variant="accent" />
                <p className="text-xs text-muted mt-1">Step {s.currentStep as number} of {s.totalSteps as number}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-primary mb-3">Recent Tests</h2>
          <div className="space-y-2">
            {(history as Array<Record<string, unknown>>).slice(0, 5).map(a => (
              <Card key={a.id as number} padding="sm">
                <div className="flex items-center gap-3">
                  <div className={'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ' + ((a.score as number) >= 70 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>
                    {Math.round(a.score as number)}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{a.title as string}</p>
                    <p className="text-xs text-muted">{a.subject as string} - {a.correctCount as number}/{a.totalQuestions as number} correct</p>
                  </div>
                  <span className="text-xs text-muted flex-shrink-0">{formatRelative(a.completedAt as string)}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
