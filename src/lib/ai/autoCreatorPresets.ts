/**
 * autoCreatorPresets.ts — Template presets cho Auto Creator
 * v3: Khởi điểm nhanh cho các thể loại phổ biến
 */

import type { AutoCreatorPreset } from '../../types/autoCreator.types';

export const AUTO_CREATOR_PRESETS: AutoCreatorPreset[] = [
  {
    id: 'romance_simple',
    label: '💕 Romance đơn giản',
    icon: '💕',
    description: 'Card nhân vật romance cơ bản, ít lorebook, không MVUZOD',
    config: {
      selectedSteps: ['basic_info', 'lorebook', 'system_prompt', 'first_message', 'mes_example'],
      stepConfigs: {
        basic_info: { includePersonality: true, includeScenario: true, language: 'vi', promptMode: 'default' },
        lorebook: { totalEntries: 10, entriesPerBatch: 5, concurrentBatches: 1, category: 'custom', cardType: 'single', useWebSearch: false, promptMode: 'default' },
        regex: { count: 2, types: ['dialog', 'style'], promptMode: 'default' },
        mvuzod: { autoDetect: false, createInitVar: false, createVarList: false, createUpdateRules: false, promptMode: 'default' },
        system_prompt: { includeDepthPrompt: true, depthValue: 4, promptMode: 'default' },
        first_message: { alternateGreetings: 2, promptMode: 'default' },
        mes_example: { exampleCount: 2, promptMode: 'default' },
      },
    },
  },
  {
    id: 'rpg_complex',
    label: '⚔️ RPG phức tạp',
    icon: '⚔️',
    description: 'Card RPG đầy đủ: lorebook lớn, MVUZOD schema, regex game UI',
    config: {
      selectedSteps: ['basic_info', 'lorebook', 'regex', 'mvuzod', 'system_prompt', 'first_message', 'mes_example'],
      stepConfigs: {
        basic_info: { includePersonality: true, includeScenario: true, language: 'vi', promptMode: 'default' },
        lorebook: { totalEntries: 40, entriesPerBatch: 5, concurrentBatches: 2, category: 'custom', cardType: 'single', useWebSearch: false, promptMode: 'default' },
        regex: { count: 5, types: ['dialog', 'cleanup', 'style'], promptMode: 'default' },
        mvuzod: { autoDetect: true, createInitVar: true, createVarList: true, createUpdateRules: true, promptMode: 'default' },
        system_prompt: { includeDepthPrompt: true, depthValue: 4, promptMode: 'default' },
        first_message: { alternateGreetings: 3, promptMode: 'default' },
        mes_example: { exampleCount: 3, promptMode: 'default' },
      },
    },
  },
  {
    id: 'slice_of_life',
    label: '🏡 Slice of Life',
    icon: '🏡',
    description: 'Cuộc sống thường nhật, trọng tâm tính cách và tương tác',
    config: {
      selectedSteps: ['basic_info', 'lorebook', 'system_prompt', 'first_message', 'mes_example'],
      stepConfigs: {
        basic_info: { includePersonality: true, includeScenario: true, language: 'vi', promptMode: 'default' },
        lorebook: { totalEntries: 15, entriesPerBatch: 5, concurrentBatches: 1, category: 'custom', cardType: 'single', useWebSearch: false, promptMode: 'default' },
        regex: { count: 2, types: ['dialog', 'style'], promptMode: 'default' },
        mvuzod: { autoDetect: true, createInitVar: true, createVarList: true, createUpdateRules: true, promptMode: 'default' },
        system_prompt: { includeDepthPrompt: true, depthValue: 4, promptMode: 'default' },
        first_message: { alternateGreetings: 2, promptMode: 'default' },
        mes_example: { exampleCount: 2, promptMode: 'default' },
      },
    },
  },
  {
    id: 'wuxia_xianxia',
    label: '🐉 Tiên hiệp / Wuxia',
    icon: '🐉',
    description: 'Thế giới tu tiên đầy đủ: hệ thống cảnh giới, môn phái, biến trạng thái',
    config: {
      selectedSteps: ['basic_info', 'lorebook', 'regex', 'mvuzod', 'system_prompt', 'first_message', 'mes_example'],
      stepConfigs: {
        basic_info: { includePersonality: true, includeScenario: true, language: 'vi', promptMode: 'default' },
        lorebook: { totalEntries: 50, entriesPerBatch: 5, concurrentBatches: 2, category: 'custom', cardType: 'single', useWebSearch: false, promptMode: 'default' },
        regex: { count: 5, types: ['dialog', 'cleanup', 'style'], promptMode: 'default' },
        mvuzod: { autoDetect: true, createInitVar: true, createVarList: true, createUpdateRules: true, promptMode: 'default' },
        system_prompt: { includeDepthPrompt: true, depthValue: 4, promptMode: 'default' },
        first_message: { alternateGreetings: 2, promptMode: 'default' },
        mes_example: { exampleCount: 3, promptMode: 'default' },
      },
    },
  },
  {
    id: 'multi_char',
    label: '👥 Nhiều nhân vật',
    icon: '👥',
    description: 'Card group chat / nhiều NV: selective entries, lorebook lớn',
    config: {
      selectedSteps: ['basic_info', 'lorebook', 'regex', 'system_prompt', 'first_message', 'mes_example'],
      stepConfigs: {
        basic_info: { includePersonality: true, includeScenario: true, language: 'vi', promptMode: 'default' },
        lorebook: { totalEntries: 30, entriesPerBatch: 5, concurrentBatches: 2, category: 'custom', cardType: 'multi', useWebSearch: false, promptMode: 'default' },
        regex: { count: 3, types: ['dialog', 'cleanup'], promptMode: 'default' },
        mvuzod: { autoDetect: false, createInitVar: false, createVarList: false, createUpdateRules: false, promptMode: 'default' },
        system_prompt: { includeDepthPrompt: true, depthValue: 4, promptMode: 'default' },
        first_message: { alternateGreetings: 3, promptMode: 'default' },
        mes_example: { exampleCount: 3, promptMode: 'default' },
      },
    },
  },
];
