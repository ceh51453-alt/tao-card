/**
 * Settings types — spec Phần 5
 */

export interface WorldbuildingStep {
  id: string;
  name: string;
  prompt: string;
  enabled: boolean;
  singleton?: boolean; // true = run once on the entire document (no chunking)
}

export interface ProxyProfile {
  id: string;
  label: string;
  providerType: 'openai' | 'claude' | 'gemini' | 'custom';
  baseUrl: string;
  apiKey: string;
  customHeaders: { key: string; value: string }[];
  selectedModel: string;
  cachedModels: ModelInfo[];
  cachedModelsAt: number | null;
  supportsNativeToolCalling: boolean | null;
  
  // Dual-model & concurrency options (inspired by Tawa Translate Tool)
  enableSecondaryModel?: boolean;
  secondaryModel?: string;
  primaryRpm?: number;
  secondaryRpm?: number;
  mixMode?: boolean;
  superMix?: boolean;
  enableCompletenessProtocol?: boolean;

  // Phase 3 Pipeline & Memory properties
  steps?: WorldbuildingStep[];
  masterInstruction?: string;
  aiPipelineMemory?: string;
  semanticDedup?: boolean;

  // SOTA Dual-Layer Web Search
  enableGoogleSearchGrounding?: boolean; // Native Gemini Google Search
  enableWebScraperFallback?: boolean; // Cascade DDG -> Wiki -> Baidu
  webSearchProxyUrl?: string; // e.g. https://corsproxy.io/?
}

export interface ModelInfo {
  id: string;
  ownedBy?: string;
}

export interface GenerationParams {
  max_tokens: number;           // mặc định 4096
  temperature: number;          // 0-2, mặc định 1
  top_p: number;                // mặc định 1
  top_k: number;                // mặc định 0
  top_a: number;                // mặc định 0
  min_p: number;                // mặc định 0
  frequency_penalty: number;    // -2..2, mặc định 0
  presence_penalty: number;     // -2..2, mặc định 0
  repetition_penalty: number;   // mặc định 1
  seed: number;                 // -1 = random
  stop: string[];
  stream: boolean;              // mặc định false
  context_size: number;         // mặc định 32000
  reasoning_effort: 'low' | 'medium' | 'high' | 'auto';
  useJsonResponseFormat: boolean;
  minTokens?: number;           // target length constraint
}

export const DEFAULT_GENERATION_PARAMS: GenerationParams = {
  max_tokens: 4096,
  temperature: 1,
  top_p: 1,
  top_k: 0,
  top_a: 0,
  min_p: 0,
  frequency_penalty: 0,
  presence_penalty: 0,
  repetition_penalty: 1,
  seed: -1,
  stop: [],
  stream: false,
  context_size: 32000,
  reasoning_effort: 'auto',
  useJsonResponseFormat: false,
  minTokens: 2000,
};
