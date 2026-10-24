import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { generate } from '../ollama.js';
import { HttpError, requiredString } from '../validate.js';

const router = Router();
router.use(requireAuth);

// Technical prompts embed the resume (≤10k) and job description (≤8k) plus instructions
const MAX_PROMPT_LENGTH = 40000;

router.post('/generate', async (req, res) => {
  const body = req.body ?? {};
  const prompt = requiredString(body.prompt, 'prompt', MAX_PROMPT_LENGTH);

  let format;
  if (body.json === true) {
    if (body.schema !== undefined) {
      if (!body.schema || typeof body.schema !== 'object' || Array.isArray(body.schema)) {
        throw new HttpError(400, 'schema must be a JSON schema object');
      }
      format = body.schema;
    } else {
      format = 'json';
    }
  }

  const started = Date.now();
  const text = await generate(prompt, format);
  console.log(`[ai] ${format ? 'json' : 'text'} response in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  res.json({ text });
});

export default router;
