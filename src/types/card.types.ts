/**
 * SillyTavern Character Card V3 — Schema chính xác theo spec Phần 3.1
 * Mọi file .json xuất ra phải khớp 100% các interface này.
 */

import type { Lorebook } from './lorebook.types';
import type { RegexScript } from './regex.types';
import type { TavernHelperExtension } from './tavernHelper.types';
import type { MVUZODConfig } from './mvuzod.types';

export interface CharacterCardV3 {
  spec: 'chara_card_v3';
  spec_version: '3.0';
  data: CharacterData;
  // Mirror fields — PHẢI đồng bộ với data.* khi lưu/export (hàm syncMirrorFields)
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creatorcomment: string;
  avatar: string;           // "none" hoặc tên file ảnh
  talkativeness: string;    // LƯU Ý: STRING "0.5", không phải number
  fav: boolean;
  tags: string[];
  create_date: string;      // ISO 8601
}

export interface CharacterData {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes: string;
  system_prompt: string;
  post_history_instructions: string;
  tags: string[];
  creator: string;
  character_version: string;
  alternate_greetings: string[];
  extensions: CardExtensions;
  character_book?: Lorebook;
}

export interface CardExtensions {
  talkativeness: string;           // STRING "0"..."1"
  fav: boolean;
  world: string;
  depth_prompt: DepthPrompt;
  tavern_helper: TavernHelperExtension;
  regex_scripts: RegexScript[];
  mvuzod?: MVUZODConfig;           // MVUZOD config — Phần 3B
}

export interface DepthPrompt {
  prompt: string;
  depth: number;            // mặc định 4
  role: 'system' | 'user' | 'assistant';
}
