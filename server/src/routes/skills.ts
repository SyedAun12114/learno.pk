import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/requireAuth';
import { logger } from '../utils/logger';

const router = Router();

router.get('/paths', requireAuth, async (req: Request, res: Response) => {
  try {
    const [pRows] = await pool.execute(
      'SELECT * FROM skill_paths WHERE is_active=1 ORDER BY title ASC'
    ) as any[];
    const [eRows] = await pool.execute(
      'SELECT * FROM student_skill_enrollments WHERE user_id=?',
      [req.session.userId]
    ) as any[];

    const paths = Array.isArray(pRows) ? pRows : [];
    const enrollments = Array.isArray(eRows) ? eRows : [];

    return res.json({
      success: true,
      data: paths.map((p: any) => {
        const e = enrollments.find((e: any) => e.path_id === p.id);
        return {
          id: p.id, title: p.title, description: p.description,
          category: p.category, totalSteps: p.total_steps,
          estimatedHours: p.estimated_hours, icon: p.icon,
          enrollment: e ? {
            progressPercent: e.progress_percent,
            currentStep: e.current_step,
            status: e.status,
            enrolledAt: e.enrolled_at,
          } : null,
        };
      }),
    });
  } catch (err) {
    logger.error('Get paths:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch skill paths.' });
  }
});

router.get('/paths/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const pathId = parseInt(req.params.id, 10);
    const uid = req.session.userId!;

    const [pRows] = await pool.execute(
      'SELECT * FROM skill_paths WHERE id=? AND is_active=1', [pathId]
    ) as any[];
    const paths = Array.isArray(pRows) ? pRows : [];
    if (!paths.length) {
      return res.status(404).json({ success: false, error: 'Skill path not found.' });
    }

    const [sRows] = await pool.execute(
      'SELECT * FROM skill_path_steps WHERE path_id=? ORDER BY step_number ASC', [pathId]
    ) as any[];

    const [prRows] = await pool.execute(
      'SELECT sssp.step_id, sssp.status FROM student_skill_step_progress sssp JOIN skill_path_steps sps ON sps.id=sssp.step_id WHERE sssp.user_id=? AND sps.path_id=?',
      [uid, pathId]
    ) as any[];

    const [eRows] = await pool.execute(
      'SELECT * FROM student_skill_enrollments WHERE user_id=? AND path_id=?',
      [uid, pathId]
    ) as any[];

    const steps = Array.isArray(sRows) ? sRows : [];
    const progressRows = Array.isArray(prRows) ? prRows : [];
    const enrollmentRows = Array.isArray(eRows) ? eRows : [];

    const pm = new Map(progressRows.map((p: any) => [p.step_id, p.status]));
    const enrollment = enrollmentRows[0] || null;
    const path = paths[0];

    return res.json({
      success: true,
      data: {
        id: path.id,
        title: path.title,
        description: path.description,
        category: path.category,
        totalSteps: path.total_steps,
        estimatedHours: path.estimated_hours,
        icon: path.icon,
        steps: steps.map((s: any) => ({
          id: s.id,
          pathId: s.path_id,
          stepNumber: s.step_number,
          title: s.title,
          description: s.description,
          estimatedHours: s.estimated_hours,
          resources: (() => {
            if (!s.resources) return [];
            if (Array.isArray(s.resources)) return s.resources;
            if (typeof s.resources === 'string') {
              try { return JSON.parse(s.resources); } catch { return []; }
            }
            return [];
          })(),
          videoUrl: s.video_url || null,
          videoTitle: s.video_title || null,
          userStatus: pm.get(s.id) || 'locked',
        })),
        enrollment: enrollment ? {
          id: enrollment.id,
          currentStep: enrollment.current_step,
          progressPercent: enrollment.progress_percent,
          status: enrollment.status,
          enrolledAt: enrollment.enrolled_at,
          updatedAt: enrollment.updated_at,
        } : null,
      },
    });
  } catch (err) {
    logger.error('Get path:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch skill path.' });
  }
});

router.post('/enroll/:pathId', requireAuth, async (req: Request, res: Response) => {
  try {
    const pathId = parseInt(req.params.pathId, 10);
    const uid = req.session.userId!;

    const [pRows] = await pool.execute(
      'SELECT id FROM skill_paths WHERE id=? AND is_active=1', [pathId]
    ) as any[];
    if (!(Array.isArray(pRows) ? pRows : []).length) {
      return res.status(404).json({ success: false, error: 'Skill path not found.' });
    }

    await pool.execute(
      'INSERT INTO student_skill_enrollments (user_id, path_id, current_step, progress_percent, status) VALUES (?, ?, 1, 0, "active") ON DUPLICATE KEY UPDATE status="active", updated_at=NOW()',
      [uid, pathId]
    );

    const [fsRows] = await pool.execute(
      'SELECT id FROM skill_path_steps WHERE path_id=? ORDER BY step_number ASC LIMIT 1',
      [pathId]
    ) as any[];
    const firstSteps = Array.isArray(fsRows) ? fsRows : [];
    if (firstSteps.length) {
      const fsid = firstSteps[0].id;
      await pool.execute(
        'INSERT INTO student_skill_step_progress (user_id, step_id, status) VALUES (?, ?, "active") ON DUPLICATE KEY UPDATE status="active"',
        [uid, fsid]
      );
    }

    return res.json({ success: true, message: 'Enrolled!' });
  } catch (err) {
    logger.error('Enroll:', err);
    return res.status(500).json({ success: false, error: 'Failed to enroll.' });
  }
});

router.patch('/steps/:stepId/complete', requireAuth, async (req: Request, res: Response) => {
  try {
    const stepId = parseInt(req.params.stepId, 10);
    const uid = req.session.userId!;

    const [sRows] = await pool.execute(
      'SELECT sps.*, sp.id as path_id, sp.total_steps FROM skill_path_steps sps JOIN skill_paths sp ON sp.id=sps.path_id WHERE sps.id=?',
      [stepId]
    ) as any[];
    const steps = Array.isArray(sRows) ? sRows : [];
    if (!steps.length) {
      return res.status(404).json({ success: false, error: 'Step not found.' });
    }
    const step = steps[0];

    await pool.execute(
      'INSERT INTO student_skill_step_progress (user_id, step_id, status, completed_at) VALUES (?, ?, "completed", NOW()) ON DUPLICATE KEY UPDATE status="completed", completed_at=NOW()',
      [uid, stepId]
    );

    const [nsRows] = await pool.execute(
      'SELECT id FROM skill_path_steps WHERE path_id=? AND step_number=? LIMIT 1',
      [step.path_id, step.step_number + 1]
    ) as any[];
    const nextSteps = Array.isArray(nsRows) ? nsRows : [];
    if (nextSteps.length) {
      const nsid = nextSteps[0].id;
      await pool.execute(
        'INSERT INTO student_skill_step_progress (user_id, step_id, status) VALUES (?, ?, "active") ON DUPLICATE KEY UPDATE status=IF(status="locked","active",status)',
        [uid, nsid]
      );
    }

    const [cRows] = await pool.execute(
      'SELECT COUNT(*) as count FROM student_skill_step_progress sssp JOIN skill_path_steps sps ON sps.id=sssp.step_id WHERE sssp.user_id=? AND sps.path_id=? AND sssp.status="completed"',
      [uid, step.path_id]
    ) as any[];
    const countRows = Array.isArray(cRows) ? cRows : [];
    const cc = countRows[0]?.count || 0;
    const pct = step.total_steps > 0 ? (cc / step.total_steps) * 100 : 0;

    await pool.execute(
      'UPDATE student_skill_enrollments SET progress_percent=?, current_step=?, status=IF(?>=100,"completed","active") WHERE user_id=? AND path_id=?',
      [pct, step.step_number + 1, pct, uid, step.path_id]
    );

    return res.json({ success: true, data: { progressPercent: Math.round(pct) } });
  } catch (err) {
    logger.error('Complete step:', err);
    return res.status(500).json({ success: false, error: 'Failed to complete step.' });
  }
});

router.get('/my-skills', requireAuth, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT sse.*, sp.title as path_title, sp.total_steps, sp.icon, sp.category FROM student_skill_enrollments sse JOIN skill_paths sp ON sp.id=sse.path_id WHERE sse.user_id=? ORDER BY sse.updated_at DESC',
      [req.session.userId]
    ) as any[];
    const enrollments = Array.isArray(rows) ? rows : [];
    return res.json({
      success: true,
      data: enrollments.map((e: any) => ({
        id: e.id, pathId: e.path_id, pathTitle: e.path_title,
        totalSteps: e.total_steps, icon: e.icon, category: e.category,
        currentStep: e.current_step, progressPercent: e.progress_percent,
        status: e.status, enrolledAt: e.enrolled_at, updatedAt: e.updated_at,
      })),
    });
  } catch (err) {
    logger.error('My skills:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch skills.' });
  }
});

export default router;
