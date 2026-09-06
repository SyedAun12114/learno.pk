import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { requireAuth } from '../middleware/requireAuth';
import { getAIProvider } from '../services/ai';
import { studyPlanPrompt } from '../services/ai/prompts';
import { logger } from '../utils/logger';

const router = Router();

const GenSchema = z.object({
  subject: z.string().min(1).max(255),
  goal: z.string().min(1).max(500),
  examDate: z.string().optional(),
  topics: z.string().min(1).max(1000),
  dailyMinutes: z.number().int().min(15).max(480).default(60),
});

const ItemSchema = z.object({
  day: z.number().int().min(1),
  title: z.string(),
  description: z.string().optional(),
  duration_minutes: z.number().int().min(5).max(480),
  phase: z.string().optional(),
});

const PlanSchema = z.object({
  title: z.string(),
  total_days: z.number().int().min(1),
  items: z.array(ItemSchema),
});

function mapPlan(p: any) {
  return {
    id: p.id, userId: p.user_id, title: p.title, subject: p.subject,
    goal: p.goal, examDate: p.exam_date, totalDays: p.total_days,
    dailyMinutes: p.daily_minutes, status: p.status,
    createdAt: p.created_at, updatedAt: p.updated_at,
  };
}

function extractJson(text: string): any {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in response');
  }
  return JSON.parse(text.slice(start, end + 1));
}

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT sp.*, COUNT(spi.id) as total_items, SUM(CASE WHEN spi.status="completed" THEN 1 ELSE 0 END) as completed_items FROM study_plans sp LEFT JOIN study_plan_items spi ON spi.plan_id=sp.id WHERE sp.user_id=? GROUP BY sp.id ORDER BY sp.created_at DESC',
      [req.session.userId]
    ) as any[];
    const plans = (Array.isArray(rows) ? rows : []).map((p: any) => ({
      ...mapPlan(p),
      totalItems: p.total_items || 0,
      completedItems: p.completed_items || 0,
      progress: (p.total_items || 0) > 0
        ? Math.round(((p.completed_items || 0) / p.total_items) * 100)
        : 0,
    }));
    return res.json({ success: true, data: plans });
  } catch (err) {
    logger.error('Get plans:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch study plans.' });
  }
});

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [pRows] = await pool.execute(
      'SELECT * FROM study_plans WHERE id=? AND user_id=?',
      [id, req.session.userId]
    ) as any[];
    const plans = Array.isArray(pRows) ? pRows : [];
    if (!plans.length) return res.status(404).json({ success: false, error: 'Plan not found.' });
    const [iRows] = await pool.execute(
      'SELECT * FROM study_plan_items WHERE plan_id=? ORDER BY day_number ASC',
      [id]
    ) as any[];
    const items = (Array.isArray(iRows) ? iRows : []).map((i: any) => ({
      id: i.id, planId: i.plan_id, dayNumber: i.day_number, title: i.title,
      description: i.description, durationMinutes: i.duration_minutes,
      phase: i.phase, status: i.status, scheduledDate: i.scheduled_date,
      completedAt: i.completed_at,
    }));
    return res.json({ success: true, data: { ...mapPlan(plans[0]), items } });
  } catch (err) {
    logger.error('Get plan:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch plan.' });
  }
});

router.post('/generate', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = GenSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { subject, goal, examDate, topics, dailyMinutes } = parsed.data;
    const ai = getAIProvider();
    if (!ai.isAvailable()) {
      return res.status(503).json({ success: false, error: 'AI service not configured.' });
    }

    const daysUntilExam = examDate
      ? Math.max(Math.ceil((new Date(examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 3)
      : 14;
    const totalDays = daysUntilExam;

    let sessionCount: number;
    let sessionNote: string;
    if (totalDays <= 14) {
      sessionCount = totalDays;
      sessionNote = 'Create exactly one session per day (days 1 to ' + totalDays + ').';
    } else if (totalDays <= 30) {
      sessionCount = Math.ceil(totalDays / 2);
      sessionNote = 'Create ' + sessionCount + ' sessions spread across ' + totalDays + ' days.';
    } else {
      sessionCount = Math.min(Math.ceil(totalDays / 7) * 3, 40);
      sessionNote = 'Create ' + sessionCount + ' key milestone sessions across ' + totalDays + ' days.';
    }

    const promptLines = [
      'Create a ' + totalDays + '-day study plan. Return ONLY valid JSON, no other text.',
      'Subject: ' + subject,
      'Goal: ' + goal,
      'Topics: ' + topics,
      'Daily study time: ' + dailyMinutes + ' minutes',
      sessionNote,
      '',
      'Return this exact JSON format:',
      '{"title":"Plan title","total_days":' + totalDays + ',"items":[{"day":1,"title":"Session title","description":"Brief description","duration_minutes":' + dailyMinutes + ',"phase":"Foundation"}]}',
      '',
      'Phases: Foundation, Development, Practice, Review.',
      'Keep each description under 15 words.',
      'Return ONLY the JSON object, nothing else.',
    ];

    const prompt = promptLines.join('\n');
    const maxTok = totalDays > 30 ? 2500 : totalDays > 14 ? 2000 : 1500;

    let aiResponse: string;
    try {
      aiResponse = await ai.chat(
        [{ role: 'user', content: prompt }],
        { systemPrompt: studyPlanPrompt(), maxTokens: maxTok }
      );
    } catch (aiErr: any) {
      logger.error('AI plan generation failed:', aiErr);
      const msg = (aiErr?.message || '').toLowerCase();
      if (msg.includes('timeout') || msg.includes('overloaded')) {
        return res.status(503).json({
          success: false,
          error: 'AI is taking too long. Try reducing the number of days or simplify your topics.',
        });
      }
      return res.status(503).json({ success: false, error: 'AI failed. Please try again.' });
    }

    let planData: z.infer<typeof PlanSchema>;
    try {
      const raw = extractJson(aiResponse);
      planData = PlanSchema.parse(raw);
    } catch (parseErr) {
      logger.error('Parse failed. AI said:', aiResponse.substring(0, 300));
      return res.status(422).json({ success: false, error: 'AI returned unexpected format. Try again.' });
    }

    const uid = req.session.userId!;
    const [pr] = await pool.execute(
      'INSERT INTO study_plans (user_id, title, subject, goal, exam_date, total_days, daily_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uid, planData.title, subject, goal, examDate || null, planData.total_days, dailyMinutes]
    ) as any[];
    const planId = (pr as any).insertId;
    const startDate = new Date();

    for (const item of planData.items) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + item.day - 1);
      await pool.execute(
        'INSERT INTO study_plan_items (plan_id, day_number, title, description, duration_minutes, phase, scheduled_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [planId, item.day, item.title, item.description || null, item.duration_minutes, item.phase || null, d.toISOString().split('T')[0]]
      );
    }

    const [newPlan] = await pool.execute('SELECT * FROM study_plans WHERE id=?', [planId]) as any[];
    const [newItems] = await pool.execute('SELECT * FROM study_plan_items WHERE plan_id=? ORDER BY day_number', [planId]) as any[];

    return res.status(201).json({
      success: true,
      data: {
        ...mapPlan((Array.isArray(newPlan) ? newPlan : [])[0]),
        items: (Array.isArray(newItems) ? newItems : []).map((i: any) => ({
          id: i.id, planId: i.plan_id, dayNumber: i.day_number, title: i.title,
          description: i.description, durationMinutes: i.duration_minutes,
          phase: i.phase, status: i.status, scheduledDate: i.scheduled_date,
        })),
      },
    });
  } catch (err) {
    logger.error('Generate plan error:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate study plan.' });
  }
});

router.patch('/:planId/items/:itemId', requireAuth, async (req: Request, res: Response) => {
  try {
    const planId = parseInt(req.params.planId, 10);
    const itemId = parseInt(req.params.itemId, 10);
    const { status } = req.body;
    if (!['pending', 'completed', 'skipped'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status.' });
    }
    const [pr] = await pool.execute(
      'SELECT id FROM study_plans WHERE id=? AND user_id=?',
      [planId, req.session.userId]
    ) as any[];
    if (!(Array.isArray(pr) ? pr : []).length) {
      return res.status(404).json({ success: false, error: 'Plan not found.' });
    }
    await pool.execute(
      'UPDATE study_plan_items SET status=?, completed_at=? WHERE id=? AND plan_id=?',
      [status, status === 'completed' ? new Date() : null, itemId, planId]
    );
    return res.json({ success: true });
  } catch (err) {
    logger.error('Update item:', err);
    return res.status(500).json({ success: false, error: 'Failed to update item.' });
  }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const [r] = await pool.execute(
      'DELETE FROM study_plans WHERE id=? AND user_id=?',
      [parseInt(req.params.id, 10), req.session.userId]
    ) as any[];
    if (!(r as any).affectedRows) {
      return res.status(404).json({ success: false, error: 'Plan not found.' });
    }
    return res.json({ success: true });
  } catch (err) {
    logger.error('Delete plan:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete plan.' });
  }
});

export default router;
