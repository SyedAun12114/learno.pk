import { Router, Request, Response } from 'express';
import mysql from 'mysql2/promise';
import { pool } from '../db';
import { requireAuth } from '../middleware/requireAuth';
import { logger } from '../utils/logger';
import { safeJsonArray } from '../utils/safeJson';

const router = Router();
type Row = Record<string, unknown>;

function mapOpp(o: Row, saved = false, match?: { matchPercent?: number; matchedSkills?: string[]; missingSkills?: string[] }) {
  return {
    id: o.id, title: o.title, company: o.company, description: o.description,
    type: o.type, location: o.location, isRemote: Boolean(o.is_remote),
    requiredSkills: safeJsonArray(o.required_skills),
    experienceLevel: o.experience_level, applicationUrl: o.application_url,
    deadline: o.deadline, isFeatured: Boolean(o.is_featured), isActive: Boolean(o.is_active),
    isSaved: saved, createdAt: o.created_at, ...match,
  };
}

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { type, remote, search, page = '1', limit = '12' } = req.query;
    const uid = req.session.userId!;
    const offset = (parseInt(String(page), 10) - 1) * parseInt(String(limit), 10);
    let q = 'SELECT o.*, CASE WHEN so.id IS NOT NULL THEN 1 ELSE 0 END as is_saved FROM opportunities o LEFT JOIN saved_opportunities so ON so.opportunity_id=o.id AND so.user_id=? WHERE o.is_active=1';
    const p: unknown[] = [uid];
    if (type) { q += ' AND o.type=?'; p.push(type); }
    if (remote === 'true') q += ' AND o.is_remote=1';
    if (search) {
      q += ' AND (o.title LIKE ? OR o.company LIKE ? OR o.description LIKE ?)';
      const s = '%' + search + '%';
      p.push(s, s, s);
    }
    q += ' ORDER BY o.is_featured DESC, o.created_at DESC LIMIT ' + parseInt(String(limit), 10) + ' OFFSET ' + offset;
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(q, p);
    return res.json({
      success: true,
      data: (rows as unknown as Row[]).map(o => mapOpp(o, Boolean(o.is_saved))),
    });
  } catch (err) {
    logger.error('Get opps:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch opportunities.' });
  }
});

router.get('/saved', requireAuth, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT o.* FROM opportunities o JOIN saved_opportunities so ON so.opportunity_id=o.id WHERE so.user_id=? AND o.is_active=1 ORDER BY so.created_at DESC',
      [req.session.userId]
    );
    return res.json({ success: true, data: (rows as unknown as Row[]).map(o => mapOpp(o, true)) });
  } catch (err) {
    logger.error('Get saved:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch saved.' });
  }
});

router.get('/matches', requireAuth, async (req: Request, res: Response) => {
  try {
    const uid = req.session.userId!;
    const [pRows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT current_skills FROM student_profiles WHERE user_id=?', [uid]
    );
    const prof = (pRows as unknown as Row[])[0];
    const [sRows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT sp.title FROM student_skill_enrollments sse JOIN skill_paths sp ON sp.id=sse.path_id WHERE sse.user_id=?', [uid]
    );
    const learningSkills = (sRows as unknown as Array<{ title: string }>).map(s => s.title);
    const currentSkills = prof?.current_skills
      ? String(prof.current_skills).split(',').map(s => s.trim()) : [];
    const allSkills = [...currentSkills, ...learningSkills];
    const [oRows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT * FROM opportunities WHERE is_active=1 ORDER BY is_featured DESC LIMIT 20'
    );
    const matches = (oRows as unknown as Row[]).map(opp => {
      const required: string[] = opp.required_skills ? JSON.parse(opp.required_skills as string) : [];
      if (!required.length) return { ...mapOpp(opp), matchPercent: 50, matchedSkills: [], missingSkills: [] };
      const matched = required.filter(sk =>
        allSkills.some(s => s.toLowerCase().includes(sk.toLowerCase()) || sk.toLowerCase().includes(s.toLowerCase()))
      );
      const missing = required.filter(sk =>
        !allSkills.some(s => s.toLowerCase().includes(sk.toLowerCase()) || sk.toLowerCase().includes(s.toLowerCase()))
      );
      return { ...mapOpp(opp), matchPercent: Math.round((matched.length / required.length) * 100), matchedSkills: matched, missingSkills: missing };
    });
    matches.sort((a, b) => (b.matchPercent || 0) - (a.matchPercent || 0));
    return res.json({ success: true, data: matches.slice(0, 10) });
  } catch (err) {
    logger.error('Get matches:', err);
    return res.status(500).json({ success: false, error: 'Failed to calculate matches.' });
  }
});

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT o.*, CASE WHEN so.id IS NOT NULL THEN 1 ELSE 0 END as is_saved FROM opportunities o LEFT JOIN saved_opportunities so ON so.opportunity_id=o.id AND so.user_id=? WHERE o.id=? AND o.is_active=1',
      [req.session.userId, parseInt(req.params.id, 10)]
    );
    if (!(rows as unknown[]).length) {
      return res.status(404).json({ success: false, error: 'Opportunity not found.' });
    }
    const o = (rows as unknown as Row[])[0];
    return res.json({ success: true, data: mapOpp(o, Boolean(o.is_saved)) });
  } catch (err) {
    logger.error('Get opp:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch opportunity.' });
  }
});

router.post('/:id/save', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.execute(
      'INSERT IGNORE INTO saved_opportunities (user_id, opportunity_id) VALUES (?, ?)',
      [req.session.userId, parseInt(req.params.id, 10)]
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to save.' });
  }
});

router.delete('/:id/save', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.execute(
      'DELETE FROM saved_opportunities WHERE user_id=? AND opportunity_id=?',
      [req.session.userId, parseInt(req.params.id, 10)]
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to unsave.' });
  }
});

export default router;
