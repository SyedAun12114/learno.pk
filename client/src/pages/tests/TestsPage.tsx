import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TestTube2, Bot, CheckCircle2, XCircle } from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { useToast } from '../../hooks/useToast';
import { formatRelative, capitalize } from '../../lib/utils';
import type { TestQuestion } from '../../../../shared/types';

type View = 'list' | 'taking' | 'results';

interface GenTest {
  id: number; title: string; subject: string; difficulty: string;
  totalQuestions: number; questions: TestQuestion[];
}

interface SubmitResult {
  score: number; correctCount: number; totalQuestions: number;
  analysis: string; strengths: string; weakAreas: string;
  answers: Array<{ questionId: number; isCorrect: boolean }>;
  questions: Array<{ id: number; question: string; correctAnswer: string }>;
}

export default function TestsPage() {
  const [view, setView] = useState<View>('list');
  const [genModal, setGenModal] = useState(false);
  const [activeTest, setActiveTest] = useState<GenTest | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [form, setForm] = useState({ subject: '', topic: '', difficulty: 'medium', questionCount: '5' });
  const toast = useToast();
  const qc = useQueryClient();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['test-history'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: unknown[] }>('/tests/attempts');
      return r.data.data;
    },
  });

  const handleGenerate = async () => {
    if (!form.subject) { toast.error('Subject is required'); return; }
    setGenLoading(true);
    try {
      const r = await api.post<{ success: boolean; data: GenTest }>('/tests/generate', {
        subject: form.subject, topic: form.topic || undefined,
        difficulty: form.difficulty, questionCount: parseInt(form.questionCount) || 5,
      });
      setActiveTest(r.data.data);
      setAnswers({});
      setStartTime(Date.now());
      setGenModal(false);
      setView('taking');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGenLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!activeTest) return;
    const unanswered = activeTest.questions.filter(q => !answers[q.id]);
    if (unanswered.length) { toast.error('Please answer all questions (' + unanswered.length + ' remaining)'); return; }
    setSubmitLoading(true);
    try {
      const r = await api.post<{ success: boolean; data: SubmitResult }>(
        '/tests/' + activeTest.id + '/submit',
        {
          answers: Object.entries(answers).map(([qid, ans]) => ({ questionId: parseInt(qid), answer: ans })),
          timeTakenSeconds: Math.round((Date.now() - startTime) / 1000),
        }
      );
      setResult(r.data.data);
      setView('results');
      qc.invalidateQueries({ queryKey: ['test-history'] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitLoading(false);
    }
  };

  if (view === 'taking' && activeTest) {
    return (
      <div className="space-y-5 pb-16 md:pb-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary">{activeTest.title}</h1>
            <p className="text-sm text-muted">{activeTest.subject} - {capitalize(activeTest.difficulty)} - {activeTest.totalQuestions} questions</p>
          </div>
          <Badge variant="warning">{Object.keys(answers).length}/{activeTest.totalQuestions} answered</Badge>
        </div>
        <div className="space-y-4">
          {activeTest.questions.map((q, i) => (
            <Card key={q.id}>
              <p className="text-sm font-medium text-primary mb-3">
                <span className="text-muted font-normal mr-2">{i + 1}.</span>
                {q.question}
              </p>
              {q.type === 'multiple_choice' && q.options ? (
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <label
                      key={oi}
                      className={'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ' + (answers[q.id] === opt.charAt(0) ? 'bg-accent/10 border-accent/50' : 'bg-surface border-border hover:border-primary/30')}
                    >
                      <input
                        type="radio"
                        name={'q-' + q.id}
                        value={opt.charAt(0)}
                        checked={answers[q.id] === opt.charAt(0)}
                        onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                        className="sr-only"
                      />
                      <div className={'w-4 h-4 rounded-full border-2 flex items-center justify-center ' + (answers[q.id] === opt.charAt(0) ? 'border-accent' : 'border-border')}>
                        {answers[q.id] === opt.charAt(0) && <div className="w-2 h-2 rounded-full bg-accent" />}
                      </div>
                      <span className="text-sm text-primary">{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  value={answers[q.id] || ''}
                  onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                  placeholder="Type your answer..."
                  rows={3}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              )}
            </Card>
          ))}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => { setView('list'); setActiveTest(null); }}>Cancel</Button>
          <Button variant="accent" isLoading={submitLoading} onClick={handleSubmit} className="flex-1">Submit test</Button>
        </div>
      </div>
    );
  }

  if (view === 'results' && result && activeTest) {
    const pct = Math.round(result.score);
    const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';
    return (
      <div className="space-y-5 pb-16 md:pb-0">
        <div>
          <h1 className="text-xl font-bold text-primary">Test Results</h1>
          <p className="text-sm text-muted">{activeTest.title}</p>
        </div>
        <Card>
          <div className="flex items-center gap-5">
            <div className={'w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold ' + (pct >= 70 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600')}>
              {grade}
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">{pct}%</p>
              <p className="text-sm text-muted">{result.correctCount} of {result.totalQuestions} correct</p>
            </div>
          </div>
        </Card>
        {result.analysis && (
          <Card>
            <h3 className="text-sm font-semibold text-primary mb-2">Analysis</h3>
            <p className="text-sm text-primary leading-relaxed">{result.analysis}</p>
          </Card>
        )}
        {(result.strengths || result.weakAreas) && (
          <div className="grid md:grid-cols-2 gap-4">
            {result.strengths && (
              <Card className="border-green-200 bg-green-50/30">
                <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-green-600" /><h3 className="text-sm font-semibold text-primary">Strengths</h3></div>
                <p className="text-sm text-primary">{result.strengths}</p>
              </Card>
            )}
            {result.weakAreas && (
              <Card className="border-red-200 bg-red-50/30">
                <div className="flex items-center gap-2 mb-2"><XCircle className="w-4 h-4 text-red-500" /><h3 className="text-sm font-semibold text-primary">Needs Work</h3></div>
                <p className="text-sm text-primary">{result.weakAreas}</p>
              </Card>
            )}
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setView('list')}>Back to tests</Button>
          <Button variant="accent" leftIcon={<Bot className="w-4 h-4" />} onClick={() => setGenModal(true)}>Take another test</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-16 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Tests</h1>
        <Button size="sm" variant="accent" leftIcon={<Bot className="w-4 h-4" />} onClick={() => setGenModal(true)}>
          Generate test
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : history.length === 0 ? (
        <EmptyState
          icon={<TestTube2 className="w-5 h-5" />}
          title="No tests taken yet"
          description="Generate an AI test on any subject to practice and track your progress."
          action={<Button size="sm" variant="accent" leftIcon={<Bot className="w-4 h-4" />} onClick={() => setGenModal(true)}>Generate your first test</Button>}
        />
      ) : (
        <div className="space-y-2">
          {(history as Array<Record<string, unknown>>).map(a => (
            <Card key={a.id as number} padding="sm">
              <div className="flex items-center gap-3">
                <div className={'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ' + ((a.score as number) >= 70 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600')}>
                  {Math.round(a.score as number)}%
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate">{a.title as string}</p>
                  <p className="text-xs text-muted">{a.subject as string} - {capitalize(a.difficulty as string)} - {a.correctCount as number}/{a.totalQuestions as number} correct</p>
                </div>
                <span className="text-xs text-muted flex-shrink-0">{formatRelative(a.completedAt as string)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={genModal} onClose={() => setGenModal(false)} title="Generate Test">
        <div className="space-y-4">
          <Input label="Subject *" placeholder="e.g. Mathematics, JavaScript, Physics" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
          <Input label="Topic (optional)" placeholder="e.g. Quadratic Equations, Arrays" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Difficulty" options={[{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }]} value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))} />
            <Select label="Questions" options={[{ value: '3', label: '3 questions' }, { value: '5', label: '5 questions' }, { value: '10', label: '10 questions' }, { value: '15', label: '15 questions' }]} value={form.questionCount} onChange={e => setForm(f => ({ ...f, questionCount: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setGenModal(false)}>Cancel</Button>
            <Button variant="accent" className="flex-1" isLoading={genLoading} leftIcon={<Bot className="w-4 h-4" />} onClick={handleGenerate}>Generate</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
