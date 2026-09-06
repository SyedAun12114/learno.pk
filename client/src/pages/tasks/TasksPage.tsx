import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle2, Circle, Trash2, Calendar, Edit2 } from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { useToast } from '../../hooks/useToast';
import { formatDate, CATEGORY_COLORS, PRIORITY_COLORS, capitalize } from '../../lib/utils';
import type { Task } from '../../../../shared/types';

const CAT = [
  { value: 'personal', label: 'Personal' }, { value: 'study', label: 'Study' },
  { value: 'assignment', label: 'Assignment' }, { value: 'exam', label: 'Exam' },
  { value: 'skill', label: 'Skill' }, { value: 'career', label: 'Career' },
];

const PRI = [
  { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' },
];

type F = { title: string; description: string; category: string; priority: string; dueDate: string };
const DEF: F = { title: '', description: '', category: 'personal', priority: 'medium', dueDate: '' };

export default function TasksPage() {
  const [tab, setTab] = useState<'pending' | 'completed'>('pending');
  const [modal, setModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [form, setForm] = useState<F>(DEF);
  const toast = useToast();
  const qc = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', tab],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: Task[] }>('/tasks?status=' + tab);
      return r.data.data;
    },
  });

  const create = useMutation({
    mutationFn: async (d: Partial<F>) => api.post('/tasks', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setModal(false); setForm(DEF); toast.success('Task added'); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const update = useMutation({
    mutationFn: async ({ id, d }: { id: number; d: Partial<F> }) => api.put('/tasks/' + id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setModal(false); setEditTask(null); toast.success('Task updated'); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const toggle = useMutation({
    mutationFn: async (id: number) => api.patch('/tasks/' + id + '/complete'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const del = useMutation({
    mutationFn: async (id: number) => api.delete('/tasks/' + id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Task deleted'); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const openEdit = (t: Task) => {
    setEditTask(t);
    setForm({ title: t.title, description: t.description || '', category: t.category, priority: t.priority, dueDate: t.dueDate || '' });
    setModal(true);
  };

  const openCreate = () => { setEditTask(null); setForm(DEF); setModal(true); };

  const submit = () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    const d = { title: form.title.trim(), description: form.description || undefined, category: form.category, priority: form.priority, dueDate: form.dueDate || null };
    if (editTask) { update.mutate({ id: editTask.id, d }); } else { create.mutate(d); }
  };

  return (
    <div className="space-y-5 pb-16 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Tasks</h1>
        <Button size="sm" variant="accent" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>Add task</Button>
      </div>

      <div className="flex gap-1 bg-surface rounded-xl p-1 w-fit">
        {[{ k: 'pending', l: 'Active' }, { k: 'completed', l: 'Completed' }].map(t => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as 'pending' | 'completed')}
            className={'px-4 py-1.5 rounded-lg text-sm font-medium transition-all ' + (tab === t.k ? 'bg-card text-primary shadow-sm' : 'text-muted hover:text-primary')}
          >
            {t.l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-5 h-5" />}
          title={tab === 'completed' ? 'No completed tasks' : 'No active tasks'}
          description={tab === 'pending' ? 'Add your first task to get started.' : 'Complete tasks to see them here.'}
          action={tab === 'pending' ? (
            <Button size="sm" variant="accent" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>Add task</Button>
          ) : undefined}
        />
      ) : (
        <div className="space-y-2">
          {tasks.map(t => (
            <Card key={t.id} padding="sm">
              <div className="flex items-center gap-3">
                <button onClick={() => toggle.mutate(t.id)} className="text-muted hover:text-primary transition-colors flex-shrink-0">
                  {t.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-accent" /> : <Circle className="w-5 h-5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={'text-sm font-medium ' + (t.status === 'completed' ? 'line-through text-muted' : 'text-primary')}>
                    {t.title}
                  </p>
                  {t.dueDate && (
                    <div className="flex items-center gap-1 text-xs text-muted mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {formatDate(t.dueDate)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Badge size="sm" className={CATEGORY_COLORS[t.category] || ''}>{capitalize(t.category)}</Badge>
                  <span className={'text-xs font-medium ' + (PRIORITY_COLORS[t.priority] || '')}>{capitalize(t.priority)}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-primary transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => del.mutate(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => { setModal(false); setEditTask(null); }} title={editTask ? 'Edit Task' : 'Add Task'}>
        <div className="space-y-4">
          <Input label="Title *" placeholder="What do you need to do?" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Textarea label="Description" placeholder="Optional details..." rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" options={CAT} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            <Select label="Priority" options={PRI} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} />
          </div>
          <Input label="Due date" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setModal(false); setEditTask(null); }}>Cancel</Button>
            <Button variant="accent" className="flex-1" onClick={submit} isLoading={create.isPending || update.isPending}>
              {editTask ? 'Save changes' : 'Add task'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
