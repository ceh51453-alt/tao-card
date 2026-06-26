/**
 * Game UI Defaults & Presets — Giá trị mặc định, preset themes, danh sách fonts
 * Dùng bởi GameUIConfigPanel để khởi tạo config và chọn preset nhanh.
 */

import type {
  GameUIConfig,
  ColorSchemeConfig,
  ColorPreset,
  CharacterImage,
  TabItem,
} from '../../types/gameUiConfig.types';
import { v4 as uuidv4 } from 'uuid';

// ═══════════════════════════════════════════════════════════════════════════
// POPULAR FONTS
// ═══════════════════════════════════════════════════════════════════════════

export interface FontOption {
  name: string;
  category: 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting';
  preview: string;  // Google Fonts CSS import URL fragment
}

export const POPULAR_FONTS: FontOption[] = [
  // Sans-serif
  { name: 'Noto Sans TC', category: 'sans-serif', preview: 'Noto+Sans+TC' },
  { name: 'Inter', category: 'sans-serif', preview: 'Inter' },
  { name: 'Roboto', category: 'sans-serif', preview: 'Roboto' },
  { name: 'Open Sans', category: 'sans-serif', preview: 'Open+Sans' },
  { name: 'Lato', category: 'sans-serif', preview: 'Lato' },
  { name: 'Outfit', category: 'sans-serif', preview: 'Outfit' },
  { name: 'M PLUS Rounded 1c', category: 'sans-serif', preview: 'M+PLUS+Rounded+1c' },
  // Serif
  { name: 'Noto Serif SC', category: 'serif', preview: 'Noto+Serif+SC' },
  { name: 'Noto Serif TC', category: 'serif', preview: 'Noto+Serif+TC' },
  { name: 'Playfair Display', category: 'serif', preview: 'Playfair+Display' },
  { name: 'Lora', category: 'serif', preview: 'Lora' },
  { name: 'Merriweather', category: 'serif', preview: 'Merriweather' },
  { name: 'Cinzel', category: 'serif', preview: 'Cinzel' },
  { name: 'EB Garamond', category: 'serif', preview: 'EB+Garamond' },
  // Display
  { name: 'Orbitron', category: 'display', preview: 'Orbitron' },
  { name: 'Rajdhani', category: 'display', preview: 'Rajdhani' },
  { name: 'Press Start 2P', category: 'display', preview: 'Press+Start+2P' },
  { name: 'Silkscreen', category: 'display', preview: 'Silkscreen' },
  // Monospace
  { name: 'JetBrains Mono', category: 'monospace', preview: 'JetBrains+Mono' },
  { name: 'Fira Code', category: 'monospace', preview: 'Fira+Code' },
];

// ═══════════════════════════════════════════════════════════════════════════
// COLOR PRESETS
// ═══════════════════════════════════════════════════════════════════════════

export const COLOR_PRESETS: Record<ColorPreset, Omit<ColorSchemeConfig, 'preset'>> = {
  dark: {
    primaryColor: '#818cf8',
    secondaryColor: '#64748b',
    accentColor: '#f59e0b',
    backgroundColor: '#0f172a',
    surfaceColor: '#1e293b',
    borderColor: '#334155',
  },
  cyberpunk: {
    primaryColor: '#06b6d4',
    secondaryColor: '#8b5cf6',
    accentColor: '#f43f5e',
    backgroundColor: '#0a0a1a',
    surfaceColor: '#141428',
    borderColor: '#1e1e3f',
  },
  fantasy: {
    primaryColor: '#d4a574',
    secondaryColor: '#8b6914',
    accentColor: '#c084fc',
    backgroundColor: '#1a1209',
    surfaceColor: '#2d1f0e',
    borderColor: '#4a3520',
  },
  pastel: {
    primaryColor: '#f9a8d4',
    secondaryColor: '#93c5fd',
    accentColor: '#a5f3fc',
    backgroundColor: '#1a1625',
    surfaceColor: '#251f35',
    borderColor: '#3b3255',
  },
  monochrome: {
    primaryColor: '#e2e8f0',
    secondaryColor: '#94a3b8',
    accentColor: '#cbd5e1',
    backgroundColor: '#0f0f0f',
    surfaceColor: '#1a1a1a',
    borderColor: '#2a2a2a',
  },
  retro: {
    primaryColor: '#4ade80',
    secondaryColor: '#22c55e',
    accentColor: '#fbbf24',
    backgroundColor: '#0a0f0a',
    surfaceColor: '#0f1a0f',
    borderColor: '#1a2e1a',
  },
  custom: {
    primaryColor: '#818cf8',
    secondaryColor: '#64748b',
    accentColor: '#f59e0b',
    backgroundColor: '#0f172a',
    surfaceColor: '#1e293b',
    borderColor: '#334155',
  },
};

export const PRESET_LABELS: Record<ColorPreset, { label: string; emoji: string }> = {
  dark: { label: 'Dark Classic', emoji: '🌙' },
  cyberpunk: { label: 'Cyberpunk', emoji: '🔮' },
  fantasy: { label: 'Fantasy / Wuxia', emoji: '⚔️' },
  pastel: { label: 'Pastel Dream', emoji: '🌸' },
  monochrome: { label: 'Monochrome', emoji: '⬛' },
  retro: { label: 'Retro Game', emoji: '👾' },
  custom: { label: 'Custom', emoji: '🎨' },
};

// ═══════════════════════════════════════════════════════════════════════════
// IMAGE SIZE MAP
// ═══════════════════════════════════════════════════════════════════════════

export const IMAGE_SIZE_PX: Record<'small' | 'medium' | 'large', number> = {
  small: 40,
  medium: 64,
  large: 96,
};

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT TAB ITEMS
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_TAB_ITEMS: TabItem[] = [
  { id: 'status', label: 'Trạng thái', emoji: '📊', enabled: true },
  { id: 'inventory', label: 'Vật phẩm', emoji: '🎒', enabled: true },
  { id: 'skills', label: 'Kỹ năng', emoji: '⚔️', enabled: false },
  { id: 'quests', label: 'Nhiệm vụ', emoji: '📜', enabled: false },
  { id: 'map', label: 'Bản đồ', emoji: '🗺️', enabled: false },
  { id: 'relationships', label: 'Quan hệ', emoji: '💕', enabled: false },
  { id: 'journal', label: 'Nhật ký', emoji: '📖', enabled: false },
  { id: 'settings', label: 'Cài đặt', emoji: '⚙️', enabled: false },
];

export function createTabItem(label = '', emoji = '📌'): TabItem {
  return { id: uuidv4(), label, emoji, enabled: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT RARITY COLORS
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_RARITY_COLORS = {
  common: '#9ca3af',
  uncommon: '#4ade80',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#fbbf24',
};

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_GAME_UI_CONFIG: GameUIConfig = {
  enabledSections: {
    typography: true,
    images: false,
    layout: true,
    effects: true,
    colorScheme: true,
    textStyling: true,
    tabs: false,
    progressBars: false,
    buttons: false,
    npcCards: false,
    inventory: false,
    notifications: false,
    transitions: false,
    responsive: false,
  },
  typography: {
    fontFamily: 'Noto Sans TC',
    fontSize: 13,
    fontWeight: 'normal',
    headingFont: 'Noto Serif SC',
    lineHeight: 1.6,
    letterSpacing: 0,
  },
  images: {
    characters: [],
    backgroundUrl: '',
    backgroundOpacity: 0.15,
    backgroundBlur: 8,
  },
  layout: {
    maxWidth: 600,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    statusBarPosition: 'top',
    statusBarStyle: 'compact',
    dialogueBoxStyle: 'plain',
  },
  effects: {
    enableAnimations: true,
    animationType: 'fade',
    enableGlow: false,
    glowColor: '#818cf8',
    glowIntensity: 10,
    enableShadow: true,
    enableGradient: true,
    gradientFrom: '#0f172a',
    gradientTo: '#1e1b4b',
    enableGlassmorphism: false,
  },
  colorScheme: {
    preset: 'dark',
    ...COLOR_PRESETS.dark,
  },
  textStyling: {
    dialogueColor: '#fbbf24',
    actionColor: '#a78bfa',
    narrativeColor: '#e2e8f0',
    dialogueStyle: 'normal',
    actionStyle: 'italic',
    showQuoteMarks: true,
    highlightSpeaker: false,
  },
  tabs: {
    enabled: false,
    style: 'underline',
    position: 'top',
    tabs: DEFAULT_TAB_ITEMS,
    activeColor: '#818cf8',
    inactiveColor: '#64748b',
    tabSize: 'medium',
    showIcons: true,
    animated: true,
  },
  progressBars: {
    style: 'linear',
    height: 8,
    borderRadius: 4,
    showLabel: true,
    showValue: false,
    animateOnChange: true,
    barColors: {
      hp: '#ef4444',
      mp: '#3b82f6',
      exp: '#eab308',
      stamina: '#22c55e',
      generic: '#818cf8',
    },
    trackColor: '#1e293b',
    stripedEffect: false,
  },
  buttons: {
    shape: 'rounded',
    variant: 'solid',
    size: 'medium',
    hoverEffect: 'lift',
    clickFeedback: 'ripple',
    primaryColor: '#818cf8',
    textColor: '#ffffff',
    showShadow: true,
    iconPosition: 'before',
  },
  npcCards: {
    layout: 'horizontal',
    showAvatar: true,
    avatarSize: 48,
    avatarShape: 'circle',
    showRelationship: true,
    relationshipStyle: 'hearts',
    showMood: true,
    moodDisplay: 'emoji',
    showTitle: true,
    cardBackground: 'solid',
    maxCardsPerRow: 2,
  },
  inventory: {
    layout: 'grid',
    gridColumns: 4,
    showQuantity: true,
    showRarity: true,
    rarityColors: { ...DEFAULT_RARITY_COLORS },
    showCategory: true,
    showItemIcon: true,
    itemCardStyle: 'bordered',
    enableDragSort: false,
    showEmptySlots: true,
    emptySlotCount: 0,
  },
  notifications: {
    enabled: true,
    position: 'top-right',
    style: 'floating',
    duration: 3000,
    showForItems: true,
    showForStats: true,
    showForEvents: true,
    accentColor: '#818cf8',
    maxVisible: 3,
  },
  transitions: {
    sceneTransition: 'fade',
    transitionDuration: 400,
    enableTextTypewriter: false,
    typewriterSpeed: 30,
    enableParallax: false,
    enablePageFlip: false,
    contentReveal: 'fade-in',
  },
  responsive: {
    enableMobileOptimize: true,
    mobileBreakpoint: 480,
    mobileFontScale: 0.9,
    compactModeOnMobile: true,
    hideImagesOnMobile: false,
    stackColumnsOnMobile: true,
    touchFriendly: true,
    swipeGestures: false,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export function createDefaultCharacterImage(name = ''): CharacterImage {
  return {
    id: uuidv4(),
    characterName: name,
    imageUrl: '',
    position: 'left',
    shape: 'circle',
    size: 'medium',
    customSizePx: 64,
    zoomable: true,
    showOnHover: false,
    border: true,
    borderColor: '#818cf8',
    usedIn: ['status_bar', 'game_screen'],
  };
}

export function applyColorPreset(preset: ColorPreset): ColorSchemeConfig {
  return {
    preset,
    ...COLOR_PRESETS[preset],
  };
}
