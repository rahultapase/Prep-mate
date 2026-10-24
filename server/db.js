import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { config } from './config.js';

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

export const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name  TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS profiles (
    user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name  TEXT NOT NULL DEFAULT '',
    graduation TEXT NOT NULL DEFAULT '',
    year       TEXT NOT NULL DEFAULT '',
    branch     TEXT NOT NULL DEFAULT '',
    experience TEXT NOT NULL DEFAULT '',
    role       TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS interviews (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interview_type TEXT NOT NULL,
    feedback       TEXT NOT NULL,
    questions      TEXT NOT NULL,
    answers        TEXT NOT NULL,
    user_inputs    TEXT NOT NULL,
    created_at     TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_interviews_user ON interviews(user_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS ratings (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interview_experience INTEGER NOT NULL,
    ai_question_quality  INTEGER NOT NULL,
    user_interface       INTEGER NOT NULL,
    overall_satisfaction INTEGER NOT NULL,
    experience_text      TEXT NOT NULL DEFAULT '',
    created_at           TEXT NOT NULL
  );
`);

// Create the demo user from .env if it does not exist yet
export function seedDemoUser() {
  const { email, password, name } = config.demo;
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return false;

  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    'INSERT INTO users (email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?)'
  ).run(email, hash, name, new Date().toISOString());
  return true;
}
