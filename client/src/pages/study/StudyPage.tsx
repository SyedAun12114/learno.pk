import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, BookOpen, CheckCircle2, Circle, Trash2, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Progress } from '../../components/ui/Progress';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { useToast } from '../../hooks/useToast';
import { formatDate, formatTime } from '../../lib/utils';
import type { StudyPlan, StudyPlanItem } from '../../../../shared/types';

export default function StudyPage() {
  const [modal, setModal] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [expandedData, setExpandedData] = useState<StudyPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ subject: '', goal: '', examDate: '', topics: '', dailyMinutes: '60' });
  const toast = useToast();
  const qc = useQueryClient();
  const sf = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['study-plans'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: StudyPlan[] }>('/study');
      return r.data.data;
    },
  });

  const generate = async () => {
    if (!form.subject || !form.topics) { toast.error('Subject and topics are required'); return; }
    setGenerating(true);
    try {
      await api.post('/study/generate', {
        subject: form.subject, goal: form.goal,
        examDate: form.examDate || undefined, topics: form.topics,
        dailyMinutes: parseInt(form.dailyMinutes) || 60,
      });
      qc.invalidateQueries({ queryKey: ['study-plans'] });
      setModal(false);
      setForm({ subject: '', goal: '', examDate: '', topics: '', dailyMinutes: '60' });
      toast.success('Study plan generated!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const del = useMutation({
    mutationFn: async (id: number) => api.delete('/study/' + id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['study-plans'] }); toast.success('Plan deleted'); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const toggleItem = useMutation({
    mutationFn: async ({ pid, iid, status }: { pid: number; iid: number; status: string }) =>
      api.patch('/study/' + pid + '/items/' + iid, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['study-plans'] });
      if (expanded) loadDetails(expanded);
    },
  });

  const loadDetails = async (pid: number) => {
    try {
      const r = await api.get<{ success: boolean; data: StudyPlan }>('/study/' + pid);
      setExpandedData(r.data.data);
    } catch {}
  };

  const toggleExpand = async (pid: number) => {
    if (expanded === pid) { setExpanded(null); setExpandedData(null); }
    else { setExpanded(pid); await loadDetails(pid); }
  };

  return (
    <div className="space-y-5 pb-16 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Study Plans</h1>
        <Button size="sm" variant="accent" leftIcon={<Bot className="w-4 h-4" />} onClick={() => setModal(true)}>
          Generate plan
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-5 h-5" />}
          title="No study plans yet"
          description="Generate an AI-powered study plan for any subject and exam date."
          action={<Button size="sm" variant="accent" leftIcon={<Bot className="w-4 h-4" />} onClick={() => setModal(true)}>Generate your first plan</Button>}
        />
      ) : (
        <div className="space-y-3">
          {(plans as Array<StudyPlan & { progress?: number }>).map(plan => (
            <Card key={plan.id}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-primary text-sm truncate">{plan.title}</h3>
                    <Badge variant="default" size="sm">{plan.subject}</Badge>
                  </div>
                  {plan.examDate && (
                    <div className="flex items-center gap-1 text-xs text-muted">
                      <Calendar className="w-3 h-3" />
                      Exam: {formatDate(plan.examDate)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => toggleExpand(plan.id)} rightIcon={expanded === plan.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}>
                    View
                  </Button>
                  <button onClick={() => del.mutate(plan.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <Progress value={plan.progress || 0} size="sm" variant="accent" showLabel />
              {expanded === plan.id && expandedData && (
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  {(expandedData.items || []).map((item: StudyPlanItem) => (
                    <div key={item.id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                      <button
                        onClick={() => toggleItem.mutate({ pid: plan.id, iid: item.id, status: item.status === 'completed' ? 'pending' : 'completed' })}
                        className="text-muted hover:text-primary transition-colors flex-shrink-0 mt-0.5"
                      >
                        {item.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-accent" /> : <Circle className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={'text-sm font-medium ' + (item.status === 'completed' ? 'line-through text-muted' : 'text-primary')}>
                          Day {item.dayNumber}: {item.title}
                        </p>
                        {item.description && <p className="text-xs text-muted mt-0.5 line-clamp-2">{item.description}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          {item.phase && <Badge size="sm" variant="muted">{item.phase}</Badge>}
                          <span className="text-xs text-muted">{formatTime(item.durationMinutes)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Generate Study Plan" size="lg">
        <div className="space-y-4">
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-3 text-xs text-primary">
            Learno AI will create a day-by-day study plan based on your subject, topics, and available time.
          </div>
          <Input label="Subject *" placeholder="e.g. Mathematics, Physics, Computer Science" value={form.subject} onChange={e => sf('subject', e.target.value)} />
          <Input label="Goal" placeholder="e.g. Pass final exam" value={form.goal} onChange={e => sf('goal', e.target.value)} />
          <Input label="Exam / deadline date" type="date" value={form.examDate} onChange={e => sf('examDate', e.target.value)} />
          <Textarea label="Topics to cover *" placeholder="e.g. Chapter 1: Algebra, Chapter 2: Trigonometry..." rows={3} value={form.topics} onChange={e => sf('topics', e.target.value)} hint="List the topics or chapters you need to study" />
          <Input label="Daily study time (minutes)" type="number" placeholder="60" value={form.dailyMinutes} onChange={e => sf('dailyMinutes', e.target.value)} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancel</Button>
            <Button variant="accent" className="flex-1" isLoading={generating} leftIcon={<Bot className="w-4 h-4" />} onClick={generate}>
              {generating ? 'Generating... (up to 60s)' : 'Generate plan'}
            </Button>
            {generating && (
              <p className="text-xs text-muted text-center">AI is building your plan. This may take up to 60 seconds.</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
