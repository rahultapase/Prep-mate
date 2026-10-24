import crypto from 'node:crypto';
import { db } from './db.js';
import { config } from './config.js';

export const SESSION_COOKIE = 'pm_session';

// Only a SHA-256 hash of the token is stored, so a leaked DB file can't be replayed as a cookie
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const toPublicUser = (row) => ({
  uid: String(row.id),
  email: row.email,
  displayName: row.display_name || null,
});

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + config.sessionDays * 24 * 60 * 60 * 1000);
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(hashToken(token), userId, expiresAt.toISOString());
  return { token, expiresAt };
}

export function deleteSession(token) {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

export function purgeExpiredSessions() {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString());
}

export function getUserFromToken(token) {
  if (!token || typeof token !== 'string') return null;
  const row = db.prepare(`
    SELECT u.id, u.email, u.display_name, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
  `).get(hashToken(token));
  if (!row) return null;
  if (row.expires_at <= new Date().toISOString()) {
    deleteSession(token);
    return null;
  }
  return row;
}

export const sessionCookieOptions = (expires) => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: false, // localhost runs over plain HTTP
  path: '/',
  ...(expires ? { expires } : {}),
});

// Attaches req.user or responds 401
export function requireAuth(req, res, next) {
  const user = getUserFromToken(req.cookies?.[SESSION_COOKIE]);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.user = user;
  next();
}
