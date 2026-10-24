import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { optionalString } from '../validate.js';

const router = Router();
router.use(requireAuth);

const emptyProfile = { fullName: '', graduation: '', year: '', branch: '', experience: '', role: '' };

const toProfile = (row) => row ? {
  fullName: row.full_name,
  graduation: row.graduation,
  year: row.year,
  branch: row.branch,
  experience: row.experience,
  role: row.role,
  updatedAt: row.updated_at,
} : null;

router.get('/', (req, res) => {
  const row = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);
  // `exists` mirrors the old Firestore docSnap.exists() check
  res.json({ exists: !!row, profile: toProfile(row) ?? emptyProfile });
});

router.put('/', (req, res) => {
  const body = req.body ?? {};
  const profile = {
    fullName: optionalString(body.fullName, 'fullName', 100),
    graduation: optionalString(body.graduation, 'graduation', 100),
    year: optionalString(body.year, 'year', 20),
    branch: optionalString(body.branch, 'branch', 100),
    experience: optionalString(body.experience, 'experience', 100),
    role: optionalString(body.role, 'role', 100),
  };
  const updatedAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO profiles (user_id, full_name, graduation, year, branch, experience, role, updated_at)
    VALUES (@userId, @fullName, @graduation, @year, @branch, @experience, @role, @updatedAt)
    ON CONFLICT(user_id) DO UPDATE SET
      full_name = excluded.full_name,
      graduation = excluded.graduation,
      year = excluded.year,
      branch = excluded.branch,
      experience = excluded.experience,
      role = excluded.role,
      updated_at = excluded.updated_at
  `).run({ userId: req.user.id, ...profile, updatedAt });

  res.json({ exists: true, profile: { ...profile, updatedAt } });
});

export default router;
