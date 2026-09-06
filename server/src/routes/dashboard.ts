import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/requireAuth';
import { getAIProvider } from '../services/ai';
import { whatNextPrompt } from '../services/ai/prompts';
import { logger } from '../utils/logger';

const router = Router();

function safeParseSkills(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val as string[];
  if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return [];
    if (s.startsWith('[')) {
      try { return JSON.parse(s); } catch {}
    }
    return s.split(',').map((x: string) => x.trim()).filter(Boolean);
  }
  return [];
}

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const uid = req.session.userId!;
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Run all queries independently so one failure does not break the whole dashboard
    const results = await Promise.allSettled([
      pool.execute('SELECT * FROM student_profiles WHERE user_id = ?', [uid]),
      pool.execute('SELECT * FROM tasks WHERE user_id = ? AND status != "completed" AND (due_date = ? OR due_date IS NULL) ORDER BY priority DESC LIMIT 10', [uid, today]),
      pool.execute('SELECT * FROM tasks WHERE user_id = ? AND status != "completed" AND due_date > ? ORDER BY due_date ASC LIMIT 5', [uid, today]),
      pool.execute('SELECT sp.*, COUNT(spi.id) as total_items, SUM(CASE WHEN spi.status = "completed" THEN 1 ELSE 0 END) as completed_items FROM study_plans sp LEFT JOIN study_plan_items spi ON spi.plan_id = sp.id WHERE sp.user_id = ? AND sp.status = "active" GROUP BY sp.id ORDER BY sp.created_at DESC LIMIT 3', [uid]),
      pool.execute('SELECT sse.*, sp.title as path_title, sp.total_steps, sp.icon FROM student_skill_enrollments sse JOIN skill_paths sp ON sp.id = sse.path_id WHERE sse.user_id = ? AND sse.status = "active" ORDER BY sse.updated_at DESC LIMIT 3', [uid]),
      pool.execute('SELECT ta.*, t.title, t.subject FROM test_attempts ta JOIN tests t ON t.id = ta.test_id WHERE ta.user_id = ? AND ta.status = "completed" ORDER BY ta.completed_at DESC LIMIT 5', [uid]),
      pool.execute('SELECT * FROM opportunities WHERE is_featured = 1 AND is_active = 1 ORDER BY RAND() LIMIT 1', []),
      pool.execute('SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = "completed" AND completed_at >= ?', [uid, weekAgo]),
      pool.execute('SELECT COUNT(*) as count FROM student_skill_enrollments WHERE user_id = ? AND status = "active"', [uid]),
      pool.execute('SELECT AVG(score) as avg_score, COUNT(*) as test_count FROM test_attempts WHERE user_id = ? AND status = "completed"', [uid]),
    ]);

    const getRows = (result: PromiseSettledResult<any>): any[] => {
      if (result.status === 'fulfilled') {
        const rows = result.value[0];
        return Array.isArray(rows) ? rows : [];
      }
      return [];
    };

    const profileRows = getRows(results[0]);
    const todayRows = getRows(results[1]);
    const upcomingRows = getRows(results[2]);
    const planRows = getRows(results[3]);
    const enrollRows = getRows(results[4]);
    const testRows = getRows(results[5]);
    const oppRows = getRows(results[6]);
    const weekRows = getRows(results[7]);
    const skillRows = getRows(results[8]);
    const scoreRows = getRows(results[9]);

    const mapTask = (t: any) => ({
      id: t.id, userId: t.user_id, title: t.title, description: t.description,
      category: t.category, priority: t.priority, status: t.status,
      dueDate: t.due_date, completedAt: t.completed_at,
      createdAt: t.created_at, updatedAt: t.updated_at,
    });

    const profile = profileRows[0] || null;
    const weekCount = weekRows[0]?.count || 0;
    const skillCount = skillRows[0]?.count || 0;
    const scoreData = scoreRows[0] || {};
    const featOpp = oppRows[0] || null;

    return res.json({
      success: true,
      data: {
        profile: profile ? {
          id: profile.id,
          userId: profile.user_id,
          fullName: profile.full_name,
          educationLevel: profile.education_level,
          institution: profile.institution,
          careerInterest: profile.career_interest,
          dailyLearningMinutes: profile.daily_learning_minutes || 60,
          academicGoal: profile.academic_goal,
          careerGoal: profile.career_goal,
          currentSkills: profile.current_skills,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
        } : null,
        todayTasks: todayRows.map(mapTask),
        upcomingTasks: upcomingRows.map(mapTask),
        activePlans: planRows.map((p: any) => ({
          id: p.id, userId: p.user_id, title: p.title, subject: p.subject,
          examDate: p.exam_date, totalDays: p.total_days,
          dailyMinutes: p.daily_minutes, status: p.status,
          progress: (p.total_items || 0) > 0
            ? Math.round((p.completed_items / p.total_items) * 100)
            : 0,
          createdAt: p.created_at, updatedAt: p.updated_at,
        })),
        enrollments: enrollRows.map((e: any) => ({
          id: e.id, userId: e.user_id, pathId: e.path_id,
          pathTitle: e.path_title, totalSteps: e.total_steps, icon: e.icon,
          currentStep: e.current_step, progressPercent: e.progress_percent,
          status: e.status, enrolledAt: e.enrolled_at, updatedAt: e.updated_at,
        })),
        recentTests: testRows.map((t: any) => ({
          id: t.id, testId: t.test_id, title: t.title, subject: t.subject,
          score: t.score, correctCount: t.correct_count,
          totalQuestions: t.total_questions, status: t.status,
          completedAt: t.completed_at, createdAt: t.created_at,
        })),
        featuredOpportunity: featOpp ? {
          id: featOpp.id, title: featOpp.title, company: featOpp.company,
          description: featOpp.description, type: featOpp.type,
          location: featOpp.location, isRemote: Boolean(featOpp.is_remote),
          requiredSkills: safeParseSkills(featOpp.required_skills),
          isFeatured: true, isActive: true, createdAt: featOpp.created_at,
        } : null,
        stats: {
          tasksCompletedThisWeek: weekCount,
          tasksTotal: todayRows.length + upcomingRows.length,
          skillsInProgress: skillCount,
          testsThisMonth: scoreData.test_count || 0,
          averageTestScore: scoreData.avg_score ? Math.round(scoreData.avg_score) : 0,
          studyMinutesThisWeek: 0,
        },
      },
    });
  } catch (err) {
    logger.error('Dashboard error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load dashboard.' });
  }
});

router.get('/ai-insight', requireAuth, async (req: Request, res: Response) => {
  try {
    const uid = req.session.userId!;
    const ai = getAIProvider();
    if (!ai.isAvailable()) {
      return res.json({ success: true, data: { insight: null } });
    }

    const [pRows] = await pool.execute(
      'SELECT * FROM student_profiles WHERE user_id = ?', [uid]
    ) as any[];
    const profile = Array.isArray(pRows) ? pRows[0] : null;
    if (!profile) return res.json({ success: true, data: { insight: null } });

    const today = new Date().toISOString().split('T')[0];
    const [tRows] = await pool.execute(
      'SELECT title, due_date FROM tasks WHERE user_id = ? AND status != "completed" ORDER BY due_date ASC LIMIT 5',
      [uid]
    ) as any[];
    const tasks = Array.isArray(tRows) ? tRows : [];

    const [spRows] = await pool.execute(
      'SELECT subject, exam_date FROM study_plans WHERE user_id = ? AND status = "active" ORDER BY exam_date ASC LIMIT 3',
      [uid]
    ) as any[];
    const plans = Array.isArray(spRows) ? spRows : [];

    const taskStr = tasks
      .map((t: any) => t.title + (t.due_date ? ' (due ' + t.due_date + ')' : ''))
      .join(', ');
    const planStr = plans
      .map((p: any) => p.subject + (p.exam_date ? ' (exam ' + p.exam_date + ')' : ''))
      .join(', ');

    const ctx = [
      'Student: ' + profile.full_name,
      'Today: ' + today,
      taskStr ? 'Pending tasks: ' + taskStr : '',
      planStr ? 'Study plans: ' + planStr : '',
    ].filter(Boolean).join('\n');

    const insight = await ai.chat(
      [{ role: 'user', content: 'Give me a specific study recommendation for today.' }],
      { systemPrompt: whatNextPrompt(ctx), maxTokens: 150 }
    );

    return res.json({ success: true, data: { insight } });
  } catch (err) {
    logger.error('AI insight error:', err);
    return res.json({ success: true, data: { insight: null } });
  }
});

export default router;
