import { Router, Request, Response } from 'express';
import mysql from 'mysql2/promise';
import { pool } from '../db';
import { requireAuth } from '../middleware/requireAuth';
import { getAIProvider } from '../services/ai';
import { studyAssistantPrompt, whatNextPrompt, buildStudentContext } from '../services/ai/prompts';
import { config } from '../config';
import { aiLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

const router = Router();
const MAX_HIST = 10;

async function checkLimit(uid: number): Promise<boolean> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM ai_usage WHERE user_id=? AND DATE(created_at)=CURDATE()', [uid]
  );
  return ((rows as unknown as Array<{ count: number }>)[0]?.count || 0) < config.ai.dailyLimit;
}

router.get('/conversations', requireAuth, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT ac.*, COUNT(am.id) as message_count FROM ai_conversations ac LEFT JOIN ai_messages am ON am.conversation_id=ac.id WHERE ac.user_id=? GROUP BY ac.id ORDER BY ac.updated_at DESC LIMIT 20',
      [req.session.userId]
    );
    return res.json({
      success: true,
      data: (rows as unknown as Array<Record<string, unknown>>).map(c => ({
        id: c.id, title: c.title, contextType: c.context_type,
        messageCount: c.message_count, createdAt: c.created_at, updatedAt: c.updated_at,
      })),
    });
  } catch (err) {
    logger.error('Get conversations:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch conversations.' });
  }
});

router.post('/conversations', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, contextType = 'general' } = req.body;
    const [r] = await pool.execute<mysql.ResultSetHeader>(
      'INSERT INTO ai_conversations (user_id, title, context_type) VALUES (?, ?, ?)',
      [req.session.userId, title || 'New conversation', contextType]
    );
    return res.status(201).json({
      success: true,
      data: { id: r.insertId, title: title || 'New conversation', contextType, messages: [] },
    });
  } catch (err) {
    logger.error('Create conv:', err);
    return res.status(500).json({ success: false, error: 'Failed to create conversation.' });
  }
});

router.get('/conversations/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [cRows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT * FROM ai_conversations WHERE id=? AND user_id=?', [id, req.session.userId]
    );
    if (!(cRows as unknown[]).length) {
      return res.status(404).json({ success: false, error: 'Conversation not found.' });
    }
    const [mRows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT * FROM ai_messages WHERE conversation_id=? ORDER BY created_at ASC', [id]
    );
    const c = (cRows as unknown as Array<Record<string, unknown>>)[0];
    const messages = (mRows as unknown as Array<Record<string, unknown>>).map(m => ({
      id: m.id, conversationId: m.conversation_id, role: m.role, content: m.content, createdAt: m.created_at,
    }));
    return res.json({
      success: true,
      data: { id: c.id, title: c.title, contextType: c.context_type, createdAt: c.created_at, updatedAt: c.updated_at, messages },
    });
  } catch (err) {
    logger.error('Get conv:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch conversation.' });
  }
});

router.post('/conversations/:id/messages', requireAuth, aiLimiter, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const uid = req.session.userId!;
    const { content, mode } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ success: false, error: 'Message required.' });
    }
    const [cRows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT id FROM ai_conversations WHERE id=? AND user_id=?', [id, uid]
    );
    if (!(cRows as unknown[]).length) {
      return res.status(404).json({ success: false, error: 'Conversation not found.' });
    }
    if (!(await checkLimit(uid))) {
      return res.status(429).json({
        success: false,
        error: 'Daily AI limit reached (' + config.ai.dailyLimit + ' requests). Resets at midnight.',
      });
    }
    const ai = getAIProvider();
    if (!ai.isAvailable()) {
      return res.status(503).json({ success: false, error: 'AI service not configured.' });
    }
    const modeMap: Record<string, string> = {
      explain: 'Explain clearly and simply: ' + content,
      simplify: 'Simplify this: ' + content,
      quiz: 'Create 3 practice questions about: ' + content,
      example: 'Give 2-3 real-world examples of: ' + content,
      practice: 'Create 5 practice questions with answers about: ' + content,
    };
    const userMsg = (mode && modeMap[mode]) ? modeMap[mode] : content.trim();
    await pool.execute(
      'INSERT INTO ai_messages (conversation_id, role, content) VALUES (?, "user", ?)', [id, userMsg]
    );
    const [hRows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT role, content FROM ai_messages WHERE conversation_id=? ORDER BY created_at DESC LIMIT ' + MAX_HIST,
      [id]
    );
    const history = (hRows as unknown as Array<{ role: string; content: string }>).reverse();
    const [pRows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT * FROM student_profiles WHERE user_id=?', [uid]
    );
    const prof = (pRows as unknown as Array<Record<string, unknown>>)[0];
    const ctx = prof ? buildStudentContext({
      fullName: String(prof.full_name),
      educationLevel: prof.education_level as string | undefined,
      careerInterest: prof.career_interest as string | undefined,
      currentSkills: prof.current_skills as string | undefined,
    }) : 'Profile not available';
    const aiResp = await ai.chat(
      history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { systemPrompt: studyAssistantPrompt(ctx), maxTokens: config.ai.maxTokens }
    );
    await pool.execute(
      'INSERT INTO ai_messages (conversation_id, role, content) VALUES (?, "assistant", ?)', [id, aiResp]
    );
    await pool.execute('UPDATE ai_conversations SET updated_at=NOW() WHERE id=?', [id]);
    await pool.execute(
      'INSERT INTO ai_usage (user_id, request_type, tokens_used) VALUES (?, "chat", 0)', [uid]
    );
    return res.json({ success: true, data: { role: 'assistant', content: aiResp } });
  } catch (err) {
    logger.error('AI message:', err);
    return res.status(500).json({ success: false, error: 'AI failed to respond. Try again.' });
  }
});

router.post('/what-next', requireAuth, aiLimiter, async (req: Request, res: Response) => {
  try {
    const uid = req.session.userId!;
    if (!(await checkLimit(uid))) {
      return res.status(429).json({ success: false, error: 'Daily AI limit reached.' });
    }
    const ai = getAIProvider();
    if (!ai.isAvailable()) {
      return res.status(503).json({ success: false, error: 'AI not configured.' });
    }
    const today = new Date().toISOString().split('T')[0];
    const [pRows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT * FROM student_profiles WHERE user_id=?', [uid]
    );
    const prof = (pRows as unknown as Array<Record<string, unknown>>)[0];
    const [tRows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT title, due_date FROM tasks WHERE user_id=? AND status!="completed" ORDER BY due_date ASC LIMIT 5',
      [uid]
    );
    const tasks = tRows as unknown as Array<{ title: string; due_date: string }>;
    const taskStr = tasks.map(t => t.title + (t.due_date ? ' (due ' + t.due_date + ')' : '')).join('; ');
    const [spRows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT subject, exam_date FROM study_plans WHERE user_id=? AND status="active" ORDER BY exam_date ASC LIMIT 3',
      [uid]
    );
    const plans = spRows as unknown as Array<{ subject: string; exam_date: string }>;
    const planStr = plans.map(p => p.subject + (p.exam_date ? ' (exam ' + p.exam_date + ')' : '')).join('; ');
    let ctx = 'Today: ' + today;
    if (prof) {
      ctx += '\nStudent: ' + prof.full_name;
      if (prof.daily_learning_minutes) ctx += '\nDaily time: ' + prof.daily_learning_minutes + ' minutes';
    }
    if (taskStr) ctx += '\nPending tasks: ' + taskStr;
    if (planStr) ctx += '\nStudy plans: ' + planStr;
    const resp = await ai.chat(
      [{ role: 'user', content: 'What is the single best thing I should do right now?' }],
      { systemPrompt: whatNextPrompt(ctx), maxTokens: 300 }
    );
    await pool.execute(
      'INSERT INTO ai_usage (user_id, request_type, tokens_used) VALUES (?, "what-next", 0)', [uid]
    );
    return res.json({ success: true, data: { recommendation: resp } });
  } catch (err) {
    logger.error('What-next:', err);
    return res.status(500).json({ success: false, error: 'Failed to get recommendation.' });
  }
});

router.get('/usage', requireAuth, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM ai_usage WHERE user_id=? AND DATE(created_at)=CURDATE()',
      [req.session.userId]
    );
    const count = (rows as unknown as Array<{ count: number }>)[0]?.count || 0;
    return res.json({
      success: true,
      data: { todayCount: count, dailyLimit: config.ai.dailyLimit, remaining: Math.max(0, config.ai.dailyLimit - count) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to get usage.' });
  }
});

export default router;
