import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, Users, BarChart3, LogOut, Plus, X, Edit2,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { formatRelative } from '../../lib/utils';

interface Stats {
  totalUsers: number; onboardedUsers: number; totalTasks: number;
  completedTests: number; studyPlans: number; aiRequestsToday: number;
}

type Tab = 'stats' | 'users' | 'opportunities' | 'skillpaths';

const OPP_TYPES = [
  { value: 'internship', label: 'Internship' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'apprenticeship', label: 'Apprenticeship' },
];

const PATH_CATS = [
  { value: 'development', label: 'Development' },
  { value: 'design', label: 'Design' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'data', label: 'Data' },
  { value: 'sales', label: 'Sales' },
  { value: 'business', label: 'Business' },
  { value: 'other', label: 'Other' },
];

const ICONS = [
  { value: 'Code2', label: 'Code (Dev)' },
  { value: 'Brain', label: 'Brain (AI)' },
  { value: 'Layers', label: 'Layers (Design)' },
  { value: 'TrendingUp', label: 'Trending (Marketing/Sales)' },
  { value: 'BarChart3', label: 'Chart (Data)' },
  { value: 'Palette', label: 'Palette (Art)' },
  { value: 'Briefcase', label: 'Briefcase (Business)' },
  { value: 'Zap', label: 'Zap (Skills)' },
];

const DEF_OPP = {
  title: '', company: '', description: '', type: 'internship',
  location: '', isRemote: false, requiredSkills: '',
  experienceLevel: '', applicationUrl: '', deadline: '', isFeatured: false,
};

const DEF_PATH = {
  title: '', description: '', category: 'development',
  estimatedHours: '', icon: 'Code2',
};

const DEF_STEP = {
  title: '', description: '', estimatedHours: '',
  videoUrl: '', videoTitle: '',
};

export default function AdminPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('stats');

  const [oppModal, setOppModal] = useState(false);
  const [editOpp, setEditOpp] = useState<Record<string, unknown> | null>(null);
  const [oppForm, setOppForm] = useState(DEF_OPP);

  const [pathModal, setPathModal] = useState(false);
  const [editPath, setEditPath] = useState<Record<string, unknown> | null>(null);
  const [pathForm, setPathForm] = useState(DEF_PATH);

  const [stepModal, setStepModal] = useState(false);
  const [activePathId, setActivePathId] = useState<number | null>(null);
  const [activePathTitle, setActivePathTitle] = useState('');
  const [editStep, setEditStep] = useState<Record<string, unknown> | null>(null);
  const [stepForm, setStepForm] = useState(DEF_STEP);
  const [expandedPath, setExpandedPath] = useState<number | null>(null);
  const [pathSteps, setPathSteps] = useState<Record<number, unknown[]>>({});

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: Stats }>('/admin/stats');
      return r.data.data;
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    enabled: tab === 'users',
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: unknown[] }>('/admin/users');
      return r.data.data;
    },
  });

  const { data: opps = [], refetch: refetchOpps } = useQuery({
    queryKey: ['admin-opps'],
    enabled: tab === 'opportunities',
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: unknown[] }>('/admin/opportunities');
      return r.data.data;
    },
  });

  const { data: paths = [], refetch: refetchPaths } = useQuery({
    queryKey: ['admin-paths'],
    enabled: tab === 'skillpaths',
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: unknown[] }>('/admin/skill-paths');
      return r.data.data;
    },
  });

  const loadSteps = async (pathId: number) => {
    try {
      const r = await api.get<{ success: boolean; data: unknown[] }>(
        '/admin/skill-paths/' + pathId + '/steps'
      );
      setPathSteps(prev => ({ ...prev, [pathId]: r.data.data || [] }));
    } catch {
      // fallback to skills endpoint
      try {
        const r2 = await api.get<{ success: boolean; data: { steps: unknown[] } }>(
          '/skills/paths/' + pathId
        );
        setPathSteps(prev => ({ ...prev, [pathId]: r2.data.data.steps || [] }));
      } catch {}
    }
  };

  const togglePath = async (pathId: number) => {
    if (expandedPath === pathId) {
      setExpandedPath(null);
    } else {
      setExpanded(pathId);
      await loadSteps(pathId);
    }
  };

  const setExpanded = (id: number) => setExpandedPath(id);

  const createOpp = useMutation({
    mutationFn: async (data: typeof DEF_OPP) => {
      const payload = {
        ...data,
        requiredSkills: data.requiredSkills
          ? data.requiredSkills.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [],
      };
      if (editOpp) await api.put('/admin/opportunities/' + editOpp.id, payload);
      else await api.post('/admin/opportunities', payload);
    },
    onSuccess: () => {
      toast.success(editOpp ? 'Updated' : 'Created');
      setOppModal(false);
      setOppForm(DEF_OPP);
      setEditOpp(null);
      refetchOpps();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteOpp = useMutation({
    mutationFn: async (id: number) => api.delete('/admin/opportunities/' + id),
    onSuccess: () => { toast.success('Deleted'); refetchOpps(); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const createPath = useMutation({
    mutationFn: async (data: typeof DEF_PATH) => {
      const payload = {
        title: data.title, description: data.description,
        category: data.category,
        estimatedHours: data.estimatedHours ? parseInt(data.estimatedHours) : undefined,
        icon: data.icon, isActive: true,
      };
      if (editPath) await api.put('/admin/skill-paths/' + editPath.id, payload);
      else await api.post('/admin/skill-paths', payload);
    },
    onSuccess: () => {
      toast.success(editPath ? 'Updated' : 'Created');
      setPathModal(false);
      setPathForm(DEF_PATH);
      setEditPath(null);
      refetchPaths();
      qc.invalidateQueries({ queryKey: ['skill-paths'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deletePath = useMutation({
    mutationFn: async (id: number) => api.delete('/admin/skill-paths/' + id),
    onSuccess: () => {
      toast.success('Deleted');
      refetchPaths();
      qc.invalidateQueries({ queryKey: ['skill-paths'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const createStep = useMutation({
    mutationFn: async (data: typeof DEF_STEP) => {
      const payload = {
        title: data.title,
        description: data.description || undefined,
        estimatedHours: data.estimatedHours ? parseInt(data.estimatedHours) : undefined,
        videoUrl: data.videoUrl || undefined,
        videoTitle: data.videoTitle || undefined,
      };
      if (editStep) {
        await api.put('/admin/skill-paths/' + activePathId + '/steps/' + editStep.id, payload);
      } else {
        await api.post('/admin/skill-paths/' + activePathId + '/steps', payload);
      }
    },
    onSuccess: () => {
      toast.success(editStep ? 'Step updated' : 'Step added');
      setStepModal(false);
      setStepForm(DEF_STEP);
      setEditStep(null);
      if (activePathId) loadSteps(activePathId);
      refetchPaths();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteStep = useMutation({
    mutationFn: async ({ pathId, stepId }: { pathId: number; stepId: number }) =>
      api.delete('/admin/skill-paths/' + pathId + '/steps/' + stepId),
    onSuccess: (_, vars) => {
      toast.success('Step deleted');
      loadSteps(vars.pathId);
      refetchPaths();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const openEditOpp = (o: Record<string, unknown>) => {
    setEditOpp(o);
    setOppForm({
      title: String(o.title || ''),
      company: String(o.company || ''),
      description: String(o.description || ''),
      type: String(o.type || 'internship'),
      location: String(o.location || ''),
      isRemote: Boolean(o.isRemote),
      requiredSkills: Array.isArray(o.requiredSkills)
        ? (o.requiredSkills as string[]).join(', ')
        : '',
      experienceLevel: String(o.experienceLevel || ''),
      applicationUrl: String(o.applicationUrl || ''),
      deadline: o.deadline ? String(o.deadline).split('T')[0] : '',
      isFeatured: Boolean(o.isFeatured),
    });
    setOppModal(true);
  };

  const openEditPath = (p: Record<string, unknown>) => {
    setEditPath(p);
    setPathForm({
      title: String(p.title || ''),
      description: String(p.description || ''),
      category: String(p.category || 'development'),
      estimatedHours: String(p.estimatedHours || ''),
      icon: String(p.icon || 'Code2'),
    });
    setPathModal(true);
  };

  const openEditStep = (pathId: number, pathTitle: string, step: Record<string, unknown>) => {
    setActivePathId(pathId);
    setActivePathTitle(pathTitle);
    setEditStep(step);
    setStepForm({
      title: String(step.title || ''),
      description: String(step.description || ''),
      estimatedHours: String(step.estimatedHours || ''),
      videoUrl: String(step.videoUrl || step.video_url || ''),
      videoTitle: String(step.videoTitle || step.video_title || ''),
    });
    setStepModal(true);
  };

  const openAddStep = (pathId: number, pathTitle: string) => {
    setActivePathId(pathId);
    setActivePathTitle(pathTitle);
    setEditStep(null);
    setStepForm(DEF_STEP);
    setStepModal(true);
  };

  return (
    <div className="min-h-screen bg-background p-5">
      <div className="max-w-6xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <Shield className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">Admin Panel</h1>
              <p className="text-xs text-muted">Learno Control Center</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/app/dashboard">
              <Button variant="secondary" size="sm">Student View</Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
              onClick={async () => { await logout(); navigate('/'); }}
            >
              Logout
            </Button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { icon: Users, l: 'Total Users', v: stats.totalUsers },
              { icon: Users, l: 'Onboarded', v: stats.onboardedUsers },
              { icon: BarChart3, l: 'Tasks', v: stats.totalTasks },
              { icon: BarChart3, l: 'Tests Done', v: stats.completedTests },
              { icon: BarChart3, l: 'Study Plans', v: stats.studyPlans },
              { icon: BarChart3, l: 'AI Today', v: stats.aiRequestsToday },
            ].map(s => (
              <Card key={s.l} padding="sm">
                <s.icon className="w-4 h-4 text-muted mb-1" />
                <p className="text-xl font-bold text-primary">{s.v}</p>
                <p className="text-xs text-muted">{s.l}</p>
              </Card>
            ))}
          </div>
        )}

        <div className="flex gap-1 bg-surface rounded-xl p-1 overflow-x-auto w-fit">
          {[
            { k: 'stats', l: 'Overview' },
            { k: 'users', l: 'Users' },
            { k: 'opportunities', l: 'Opportunities' },
            { k: 'skillpaths', l: 'Skill Paths' },
          ].map(t => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as Tab)}
              className={
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ' +
                (tab === t.k ? 'bg-card text-primary shadow-sm' : 'text-muted hover:text-primary')
              }
            >
              {t.l}
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted">Email</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted">Name</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted">Role</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted">Status</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {(users as Array<Record<string, unknown>>).map(u => (
                    <tr key={u.id as number} className="border-b border-border/50 hover:bg-surface/50">
                      <td className="py-2.5 px-3 text-primary">{u.email as string}</td>
                      <td className="py-2.5 px-3 text-muted">{u.fullName as string || '-'}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant={u.role === 'admin' ? 'accent' : 'default'} size="sm">
                          {u.role as string}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={u.isOnboarded ? 'success' : 'muted'} size="sm">
                          {u.isOnboarded ? 'Onboarded' : 'Pending'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-muted text-xs">
                        {formatRelative(u.createdAt as string)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {tab === 'opportunities' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold text-primary">
                Opportunities ({(opps as unknown[]).length})
              </h2>
              <Button
                size="sm"
                variant="accent"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => { setEditOpp(null); setOppForm(DEF_OPP); setOppModal(true); }}
              >
                Add Opportunity
              </Button>
            </div>
            <div className="space-y-2">
              {(opps as Array<Record<string, unknown>>).map(o => (
                <Card key={o.id as number} padding="sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-medium text-primary">{o.title as string}</p>
                        {o.isFeatured && <Badge variant="accent" size="sm">Featured</Badge>}
                        <Badge variant={o.isActive ? 'success' : 'muted'} size="sm">
                          {o.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="default" size="sm">
                          {String(o.type || '').replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted">
                        {o.company as string} &bull; {o.location as string || 'Remote'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEditOpp(o)}
                        className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-primary transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteOpp.mutate(o.id as number)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-muted hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
              {(opps as unknown[]).length === 0 && (
                <Card>
                  <p className="text-sm text-muted text-center py-6">
                    No opportunities yet.
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}

        {tab === 'skillpaths' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold text-primary">
                Skill Paths ({(paths as unknown[]).length})
              </h2>
              <Button
                size="sm"
                variant="accent"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => { setEditPath(null); setPathForm(DEF_PATH); setPathModal(true); }}
              >
                Add Skill Path
              </Button>
            </div>
            <div className="space-y-3">
              {(paths as Array<Record<string, unknown>>).map(path => (
                <Card key={path.id as number}>
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold text-primary">{path.title as string}</p>
                        <Badge variant="muted" size="sm">{path.category as string}</Badge>
                        <Badge variant="default" size="sm">
                          {path.totalSteps as number} steps
                        </Badge>
                        <Badge variant={path.isActive ? 'success' : 'muted'} size="sm">
                          {path.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted line-clamp-1">{path.description as string}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => togglePath(path.id as number)}
                        rightIcon={
                          expandedPath === path.id
                            ? <ChevronDown className="w-3.5 h-3.5" />
                            : <ChevronRight className="w-3.5 h-3.5" />
                        }
                      >
                        Steps
                      </Button>
                      <button
                        onClick={() => openEditPath(path)}
                        className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-primary transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deletePath.mutate(path.id as number)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-muted hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {expandedPath === path.id && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-muted uppercase tracking-wide">
                          Steps
                        </p>
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<Plus className="w-3.5 h-3.5" />}
                          onClick={() => openAddStep(path.id as number, path.title as string)}
                        >
                          Add Step
                        </Button>
                      </div>
                      {(pathSteps[path.id as number] || []).map((step, idx) => {
                        const s = step as Record<string, unknown>;
                        const hasVideo = Boolean(s.videoUrl || s.video_url);
                        return (
                          <div
                            key={s.id as number}
                            className="flex items-center gap-3 py-2 px-3 bg-surface rounded-xl"
                          >
                            <div className="w-6 h-6 rounded-full bg-primary text-background flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-primary truncate">
                                {s.title as string}
                              </p>
                              {s.description && (
                                <p className="text-xs text-muted truncate">
                                  {s.description as string}
                                </p>
                              )}
                              {hasVideo && (
                                <p className="text-xs text-accent mt-0.5">
                                  Video: {String(s.videoTitle || s.video_title || s.videoUrl || s.video_url || '').substring(0, 50)}
                                </p>
                              )}
                            </div>
                            {s.estimatedHours && (
                              <span className="text-xs text-muted flex-shrink-0">
                                {s.estimatedHours as number}h
                              </span>
                            )}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => openEditStep(
                                  path.id as number,
                                  path.title as string,
                                  s
                                )}
                                className="p-1 rounded hover:bg-card text-muted hover:text-primary transition-colors"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deleteStep.mutate({
                                  pathId: path.id as number,
                                  stepId: s.id as number,
                                })}
                                className="p-1 rounded hover:bg-red-50 text-muted hover:text-red-500 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {!(pathSteps[path.id as number]?.length) && (
                        <p className="text-xs text-muted text-center py-3">
                          No steps yet. Click "Add Step" to get started.
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Opportunity Modal */}
      <Modal
        isOpen={oppModal}
        onClose={() => { setOppModal(false); setEditOpp(null); setOppForm(DEF_OPP); }}
        title={editOpp ? 'Edit Opportunity' : 'Add Opportunity'}
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Title *"
              placeholder="e.g. Frontend Developer Intern"
              value={oppForm.title}
              onChange={e => setOppForm(f => ({ ...f, title: e.target.value }))}
            />
            <Input
              label="Company *"
              placeholder="e.g. TechCorp"
              value={oppForm.company}
              onChange={e => setOppForm(f => ({ ...f, company: e.target.value }))}
            />
          </div>
          <Textarea
            label="Description *"
            placeholder="Describe the opportunity..."
            rows={3}
            value={oppForm.description}
            onChange={e => setOppForm(f => ({ ...f, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type"
              options={OPP_TYPES}
              value={oppForm.type}
              onChange={e => setOppForm(f => ({ ...f, type: e.target.value }))}
            />
            <Input
              label="Location"
              placeholder="e.g. Karachi, Pakistan"
              value={oppForm.location}
              onChange={e => setOppForm(f => ({ ...f, location: e.target.value }))}
            />
          </div>
          <Input
            label="Required Skills"
            placeholder="HTML, CSS, JavaScript, React"
            hint="Comma-separated"
            value={oppForm.requiredSkills}
            onChange={e => setOppForm(f => ({ ...f, requiredSkills: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Experience Level"
              placeholder="e.g. Entry Level"
              value={oppForm.experienceLevel}
              onChange={e => setOppForm(f => ({ ...f, experienceLevel: e.target.value }))}
            />
            <Input
              label="Application URL"
              placeholder="https://..."
              value={oppForm.applicationUrl}
              onChange={e => setOppForm(f => ({ ...f, applicationUrl: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Deadline"
              type="date"
              value={oppForm.deadline}
              onChange={e => setOppForm(f => ({ ...f, deadline: e.target.value }))}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-primary">Options</label>
              <div className="flex flex-col gap-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={oppForm.isRemote}
                    onChange={e => setOppForm(f => ({ ...f, isRemote: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-primary">Remote position</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={oppForm.isFeatured}
                    onChange={e => setOppForm(f => ({ ...f, isFeatured: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-primary">Featured on dashboard</span>
                </label>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => { setOppModal(false); setEditOpp(null); setOppForm(DEF_OPP); }}
            >
              Cancel
            </Button>
            <Button
              variant="accent"
              className="flex-1"
              isLoading={createOpp.isPending}
              onClick={() => createOpp.mutate(oppForm)}
            >
              {editOpp ? 'Save Changes' : 'Add Opportunity'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Skill Path Modal */}
      <Modal
        isOpen={pathModal}
        onClose={() => { setPathModal(false); setEditPath(null); setPathForm(DEF_PATH); }}
        title={editPath ? 'Edit Skill Path' : 'Add Skill Path'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Title *"
            placeholder="e.g. Frontend Development"
            value={pathForm.title}
            onChange={e => setPathForm(f => ({ ...f, title: e.target.value }))}
          />
          <Textarea
            label="Description"
            placeholder="What students will learn..."
            rows={2}
            value={pathForm.description}
            onChange={e => setPathForm(f => ({ ...f, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              options={PATH_CATS}
              value={pathForm.category}
              onChange={e => setPathForm(f => ({ ...f, category: e.target.value }))}
            />
            <Input
              label="Estimated Hours"
              type="number"
              placeholder="e.g. 120"
              value={pathForm.estimatedHours}
              onChange={e => setPathForm(f => ({ ...f, estimatedHours: e.target.value }))}
            />
          </div>
          <Select
            label="Icon"
            options={ICONS}
            value={pathForm.icon}
            onChange={e => setPathForm(f => ({ ...f, icon: e.target.value }))}
          />
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => { setPathModal(false); setEditPath(null); setPathForm(DEF_PATH); }}
            >
              Cancel
            </Button>
            <Button
              variant="accent"
              className="flex-1"
              isLoading={createPath.isPending}
              onClick={() => createPath.mutate(pathForm)}
            >
              {editPath ? 'Save Changes' : 'Add Skill Path'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Step Modal */}
      <Modal
        isOpen={stepModal}
        onClose={() => { setStepModal(false); setEditStep(null); setStepForm(DEF_STEP); }}
        title={(editStep ? 'Edit Step' : 'Add Step') + (activePathTitle ? ' — ' + activePathTitle : '')}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Step Title *"
            placeholder="e.g. HTML Fundamentals"
            value={stepForm.title}
            onChange={e => setStepForm(f => ({ ...f, title: e.target.value }))}
          />
          <Textarea
            label="Description"
            placeholder="What will students learn in this step..."
            rows={2}
            value={stepForm.description}
            onChange={e => setStepForm(f => ({ ...f, description: e.target.value }))}
          />
          <Input
            label="Estimated Hours"
            type="number"
            placeholder="e.g. 10"
            value={stepForm.estimatedHours}
            onChange={e => setStepForm(f => ({ ...f, estimatedHours: e.target.value }))}
          />

          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
              Video Resource (Optional)
            </p>
            <div className="space-y-3">
              <Input
                label="Video URL"
                placeholder="https://www.youtube.com/watch?v=..."
                hint="YouTube, Vimeo, or any video link"
                value={stepForm.videoUrl}
                onChange={e => setStepForm(f => ({ ...f, videoUrl: e.target.value }))}
              />
              <Input
                label="Video Title"
                placeholder="e.g. Complete HTML Tutorial for Beginners"
                hint="Shown as the video label"
                value={stepForm.videoTitle}
                onChange={e => setStepForm(f => ({ ...f, videoTitle: e.target.value }))}
              />
              {stepForm.videoUrl && (
                <div className="bg-surface border border-border rounded-xl p-3 text-xs">
                  <p className="text-muted mb-1">Preview URL:</p>
                  <a
                    href={stepForm.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline break-all"
                  >
                    {stepForm.videoUrl}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => { setStepModal(false); setEditStep(null); setStepForm(DEF_STEP); }}
            >
              Cancel
            </Button>
            <Button
              variant="accent"
              className="flex-1"
              isLoading={createStep.isPending}
              onClick={() => createStep.mutate(stepForm)}
            >
              {editStep ? 'Save Changes' : 'Add Step'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
