import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import mysql from 'mysql2/promise';
import { pool } from '../db';
import { requireAuth } from '../middleware/requireAuth';
import { authLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

const router = Router();

router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(2).max(100),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const em = parsed.data.email.toLowerCase().trim();
    const [ex] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?', [em]
    );
    if ((ex as unknown[]).length) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }
    const hash = await bcrypt.hash(parsed.data.password, 12);
    const [r] = await pool.execute<mysql.ResultSetHeader>(
      'INSERT INTO users (email, password_hash, role, is_onboarded) VALUES (?, ?, "student", 0)',
      [em, hash]
    );
    await pool.execute(
      'INSERT INTO student_profiles (user_id, full_name) VALUES (?, ?)',
      [r.insertId, parsed.data.name]
    );
    req.session.userId = r.insertId;
    req.session.userRole = 'student';
    req.session.userEmail = em;
    return res.status(201).json({
      success: true,
      data: { id: r.insertId, email: em, role: 'student', isOnboarded: false },
    });
  } catch (err) {
    logger.error('Register error:', err);
    return res.status(500).json({ success: false, error: 'Registration failed.' });
  }
});

router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid email or password.' });
    }
    const em = parsed.data.email.toLowerCase().trim();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT id, email, password_hash, role, is_onboarded FROM users WHERE email = ?', [em]
    );
    const users = rows as unknown as Array<{
      id: number; email: string; password_hash: string; role: string; is_onboarded: number;
    }>;
    if (!users.length || !(await bcrypt.compare(parsed.data.password, users[0].password_hash))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }
    const u = users[0];
    req.session.userId = u.id;
    req.session.userRole = u.role as 'student' | 'admin';
    req.session.userEmail = u.email;
    return res.json({
      success: true,
      data: { id: u.id, email: u.email, role: u.role, isOnboarded: Boolean(u.is_onboarded) },
    });
  } catch (err) {
    logger.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Login failed.' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.clearCookie('learno.sid');
    res.json({ success: true });
  });
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT id, email, role, is_onboarded, created_at FROM users WHERE id = ?',
      [req.session.userId]
    );
    const users = rows as unknown as Array<{
      id: number; email: string; role: string; is_onboarded: number; created_at: string;
    }>;
    if (!users.length) {
      req.session.destroy(() => {});
      return res.status(401).json({ success: false, error: 'Session expired.' });
    }
    const u = users[0];
    return res.json({
      success: true,
      data: { id: u.id, email: u.email, role: u.role, isOnboarded: Boolean(u.is_onboarded), createdAt: u.created_at },
    });
  } catch (err) {
    logger.error('Auth/me error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch user.' });
  }
});

export default router;
