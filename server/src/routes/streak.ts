import { Router, Request, Response } from 'express';
import mysql from 'mysql2/promise';
import { pool } from '../db';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const uid = req.session.userId!;
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT DATE(created_at) as day FROM user_activity WHERE user_id=? ORDER BY day DESC LIMIT 60',
      [uid]
    );
    const days = [...new Set((rows as unknown as Array<{ day: string }>).map(r => r.day))];
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      if (days.includes(dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    const [taskRows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM tasks WHERE user_id=? AND DATE(completed_at)=CURDATE()',
      [uid]
    );
    const todayActivity = (taskRows as unknown as Array<{ count: number }>)[0]?.count || 0;
    return res.json({ success: true, data: { streak, todayActivity } });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to get streak.' });
  }
});

export default router;
