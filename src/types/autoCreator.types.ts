import type { EntryCategory, CardType } from '../lib/worldbook/worldbookConfig';

// ═══ Các bước pipeline ═══
export type AutoCreatorStep =
  | 'basic_info'        // Name, Description, Personality, Scenario
  | 'lorebook'          // Lorebook entries
  | 'regex'             // Regex scripts
  | 'mvuzod'            // MVUZOD schema + system entries
  | 'system_prompt'     // System prompt + Depth prompt
  | 'first_message'     // First message + alternate greetings
  | 'mes_example';      // Message examples

export type StepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

/** v3: Mỗi bước có 3 phase: generate → preview → apply */
export type StepPhase = 'idle' | 'generating' | 'previewing' | 'applied' | 'error';

// ═══ Prompt override ═══
export type PromptMode = 'default' | 'append' | 'replace';

// ═══ Config từng bước (user tùy chỉnh) ═══
export interface LorebookStepConfig {
  totalEntries: number;        // Tổng số entry muốn tạo (5-100, default 20)
  entriesPerBatch: number;     // Entries mỗi batch (1-10, default 5)
  concurrentBatches: number;   // Batch song song (1-5, default 1)
  category: EntryCategory;     // Loại entry
  cardType: CardType;          // Thẻ đơn/nhiều NV
  useWebSearch: boolean;       // Có dùng web search không
  promptOverride?: string;
  promptMode: PromptMode;
}

export interface RegexStepConfig {
  count: number;               // Số regex scripts (1-10, default 3)
  types: string[];             // Loại regex muốn tạo
  promptOverride?: string;
  promptMode: PromptMode;
}

export interface MvuzodStepConfig {
  autoDetect: boolean;         // Tự phân tích lorebook → schema
  createInitVar: boolean;      // Tạo entry [initvar]
  createVarList: boolean;      // Tạo entry biến list
  createUpdateRules: boolean;  // Tạo entry update rules
  promptOverride?: string;
  promptMode: PromptMode;
}

export interface BasicInfoStepConfig {
  includePersonality: boolean; // default true
  includeScenario: boolean;    // default true
  language: 'vi' | 'en' | 'zh' | 'ja'; // Ngôn ngữ content
  promptOverride?: string;
  promptMode: PromptMode;
}

export interface SystemPromptStepConfig {
  includeDepthPrompt: boolean; // default true
  depthValue: number;          // default 4
  promptOverride?: string;
  promptMode: PromptMode;
}

export interface FirstMessageStepConfig {
  alternateGreetings: number;  // Số alternate greetings (0-5, default 2)
  promptOverride?: string;
  promptMode: PromptMode;
}

export interface MesExampleStepConfig {
  exampleCount: number;        // Số ví dụ hội thoại (1-5, default 2)
  promptOverride?: string;
  promptMode: PromptMode;
}

// ═══ Config tổng thể ═══
export interface AutoCreatorConfig {
  idea: string;                          // Ý tưởng chính
  selectedSteps: AutoCreatorStep[];      // Các bước đã bật (có thứ tự)
  autoApplyAll: boolean;                 // true = apply ngay, false = dừng ở preview
  presetId?: string;                     // Preset đang dùng
  stepConfigs: {
    basic_info: BasicInfoStepConfig;
    lorebook: LorebookStepConfig;
    regex: RegexStepConfig;
    mvuzod: MvuzodStepConfig;
    system_prompt: SystemPromptStepConfig;
    first_message: FirstMessageStepConfig;
    mes_example: MesExampleStepConfig;
  };
}

// ═══ Step Preview (v3) ═══
export interface StepPreview {
  rawOutput: string;           // JSON thô từ AI
  parsedData: unknown;         // Đã parse
  editedData?: unknown;        // User đã chỉnh sửa (nếu có)
  tokenEstimate?: number;      // Ước lượng token
}

// ═══ Card Blueprint (Phase 0) ═══
export interface CardBlueprint {
  characterProfile: {
    name: string;
    origin: string;
    appearance: string;
    personality: string;
    abilities: string[];
    relationships: string[];
  };
  worldStructure: {
    genre: string;
    setting: string;
    systems: string[];         // ma thuật, RPG, chiến đấu...
    factions: string[];
  };
  suggestedEntryTopics: BlueprintEntryTopic[];
  suggestedVariables: BlueprintVariable[];
  toneAndStyle: {
    narrativeVoice: string;    // ngôi kể
    language: string;
    mood: string;
  };
  estimatedComplexity: 'simple' | 'medium' | 'complex';
}

export interface BlueprintEntryTopic {
  category: 'worldview' | 'character' | 'npc' | 'location' | 'system' | 'event';
  title: string;
  description: string;
  priority: number;            // 1-10
  suggestedPosition: number;   // SillyTavern position
  suggestedConstant: boolean;
}

export interface BlueprintVariable {
  path: string;                // e.g. "/角色/HP"
  type: 'number' | 'string' | 'boolean';
  defaultValue: unknown;
  description: string;
  group: string;               // e.g. "角色", "世界"
}

// ═══ Preset ═══
export interface AutoCreatorPreset {
  id: string;
  label: string;
  icon: string;
  description: string;
  config: Partial<AutoCreatorConfig>;
}

// ═══ Log entry ═══
export interface PipelineLog {
  id: string;
  timestamp: number;
  step: AutoCreatorStep | 'system' | 'blueprint';
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}
