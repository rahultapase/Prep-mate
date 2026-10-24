import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import {
  SESSION_COOKIE,
  createSession,
  deleteSession,
  getUserFromToken,
  sessionCookieOptions,
  toPublicUser,
} from '../auth.js';
import { requiredString } from '../validate.js';

const router = Router();

router.post('/login', async (req, res) => {
  const body = req.body ?? {};
  const email = requiredString(body.email, 'email', 254).toLowerCase();
  const password = requiredString(body.password, 'password', 200);

  const user = db.prepare('SELECT id, email, display_name, password_hash FROM users WHERE email = ?').get(email);
  const ok = user ? await bcrypt.compare(password, user.password_hash) : false;
  if (!ok) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const { token, expiresAt } = createSession(user.id);
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  res.json({ user: toPublicUser(user) });
});

router.post('/logout', (req, res) => {
  deleteSession(req.cookies?.[SESSION_COOKIE]);
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
  res.json({ ok: true });
});

// Returns { user: null } instead of 401 so the app can check login state quietly on load
router.get('/me', (req, res) => {
  const user = getUserFromToken(req.cookies?.[SESSION_COOKIE]);
  res.json({ user: user ? toPublicUser(user) : null });
});

export default router;
