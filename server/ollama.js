import { config } from './config.js';
import { HttpError } from './validate.js';

const { url, model, numCtx, timeoutMs } = config.ollama;

const notRunning = () =>
  new HttpError(503, `Ollama is not reachable at ${url}. Start it with "ollama serve".`);

const modelMissing = () =>
  new HttpError(503, `Model "${model}" is not installed. Run "ollama pull ${model}".`);

/**
 * Send a single-turn prompt to the local Gemma model.
 * @param {string} prompt
 * @param {object|string|undefined} format  JSON schema object, "json", or undefined for plain text
 * @returns {Promise<string>} the model's reply text
 */
export async function generate(prompt, format) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        think: false, // skip the reasoning trace, it only adds latency here
        ...(format ? { format } : {}),
        options: { num_ctx: numCtx },
      }),
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new HttpError(504, `The model took longer than ${Math.round(timeoutMs / 1000)}s to respond.`);
    }
    throw notRunning();
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    const message = String(detail.error || '');
    if (res.status === 404 && message.includes('not found')) throw modelMissing();
    throw new HttpError(502, `Ollama error (${res.status}): ${message || 'unknown error'}`);
  }

  const data = await res.json();
  return data.message?.content ?? '';
}

// Used by /api/health and the system check page
export async function getStatus() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${url}/api/tags`, { signal: controller.signal });
    if (!res.ok) return { reachable: false, model, modelInstalled: false };
    const { models = [] } = await res.json();
    const wanted = model.includes(':') ? model : `${model}:latest`;
    const modelInstalled = models.some((m) => m.name === wanted || m.model === wanted);
    return { reachable: true, model, modelInstalled };
  } catch {
    return { reachable: false, model, modelInstalled: false };
  } finally {
    clearTimeout(timer);
  }
}
