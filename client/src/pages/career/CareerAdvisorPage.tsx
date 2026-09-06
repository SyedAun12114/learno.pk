import { useState } from 'react';
import { Bot, Target, TrendingUp, Briefcase, ArrowRight, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { useToast } from '../../hooks/useToast';
import { api } from '../../lib/api';
import type { StudentProfile } from '../../../../shared/types';

interface Phase {
  phase: string;
  duration: string;
  goals: string[];
  skills: string[];
}

interface CareerPlan {
  summary: string;
  phases: Phase[];
  immediate_actions: string[];
  resources: string[];
}

const GOALS = [
  { value: '', label: 'Select a career goal...' },
  { value: 'Frontend Developer', label: 'Frontend Developer' },
  { value: 'Backend Developer', label: 'Backend Developer' },
  { value: 'Full-Stack Developer', label: 'Full-Stack Developer' },
  { value: 'AI/ML Engineer', label: 'AI/ML Engineer' },
  { value: 'UI/UX Designer', label: 'UI/UX Designer' },
  { value: 'Data Analyst', label: 'Data Analyst' },
  { value: 'Digital Marketer', label: 'Digital Marketer' },
  { value: 'Freelancer', label: 'Freelancer / Remote Worker' },
  { value: 'Graphic Designer', label: 'Graphic Designer' },
];

const TIMELINES = [
  { value: '3', label: '3 months' },
  { value: '6', label: '6 months' },
  { value: '12', label: '1 year' },
  { value: '24', label: '2 years' },
];

export default function CareerAdvisorPage() {
  const [goal, setGoal] = useState('');
  const [timeline, setTimeline] = useState('6');
  const [context, setContext] = useState('');
  const [plan, setPlan] = useState<CareerPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: StudentProfile }>('/profile');
      return r.data.data;
    },
  });

  const { data: skills = [] } = useQuery({
    queryKey: ['my-skills'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: unknown[] }>('/skills/my-skills');
      return r.data.data;
    },
  });

  const generate = async () => {
    if (!goal) { toast.error('Select a career goal first'); return; }
    setLoading(true);
    try {
      const skillList = (skills as Array<Record<string, unknown>>)
        .map(s => String(s.pathTitle || ''))
        .filter(Boolean)
        .join(', ');

      const lines = [
        'Create a detailed career roadmap. Return ONLY valid JSON with no extra text.',
        'Target career: ' + goal,
        'Timeline: ' + timeline + ' months',
        'Current skills: ' + (profile?.currentSkills || 'Beginner'),
        'Education: ' + (profile?.educationLevel || 'Student') + ' at ' + (profile?.institution || 'University'),
        'Currently learning: ' + (skillList || 'Nothing yet'),
      ];
      if (context) lines.push('Additional context: ' + context);
      lines.push('');
      lines.push('Return exactly this JSON structure:');
      lines.push('{"summary":"2-3 sentence overview","phases":[{"phase":"Phase name","duration":"X weeks","goals":["goal1","goal2"],"skills":["skill1","skill2"]}],"immediate_actions":["action1","action2","action3"],"resources":["resource1","resource2","resource3"]}');
      lines.push('Include 3 to 4 phases. Be specific for Pakistan job market.');

      const prompt = lines.join('\n');

      const convRes = await api.post<{ success: boolean; data: { id: number } }>(
        '/ai/conversations',
        { title: 'Career Plan: ' + goal }
      );
      const cid = convRes.data.data.id;

      const msgRes = await api.post<{ success: boolean; data: { content: string } }>(
        '/ai/conversations/' + cid + '/messages',
        { content: prompt }
      );

      const content = msgRes.data.data.content;
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON found in response');

      const parsed: CareerPlan = JSON.parse(match[0]);
      setPlan(parsed);
      toast.success('Career roadmap generated!');
    } catch {
      toast.error('Failed to generate plan. The AI may have returned an unexpected format. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-primary">Career Advisor</h1>
        <p className="text-sm text-muted mt-0.5">AI builds your personalized career roadmap</p>
      </div>

      <Card>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <Select
            label="Career Goal *"
            options={GOALS}
            value={goal}
            onChange={e => setGoal(e.target.value)}
          />
          <Select
            label="Timeline"
            options={TIMELINES}
            value={timeline}
            onChange={e => setTimeline(e.target.value)}
          />
          <div className="flex items-end">
            <Button
              variant="accent"
              className="w-full"
              isLoading={loading}
              leftIcon={<Bot className="w-4 h-4" />}
              onClick={generate}
            >
              {loading ? 'Building roadmap...' : 'Build My Roadmap'}
            </Button>
          </div>
        </div>
        <Textarea
          label="Additional context (optional)"
          placeholder="e.g. I have 2 hours per day, I want to focus on freelancing, I already know HTML..."
          rows={2}
          value={context}
          onChange={e => setContext(e.target.value)}
        />
      </Card>

      {loading && (
        <Card className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted">Building your personalized roadmap...</p>
          </div>
        </Card>
      )}

      {plan && !loading && (
        <div className="space-y-5">
          <Card className="bg-accent/5 border-accent/30">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-accent rounded-xl flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-primary mb-1">Your Career Roadmap</h2>
                <p className="text-sm text-primary leading-relaxed">{plan.summary}</p>
              </div>
            </div>
          </Card>

          <div>
            <h2 className="text-sm font-semibold text-primary mb-3">Phases</h2>
            <div className="space-y-3">
              {(plan.phases || []).map((phase, i) => (
                <Card key={i}>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-background">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-primary">{phase.phase}</h3>
                        <span className="text-xs text-muted bg-surface px-2 py-1 rounded-full">
                          {phase.duration}
                        </span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                            Goals
                          </p>
                          <ul className="space-y-1">
                            {(phase.goals || []).map((g, j) => (
                              <li key={j} className="flex items-start gap-1.5 text-xs text-primary">
                                <ArrowRight className="w-3 h-3 text-accent flex-shrink-0 mt-0.5" />
                                {g}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                            Skills to Learn
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {(phase.skills || []).map((s, j) => (
                              <span
                                key={j}
                                className="text-xs bg-surface text-muted px-2 py-0.5 rounded-full"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-primary">Start Today</h2>
              </div>
              <ul className="space-y-2">
                {(plan.immediate_actions || []).map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-primary">
                    <span className="w-5 h-5 bg-accent rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    {action}
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-primary">Recommended Resources</h2>
              </div>
              <ul className="space-y-2">
                {(plan.resources || []).map((resource, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-primary">
                    <ArrowRight className="w-3.5 h-3.5 text-muted flex-shrink-0 mt-0.5" />
                    {resource}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}

      {!plan && !loading && (
        <Card className="py-10 text-center">
          <Bot className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-sm font-medium text-primary mb-1">
            Select your career goal and click Build My Roadmap
          </p>
          <p className="text-xs text-muted max-w-sm mx-auto">
            The AI will create a personalized step-by-step plan based on your current skills and goals
          </p>
        </Card>
      )}
    </div>
  );
}