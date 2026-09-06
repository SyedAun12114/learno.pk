import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Zap, CheckCircle2, Circle, Lock, ChevronDown, ChevronRight,
  Clock, PlayCircle, ExternalLink, X, BookOpen, Award, ArrowRight,
} from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Progress } from '../../components/ui/Progress';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { useToast } from '../../hooks/useToast';
import type { SkillPath, SkillPathStep } from '../../../../shared/types';

interface StepWithVideo extends SkillPathStep {
  videoUrl?: string;
  videoTitle?: string;
}

function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
    /(?:youtu\.be\/)([^?\s]+)/,
    /(?:youtube\.com\/embed\/)([^?\s]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function StepModal({
  step,
  stepNumber,
  pathTitle,
  onClose,
  onComplete,
  completing,
}: {
  step: StepWithVideo;
  stepNumber: number;
  pathTitle: string;
  onClose: () => void;
  onComplete: (id: number) => void;
  completing: boolean;
}) {
  const ytId = step.videoUrl ? getYouTubeId(step.videoUrl) : null;
  const isCompleted = step.userStatus === 'completed';
  const isActive = step.userStatus === 'active';
  const isLocked = step.userStatus === 'locked';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex items-start gap-4">
            <div className={
              'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ' +
              (isCompleted ? 'bg-accent text-primary' :
               isActive ? 'bg-primary text-background' :
               'bg-surface text-muted')
            }>
              {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : stepNumber}
            </div>
            <div>
              <p className="text-xs text-muted font-medium mb-0.5">{pathTitle}</p>
              <h2 className="text-lg font-bold text-primary leading-tight">{step.title}</h2>
              <div className="flex items-center gap-3 mt-1.5">
                {step.estimatedHours && (
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <Clock className="w-3 h-3" />{step.estimatedHours} hours
                  </span>
                )}
                <Badge
                  variant={isCompleted ? 'success' : isActive ? 'accent' : 'muted'}
                  size="sm"
                >
                  {isCompleted ? 'Completed' : isActive ? 'In Progress' : 'Locked'}
                </Badge>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface text-muted hover:text-primary transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Section */}
        {step.videoUrl && (
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <PlayCircle className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-primary">Video Lesson</h3>
            </div>
            {ytId ? (
              <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={'https://www.youtube.com/embed/' + ytId + '?rel=0&modestbranding=1'}
                  title={step.videoTitle || step.title}
                  className="absolute inset-0 w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <a
                href={step.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 bg-surface border border-border rounded-xl hover:border-accent/50 transition-colors group"
              >
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                  <PlayCircle className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary group-hover:text-accent transition-colors">
                    {step.videoTitle || 'Watch Video'}
                  </p>
                  <p className="text-xs text-muted truncate">{step.videoUrl}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted flex-shrink-0" />
              </a>
            )}
            {step.videoTitle && ytId && (
              <p className="text-xs text-muted mt-2 text-center">{step.videoTitle}</p>
            )}
          </div>
        )}

        {/* Description */}
        {step.description && (
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-primary">About This Step</h3>
            </div>
            <p className="text-sm text-primary leading-relaxed">{step.description}</p>
          </div>
        )}

        {/* Resources */}
        {step.resources && step.resources.length > 0 && (
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <ArrowRight className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-primary">Resources</h3>
            </div>
            <div className="space-y-2">
              {step.resources.map((r, i) => (
                <a
                  key={i}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl hover:border-primary/40 transition-colors group"
                >
                  <div className="w-7 h-7 bg-card rounded-lg flex items-center justify-center flex-shrink-0">
                    <ExternalLink className="w-3.5 h-3.5 text-muted group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{r.title}</p>
                    <p className="text-xs text-muted capitalize">{r.type}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Action Footer */}
        <div className="p-6">
          {isLocked && (
            <div className="flex items-center gap-3 p-4 bg-surface rounded-xl border border-border">
              <Lock className="w-4 h-4 text-muted flex-shrink-0" />
              <p className="text-sm text-muted">Complete the previous step to unlock this one.</p>
            </div>
          )}
          {isCompleted && (
            <div className="flex items-center gap-3 p-4 bg-accent/10 rounded-xl border border-accent/30">
              <Award className="w-4 h-4 text-accent flex-shrink-0" />
              <p className="text-sm text-primary font-medium">You have completed this step.</p>
            </div>
          )}
          {isActive && (
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                Continue Later
              </Button>
              <Button
                variant="accent"
                className="flex-1"
                isLoading={completing}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                onClick={() => onComplete(step.id)}
              >
                Mark as Complete
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SkillsPage() {
  const [tab, setTab] = useState<'browse' | 'my-skills'>('browse');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, SkillPath>>({});
  const [selectedStep, setSelectedStep] = useState<{ step: StepWithVideo; stepNumber: number; pathTitle: string } | null>(null);
  const toast = useToast();
  const qc = useQueryClient();

  const { data: paths = [], isLoading: pl } = useQuery({
    queryKey: ['skill-paths'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: SkillPath[] }>('/skills/paths');
      return r.data.data;
    },
  });

  const { data: mySkills = [], isLoading: ml } = useQuery({
    queryKey: ['my-skills'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: unknown[] }>('/skills/my-skills');
      return r.data.data;
    },
  });

  const enroll = useMutation({
    mutationFn: async (pid: number) => api.post('/skills/enroll/' + pid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skill-paths', 'my-skills'] });
      toast.success('Enrolled! Start from step 1.');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const complete = useMutation({
    mutationFn: async (sid: number) => api.patch('/skills/steps/' + sid + '/complete'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skill-paths', 'my-skills'] });
      if (expanded) loadDetails(expanded);
      setSelectedStep(null);
      toast.success('Step completed!');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const loadDetails = async (pid: number) => {
    try {
      const r = await api.get<{ success: boolean; data: SkillPath }>('/skills/paths/' + pid);
      setDetails(p => ({ ...p, [pid]: r.data.data }));
    } catch {}
  };

  const toggleExpand = async (pid: number) => {
    if (expanded === pid) {
      setExpanded(null);
    } else {
      setExpanded(pid);
      if (!details[pid]) await loadDetails(pid);
    }
  };

  const openStep = (step: StepWithVideo, stepNumber: number, pathTitle: string) => {
    setSelectedStep({ step, stepNumber, pathTitle });
  };

  const statusIcon = (s: string) => {
    if (s === 'completed') return <CheckCircle2 className="w-4 h-4 text-accent" />;
    if (s === 'active') return <Circle className="w-4 h-4 text-primary" />;
    return <Lock className="w-4 h-4 text-muted" />;
  };

  return (
    <div className="space-y-5 pb-16 md:pb-0">
      <h1 className="text-2xl font-bold text-primary">Skill Roadmaps</h1>

      <div className="flex gap-1 bg-surface rounded-xl p-1 w-fit">
        {[{ k: 'browse', l: 'Browse Paths' }, { k: 'my-skills', l: 'My Skills' }].map(t => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as 'browse' | 'my-skills')}
            className={'px-4 py-1.5 rounded-lg text-sm font-medium transition-all ' +
              (tab === t.k ? 'bg-card text-primary shadow-sm' : 'text-muted hover:text-primary')}
          >
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'browse' && (
        pl ? (
          <div className="grid md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="space-y-3">
            {(paths as SkillPath[]).map(path => {
              const enrolled = Boolean(path.enrollment);
              const det = details[path.id];
              return (
                <Card key={path.id}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-primary">{path.title}</h3>
                        {enrolled && <Badge variant="accent" size="sm">Enrolled</Badge>}
                      </div>
                      <p className="text-xs text-muted line-clamp-2">{path.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted">
                        <span>{path.totalSteps} steps</span>
                        {path.estimatedHours && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />{path.estimatedHours}h estimated
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {!enrolled ? (
                        <Button size="sm" variant="accent" onClick={() => enroll.mutate(path.id)} isLoading={enroll.isPending}>
                          Enroll
                        </Button>
                      ) : (
                        <div className="text-right">
                          <Badge variant="success" size="sm">{Math.round(path.enrollment!.progressPercent)}%</Badge>
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleExpand(path.id)}
                        rightIcon={expanded === path.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      >
                        {expanded === path.id ? 'Hide' : 'View Steps'}
                      </Button>
                    </div>
                  </div>

                  {enrolled && path.enrollment && (
                    <Progress value={path.enrollment.progressPercent} size="sm" variant="accent" showLabel />
                  )}

                  {expanded === path.id && (
                    <div className="mt-4 pt-4 border-t border-border space-y-2">
                      {(det?.steps || []).map((step: any) => {
                        const s = step as StepWithVideo;
                        const hasVideo = Boolean(s.videoUrl || (s as any).video_url);
                        const isComp = s.userStatus === 'completed';
                        const isAct = s.userStatus === 'active';
                        return (
                          <button
                            key={s.id}
                            onClick={() => openStep({
                          ...s,
                          videoUrl: s.videoUrl || (s as any).video_url || undefined,
                          videoTitle: s.videoTitle || (s as any).video_title || undefined,
                        }, s.stepNumber, path.title)}
                            className={'w-full flex items-center gap-3 py-3 px-3 rounded-xl border transition-all text-left ' +
                              (isComp
                                ? 'bg-accent/5 border-accent/20 hover:bg-accent/10'
                                : isAct
                                ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                                : 'bg-surface border-transparent hover:border-border')}
                          >
                            <div className="flex-shrink-0">{statusIcon(s.userStatus || 'locked')}</div>
                            <div className="flex-1 min-w-0">
                              <p className={'text-sm font-medium ' + (s.userStatus === 'locked' ? 'text-muted' : 'text-primary')}>
                                {s.stepNumber}. {s.title}
                              </p>
                              {s.description && (
                                <p className="text-xs text-muted truncate mt-0.5">{s.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {hasVideo && (
                                <span className="flex items-center gap-1 text-xs text-muted bg-card border border-border px-2 py-0.5 rounded-full">
                                  <PlayCircle className="w-3 h-3 text-red-500" /> Video
                                </span>
                              )}
                              {s.estimatedHours && (
                                <span className="text-xs text-muted">{s.estimatedHours}h</span>
                              )}
                              <ChevronRight className="w-3.5 h-3.5 text-muted" />
                            </div>
                          </button>
                        );
                      })}
                      {!(det?.steps?.length) && (
                        <p className="text-xs text-muted text-center py-3">Loading steps...</p>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )
      )}

      {tab === 'my-skills' && (
        ml ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : (mySkills as Array<Record<string, unknown>>).length === 0 ? (
          <EmptyState
            icon={<Zap className="w-5 h-5" />}
            title="No skills enrolled yet"
            description="Browse skill paths and enroll in ones that match your career goals."
            action={<Button size="sm" variant="accent" onClick={() => setTab('browse')}>Browse paths</Button>}
          />
        ) : (
          <div className="space-y-3">
            {(mySkills as Array<Record<string, unknown>>).map(s => (
              <Card key={s.id as number}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-primary text-sm">{s.pathTitle as string}</h3>
                    <p className="text-xs text-muted">
                      Step {s.currentStep as number} of {s.totalSteps as number}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.status === 'completed' ? 'success' : 'accent'} size="sm">
                      {Math.round(s.progressPercent as number)}%
                    </Badge>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setTab('browse');
                        const pathId = s.pathId as number;
                        toggleExpand(pathId);
                      }}
                    >
                      View
                    </Button>
                  </div>
                </div>
                <Progress value={s.progressPercent as number} size="md" variant="accent" />
              </Card>
            ))}
          </div>
        )
      )}

      {/* Step Detail Modal */}
      {selectedStep && (
        <StepModal
          step={selectedStep.step}
          stepNumber={selectedStep.stepNumber}
          pathTitle={selectedStep.pathTitle}
          onClose={() => setSelectedStep(null)}
          onComplete={(id) => complete.mutate(id)}
          completing={complete.isPending}
        />
      )}
    </div>
  );
}
