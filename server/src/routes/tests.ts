import { Router, Request, Response } from 'express';
import { z } from 'zod';
import mysql from 'mysql2/promise';
import { pool } from '../db';
import { requireAuth } from '../middleware/requireAuth';
import { getAIProvider } from '../services/ai';
import { testGeneratorPrompt, testAnalyzerPrompt } from '../services/ai/prompts';
import { logger } from '../utils/logger';
import { safeJsonArray } from '../utils/safeJson';

const router = Router();

const GenSchema = z.object({
  subject: z.string().min(1).max(255),
  topic: z.string().max(255).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  questionCount: z.number().int().min(3).max(20).default(5),
});

const QSchema = z.object({
  number: z.number().int(),
  type: z.enum(['multiple_choice', 'short_answer']),
  question: z.string(),
  options: z.array(z.string()).optional(),
  correct_answer: z.string(),
  explanation: z.string().optional(),
});

const TestSchema = z.object({
  title: z.string(),
  questions: z.array(QSchema),
});

const SubmitSchema = z.object({
  answers: z.array(z.object({ questionId: z.number().int(), answer: z.string() })),
  timeTakenSeconds: z.number().int().optional(),
});

type Row = Record<string, unknown>;

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT t.*, ta.score, ta.status as attempt_status, ta.completed_at FROM tests t LEFT JOIN test_attempts ta ON ta.test_id=t.id AND ta.user_id=t.user_id WHERE t.user_id=? ORDER BY t.created_at DESC LIMIT 20',
      [req.session.userId]
    );
    return res.json({
      success: true,
      data: (rows as unknown as Row[]).map(t => ({
        id: t.id, subject: t.subject, topic: t.topic, title: t.title,
        difficulty: t.difficulty, totalQuestions: t.total_questions,
        score: t.score, attemptStatus: t.attempt_status, completedAt: t.completed_at, createdAt: t.created_at,
      })),
    });
  } catch (err) {
    logger.error('Get tests:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch tests.' });
  }
});

router.post('/generate', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = GenSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { subject, topic, difficulty, questionCount } = parsed.data;
    const ai = getAIProvider();
    if (!ai.isAvailable()) {
      return res.status(503).json({ success: false, error: 'AI not configured.' });
    }
    const prompt = 'Generate a ' + difficulty + ' test on ' + subject + (topic ? ' - ' + topic : '') + '.\nQuestions: ' + questionCount + '\nReturn ONLY this JSON:\n{"title":"Test title","questions":[{"number":1,"type":"multiple_choice","question":"Q?","options":["A) opt","B) opt","C) opt","D) opt"],"correct_answer":"A","explanation":"Why A"}]}';
    let aiResp: string;
    try {
      aiResp = await ai.chat([{ role: 'user', content: prompt }], { systemPrompt: testGeneratorPrompt(), maxTokens: 3000 });
    } catch {
      return res.status(503).json({ success: false, error: 'AI failed to generate test. Try again.' });
    }
    let testData: z.infer<typeof TestSchema>;
    try {
      const m = aiResp.match(/[{][\s\S]*[}]/);
      if (!m) throw new Error('No JSON');
      testData = TestSchema.parse(JSON.parse(m[0]));
    } catch {
      return res.status(422).json({ success: false, error: 'AI returned unexpected format. Try again.' });
    }
    const uid = req.session.userId!;
    const [tr] = await pool.execute<mysql.ResultSetHeader>(
      'INSERT INTO tests (user_id, title, subject, topic, difficulty, total_questions) VALUES (?, ?, ?, ?, ?, ?)',
      [uid, testData.title, subject, topic || null, difficulty, testData.questions.length]
    );
    const tid = tr.insertId;
    for (const q of testData.questions) {
      await pool.execute(
        'INSERT INTO test_questions (test_id, question_number, type, question, options, correct_answer, explanation) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [tid, q.number, q.type, q.question, q.options ? JSON.stringify(q.options) : null, q.correct_answer, q.explanation || null]
      );
    }
    const [qRows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT * FROM test_questions WHERE test_id=? ORDER BY question_number', [tid]
    );
    return res.status(201).json({
      success: true,
      data: {
        id: tid, title: testData.title, subject, topic, difficulty,
        totalQuestions: testData.questions.length,
        questions: (qRows as unknown as Row[]).map(q => ({
          id: q.id, testId: q.test_id, questionNumber: q.question_number, type: q.type,
          question: q.question, options: q.options ? safeJsonArray(q.options) : undefined,
          correctAnswer: q.correct_answer, explanation: q.explanation,
        })),
      },
    });
  } catch (err) {
    logger.error('Generate test:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate test.' });
  }
});

router.post('/:id/submit', requireAuth, async (req: Request, res: Response) => {
  try {
    const tid = parseInt(req.params.id, 10);
    const uid = req.session.userId!;
    const parsed = SubmitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid submission.' });
    }
    const { answers, timeTakenSeconds } = parsed.data;
    const [tRows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT * FROM tests WHERE id=? AND user_id=?', [tid, uid]
    );
    if (!(tRows as unknown[]).length) {
      return res.status(404).json({ success: false, error: 'Test not found.' });
    }
    const [qRows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT * FROM test_questions WHERE test_id=?', [tid]
    );
    const questions = qRows as unknown as Array<{ id: number; type: string; correct_answer: string; question: string }>;
    let correct = 0;
    const graded: Array<{ questionId: number; answer: string; isCorrect: boolean }> = [];
    for (const ans of answers) {
      const q = questions.find(q => q.id === ans.questionId);
      if (!q) continue;
      const isCorrect = q.type === 'multiple_choice'
        ? ans.answer.trim().toUpperCase() === q.correct_answer.trim().toUpperCase()
          || ans.answer.trim().toUpperCase().startsWith(q.correct_answer.trim().toUpperCase())
        : ans.answer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
      if (isCorrect) correct++;
      graded.push({ questionId: ans.questionId, answer: ans.answer, isCorrect });
    }
    const score = questions.length > 0 ? (correct / questions.length) * 100 : 0;
    const ai = getAIProvider();
    let analysis = '', strengths = '', weakAreas = '';
    if (ai.isAvailable()) {
      try {
        const td = tRows as unknown as Array<{ subject: string; topic: string; difficulty: string }>;
        const wrong = questions.filter(q => !graded.find(a => a.questionId === q.id && a.isCorrect));
        const ap = 'Test: ' + td[0].difficulty + ' ' + td[0].subject + (td[0].topic ? ' (' + td[0].topic + ')' : '') + '\nScore: ' + correct + '/' + questions.length + ' (' + Math.round(score) + '%)\nWrong: ' + wrong.map(q => q.question).join('; ') + '\n\nReturn JSON: {"analysis":"assessment","strengths":"what they know","weak_areas":"gaps to fix"}';
        const ar = await ai.chat([{ role: 'user', content: ap }], { systemPrompt: testAnalyzerPrompt(), maxTokens: 500 });
        const m = ar.match(/[{][\s\S]*[}]/);
        if (m) {
          const p = JSON.parse(m[0]);
          analysis = p.analysis || '';
          strengths = p.strengths || '';
          weakAreas = p.weak_areas || '';
        }
      } catch {
        // analysis optional
      }
    }
    const [ar] = await pool.execute<mysql.ResultSetHeader>(
      'INSERT INTO test_attempts (test_id, user_id, score, total_questions, correct_count, time_taken_seconds, analysis, strengths, weak_areas, status, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "completed", NOW())',
      [tid, uid, score, questions.length, correct, timeTakenSeconds || null, analysis, strengths, weakAreas]
    );
    const aid = ar.insertId;
    for (const a of graded) {
      await pool.execute(
        'INSERT INTO test_answers (attempt_id, question_id, user_answer, is_correct) VALUES (?, ?, ?, ?)',
        [aid, a.questionId, a.answer, a.isCorrect ? 1 : 0]
      );
    }
    return res.json({
      success: true,
      data: {
        attemptId: aid, score: Math.round(score), correctCount: correct,
        totalQuestions: questions.length, analysis, strengths, weakAreas,
        answers: graded,
        questions: questions.map(q => ({ id: q.id, question: q.question, correctAnswer: q.correct_answer })),
      },
    });
  } catch (err) {
    logger.error('Submit test:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit test.' });
  }
});

router.get('/attempts', requireAuth, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT ta.*, t.title, t.subject, t.topic, t.difficulty FROM test_attempts ta JOIN tests t ON t.id=ta.test_id WHERE ta.user_id=? AND ta.status="completed" ORDER BY ta.completed_at DESC LIMIT 20',
      [req.session.userId]
    );
    return res.json({
      success: true,
      data: (rows as unknown as Array<Record<string, unknown>>).map(a => ({
        id: a.id, testId: a.test_id, title: a.title, subject: a.subject,
        topic: a.topic, difficulty: a.difficulty, score: a.score,
        correctCount: a.correct_count, totalQuestions: a.total_questions,
        analysis: a.analysis, strengths: a.strengths, weakAreas: a.weak_areas,
        completedAt: a.completed_at, createdAt: a.created_at,
      })),
    });
  } catch (err) {
    logger.error('Get attempts:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch history.' });
  }
});

export default router;
