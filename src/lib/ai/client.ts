/**
 * src/lib/ai/client.ts — Unified AI chat-completion caller
 * Spec Phần 5 + 9: gọi OpenAI-compatible, Claude, Gemini endpoints
 */

import type { ProxyProfile, GenerationParams, ChatMessage } from '../../types';

export interface AICallOptions {
  profile: ProxyProfile;
  params: GenerationParams;
  messages: ChatMessage[];
  signal?: AbortSignal;
  useSecondary?: boolean; // Use secondary (Flash) model if configured
}

export interface AICallResult {
  text: string;
  model: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  finishReason?: string;
}

class RPMLimiter {
  private lastCalls: number[] = [];
  
  async waitIfNecessary(rpm: number) {
    if (rpm <= 0) return;
    const now = Date.now();
    this.lastCalls = this.lastCalls.filter(t => now - t < 60000);
    
    if (this.lastCalls.length >= rpm) {
      const oldestCall = this.lastCalls[0];
      const waitTime = 60000 - (now - oldestCall) + 200; // 200ms padding
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    this.lastCalls.push(Date.now());
  }
}

const primaryLimiter = new RPMLimiter();
const secondaryLimiter = new RPMLimiter();

/**
 * Gọi AI chat-completion theo provider type.
 * Trả về text response thuần (đã extract từ JSON response format).
 */
export async function callAI(options: AICallOptions): Promise<AICallResult> {
  const { profile, params, messages, signal, useSecondary } = options;
  const base = profile.baseUrl.replace(/\/+$/, '');

  // Rate Limiter
  const rpm = useSecondary && profile.enableSecondaryModel
    ? (profile.secondaryRpm ?? 10)
    : (profile.primaryRpm ?? 5);

  if (rpm > 0) {
    const limiter = useSecondary && profile.enableSecondaryModel ? secondaryLimiter : primaryLimiter;
    await limiter.waitIfNecessary(rpm);
  }

  // Smart AbortController with 5min hard timeout (large lorebooks need time)
  const timeoutMs = 300_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Timeout: Yêu cầu AI vượt quá ${timeoutMs / 1000} giây.`));
  }, timeoutMs);

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId);
      throw signal.reason || new Error('Aborted');
    }
    signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      controller.abort(signal.reason);
    });
  }

  try {
    switch (profile.providerType) {
      case 'openai':
      case 'custom':
        return await callOpenAICompatible(base, profile, params, messages, controller.signal, useSecondary);
      case 'claude':
        return await callClaude(base, profile, params, messages, controller.signal, useSecondary);
      case 'gemini':
        return await callGemini(base, profile, params, messages, controller.signal, useSecondary);
      default:
        throw new Error(`Provider không được hỗ trợ: ${profile.providerType}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── OpenAI-Compatible ──────────────────────────────────────────────────────

async function callOpenAICompatible(
  base: string, profile: ProxyProfile, params: GenerationParams,
  messages: ChatMessage[], signal?: AbortSignal, useSecondary?: boolean,
): Promise<AICallResult> {
  const url = base.endsWith('/v1')
    ? `${base}/chat/completions`
    : `${base}/v1/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${profile.apiKey}`,
  };
  for (const h of profile.customHeaders) {
    if (h.key && h.value) headers[h.key] = h.value;
  }

  const model = (useSecondary && profile.enableSecondaryModel && profile.secondaryModel)
    ? profile.secondaryModel
    : profile.selectedModel;

  const body: Record<string, unknown> = {
    model,
    messages: messages.map(m => {
      if (!m.attachments?.length) return { role: m.role, content: m.content };
      const parts: Record<string, unknown>[] = [{ type: 'text', text: m.content }];
      for (const att of m.attachments) {
        if (att.type === 'image') {
          parts.push({ type: 'image_url', image_url: { url: `data:${att.mimeType};base64,${att.data}` } });
        } else {
          parts.push({ type: 'text', text: `\n\n--- Tệp đính kèm: ${att.name} ---\n${att.data}` });
        }
      }
      return { role: m.role, content: parts };
    }),
    max_tokens: params.max_tokens,
    temperature: params.temperature,
    top_p: params.top_p,
    frequency_penalty: params.frequency_penalty,
    presence_penalty: params.presence_penalty,
    stream: false,
  };
  if (params.stop.length > 0) body.stop = params.stop;
  if (params.seed !== -1) body.seed = params.seed;
  if (params.top_k > 0) body.top_k = params.top_k;
  if (params.min_p > 0) body.min_p = params.min_p;
  if (params.repetition_penalty !== 1) body.repetition_penalty = params.repetition_penalty;
  if (params.useJsonResponseFormat) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`[${res.status}] ${res.statusText}: ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  if (json.error) {
    throw new Error(`API Error: ${json.error.message || JSON.stringify(json.error)}`);
  }
  const choice = json.choices?.[0];
  if (!choice) {
    throw new Error(`API returned 200 OK but with no content choices. Response: ${JSON.stringify(json)}`);
  }
  if (choice.finish_reason && !['stop', 'stop_sequence', 'length'].includes(choice.finish_reason)) {
    throw new Error(`API dừng thế sinh vì lý do: ${choice.finish_reason}. Nội dung có thể đã bị chặn hoặc lọc bởi bộ lọc an toàn.`);
  }
  return {
    text: choice.message?.content ?? '',
    model: json.model ?? profile.selectedModel,
    usage: json.usage,
    finishReason: choice.finish_reason,
  };
}

// ─── Claude (Anthropic) ─────────────────────────────────────────────────────

async function callClaude(
  base: string, profile: ProxyProfile, params: GenerationParams,
  messages: ChatMessage[], signal?: AbortSignal, useSecondary?: boolean,
): Promise<AICallResult> {
  const url = `${base}/v1/messages`;
  const systemMsg = messages.find(m => m.role === 'system');
  const nonSystemMsgs = messages.filter(m => m.role !== 'system');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': profile.apiKey,
    'anthropic-version': '2023-06-01',
  };
  for (const h of profile.customHeaders) {
    if (h.key && h.value) headers[h.key] = h.value;
  }

  const model = (useSecondary && profile.enableSecondaryModel && profile.secondaryModel)
    ? profile.secondaryModel
    : profile.selectedModel;

  const body: Record<string, unknown> = {
    model,
    max_tokens: params.max_tokens,
    messages: nonSystemMsgs.map(m => {
      if (!m.attachments?.length) return { role: m.role, content: m.content };
      const parts: Record<string, unknown>[] = [{ type: 'text', text: m.content }];
      for (const att of m.attachments) {
        if (att.type === 'image') {
          parts.push({ type: 'image', source: { type: 'base64', media_type: att.mimeType, data: att.data } });
        } else {
          parts.push({ type: 'text', text: `\n\n--- Tệp đính kèm: ${att.name} ---\n${att.data}` });
        }
      }
      return { role: m.role, content: parts };
    }),
    temperature: params.temperature,
    top_p: params.top_p,
  };
  if (systemMsg) body.system = systemMsg.content;
  if (params.stop.length > 0) body.stop_sequences = params.stop;
  if (params.top_k > 0) body.top_k = params.top_k;

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`[${res.status}] ${res.statusText}: ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  if (json.error) {
    throw new Error(`Claude API Error: ${json.error.message || JSON.stringify(json.error)}`);
  }
  if (!json.content || json.content.length === 0) {
    throw new Error(`Claude API returned no content. Response: ${JSON.stringify(json)}`);
  }
  const text = json.content.map((c: { text?: string }) => c.text ?? '').join('');
  return {
    text,
    model: json.model ?? profile.selectedModel,
    usage: json.usage ? {
      prompt_tokens: json.usage.input_tokens,
      completion_tokens: json.usage.output_tokens,
      total_tokens: (json.usage.input_tokens ?? 0) + (json.usage.output_tokens ?? 0),
    } : undefined,
    finishReason: json.stop_reason,
  };
}

// ─── Gemini (Google AI) ─────────────────────────────────────────────────────

async function callGemini(
  base: string, profile: ProxyProfile, params: GenerationParams,
  messages: ChatMessage[], signal?: AbortSignal, useSecondary?: boolean,
): Promise<AICallResult> {
  const selectedModel = (useSecondary && profile.enableSecondaryModel && profile.secondaryModel)
    ? profile.secondaryModel
    : profile.selectedModel;
  const model = selectedModel.replace('models/', '');
  const url = `${base}/v1beta/models/${model}:generateContent?key=${profile.apiKey}`;

  const systemMsg = messages.find(m => m.role === 'system');
  const nonSystemMsgs = messages.filter(m => m.role !== 'system');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  for (const h of profile.customHeaders) {
    if (h.key && h.value) headers[h.key] = h.value;
  }

  const contents = nonSystemMsgs.map(m => {
    const parts: Record<string, unknown>[] = [{ text: m.content }];
    if (m.attachments) {
      for (const att of m.attachments) {
        if (att.type === 'image') {
          parts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
        } else {
          parts.push({ text: `\n\n--- Tệp đính kèm: ${att.name} ---\n${att.data}` });
        }
      }
    }
    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts,
    };
  });

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: params.max_tokens,
      temperature: params.temperature,
      topP: params.top_p,
      topK: params.top_k > 0 ? params.top_k : undefined,
      responseMimeType: params.useJsonResponseFormat ? 'application/json' : undefined,
    },
  };
  
  if (profile.enableGoogleSearchGrounding) {
    body.tools = [{ googleSearch: {} }];
  }
  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }
  if (params.stop.length > 0) {
    (body.generationConfig as Record<string, unknown>).stopSequences = params.stop;
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`[${res.status}] ${res.statusText}: ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  if (json.error) {
    throw new Error(`Gemini API Error: ${json.error.message || JSON.stringify(json.error)}`);
  }
  const candidate = json.candidates?.[0];
  if (!candidate) {
    throw new Error(`Gemini API returned no content candidates. Response: ${JSON.stringify(json)}`);
  }
  if (candidate.finishReason && !['STOP', 'MAX_TOKENS'].includes(candidate.finishReason)) {
    throw new Error(`Gemini API dừng thế sinh vì lý do: ${candidate.finishReason}. Nội dung hoặc Prompt có thể đã bị chặn bởi bộ lọc an toàn hoặc Recitation check. Phản hồi đầy đủ: ${JSON.stringify(candidate)}`);
  }
  const text = candidate.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  if (!text.trim() && candidate.finishReason === 'MAX_TOKENS') {
    throw new Error(`Gemini API dừng sinh ngay lập tức (MAX_TOKENS) mà không trả nội dung nào. Nguyên nhân: prompt đầu vào quá lớn (${json.usageMetadata?.promptTokenCount ?? '?'} tokens) chiếm hết context, không còn chỗ cho output. Thử: giảm số entries lorebook, hoặc tăng maxOutputTokens trong Settings.`);
  }
  return {
    text,
    finishReason: candidate.finishReason as string | undefined,
    model: profile.selectedModel,
    usage: json.usageMetadata ? {
      prompt_tokens: json.usageMetadata.promptTokenCount,
      completion_tokens: json.usageMetadata.candidatesTokenCount,
      total_tokens: json.usageMetadata.totalTokenCount,
    } : undefined,
  };
}

// ─── Connection Test ────────────────────────────────────────────────────────

export interface ConnectionTestResult {
  ok: boolean;
  latencyMs: number;
  modelUsed: string;
  supportsToolCalling: boolean;
  error?: string;
}

/**
 * Ping AI server + test tool-calling support
 */
export async function testConnection(
  profile: ProxyProfile, params: GenerationParams,
): Promise<ConnectionTestResult> {
  const start = performance.now();
  try {
    const result = await callAI({
      profile,
      params: { ...params, max_tokens: 50 },
      messages: [
        { role: 'system', content: 'You are a test assistant. Reply with exactly: {"test":"ok"}' },
        { role: 'user', content: 'ping' },
      ],
    });
    const latencyMs = Math.round(performance.now() - start);

    // Naive tool-calling detection: check if the model returns valid JSON
    let supportsToolCalling = false;
    try {
      const parsed = JSON.parse(result.text.trim());
      supportsToolCalling = typeof parsed === 'object' && parsed !== null;
    } catch { /* not JSON */ }

    return { ok: true, latencyMs, modelUsed: result.model, supportsToolCalling };
  } catch (e) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - start),
      modelUsed: profile.selectedModel,
      supportsToolCalling: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
