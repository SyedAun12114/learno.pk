import { Router, Request, Response } from 'express';
import { z } from 'zod';
import mysql from 'mysql2/promise';
import { pool } from '../db';
import { requireAuth } from '../middleware/requireAuth';
import { logger } from '../utils/logger';

const router = Router();

const TaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(1000).optional(),
  category: z.enum(['study', 'assignment', 'exam', 'skill', 'career', 'personal']).default('personal'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().optional().nullable(),
});

type Row = Record<string, unknown>;

function mapTask(t: Row) {
  return {
    id: t.id, userId: t.user_id, title: t.title, description: t.description,
    category: t.category, priority: t.priority, status: t.status,
    dueDate: t.due_date, completedAt: t.completed_at,
    createdAt: t.created_at, updatedAt: t.updated_at,
  };
}

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { status, category, limit = '50', offset = '0' } = req.query;
    const uid = req.session.userId!;
    let q = 'SELECT * FROM tasks WHERE user_id = ?';
    const p: unknown[] = [uid];
    if (status) { q += ' AND status = ?'; p.push(status); }
    if (category) { q += ' AND category = ?'; p.push(category); }
    q += ' ORDER BY CASE status WHEN "pending" THEN 1 WHEN "in_progress" THEN 2 ELSE 3 END, due_date ASC, priority DESC LIMIT ? OFFSET ?';
    p.push(parseInt(String(limit), 10), parseInt(String(offset), 10));
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(q, p);
    return res.json({ success: true, data: (rows as unknown as Row[]).map(mapTask) });
  } catch (err) {
    logger.error('Get tasks:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch tasks.' });
  }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = TaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { title, description, category, priority, dueDate } = parsed.data;
    const [r] = await pool.execute<mysql.ResultSetHeader>(
      'INSERT INTO tasks (user_id, title, description, category, priority, due_date) VALUES (?, ?, ?, ?, ?, ?)',
      [req.session.userId, title, description || null, category, priority, dueDate || null]
    );
    const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM tasks WHERE id = ?', [r.insertId]);
    return res.status(201).json({ success: true, data: mapTask((rows as unknown as Row[])[0]) });
  } catch (err) {
    logger.error('Create task:', err);
    return res.status(500).json({ success: false, error: 'Failed to create task.' });
  }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const uid = req.session.userId!;
    const [ex] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?', [id, uid]
    );
    if (!(ex as unknown[]).length) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }
    const parsed = TaskSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { title, description, category, priority, dueDate } = parsed.data;
    await pool.execute(
      'UPDATE tasks SET title=COALESCE(?,title), description=COALESCE(?,description), category=COALESCE(?,category), priority=COALESCE(?,priority), due_date=COALESCE(?,due_date) WHERE id=? AND user_id=?',
      [title || null, description || null, category || null, priority || null, dueDate !== undefined ? (dueDate || null) : null, id, uid]
    );
    const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM tasks WHERE id = ?', [id]);
    return res.json({ success: true, data: mapTask((rows as unknown as Row[])[0]) });
  } catch (err) {
    logger.error('Update task:', err);
    return res.status(500).json({ success: false, error: 'Failed to update task.' });
  }
});

router.patch('/:id/complete', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [ex] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT status FROM tasks WHERE id = ? AND user_id = ?', [id, req.session.userId]
    );
    const rows = ex as unknown as Array<{ status: string }>;
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }
    const newStatus = rows[0].status === 'completed' ? 'pending' : 'completed';
    const completedAt = newStatus === 'completed' ? new Date() : null;
    await pool.execute('UPDATE tasks SET status=?, completed_at=? WHERE id=?', [newStatus, completedAt, id]);
    return res.json({ success: true, data: { status: newStatus } });
  } catch (err) {
    logger.error('Complete task:', err);
    return res.status(500).json({ success: false, error: 'Failed to update task.' });
  }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const [r] = await pool.execute<mysql.ResultSetHeader>(
      'DELETE FROM tasks WHERE id=? AND user_id=?',
      [parseInt(req.params.id, 10), req.session.userId]
    );
    if (!r.affectedRows) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }
    return res.json({ success: true });
  } catch (err) {
    logger.error('Delete task:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete task.' });
  }
});

export default router;
