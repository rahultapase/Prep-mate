import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { seedDemoUser } from './db.js';
import { purgeExpiredSessions } from './auth.js';
import { getStatus } from './ollama.js';
import { HttpError } from './validate.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import interviewRoutes from './routes/interviews.js';
import ratingRoutes from './routes/ratings.js';
import aiRoutes from './routes/ai.js';

const app = express();
app.disable('x-powered-by');

// Security headers suited to a localhost app
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval'", // lottie-web evaluates expressions
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "media-src 'self' blob: mediastream:",
    "worker-src 'self' blob:", // pdf.js worker
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '));
  next();
});

// Only the Vite dev server needs cross-origin access; it normally goes through the proxy anyway
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), ollama: await getStatus() });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/ai', aiRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler: known errors keep their status, everything else is a 500
// Express needs all four args to treat this as an error handler
app.use((err, req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  console.error('[server] unexpected error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

if (seedDemoUser()) {
  console.log(`[db] created demo user ${config.demo.email}`);
}
purgeExpiredSessions();

app.listen(config.port, config.host, async () => {
  console.log(`[server] API running at http://${config.host}:${config.port}`);
  console.log(`[db] ${config.dbPath}`);
  const status = await getStatus();
  if (!status.reachable) {
    console.warn(`[ollama] not reachable at ${config.ollama.url}. Start it with "ollama serve".`);
  } else if (!status.modelInstalled) {
    console.warn(`[ollama] model "${status.model}" missing. Run "ollama pull ${status.model}".`);
  } else {
    console.log(`[ollama] ready with ${status.model}`);
  }
});
