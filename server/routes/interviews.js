import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { HttpError, plainObject, requiredString, stringArray } from '../validate.js';

const router = Router();
router.use(requireAuth);

const parseJson = (text, fallback) => {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
};

// Same shape the Dashboard used to read from Firestore
const toInterview = (row, email) => ({
  id: String(row.id),
  feedback: parseJson(row.feedback, {}),
  interviewType: row.interview_type,
  questions: parseJson(row.questions, []),
  answers: parseJson(row.answers, []),
  userInputs: parseJson(row.user_inputs, {}),
  timestamp: row.created_at,
  user: email,
});

router.get('/', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM interviews WHERE user_id = ? ORDER BY created_at DESC, id DESC'
  ).all(req.user.id);
  res.json({ interviews: rows.map((row) => toInterview(row, req.user.email)) });
});

router.get('/count', (req, res) => {
  const type = requiredString(req.query.type, 'type', 50);
  const { count } = db.prepare(
    'SELECT COUNT(*) AS count FROM interviews WHERE user_id = ? AND interview_type = ?'
  ).get(req.user.id, type);
  res.json({ count });
});

router.post('/', (req, res) => {
  const body = req.body ?? {};
  const interviewType = requiredString(body.interviewType, 'interviewType', 50);
  const feedback = plainObject(body.feedback, 'feedback');
  const questions = stringArray(body.questions, 'questions', 200, 5000);
  const answers = stringArray(body.answers, 'answers', 200, 20000);
  const userInputs = plainObject(body.userInputs ?? {}, 'userInputs');
  const createdAt = new Date().toISOString();

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO interviews (user_id, interview_type, feedback, questions, answers, user_inputs, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    interviewType,
    JSON.stringify(feedback),
    JSON.stringify(questions),
    JSON.stringify(answers),
    JSON.stringify({ ...userInputs, email: req.user.email }),
    createdAt
  );

  res.status(201).json({ id: String(lastInsertRowid), timestamp: createdAt });
});

router.delete('/:id', (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid id');

  // Scoped to the owner so one user can never delete another user's interview
  const { changes } = db.prepare('DELETE FROM interviews WHERE id = ? AND user_id = ?').run(id, req.user.id);
  if (changes === 0) throw new HttpError(404, 'Interview not found');
  res.json({ ok: true });
});

export default router;
