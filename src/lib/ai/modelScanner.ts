/**
 * src/lib/ai/modelScanner.ts — Quét danh sách model từ 3 providers
 * Spec Phần 5.3
 */

import type { ProxyProfile, ModelInfo } from '../../types';

/**
 * Quét model list theo provider type.
 * OpenAI/Custom: GET /v1/models
 * Claude: GET /v1/models (Anthropic header)
 * Gemini: GET /v1beta/models?key=...
 */
export async function scanModels(profile: ProxyProfile): Promise<ModelInfo[]> {
  const base = profile.baseUrl.replace(/\/+$/, '');

  switch (profile.providerType) {
    case 'openai':
    case 'custom': {
      const url = base.endsWith('/v1') ? `${base}/models` : `${base}/v1/models`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${profile.apiKey}` },
      });
      if (!res.ok) throw new Error(`Quét model thất bại: [${res.status}] ${res.statusText}`);
      const json = await res.json();
      return (json.data ?? [])
        .map((m: { id: string; owned_by?: string }) => ({
          id: m.id,
          ownedBy: m.owned_by,
        }))
        .sort((a: ModelInfo, b: ModelInfo) => a.id.localeCompare(b.id));
    }

    case 'claude': {
      const res = await fetch(`${base}/v1/models`, {
        headers: {
          'x-api-key': profile.apiKey,
          'anthropic-version': '2023-06-01',
        },
      });
      if (!res.ok) throw new Error(`Quét model thất bại: [${res.status}] ${res.statusText}`);
      const json = await res.json();
      return (json.data ?? [])
        .map((m: { id: string }) => ({ id: m.id }))
        .sort((a: ModelInfo, b: ModelInfo) => a.id.localeCompare(b.id));
    }

    case 'gemini': {
      const res = await fetch(`${base}/v1beta/models?key=${profile.apiKey}`);
      if (!res.ok) throw new Error(`Quét model thất bại: [${res.status}] ${res.statusText}`);
      const json = await res.json();
      return (json.models ?? [])
        .map((m: { name: string }) => ({ id: m.name.replace('models/', '') }))
        .sort((a: ModelInfo, b: ModelInfo) => a.id.localeCompare(b.id));
    }

    default:
      return [];
  }
}
