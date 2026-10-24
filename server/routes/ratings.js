import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { HttpError, optionalString, rating } from '../validate.js';

const router = Router();
router.use(requireAuth);

router.post('/', (req, res) => {
  const body = req.body ?? {};
  const values = {
    interviewExperience: rating(body.interviewExperience, 'interviewExperience'),
    aiQuestionQuality: rating(body.aiQuestionQuality, 'aiQuestionQuality'),
    userInterface: rating(body.userInterface, 'userInterface'),
    overallSatisfaction: rating(body.overallSatisfaction, 'overallSatisfaction'),
  };
  if (Object.values(values).every((v) => v === 0)) {
    throw new HttpError(400, 'At least one rating is required');
  }
  const experienceText = optionalString(body.experienceText, 'experienceText', 2000);

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO ratings (user_id, interview_experience, ai_question_quality, user_interface,
                         overall_satisfaction, experience_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    values.interviewExperience,
    values.aiQuestionQuality,
    values.userInterface,
    values.overallSatisfaction,
    experienceText,
    new Date().toISOString()
  );

  res.status(201).json({ id: String(lastInsertRowid) });
});

export default router;
