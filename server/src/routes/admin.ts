import { Router, Request, Response } from 'express';
import { z } from 'zod';
import mysql from 'mysql2/promise';
import { pool } from '../db';
import { requireAdmin } from '../middleware/requireAuth';
import { logger } from '../utils/logger';

const router = Router();

function safeSkills(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val as string[];
  if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return [];
    if (s.startsWith('[')) { try { return JSON.parse(s); } catch {} }
    return s.split(',').map((x: string) => x.trim()).filter(Boolean);
  }
  return [];
}

router.get('/stats', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const queries = await Promise.allSettled([
      pool.execute('SELECT COUNT(*) as count FROM users'),
      pool.execute('SELECT COUNT(*) as count FROM users WHERE is_onboarded=1'),
      pool.execute('SELECT COUNT(*) as count FROM tasks'),
      pool.execute('SELECT COUNT(*) as count FROM test_attempts WHERE status="completed"'),
      pool.execute('SELECT COUNT(*) as count FROM study_plans'),
      pool.execute('SELECT COUNT(*) as count FROM ai_usage WHERE DATE(created_at)=CURDATE()'),
    ]);
    const g = (r: any) => r.status === 'fulfilled' ? (r.value[0] as any[])[0]?.count || 0 : 0;
    return res.json({ success: true, data: {
      totalUsers: g(queries[0]), onboardedUsers: g(queries[1]),
      totalTasks: g(queries[2]), completedTests: g(queries[3]),
      studyPlans: g(queries[4]), aiRequestsToday: g(queries[5]),
    }});
  } catch (err) {
    logger.error('Admin stats:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch stats.' });
  }
});

router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const offset = (parseInt(String(page), 10) - 1) * parseInt(String(limit), 10);
    const [rows] = await pool.execute(
      'SELECT u.id, u.email, u.role, u.is_onboarded, u.created_at, sp.full_name FROM users u LEFT JOIN student_profiles sp ON sp.user_id=u.id ORDER BY u.created_at DESC LIMIT ' + parseInt(String(limit), 10) + ' OFFSET ' + offset
    ) as any[];
    return res.json({ success: true, data: (Array.isArray(rows) ? rows : []).map((u: any) => ({
      id: u.id, email: u.email, role: u.role,
      isOnboarded: Boolean(u.is_onboarded), fullName: u.full_name, createdAt: u.created_at,
    }))});
  } catch (err) {
    logger.error('Admin users:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch users.' });
  }
});

router.get('/skill-paths', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [paths] = await pool.execute(
      'SELECT sp.*, COUNT(sps.id) as step_count FROM skill_paths sp LEFT JOIN skill_path_steps sps ON sps.path_id = sp.id GROUP BY sp.id ORDER BY sp.created_at DESC'
    ) as any[];
    return res.json({ success: true, data: (Array.isArray(paths) ? paths : []).map((p: any) => ({
      id: p.id, title: p.title, description: p.description, category: p.category,
      totalSteps: p.step_count, estimatedHours: p.estimated_hours, icon: p.icon,
      isActive: Boolean(p.is_active), createdAt: p.created_at,
    }))});
  } catch (err) {
    logger.error('Admin get paths:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch skill paths.' });
  }
});

router.post('/skill-paths', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { title, description, category, estimatedHours, icon } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'Title is required.' });
    const [r] = await pool.execute(
      'INSERT INTO skill_paths (title, description, category, estimated_hours, icon, is_active, total_steps) VALUES (?, ?, ?, ?, ?, 1, 0)',
      [title, description || null, category || 'development', estimatedHours || null, icon || 'Zap']
    ) as any[];
    return res.status(201).json({ success: true, data: { id: (r as any).insertId } });
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

router.get('/skill-paths/:pathId/steps', requireAdmin, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM skill_path_steps WHERE path_id=? ORDER BY step_number ASC',
      [parseInt(req.params.pathId, 10)]
    ) as any[];
    return res.json({ success: true, data: (Array.isArray(rows) ? rows : []).map((s: any) => ({
      id: s.id, pathId: s.path_id, stepNumber: s.step_number,
      title: s.title, description: s.description,
      estimatedHours: s.estimated_hours,
      videoUrl: s.video_url || null,
      videoTitle: s.video_title || null,
    }))});
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch steps.' });
  }
});

router.post('/skill-paths/:pathId/steps', requireAdmin, async (req: Request, res: Response) => {
  try {
    const pathId = parseInt(req.params.pathId, 10);
    const { title, description, estimatedHours, videoUrl, videoTitle } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'Title is required.' });
    const [countRows] = await pool.execute(
      'SELECT COUNT(*) as count FROM skill_path_steps WHERE path_id=?', [pathId]
    ) as any[];
    const stepNumber = ((Array.isArray(countRows) ? countRows : [])[0]?.count || 0) + 1;
    const [r] = await pool.execute(
      'INSERT INTO skill_path_steps (path_id, step_number, title, description, estimated_hours, video_url, video_title) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [pathId, stepNumber, title, description || null, estimatedHours || null, videoUrl || null, videoTitle || null]
    ) as any[];
    await pool.execute(
      'UPDATE skill_paths SET total_steps=(SELECT COUNT(*) FROM skill_path_steps WHERE path_id=?) WHERE id=?',
      [pathId, pathId]
    );
    return res.status(201).json({ success: true, data: { id: (r as any).insertId } });
  } catch (err) {
    logger.error('Create step:', err);
    return res.status(500).json({ success: false, error: 'Failed to add step.' });
  }
});

router.put('/skill-paths/:pathId/steps/:stepId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { title, description, estimatedHours, videoUrl, videoTitle } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'Title is required.' });
    await pool.execute(
      'UPDATE skill_path_steps SET title=?, description=?, estimated_hours=?, video_url=?, video_title=? WHERE id=? AND path_id=?',
      [title, description || null, estimatedHours || null, videoUrl || null, videoTitle || null, parseInt(req.params.stepId, 10), parseInt(req.params.pathId, 10)]
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
    await pool.execute('DELETE FROM skill_path_steps WHERE id=? AND path_id=?', [parseInt(req.params.stepId, 10), pathId]);
    await pool.execute('UPDATE skill_paths SET total_steps=(SELECT COUNT(*) FROM skill_path_steps WHERE path_id=?) WHERE id=?', [pathId, pathId]);
    return res.json({ success: true });
  } catch (err) {
    logger.error('Delete step:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete step.' });
  }
});

router.get('/opportunities', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM opportunities ORDER BY created_at DESC') as any[];
    return res.json({ success: true, data: (Array.isArray(rows) ? rows : []).map((o: any) => ({
      id: o.id, title: o.title, company: o.company, description: o.description,
      type: o.type, location: o.location, isRemote: Boolean(o.is_remote),
      requiredSkills: safeSkills(o.required_skills),
      experienceLevel: o.experience_level, applicationUrl: o.application_url,
      deadline: o.deadline, isFeatured: Boolean(o.is_featured),
      isActive: Boolean(o.is_active), createdAt: o.created_at,
    }))});
  } catch (err) {
    logger.error('Admin opps:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch opportunities.' });
  }
});

const OppSchema = z.object({
  title: z.string().min(1).max(500),
  company: z.string().min(1).max(255),
  description: z.string().min(1),
  type: z.enum(['internship','freelance','part_time','full_time','apprenticeship']),
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
    const [r] = await pool.execute(
      'INSERT INTO opportunities (title,company,description,type,location,is_remote,required_skills,experience_level,application_url,deadline,is_featured,is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?,1)',
      [d.title,d.company,d.description,d.type,d.location||null,d.isRemote?1:0,d.requiredSkills?JSON.stringify(d.requiredSkills):null,d.experienceLevel||null,d.applicationUrl||null,d.deadline||null,d.isFeatured?1:0]
    ) as any[];
    return res.status(201).json({ success: true, data: { id: (r as any).insertId } });
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
      [d.title,d.company,d.description,d.type,d.location||null,d.isRemote?1:0,d.requiredSkills?JSON.stringify(d.requiredSkills):null,d.experienceLevel||null,d.applicationUrl||null,d.deadline||null,d.isFeatured?1:0,parseInt(req.params.id,10)]
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