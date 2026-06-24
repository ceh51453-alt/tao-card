/**
 * src/lib/ai/jsonExtract.ts — Parse AI response JSON with fallback
 * Spec Phần 9.6: Extract JSON from AI responses (fenced, raw, or plain text)
 */

import type { AIResponse } from './copilotTypes';

/**
 * Parse AI response into structured AIResponse.
 * Tries in order: direct JSON, fenced JSON, regex JSON object, plain text fallback.
 */
export function parseAIResponseJSON(raw: string): AIResponse {
  const trimmed = raw.trim();

  // 1. Direct JSON parse
  try { return validateResponse(JSON.parse(trimmed)); } catch { /* continue */ }

  // 2. Fenced JSON (```json ... ```)
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]+?)```/);
  if (fence) {
    try { return validateResponse(JSON.parse(fence[1].trim())); } catch { /* continue */ }
  }

  // 3. Extract JSON object from raw text
  const objMatch = trimmed.match(/\{[\s\S]+\}/);
  if (objMatch) {
    try { return validateResponse(JSON.parse(objMatch[0])); } catch { /* continue */ }
  }

  // 4. Fallback: treat as plain text message
  return {
    thought: '',
    message: raw,
    status: 'DONE',
    actions: [],
  };
}

function validateResponse(obj: unknown): AIResponse {
  if (typeof obj !== 'object' || obj === null) throw new Error('Not an object');
  const resp = obj as Record<string, unknown>;
  return {
    thought: typeof resp.thought === 'string' ? resp.thought : '',
    message: typeof resp.message === 'string' ? resp.message : '',
    status: resp.status === 'CONTINUE' ? 'CONTINUE' : 'DONE',
    actions: Array.isArray(resp.actions) ? resp.actions.map(normalizeAction).filter(Boolean) as AIResponse['actions'] : [],
  };
}

function normalizeAction(raw: unknown): AIResponse['actions'][0] | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const a = raw as Record<string, unknown>;
  if (typeof a.type !== 'string') return null;
  return { type: a.type, data: (a.data ?? {}) as Record<string, unknown> } as AIResponse['actions'][0];
}
