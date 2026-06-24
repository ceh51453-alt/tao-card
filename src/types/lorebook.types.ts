/**
 * Lorebook / World Info types — spec Phần 3.2, 3.6
 */

export interface Lorebook {
  name: string;
  entries: LorebookEntry[];
}

export interface LorebookEntry {
  id: number;
  keys: string[];
  secondary_keys: string[];
  comment: string;
  content: string;
  constant: boolean;
  selective: boolean;
  insertion_order: number;
  enabled: boolean;
  position: 'before_char' | 'after_char';
  use_regex: boolean;
  extensions: LorebookEntryExt;
}

export interface LorebookEntryExt {
  position: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  exclude_recursion: boolean;
  display_index: number;
  probability: number;
  useProbability: boolean;
  depth: number;
  selectiveLogic: 0 | 1 | 2 | 3;
  outlet_name: string;
  group: string;
  group_override: boolean;
  group_weight: number;
  prevent_recursion: boolean;
  delay_until_recursion: boolean;
  scan_depth: number | null;
  match_whole_words: boolean | null;
  use_group_scoring: boolean;
  case_sensitive: boolean | null;
  automation_id: string;
  role: 0 | 1 | 2 | null;
  vectorized: boolean;
  sticky: number;
  cooldown: number;
  delay: number;
  match_persona_description: boolean;
  match_character_description: boolean;
  match_character_personality: boolean;
  match_character_depth_prompt: boolean;
  match_scenario: boolean;
  match_creator_notes: boolean;
  triggers: string[];
  ignore_budget: boolean;
}

export const DEFAULT_ENTRY_EXT: LorebookEntryExt = {
  position: 0,
  exclude_recursion: true,
  display_index: 0,
  probability: 100,
  useProbability: true,
  depth: 4,
  selectiveLogic: 0,
  outlet_name: '',
  group: '',
  group_override: false,
  group_weight: 100,
  prevent_recursion: true,
  delay_until_recursion: false,
  scan_depth: 2,             // guide: khuyến nghị 2 (quét 1 tin user + 1 tin AI)
  match_whole_words: null,
  use_group_scoring: false,
  case_sensitive: null,
  automation_id: '',
  role: null,
  vectorized: false,
  sticky: 0,
  cooldown: 0,
  delay: 0,
  match_persona_description: false,
  match_character_description: false,
  match_character_personality: false,
  match_character_depth_prompt: false,
  match_scenario: false,
  match_creator_notes: false,
  triggers: [],
  ignore_budget: false,
};

// Standalone lorebook file format (export/import riêng) — Phần 3.6
export interface StandaloneLorebookFile {
  entries: Record<string, StandaloneEntry>;   // key: "0","1","2"...
}

export interface StandaloneEntry {
  uid: number;
  key: string[];
  keysecondary: string[];
  comment: string;
  content: string;
  constant: boolean;
  vectorized: boolean;
  selective: boolean;
  selectiveLogic: number;
  addMemo: boolean;
  order: number;
  position: number;        // 0-7 trực tiếp
  disable: boolean;        // = !enabled
  ignoreBudget: boolean;
  excludeRecursion: boolean;
  preventRecursion: boolean;
  matchPersonaDescription: boolean;
  matchCharacterDescription: boolean;
  matchCharacterPersonality: boolean;
  matchCharacterDepthPrompt: boolean;
  matchScenario: boolean;
  matchCreatorNotes: boolean;
  delayUntilRecursion: boolean;
  probability: number;
  useProbability: boolean;
  depth: number;
  outletName: string;
  group: string;
  groupOverride: boolean;
  groupWeight: number;
  scanDepth: number | null;
  caseSensitive: boolean | null;
  matchWholeWords: boolean | null;
  useGroupScoring: boolean | null;
  automationId: string;
  role: number | null;
  sticky: number;
  cooldown: number;
  delay: number;
  triggers: string[];
  displayIndex: number;
  characterFilter: { isExclude: boolean; names: string[]; tags: string[] };
}
