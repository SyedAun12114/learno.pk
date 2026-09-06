import { Router, Request, Response } from 'express';
import { z } from 'zod';
import mysql from 'mysql2/promise';
import { pool } from '../db';
import { requireAuth } from '../middleware/requireAuth';
import { logger } from '../utils/logger';

const router = Router();

const ProfileSchema = z.object({
  fullName: z.string().min(2).max(100),
  age: z.number().int().min(13).max(100).optional(),
  educationLevel: z.string().max(100).optional(),
  institution: z.string().max(255).optional(),
  careerInterest: z.string().max(255).optional(),
  dailyLearningMinutes: z.number().int().min(15).max(480).optional(),
  academicGoal: z.string().max(500).optional(),
  careerGoal: z.string().max(500).optional(),
  currentSkills: z.string().max(500).optional(),
  subjects: z.array(z.string().max(100)).optional(),
});

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT sp.*, GROUP_CONCAT(ss.subject_name) as subjects_list FROM student_profiles sp LEFT JOIN student_subjects ss ON ss.user_id = sp.user_id WHERE sp.user_id = ? GROUP BY sp.id',
      [req.session.userId]
    );
    const p = (rows as unknown as Array<Record<string, unknown>>)[0];
    if (!p) return res.json({ success: true, data: null });
    return res.json({
      success: true,
      data: {
        id: p.id, userId: p.user_id, fullName: p.full_name, age: p.age,
        educationLevel: p.education_level, institution: p.institution,
        careerInterest: p.career_interest, dailyLearningMinutes: p.daily_learning_minutes || 60,
        academicGoal: p.academic_goal, careerGoal: p.career_goal, currentSkills: p.current_skills,
        subjects: p.subjects_list ? String(p.subjects_list).split(',') : [],
        createdAt: p.created_at, updatedAt: p.updated_at,
      },
    });
  } catch (err) {
    logger.error('Get profile error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch profile.' });
  }
});

router.post('/onboarding', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = ProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const d = parsed.data;
    const uid = req.session.userId!;
    await pool.execute(
      'INSERT INTO student_profiles (user_id, full_name, age, education_level, institution, career_interest, daily_learning_minutes, academic_goal, career_goal, current_skills) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE full_name=VALUES(full_name),age=VALUES(age),education_level=VALUES(education_level),institution=VALUES(institution),career_interest=VALUES(career_interest),daily_learning_minutes=VALUES(daily_learning_minutes),academic_goal=VALUES(academic_goal),career_goal=VALUES(career_goal),current_skills=VALUES(current_skills)',
      [uid, d.fullName, d.age || null, d.educationLevel || null, d.institution || null, d.careerInterest || null, d.dailyLearningMinutes || 60, d.academicGoal || null, d.careerGoal || null, d.currentSkills || null]
    );
    if (d.subjects?.length) {
      await pool.execute('DELETE FROM student_subjects WHERE user_id = ?', [uid]);
      for (const s of d.subjects) {
        if (s.trim()) {
          await pool.execute('INSERT INTO student_subjects (user_id, subject_name) VALUES (?, ?)', [uid, s.trim()]);
        }
      }
    }
    await pool.execute('UPDATE users SET is_onboarded = 1 WHERE id = ?', [uid]);
    return res.json({ success: true, message: 'Onboarding complete.' });
  } catch (err) {
    logger.error('Onboarding error:', err);
    return res.status(500).json({ success: false, error: 'Failed to save onboarding data.' });
  }
});

router.put('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = ProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const d = parsed.data;
    const uid = req.session.userId!;

    await pool.execute(
      `INSERT INTO student_profiles
        (user_id, full_name, age, education_level, institution, career_interest,
         daily_learning_minutes, academic_goal, career_goal, current_skills)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         full_name = VALUES(full_name),
         age = VALUES(age),
         education_level = VALUES(education_level),
         institution = VALUES(institution),
         career_interest = VALUES(career_interest),
         daily_learning_minutes = VALUES(daily_learning_minutes),
         academic_goal = VALUES(academic_goal),
         career_goal = VALUES(career_goal),
         current_skills = VALUES(current_skills)`,
      [
        uid,
        d.fullName,
        d.age || null,
        d.educationLevel || null,
        d.institution || null,
        d.careerInterest || null,
        d.dailyLearningMinutes || 60,
        d.academicGoal || null,
        d.careerGoal || null,
        d.currentSkills || null,
      ]
    );

    return res.json({ success: true, message: 'Profile updated.' });
  } catch (err) {
    logger.error('Update profile error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update profile.' });
  }
});

export default router;
