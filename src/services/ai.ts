// Client for the local Gemma model (served by Ollama behind /api/ai/generate)
import { API_ENDPOINTS, apiFetch } from '../config/api';

type JsonSchema = Record<string, unknown>;

export async function generateText(prompt: string): Promise<string> {
  const { text } = await apiFetch<{ text: string }>(API_ENDPOINTS.AI_GENERATE, {
    method: 'POST',
    body: { prompt },
  });
  return text;
}

/** Ask for JSON output. With a schema, Ollama constrains the reply to that shape. */
export async function generateJson<T>(prompt: string, schema?: JsonSchema): Promise<T> {
  const { text } = await apiFetch<{ text: string }>(API_ENDPOINTS.AI_GENERATE, {
    method: 'POST',
    body: { prompt, json: true, ...(schema ? { schema } : {}) },
  });
  return parseJsonResponse<T>(text);
}

export function parseJsonResponse<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    // Fallback: pull the first {...} block out of any surrounding text or markdown
    const match = text.match(/{[\s\S]*}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        // fall through
      }
    }
    throw new Error('The AI returned an invalid feedback format. Please try again.');
  }
}

/** Turn the model's reply into a list of questions (same rules the app used with Gemini). */
export function parseQuestionList(text: string): string[] {
  const lines = text.split('\n').map((l) => l.trim());
  // Numbered or bulleted lines ending with "?"
  let questions = lines.filter((l) => /^(\d+\.|[-•])\s?.+\?$/.test(l));
  // Any reasonably long line ending with "?"
  if (questions.length === 0) {
    questions = lines.filter((l) => l.length > 10 && /\?$/.test(l));
  }
  // Last resort: show the whole reply as one item
  return questions.length > 0 ? questions : [text.trim()];
}

const scoreInt = { type: 'integer' };
const str = { type: 'string' };

/** JSON schema for interview feedback. HR/Behavioral use behavioral scores, other types use technical scores. */
export function feedbackSchema(softSkillsInterview: boolean): JsonSchema {
  const perQuestion = softSkillsInterview
    ? { question: str, answer: str, communicationScore: scoreInt, fluencyComment: str, behavioralComment: str }
    : { question: str, answer: str, communicationScore: scoreInt, technicalScore: scoreInt, fluencyComment: str, techComment: str };
  const overall = softSkillsInterview
    ? { overallScore: scoreInt, communicationScore: scoreInt, logicalBehavioralScore: scoreInt }
    : { overallScore: scoreInt, communicationScore: scoreInt, technicalScore: scoreInt };

  return {
    type: 'object',
    properties: {
      ...overall,
      interviewSummary: str,
      overallSuggestions: { type: 'array', items: str },
      questions: {
        type: 'array',
        items: { type: 'object', properties: perQuestion, required: Object.keys(perQuestion) },
      },
    },
    required: [...Object.keys(overall), 'interviewSummary', 'overallSuggestions', 'questions'],
  };
}
