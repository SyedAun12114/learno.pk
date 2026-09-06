"""
Learno Patch 3 - Fix admin panel + fix all new feature pages
"""
import sys
from pathlib import Path


def w(path, content):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    print("  [OK] " + str(p))


def find_root():
    for c in [Path("."), Path("Learno"), Path("Learno MVP"), Path("Learno MVP v1")]:
        if (c / "package.json").exists() and (c / "server").exists():
            return c.resolve()
    p = Path(".").resolve()
    if (p / "package.json").exists() and (p / "server").exists():
        return p
    print("ERROR: Cannot find Learno project root.")
    sys.exit(1)


def fix_admin(base):
    print("\n[1/3] Fixing admin backend...")

    w(base / "server/src/routes/admin.ts", """import { Router, Request, Response } from 'express';
import { z } from 'zod';
import mysql from 'mysql2/promise';
import { pool } from '../db';
import { requireAdmin } from '../middleware/requireAuth';
import { logger } from '../utils/logger';

const router = Router();

function safeSkills(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val as string[];
  if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return [];
    if (s.startsWith('[')) {
      try { return JSON.parse(s); } catch {}
    }
    return s.split(',').map(x => x.trim()).filter(Boolean);
  }
  return [];
}

router.get('/stats', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const queries = await Promise.allSettled([
      pool.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM users'),
      pool.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM users WHERE is_onboarded=1'),
      pool.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM tasks'),
      pool.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM test_attempts WHERE status="completed"'),
      pool.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM study_plans'),
      pool.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM ai_usage WHERE DATE(created_at)=CURDATE()'),
    ]);
    const getCount = (result: PromiseSettledResult<[mysql.RowDataPacket[], unknown]>) => {
      if (result.status === 'fulfilled') {
        return (result.value[0] as unknown as Array<{ count: number }>)[0]?.count || 0;
      }
      return 0;
    };
    return res.json({
      success: true,
      data: {
        totalUsers: getCount(queries[0]),
        onboardedUsers: getCount(queries[1]),
        totalTasks: getCount(queries[2]),
        completedTests: getCount(queries[3]),
        studyPlans: getCount(queries[4]),
        aiRequestsToday: getCount(queries[5]),
      },
    });
  } catch (err) {
    logger.error('Admin stats:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch stats.' });
  }
});

router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const offset = (parseInt(String(page), 10) - 1) * parseInt(String(limit), 10);
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT u.id, u.email, u.role, u.is_onboarded, u.created_at, sp.full_name FROM users u LEFT JOIN student_profiles sp ON sp.user_id=u.id ORDER BY u.created_at DESC LIMIT ' + parseInt(String(limit), 10) + ' OFFSET ' + offset
    );
    return res.json({
      success: true,
      data: (rows as unknown as Array<Record<string, unknown>>).map(u => ({
        id: u.id, email: u.email, role: u.role,
        isOnboarded: Boolean(u.is_onboarded), fullName: u.full_name, createdAt: u.created_at,
      })),
    });
  } catch (err) {
    logger.error('Admin users:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch users.' });
  }
});

router.get('/skill-paths', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [paths] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT sp.*, COUNT(sps.id) as step_count FROM skill_paths sp LEFT JOIN skill_path_steps sps ON sps.path_id = sp.id GROUP BY sp.id ORDER BY sp.created_at DESC'
    );
    return res.json({
      success: true,
      data: (paths as unknown as Array<Record<string, unknown>>).map(p => ({
        id: p.id, title: p.title, description: p.description, category: p.category,
        totalSteps: p.step_count, estimatedHours: p.estimated_hours, icon: p.icon,
        isActive: Boolean(p.is_active), createdAt: p.created_at,
      })),
    });
  } catch (err) {
    logger.error('Admin get paths:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch skill paths.' });
  }
});

router.post('/skill-paths', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { title, description, category, estimatedHours, icon } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'Title is required.' });
    const [r] = await pool.execute<mysql.ResultSetHeader>(
      'INSERT INTO skill_paths (title, description, category, estimated_hours, icon, is_active, total_steps) VALUES (?, ?, ?, ?, ?, 1, 0)',
      [title, description || null, category || 'development', estimatedHours || null, icon || 'Zap']
    );
    return res.status(201).json({ success: true, data: { id: r.insertId } });
  } catch (err) {
    logger.error('Create path:', err);
    return res.status(500).json({ success: false, error: 'Failed to create skill path.' });
  }
});

router.put('/skill-paths/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { title, description, category, estimatedHours, icon } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'Title is required.' });
    await pool.execute(
      'UPDATE skill_paths SET title=?, description=?, category=?, estimated_hours=?, icon=? WHERE id=?',
      [title, description || null, category || 'development', estimatedHours || null, icon || 'Zap', parseInt(req.params.id, 10)]
    );
    return res.json({ success: true });
  } catch (err) {
    logger.error('Update path:', err);
    return res.status(500).json({ success: false, error: 'Failed to update skill path.' });
  }
});

router.delete('/skill-paths/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await pool.execute('UPDATE skill_paths SET is_active=0 WHERE id=?', [parseInt(req.params.id, 10)]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to delete skill path.' });
  }
});

router.post('/skill-paths/:pathId/steps', requireAdmin, async (req: Request, res: Response) => {
  try {
    const pathId = parseInt(req.params.pathId, 10);
    const { title, description, estimatedHours } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'Title is required.' });
    const [countRows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM skill_path_steps WHERE path_id=?', [pathId]
    );
    const stepNumber = ((countRows as unknown as Array<{ count: number }>)[0]?.count || 0) + 1;
    const [r] = await pool.execute<mysql.ResultSetHeader>(
      'INSERT INTO skill_path_steps (path_id, step_number, title, description, estimated_hours) VALUES (?, ?, ?, ?, ?)',
      [pathId, stepNumber, title, description || null, estimatedHours || null]
    );
    await pool.execute(
      'UPDATE skill_paths SET total_steps=(SELECT COUNT(*) FROM skill_path_steps WHERE path_id=?) WHERE id=?',
      [pathId, pathId]
    );
    return res.status(201).json({ success: true, data: { id: r.insertId } });
  } catch (err) {
    logger.error('Create step:', err);
    return res.status(500).json({ success: false, error: 'Failed to add step.' });
  }
});

router.put('/skill-paths/:pathId/steps/:stepId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { title, description, estimatedHours } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'Title is required.' });
    await pool.execute(
      'UPDATE skill_path_steps SET title=?, description=?, estimated_hours=? WHERE id=? AND path_id=?',
      [title, description || null, estimatedHours || null, parseInt(req.params.stepId, 10), parseInt(req.params.pathId, 10)]
    );
    return res.json({ success: true });
  } catch (err) {
    logger.error('Update step:', err);
    return res.status(500).json({ success: false, error: 'Failed to update step.' });
  }
});

router.delete('/skill-paths/:pathId/steps/:stepId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const pathId = parseInt(req.params.pathId, 10);
    await pool.execute(
      'DELETE FROM skill_path_steps WHERE id=? AND path_id=?',
      [parseInt(req.params.stepId, 10), pathId]
    );
    await pool.execute(
      'UPDATE skill_paths SET total_steps=(SELECT COUNT(*) FROM skill_path_steps WHERE path_id=?) WHERE id=?',
      [pathId, pathId]
    );
    return res.json({ success: true });
  } catch (err) {
    logger.error('Delete step:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete step.' });
  }
});

router.get('/opportunities', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT * FROM opportunities ORDER BY created_at DESC'
    );
    return res.json({
      success: true,
      data: (rows as unknown as Array<Record<string, unknown>>).map(o => ({
        id: o.id, title: o.title, company: o.company, description: o.description,
        type: o.type, location: o.location, isRemote: Boolean(o.is_remote),
        requiredSkills: safeSkills(o.required_skills),
        experienceLevel: o.experience_level, applicationUrl: o.application_url,
        deadline: o.deadline, isFeatured: Boolean(o.is_featured),
        isActive: Boolean(o.is_active), createdAt: o.created_at,
      })),
    });
  } catch (err) {
    logger.error('Admin opps:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch opportunities.' });
  }
});

const OppSchema = z.object({
  title: z.string().min(1).max(500),
  company: z.string().min(1).max(255),
  description: z.string().min(1),
  type: z.enum(['internship', 'freelance', 'part_time', 'full_time', 'apprenticeship']),
  location: z.string().max(255).optional(),
  isRemote: z.boolean().default(false),
  requiredSkills: z.array(z.string()).optional(),
  experienceLevel: z.string().max(100).optional(),
  applicationUrl: z.string().max(1000).optional(),
  deadline: z.string().optional().nullable(),
  isFeatured: z.boolean().default(false),
});

router.post('/opportunities', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = OppSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    const d = parsed.data;
    const [r] = await pool.execute<mysql.ResultSetHeader>(
      'INSERT INTO opportunities (title,company,description,type,location,is_remote,required_skills,experience_level,application_url,deadline,is_featured,is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?,1)',
      [d.title, d.company, d.description, d.type, d.location || null, d.isRemote ? 1 : 0,
       d.requiredSkills ? JSON.stringify(d.requiredSkills) : null,
       d.experienceLevel || null, d.applicationUrl || null, d.deadline || null, d.isFeatured ? 1 : 0]
    );
    return res.status(201).json({ success: true, data: { id: r.insertId } });
  } catch (err) {
    logger.error('Admin create opp:', err);
    return res.status(500).json({ success: false, error: 'Failed to create.' });
  }
});

router.put('/opportunities/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = OppSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    const d = parsed.data;
    await pool.execute(
      'UPDATE opportunities SET title=?,company=?,description=?,type=?,location=?,is_remote=?,required_skills=?,experience_level=?,application_url=?,deadline=?,is_featured=? WHERE id=?',
      [d.title, d.company, d.description, d.type, d.location || null, d.isRemote ? 1 : 0,
       d.requiredSkills ? JSON.stringify(d.requiredSkills) : null,
       d.experienceLevel || null, d.applicationUrl || null, d.deadline || null, d.isFeatured ? 1 : 0,
       parseInt(req.params.id, 10)]
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to update.' });
  }
});

router.put('/opportunities/:id/toggle', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { isActive } = req.body;
    await pool.execute('UPDATE opportunities SET is_active=? WHERE id=?', [isActive ? 1 : 0, parseInt(req.params.id, 10)]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to toggle.' });
  }
});

router.delete('/opportunities/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await pool.execute('UPDATE opportunities SET is_active=0 WHERE id=?', [parseInt(req.params.id, 10)]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to delete.' });
  }
});

export default router;
""")
    print("  admin.ts fully rewritten")


def fix_features(base):
    print("\n[2/3] Fixing feature pages...")

    w(base / "client/src/pages/flashcards/FlashcardsPage.tsx", """import { useState } from 'react';
import { Bot, ChevronLeft, ChevronRight, RotateCcw, Check, X, Shuffle, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../hooks/useToast';
import { api } from '../../lib/api';

interface Flashcard { question: string; answer: string; }
type Mode = 'generate' | 'study' | 'results';

const COUNTS = [
  { value: '5', label: '5 cards' },
  { value: '10', label: '10 cards' },
  { value: '15', label: '15 cards' },
  { value: '20', label: '20 cards' },
];

export default function FlashcardsPage() {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState('10');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [unknown, setUnknown] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [mode, setMode] = useState<Mode>('generate');
  const toast = useToast();

  const generate = async () => {
    if (!topic.trim()) { toast.error('Enter a topic first'); return; }
    setGenerating(true);
    try {
      const convRes = await api.post<{ success: boolean; data: { id: number } }>(
        '/ai/conversations',
        { title: 'Flashcards: ' + topic }
      );
      const convId = convRes.data.data.id;

      const prompt = 'Generate ' + count + ' flashcards about: ' + topic + '. Return ONLY valid JSON in this exact format: {"cards":[{"question":"What is X?","answer":"X is..."}]} Make questions test genuine understanding. No extra text outside the JSON.';

      const msgRes = await api.post<{ success: boolean; data: { content: string } }>(
        '/ai/conversations/' + convId + '/messages',
        { content: prompt }
      );

      const content = msgRes.data.data.content;
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON found in AI response');

      const parsed = JSON.parse(match[0]);
      if (!parsed.cards || !Array.isArray(parsed.cards) || parsed.cards.length === 0) {
        throw new Error('Invalid flashcard format returned');
      }

      setCards(parsed.cards);
      setIndex(0);
      setFlipped(false);
      setKnown(new Set());
      setUnknown(new Set());
      setMode('study');
      toast.success(parsed.cards.length + ' flashcards generated!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to generate flashcards: ' + msg);
    } finally {
      setGenerating(false);
    }
  };

  const shuffle = () => {
    setCards(c => [...c].sort(() => Math.random() - 0.5));
    setIndex(0);
    setFlipped(false);
    setKnown(new Set());
    setUnknown(new Set());
  };

  const markKnown = () => {
    setKnown(k => new Set([...k, index]));
    setUnknown(u => { const n = new Set(u); n.delete(index); return n; });
    nextCard();
  };

  const markUnknown = () => {
    setUnknown(u => new Set([...u, index]));
    setKnown(k => { const n = new Set(k); n.delete(index); return n; });
    nextCard();
  };

  const nextCard = () => {
    if (index < cards.length - 1) { setIndex(i => i + 1); setFlipped(false); }
    else setMode('results');
  };

  const prevCard = () => {
    if (index > 0) { setIndex(i => i - 1); setFlipped(false); }
  };

  const restart = () => {
    setIndex(0); setFlipped(false);
    setKnown(new Set()); setUnknown(new Set());
    setMode('study');
  };

  return (
    <div className="space-y-6 pb-16 md:pb-0 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-primary">AI Flashcards</h1>
        <p className="text-sm text-muted mt-0.5">Generate and study flashcards on any topic</p>
      </div>

      {mode === 'generate' && (
        <Card>
          <h2 className="text-sm font-semibold text-primary mb-4">Generate Flashcards</h2>
          <div className="space-y-4">
            <Input
              label="Topic *"
              placeholder="e.g. JavaScript Arrays, Photosynthesis, World War 2"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') generate(); }}
            />
            <Select
              label="Number of cards"
              options={COUNTS}
              value={count}
              onChange={e => setCount(e.target.value)}
            />
            <Button
              variant="accent"
              className="w-full"
              isLoading={generating}
              leftIcon={<Bot className="w-4 h-4" />}
              onClick={generate}
            >
              {generating ? 'Generating flashcards...' : 'Generate Flashcards'}
            </Button>
          </div>
        </Card>
      )}

      {mode === 'study' && cards.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">{index + 1} of {cards.length}</p>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-green-600"><Check className="w-3.5 h-3.5" />{known.size} known</span>
              <span className="flex items-center gap-1 text-red-500"><X className="w-3.5 h-3.5" />{unknown.size} learning</span>
            </div>
          </div>

          <div className="h-2 bg-surface rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: (index / cards.length * 100) + '%' }} />
          </div>

          <div className="cursor-pointer select-none" onClick={() => setFlipped(f => !f)}>
            <Card className={'min-h-64 flex flex-col items-center justify-center text-center p-8 transition-colors ' + (flipped ? 'bg-primary' : 'hover:border-accent/50')}>
              <p className={'text-xs font-semibold uppercase tracking-widest mb-4 ' + (flipped ? 'text-background/60' : 'text-muted')}>
                {flipped ? 'Answer' : 'Question — tap to reveal answer'}
              </p>
              <p className={'text-lg font-medium leading-relaxed ' + (flipped ? 'text-background' : 'text-primary')}>
                {flipped ? cards[index].answer : cards[index].question}
              </p>
            </Card>
          </div>

          {flipped && (
            <div className="grid grid-cols-2 gap-3">
              <Button variant="danger" className="w-full" leftIcon={<X className="w-4 h-4" />} onClick={markUnknown}>
                Still learning
              </Button>
              <Button variant="accent" className="w-full" leftIcon={<Check className="w-4 h-4" />} onClick={markKnown}>
                Got it
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" leftIcon={<ChevronLeft className="w-4 h-4" />} onClick={prevCard} disabled={index === 0}>
              Prev
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<Shuffle className="w-3.5 h-3.5" />} onClick={shuffle}>
              Shuffle
            </Button>
            <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />} onClick={nextCard} disabled={index === cards.length - 1}>
              Next
            </Button>
          </div>
        </div>
      )}

      {mode === 'results' && (
        <Card className="text-center py-10">
          <div className="text-5xl font-bold text-primary mb-2">
            {Math.round((known.size / cards.length) * 100)}%
          </div>
          <p className="text-sm text-muted mb-6">{known.size} of {cards.length} cards marked as known</p>
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mb-8">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{known.size}</p>
              <p className="text-xs text-green-600">Known</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{unknown.size}</p>
              <p className="text-xs text-red-500">Still learning</p>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" leftIcon={<RotateCcw className="w-4 h-4" />} onClick={restart}>
              Study again
            </Button>
            <Button variant="accent" onClick={() => { setMode('generate'); setCards([]); setTopic(''); }}>
              New topic
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
""")

    w(base / "client/src/pages/interview/InterviewPage.tsx", """import { useState, useRef, useEffect } from 'react';
import { Bot, Send, RotateCcw, Briefcase, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../hooks/useToast';
import { api } from '../../lib/api';

interface Message { role: 'user' | 'assistant'; content: string; }

const ROLES = [
  { value: 'Frontend Developer', label: 'Frontend Developer' },
  { value: 'Backend Developer', label: 'Backend Developer' },
  { value: 'Full-Stack Developer', label: 'Full-Stack Developer' },
  { value: 'UI/UX Designer', label: 'UI/UX Designer' },
  { value: 'Data Analyst', label: 'Data Analyst' },
  { value: 'AI/ML Engineer', label: 'AI/ML Engineer' },
  { value: 'Digital Marketer', label: 'Digital Marketer' },
  { value: 'Custom', label: 'Custom role...' },
];

const LEVELS = [
  { value: 'internship', label: 'Internship' },
  { value: 'junior', label: 'Junior (0-2 years)' },
  { value: 'mid', label: 'Mid-level (2-5 years)' },
];

export default function InterviewPage() {
  const [role, setRole] = useState('Frontend Developer');
  const [customRole, setCustomRole] = useState('');
  const [level, setLevel] = useState('internship');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [started, setStarted] = useState(false);
  const [convId, setConvId] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const targetRole = role === 'Custom' ? customRole : role;

  const startInterview = async () => {
    if (!targetRole.trim()) { toast.error('Enter a role name'); return; }
    setSending(true);
    try {
      const convRes = await api.post<{ success: boolean; data: { id: number } }>(
        '/ai/conversations',
        { title: 'Interview: ' + targetRole }
      );
      const cid = convRes.data.data.id;
      setConvId(cid);

      const startPrompt = 'You are a professional technical interviewer. Conduct a realistic ' + level + ' level ' + targetRole + ' interview. Start by briefly introducing yourself as the interviewer, then ask your first interview question. After each of my answers, give brief encouraging feedback then ask the next question. Ask 5-7 questions total, then give a final assessment with a score out of 10 and specific feedback.';

      const msgRes = await api.post<{ success: boolean; data: { content: string } }>(
        '/ai/conversations/' + cid + '/messages',
        { content: startPrompt }
      );

      setMessages([{ role: 'assistant', content: msgRes.data.data.content }]);
      setStarted(true);
    } catch (err) {
      toast.error('Failed to start interview. Check your AI configuration.');
    } finally {
      setSending(false);
    }
  };

  const send = async () => {
    if (!input.trim() || sending || !convId) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setSending(true);
    try {
      const res = await api.post<{ success: boolean; data: { content: string } }>(
        '/ai/conversations/' + convId + '/messages',
        { content: userMsg }
      );
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.data.content }]);
    } catch (err) {
      toast.error('Failed to send message. Try again.');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setMessages([]); setStarted(false);
    setConvId(null); setInput('');
  };

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Interview Prep</h1>
          <p className="text-sm text-muted mt-0.5">Practice with an AI interviewer for any role</p>
        </div>
        {started && (
          <Button variant="secondary" size="sm" leftIcon={<RotateCcw className="w-4 h-4" />} onClick={reset}>
            New Session
          </Button>
        )}
      </div>

      {!started ? (
        <Card>
          <h2 className="text-sm font-semibold text-primary mb-4">Configure Your Interview</h2>
          <div className="space-y-4">
            <Select label="Role" options={ROLES} value={role} onChange={e => setRole(e.target.value)} />
            {role === 'Custom' && (
              <Input label="Custom role name" placeholder="e.g. DevOps Engineer" value={customRole} onChange={e => setCustomRole(e.target.value)} />
            )}
            <Select label="Level" options={LEVELS} value={level} onChange={e => setLevel(e.target.value)} />
            <Card variant="surface" padding="sm">
              <p className="text-xs font-semibold text-primary mb-1">What to expect</p>
              <p className="text-xs text-muted">The AI will conduct a realistic mock interview with 5-7 questions. Answer as you would in a real interview. You will receive feedback and a final score.</p>
            </Card>
            <Button
              variant="accent"
              className="w-full"
              isLoading={sending}
              leftIcon={<Briefcase className="w-4 h-4" />}
              onClick={startInterview}
            >
              {sending ? 'Starting interview...' : 'Start Interview'}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col bg-card border border-border rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 14rem)' }}>
          <div className="flex-shrink-0 px-5 py-3 border-b border-border flex items-center gap-2 bg-surface/50">
            <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">AI Interviewer</p>
              <p className="text-xs text-muted">{targetRole} — {level}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.map((msg, i) => (
              <div key={i} className={'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 bg-accent rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div className={'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ' + (msg.role === 'user' ? 'bg-primary text-background' : 'bg-surface text-primary')}>
                  {msg.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-accent rounded-lg flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-surface rounded-2xl px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="flex-shrink-0 p-4 border-t border-border">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Type your answer... (Enter to send, Shift+Enter for new line)"
                rows={2}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                className="p-2.5 rounded-xl bg-accent text-primary hover:bg-accent/90 transition-colors disabled:opacity-40 self-end"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
""")

    w(base / "client/src/pages/cv/CVBuilderPage.tsx", """import { useState } from 'react';
import { Bot, Download, FileText, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { useToast } from '../../hooks/useToast';
import { api } from '../../lib/api';
import type { StudentProfile } from '../../../../shared/types';

export default function CVBuilderPage() {
  const [phone, setPhone] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [extra, setExtra] = useState('');
  const [cv, setCv] = useState('');
  const [generating, setGenerating] = useState(false);
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
    if (!profile) { toast.error('Complete your profile in Settings first'); return; }
    setGenerating(true);
    try {
      const skillList = (skills as Array<Record<string, unknown>>)
        .map(s => String(s.pathTitle))
        .join(', ');

      const prompt = [
        'Generate a professional CV for this student for the Pakistan job market.',
        '',
        'Name: ' + profile.fullName,
        'Education: ' + (profile.educationLevel || 'Student') + ' at ' + (profile.institution || 'University'),
        'Career Goal: ' + (profile.careerGoal || profile.careerInterest || 'Software Development'),
        'Current Skills: ' + (profile.currentSkills || 'Not specified'),
        'Learning Paths: ' + (skillList || 'Various'),
        phone ? 'Phone: ' + phone : '',
        linkedin ? 'LinkedIn: ' + linkedin : '',
        github ? 'GitHub: ' + github : '',
        extra ? 'Additional: ' + extra : '',
        '',
        'Create a clean, ATS-friendly CV with these sections: Contact Info, Career Objective, Education, Technical Skills, Projects/Learning, and Certifications if applicable.',
        'Use plain text formatting with dashes for bullets. Keep it to 1 page.',
      ].filter(Boolean).join('\n');

      const convRes = await api.post<{ success: boolean; data: { id: number } }>(
        '/ai/conversations',
        { title: 'CV: ' + profile.fullName }
      );
      const cid = convRes.data.data.id;

      const msgRes = await api.post<{ success: boolean; data: { content: string } }>(
        '/ai/conversations/' + cid + '/messages',
        { content: prompt }
      );

      setCv(msgRes.data.data.content);
      toast.success('CV generated! Copy and paste into Word or Google Docs.');
    } catch (err) {
      toast.error('Failed to generate CV. Check your AI configuration.');
    } finally {
      setGenerating(false);
    }
  };

  const copyCV = () => {
    navigator.clipboard.writeText(cv);
    toast.success('CV copied to clipboard!');
  };

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-primary">CV Builder</h1>
        <p className="text-sm text-muted mt-0.5">AI generates a professional CV from your Learno profile</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-primary">Profile Used</h2>
            </div>
            {profile ? (
              <div className="space-y-2 text-sm">
                {[
                  { l: 'Name', v: profile.fullName },
                  { l: 'Education', v: profile.educationLevel || '-' },
                  { l: 'Institution', v: profile.institution || '-' },
                  { l: 'Skills', v: profile.currentSkills || '-' },
                  { l: 'Career Goal', v: profile.careerGoal || '-' },
                ].map(row => (
                  <div key={row.l} className="flex justify-between py-1.5 border-b border-border last:border-0">
                    <span className="text-muted">{row.l}</span>
                    <span className="text-primary text-right max-w-48 truncate">{row.v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Complete your profile in Settings first.</p>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-primary">Additional Details</h2>
            </div>
            <div className="space-y-3">
              <Input label="Phone" placeholder="+92 300 1234567" value={phone} onChange={e => setPhone(e.target.value)} />
              <Input label="LinkedIn" placeholder="linkedin.com/in/yourname" value={linkedin} onChange={e => setLinkedin(e.target.value)} />
              <Input label="GitHub" placeholder="github.com/yourname" value={github} onChange={e => setGithub(e.target.value)} />
              <Textarea
                label="Projects, internships, or achievements"
                placeholder="Any additional experience you want to include..."
                rows={3}
                value={extra}
                onChange={e => setExtra(e.target.value)}
              />
              <Button
                variant="accent"
                className="w-full"
                isLoading={generating}
                leftIcon={<Bot className="w-4 h-4" />}
                onClick={generate}
              >
                {generating ? 'Generating your CV...' : 'Generate My CV'}
              </Button>
            </div>
          </Card>
        </div>

        <div>
          {cv ? (
            <Card className="flex flex-col" style={{ minHeight: '500px' }}>
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h2 className="text-sm font-semibold text-primary">Your CV</h2>
                <Button size="sm" variant="accent" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={copyCV}>
                  Copy to clipboard
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <pre className="text-xs text-primary whitespace-pre-wrap font-mono leading-relaxed bg-surface rounded-xl p-4">
                  {cv}
                </pre>
              </div>
              <p className="text-xs text-muted mt-3 flex-shrink-0">
                Tip: Copy and paste into Word or Google Docs, then format and download as PDF.
              </p>
            </Card>
          ) : (
            <Card className="flex items-center justify-center" style={{ minHeight: '300px' }}>
              <div className="text-center">
                <FileText className="w-10 h-10 text-muted mx-auto mb-3" />
                <p className="text-sm font-medium text-primary mb-1">Your CV will appear here</p>
                <p className="text-xs text-muted">Fill in details on the left and click Generate</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
""")

    w(base / "client/src/pages/career/CareerAdvisorPage.tsx", """import { useState } from 'react';
import { Bot, Target, TrendingUp, Briefcase, ArrowRight, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { useToast } from '../../hooks/useToast';
import { api } from '../../lib/api';
import type { StudentProfile } from '../../../../shared/types';

interface Phase { phase: string; duration: string; goals: string[]; skills: string[]; }
interface CareerPlan { summary: string; phases: Phase[]; immediate_actions: string[]; resources: string[]; }

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
      const skillList = (skills as Array<Record<string, unknown>>).map(s => String(s.pathTitle)).join(', ');

      const prompt = [
        'Create a detailed career roadmap. Return ONLY valid JSON, no extra text.',
        '',
        'Target: ' + goal,
        'Timeline: ' + timeline + ' months',
        'Current skills: ' + (profile?.currentSkills || 'Beginner'),
        'Education: ' + (profile?.educationLevel || 'Student') + ' at ' + (profile?.institution || 'University'),
        'Learning now: ' + (skillList || 'Nothing yet'),
        context ? 'Context: ' + context : '',
        '',
        'Return this exact JSON structure:',
        '{"summary":"2-3 sentences","phases":[{"phase":"Phase name","duration":"X weeks","goals":["goal1","goal2"],"skills":["skill1","skill2"]}],"immediate_actions":["action1","action2","action3"],"resources":["resource1","resource2","resource3"]}',
        '',
        'Be specific for Pakistan job market. Include 3-4 phases.',
      ].filter(Boolean).join('\n');

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
    } catch (err) {
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
          <Select label="Career Goal *" options={GOALS} value={goal} onChange={e => setGoal(e.target.value)} />
          <Select label="Timeline" options={TIMELINES} value={timeline} onChange={e => setTimeline(e.target.value)} />
          <div className="flex items-end">
            <Button variant="accent" className="w-full" isLoading={loading} leftIcon={<Bot className="w-4 h-4" />} onClick={generate}>
              {loading ? 'Building roadmap...' : 'Build My Roadmap'}
            </Button>
          </div>
        </div>
        <Textarea
          label="Additional context (optional)"
          placeholder="e.g. I have 2 hours per day, I want to focus on freelancing..."
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
                        <span className="text-xs text-muted bg-surface px-2 py-1 rounded-full">{phase.duration}</span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Goals</p>
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
                          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Skills</p>
                          <div className="flex flex-wrap gap-1">
                            {(phase.skills || []).map((s, j) => (
                              <span key={j} className="text-xs bg-surface text-muted px-2 py-0.5 rounded-full">{s}</span>
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
                {(plan.immediate_actions || []).map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-primary">
                    <span className="w-5 h-5 bg-accent rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                    {a}
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
                {(plan.resources || []).map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-primary">
                    <ArrowRight className="w-3.5 h-3.5 text-muted flex-shrink-0 mt-0.5" />
                    {r}
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
          <p className="text-sm font-medium text-primary mb-1">Select your career goal and click Build My Roadmap</p>
          <p className="text-xs text-muted max-w-sm mx-auto">The AI will create a personalized step-by-step plan based on your skills and goals</p>
        </Card>
      )}
    </div>
  );
}
""")

    w(base / "client/src/pages/skillgap/SkillGapPage.tsx", """import { useQuery } from '@tanstack/react-query';
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
""")

    print("  All 5 feature pages rewritten cleanly.")


def fix_sidebar(base):
    print("\n[3/3] Fixing Sidebar imports...")
    sidebar = base / "client/src/components/layout/Sidebar.tsx"
    if not sidebar.exists():
        print("  [SKIP] Sidebar.tsx not found")
        return

    w(sidebar, """import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Sun, CheckSquare, BookOpen, Bot, TestTube2,
  Zap, Briefcase, BarChart3, Settings, LogOut, GraduationCap,
  Layers, MessageSquare, FileText, Target, TrendingUp, Clock,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../lib/api';

const NAV = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/app/my-day', icon: Sun, label: 'My Day' },
  { to: '/app/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/app/study', icon: BookOpen, label: 'Study' },
  { to: '/app/skills', icon: Zap, label: 'Skills' },
  { to: '/app/tests', icon: TestTube2, label: 'Tests' },
  { to: '/app/opportunities', icon: Briefcase, label: 'Opportunities' },
  { to: '/app/ai', icon: Bot, label: 'AI Assistant' },
  { to: '/app/flashcards', icon: Layers, label: 'Flashcards' },
  { to: '/app/interview', icon: MessageSquare, label: 'Interview Prep' },
  { to: '/app/cv', icon: FileText, label: 'CV Builder' },
  { to: '/app/career', icon: Target, label: 'Career Advisor' },
  { to: '/app/skillgap', icon: TrendingUp, label: 'Skill Gap' },
  { to: '/app/timer', icon: Clock, label: 'Focus Timer' },
  { to: '/app/notes', icon: FileText, label: 'Notes' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogout = async () => {
    try { await logout(); navigate('/'); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  const cls = (active: boolean) =>
    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ' +
    (active ? 'bg-accent text-primary' : 'text-muted hover:text-primary hover:bg-surface');

  return (
    <aside className="hidden md:flex flex-col w-60 h-full bg-card border-r border-border flex-shrink-0">
      <div className="flex-shrink-0 h-14 flex items-center px-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-accent" />
          </div>
          <span className="font-bold text-primary text-base tracking-tight">Learno</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 scrollbar-thin">
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => cls(isActive)}>
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="flex-shrink-0 border-t border-border p-3 space-y-0.5">
        <NavLink to="/app/progress" className={({ isActive }) => cls(isActive)}>
          <BarChart3 className="w-4 h-4" /> Progress
        </NavLink>
        <NavLink to="/app/settings" className={({ isActive }) => cls(isActive)}>
          <Settings className="w-4 h-4" /> Settings
        </NavLink>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">
              {user?.email?.[0]?.toUpperCase() || 'S'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary truncate">{user?.email}</p>
            <p className="text-xs text-muted capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-primary transition-colors"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
""")
    print("  Sidebar.tsx rewritten cleanly - no duplicate imports")


def main():
    print("=" * 55)
    print("  Learno Patch 3 - Fix Admin + Fix All Features")
    print("=" * 55)

    base = find_root()
    print("\nProject found at: " + str(base))

    fix_admin(base)
    fix_features(base)
    fix_sidebar(base)

    print("\n" + "=" * 55)
    print("  Patch complete!")
    print("=" * 55)
    print("""
FIXES:
  Admin Stats        - Now uses Promise.allSettled so one
                       failing query does not break all stats
  Admin Opportunities - Rewrote GET endpoint with robust
                        JSON parsing using safeSkills()
  Admin Skill Paths  - Clean GET /admin/skill-paths endpoint
  Sidebar            - Removed duplicate FileText import,
                       replaced Mic with MessageSquare

FEATURES FIXED:
  Flashcards    - Simplified API flow, better JSON parse error handling
  Interview Prep - Fixed conversation creation and message flow
  CV Builder    - Simplified prompt construction, cleaner API calls
  Career Advisor - Fixed JSON parsing, added loading state
  Skill Gap     - Fixed data handling, added loading state,
                  shows current skills and top missing skills

NEXT STEPS:
  1. Restart: npm run dev
  2. Admin overview should now load stats correctly
  3. Admin opportunities tab should show all opportunities
  4. All 5 new feature pages should work
""")


if __name__ == "__main__":
    main()