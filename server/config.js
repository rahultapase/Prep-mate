import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '..');

// Load .env from the project root (Node 22 built-in, no dotenv needed).
// Variables already set in the shell take precedence.
const envPath = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const toInt = (value, fallback) => {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const config = {
  port: toInt(process.env.PORT, 3001),
  host: process.env.HOST || '127.0.0.1',
  isProd: process.env.NODE_ENV === 'production',
  dbPath: path.join(ROOT_DIR, 'data', 'prepmate.db'),
  distDir: path.join(ROOT_DIR, 'dist'),
  sessionDays: 7,
  ollama: {
    url: (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/+$/, ''),
    model: process.env.OLLAMA_MODEL || 'gemma4:e2b',
    numCtx: toInt(process.env.OLLAMA_NUM_CTX, 16384),
    timeoutMs: toInt(process.env.OLLAMA_TIMEOUT_MS, 180000),
  },
  demo: {
    email: (process.env.DEMO_EMAIL || 'rahul@prepmate.local').trim().toLowerCase(),
    password: process.env.DEMO_PASSWORD || 'demo1234',
    name: process.env.DEMO_NAME || 'Rahul',
  },
};
