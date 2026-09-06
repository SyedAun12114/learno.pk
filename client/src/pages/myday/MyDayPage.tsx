import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, BookOpen, Zap, Briefcase, CheckSquare, Clock } from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { useToast } from '../../hooks/useToast';
import { formatTime } from '../../lib/utils';
import type { Task } from '../../../../shared/types';

export default function MyDayPage() {
  const toast = useToast();
  const qc = useQueryClient();

  const { data: tasks = [], isLoading: tl } = useQuery({
    queryKey: ['tasks-today'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: Task[] }>('/tasks?status=pending');
      return r.data.data;
    },
  });

  const { data: skills = [], isLoading: sl } = useQuery({
    queryKey: ['my-skills'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: unknown[] }>('/skills/my-skills');
      return r.data.data;
    },
  });

  const complete = useMutation({
    mutationFn: async (id: number) => { await api.patch('/tasks/' + id + '/complete'); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks-today'] }),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const studyTasks = (tasks as Task[]).filter(t => ['study', 'assignment', 'exam'].includes(t.category)).slice(0, 3);
  const careerTasks = (tasks as Task[]).filter(t => t.category === 'career').slice(0, 1);
  const otherTasks = (tasks as Task[]).filter(t => !['study', 'assignment', 'exam', 'career'].includes(t.category)).slice(0, 5);
  const activeSkills = (skills as Array<Record<string, unknown>>).filter(s => s.status === 'active').slice(0, 2);

  type MItem = { id: string; type: 'study' | 'skill' | 'career'; title: string; sub?: string; dur?: number; done: boolean; taskId?: number };

  const items: MItem[] = [
    ...studyTasks.map(t => ({ id: 't-' + t.id, type: 'study' as const, title: t.title, sub: t.dueDate ? 'Due ' + t.dueDate : undefined, done: t.status === 'completed', taskId: t.id })),
    ...activeSkills.map(s => ({ id: 's-' + s.id, type: 'skill' as const, title: String(s.pathTitle || 'Continue learning'), sub: Math.round(s.progressPercent as number) + '% complete', dur: 30, done: false })),
    ...careerTasks.map(t => ({ id: 'c-' + t.id, type: 'career' as const, title: t.title, done: t.status === 'completed', taskId: t.id })),
  ];

  const done = items.filter(i => i.done).length;

  const cfg = {
    study: { icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
    skill: { icon: Zap, color: 'bg-green-50 text-green-600' },
    career: { icon: Briefcase, color: 'bg-orange-50 text-orange-600' },
  };

  if (tl || sl) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>;

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-primary">My Day</h1>
        <p className="text-sm text-muted mt-0.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {items.length > 0 && (
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Today's Progress</p>
              <p className="text-xs text-muted">{done} of {items.length} completed</p>
            </div>
            <div className="text-2xl font-bold text-primary">
              {items.length > 0 ? Math.round((done / items.length) * 100) : 0}%
            </div>
          </div>
          <div className="mt-3 h-2 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: (items.length > 0 ? (done / items.length) * 100 : 0) + '%' }}
            />
          </div>
        </Card>
      )}

      <div>
        <h2 className="text-sm font-semibold text-primary mb-3">Today's Mission</h2>
        {items.length === 0 ? (
          <Card>
            <p className="text-sm text-muted text-center py-4">
              Nothing scheduled. Add tasks and enroll in skills to build your daily plan.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map(item => {
              const c = cfg[item.type];
              return (
                <Card key={item.id} padding="sm" className={item.done ? 'opacity-60' : ''}>
                  <div className="flex items-center gap-3">
                    <div className={'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ' + c.color}>
                      <c.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={'text-sm font-medium ' + (item.done ? 'line-through text-muted' : 'text-primary')}>
                        {item.title}
                      </p>
                      {item.sub && <p className="text-xs text-muted">{item.sub}</p>}
                    </div>
                    {item.dur && (
                      <div className="flex items-center gap-1 text-xs text-muted flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {formatTime(item.dur)}
                      </div>
                    )}
                    {item.taskId && (
                      <button
                        onClick={() => complete.mutate(item.taskId!)}
                        className="flex-shrink-0 ml-1 text-muted hover:text-primary transition-colors"
                      >
                        {item.done
                          ? <CheckCircle2 className="w-5 h-5 text-accent" />
                          : <Circle className="w-5 h-5" />
                        }
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {otherTasks.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-primary mb-3">Other Tasks</h2>
          <div className="space-y-2">
            {otherTasks.map((t: Task) => (
              <Card key={t.id} padding="sm">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => complete.mutate(t.id)}
                    className="text-muted hover:text-primary transition-colors flex-shrink-0"
                  >
                    {t.status === 'completed'
                      ? <CheckCircle2 className="w-5 h-5 text-accent" />
                      : <Circle className="w-5 h-5" />
                    }
                  </button>
                  <p className={'text-sm flex-1 ' + (t.status === 'completed' ? 'line-through text-muted' : 'text-primary')}>
                    {t.title}
                  </p>
                  <Badge variant="muted" size="sm">{t.category}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
