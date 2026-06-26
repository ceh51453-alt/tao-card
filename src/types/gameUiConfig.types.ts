/**
 * Game UI Configuration Types — Cấu trúc tùy chỉnh giao diện cho AI Regex Generator
 * Dùng bởi GameUIConfigPanel và gameRegexPrompt để truyền config vào prompt AI.
 */

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export type ConfigSection =
  | 'typography' | 'images' | 'layout' | 'effects' | 'colorScheme' | 'textStyling'
  | 'tabs' | 'progressBars' | 'buttons' | 'npcCards' | 'inventory'
  | 'notifications' | 'transitions' | 'responsive'
  | 'theme' | 'retroEffects' | 'audioPlayer' | 'toolbar' | 'readingMode'
  | 'multiPage' | 'collapsibles' | 'currency' | 'badges' | 'cssAdvanced'
  | 'eventPopup' | 'dataTable' | 'formElements';

export interface GameUIConfig {
  enabledSections: Record<ConfigSection, boolean>;
  typography: TypographyConfig;
  images: ImageConfig;
  layout: LayoutConfig;
  effects: EffectsConfig;
  colorScheme: ColorSchemeConfig;
  textStyling: TextStylingConfig;
  tabs: TabSystemConfig;
  progressBars: ProgressBarConfig;
  buttons: ButtonConfig;
  npcCards: NpcCardConfig;
  inventory: InventoryConfig;
  notifications: NotificationConfig;
  transitions: TransitionConfig;
  responsive: ResponsiveConfig;
  theme: ThemeConfig;
  retroEffects: RetroEffectsConfig;
  audioPlayer: AudioPlayerConfig;
  toolbar: ToolbarConfig;
  readingMode: ReadingModeConfig;
  multiPage: MultiPageConfig;
  collapsibles: CollapsibleConfig;
  currency: CurrencyConfig;
  badges: BadgesConfig;
  cssAdvanced: CssAdvancedConfig;
  eventPopup: EventPopupConfig;
  dataTable: DataTableConfig;
  formElements: FormElementsConfig;
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY
// ═══════════════════════════════════════════════════════════════════════════

export interface TypographyConfig {
  fontFamily: string;
  fontSize: number;             // base size px (10-24)
  fontWeight: 'light' | 'normal' | 'medium' | 'bold';
  headingFont: string;
  lineHeight: number;           // 1.0 - 2.5
  letterSpacing: number;        // -1 ~ 3 (px)
}

// ═══════════════════════════════════════════════════════════════════════════
// CHARACTER IMAGES
// ═══════════════════════════════════════════════════════════════════════════

export type ImagePosition = 'left' | 'right' | 'center' | 'background';
export type ImageShape = 'circle' | 'square' | 'rounded' | 'none';
export type ImageSize = 'small' | 'medium' | 'large' | 'custom';
export type GameComponentTarget = 'status_bar' | 'game_screen' | 'opening_form';

export interface CharacterImage {
  id: string;
  characterName: string;
  imageUrl: string;
  position: ImagePosition;
  shape: ImageShape;
  size: ImageSize;
  customSizePx: number;         // used when size = 'custom'
  zoomable: boolean;
  showOnHover: boolean;
  border: boolean;
  borderColor: string;
  usedIn: GameComponentTarget[];
}

export interface ImageConfig {
  characters: CharacterImage[];
  backgroundUrl: string;
  backgroundOpacity: number;    // 0-1
  backgroundBlur: number;       // 0-20 px
}

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT
// ═══════════════════════════════════════════════════════════════════════════

export type StatusBarPosition = 'top' | 'bottom' | 'float';
export type StatusBarStyle = 'compact' | 'detailed' | 'minimal';
export type DialogueBoxStyle = 'bubble' | 'plain' | 'novel' | 'vn';

export interface LayoutConfig {
  maxWidth: number;             // px (300-900)
  borderRadius: number;         // px (0-32)
  padding: number;              // px (4-40)
  gap: number;                  // px (2-24)
  statusBarPosition: StatusBarPosition;
  statusBarStyle: StatusBarStyle;
  dialogueBoxStyle: DialogueBoxStyle;
}

// ═══════════════════════════════════════════════════════════════════════════
// EFFECTS
// ═══════════════════════════════════════════════════════════════════════════

export type AnimationType = 'fade' | 'slide' | 'scale' | 'none';

export interface EffectsConfig {
  enableAnimations: boolean;
  animationType: AnimationType;
  enableGlow: boolean;
  glowColor: string;
  glowIntensity: number;       // 0-30 (px blur)
  enableShadow: boolean;
  enableGradient: boolean;
  gradientFrom: string;
  gradientTo: string;
  enableGlassmorphism: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// COLOR SCHEME
// ═══════════════════════════════════════════════════════════════════════════

export type ColorPreset = 'dark' | 'cyberpunk' | 'fantasy' | 'pastel' | 'monochrome' | 'retro' | 'custom';

export interface ColorSchemeConfig {
  preset: ColorPreset;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  borderColor: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEXT STYLING
// ═══════════════════════════════════════════════════════════════════════════

export interface TextStylingConfig {
  dialogueColor: string;        // màu lời thoại "..."
  actionColor: string;          // màu hành động *...*
  narrativeColor: string;       // màu tường thuật
  dialogueStyle: 'normal' | 'italic' | 'bold';
  actionStyle: 'italic' | 'normal' | 'bold';
  showQuoteMarks: boolean;      // hiển thị dấu ngoặc kép
  highlightSpeaker: boolean;    // highlight tên người nói
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

export type TabStyle = 'underline' | 'pill' | 'card' | 'minimal' | 'vertical';

export interface TabItem {
  id: string;
  label: string;
  emoji: string;                // emoji icon cho tab
  enabled: boolean;
}

export interface TabSystemConfig {
  enabled: boolean;
  style: TabStyle;
  position: 'top' | 'bottom';
  tabs: TabItem[];
  activeColor: string;
  inactiveColor: string;
  tabSize: 'small' | 'medium' | 'large';
  showIcons: boolean;
  animated: boolean;             // tab switch animation
}

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS BARS
// ═══════════════════════════════════════════════════════════════════════════

export type BarStyle = 'linear' | 'circular' | 'segmented' | 'gradient';

export interface ProgressBarConfig {
  style: BarStyle;
  height: number;               // px (4-24)
  borderRadius: number;         // px (0-12)
  showLabel: boolean;           // hiện % hoặc giá trị
  showValue: boolean;           // hiện X/Max
  animateOnChange: boolean;
  barColors: {
    hp: string;
    mp: string;
    exp: string;
    stamina: string;
    generic: string;
  };
  trackColor: string;           // background của bar
  stripedEffect: boolean;       // hiệu ứng sọc
}

// ═══════════════════════════════════════════════════════════════════════════
// BUTTONS
// ═══════════════════════════════════════════════════════════════════════════

export type ButtonShape = 'rounded' | 'pill' | 'sharp' | 'circle';
export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'gradient';

export interface ButtonConfig {
  shape: ButtonShape;
  variant: ButtonVariant;
  size: 'small' | 'medium' | 'large';
  hoverEffect: 'lift' | 'glow' | 'scale' | 'color' | 'none';
  clickFeedback: 'ripple' | 'pulse' | 'shrink' | 'none';
  primaryColor: string;
  textColor: string;
  showShadow: boolean;
  iconPosition: 'before' | 'after' | 'none';
}

// ═══════════════════════════════════════════════════════════════════════════
// NPC / CHARACTER CARDS
// ═══════════════════════════════════════════════════════════════════════════

export type NpcCardLayout = 'horizontal' | 'vertical' | 'mini' | 'portrait';
export type MoodDisplay = 'emoji' | 'bar' | 'text' | 'color' | 'none';

export interface NpcCardConfig {
  layout: NpcCardLayout;
  showAvatar: boolean;
  avatarSize: number;           // px (32-128)
  avatarShape: ImageShape;
  showRelationship: boolean;
  relationshipStyle: 'hearts' | 'bar' | 'number' | 'stars';
  showMood: boolean;
  moodDisplay: MoodDisplay;
  showTitle: boolean;           // chức danh / tên gọi
  cardBackground: 'solid' | 'gradient' | 'transparent';
  maxCardsPerRow: number;       // 1-4
}

// ═══════════════════════════════════════════════════════════════════════════
// INVENTORY DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

export type InventoryLayout = 'grid' | 'list' | 'compact' | 'detailed';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface InventoryConfig {
  layout: InventoryLayout;
  gridColumns: number;          // 2-6
  showQuantity: boolean;
  showRarity: boolean;
  rarityColors: Record<ItemRarity, string>;
  showCategory: boolean;
  showItemIcon: boolean;
  itemCardStyle: 'flat' | 'raised' | 'bordered' | 'glass';
  enableDragSort: boolean;
  showEmptySlots: boolean;
  emptySlotCount: number;       // 0 = auto
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS / TOASTS
// ═══════════════════════════════════════════════════════════════════════════

export type ToastPosition = 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center';
export type ToastStyle = 'minimal' | 'card' | 'banner' | 'floating';

export interface NotificationConfig {
  enabled: boolean;
  position: ToastPosition;
  style: ToastStyle;
  duration: number;             // ms (1000-10000)
  showForItems: boolean;        // thông báo khi nhận vật phẩm
  showForStats: boolean;        // thông báo khi stat thay đổi
  showForEvents: boolean;       // thông báo sự kiện
  accentColor: string;
  maxVisible: number;           // 1-5
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════

export type SceneTransition = 'fade' | 'slide-left' | 'slide-up' | 'zoom' | 'flip' | 'blur' | 'none';

export interface TransitionConfig {
  sceneTransition: SceneTransition;
  transitionDuration: number;   // ms (200-1500)
  enableTextTypewriter: boolean;
  typewriterSpeed: number;      // ms per char (10-100)
  enableParallax: boolean;      // parallax scrolling on bg
  enablePageFlip: boolean;      // page flip effect cho novel style
  contentReveal: 'instant' | 'fade-in' | 'slide-up' | 'cascade';  // how new content appears
}

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSIVE / MOBILE
// ═══════════════════════════════════════════════════════════════════════════

export interface ResponsiveConfig {
  enableMobileOptimize: boolean;
  mobileBreakpoint: number;     // px (320-768)
  mobileFontScale: number;      // 0.7-1.3
  compactModeOnMobile: boolean;
  hideImagesOnMobile: boolean;
  stackColumnsOnMobile: boolean;
  touchFriendly: boolean;       // larger tap targets
  swipeGestures: boolean;       // swipe tabs, inventory
}

// ═══════════════════════════════════════════════════════════════════════════
// THEME / DARK-LIGHT MODE
// ═══════════════════════════════════════════════════════════════════════════

export interface ThemeConfig {
  enableDualTheme: boolean;
  defaultTheme: 'dark' | 'light';
  autoDetect: boolean;             // theo system preference
  lightBg: string;
  lightText: string;
  lightAccent: string;
  lightSurface: string;
  enableEyeCare: boolean;
  eyeCareStrength: number;         // 0-100 (sepia %)
}

// ═══════════════════════════════════════════════════════════════════════════
// RETRO / SPECIAL EFFECTS
// ═══════════════════════════════════════════════════════════════════════════

export interface RetroEffectsConfig {
  enableScanlines: boolean;
  scanlineOpacity: number;         // 0-0.15
  scanlineGap: number;             // px (2-8)
  enableCrtVignette: boolean;
  crtIntensity: number;            // 0-100
  enableNoiseTexture: boolean;
  noiseOpacity: number;            // 0-0.1
  enableTerminalStyle: boolean;    // monospace + green-on-black
  customOverlayUrl: string;
  overlayBlendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO / MUSIC PLAYER
// ═══════════════════════════════════════════════════════════════════════════

export type PlayerStyle = 'mini' | 'full' | 'floating';
export type PlayerPosition = 'bottom' | 'top' | 'floating-br' | 'floating-bl';

export interface AudioPlayerConfig {
  enabled: boolean;
  playerStyle: PlayerStyle;
  position: PlayerPosition;
  defaultTrackUrl: string;
  trackLabel: string;
  autoPlay: boolean;
  showVolume: boolean;
  showSeek: boolean;
  loop: boolean;
  playerBg: string;
  playerAccent: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOLBAR / ACTION BAR
// ═══════════════════════════════════════════════════════════════════════════

export type ToolbarPosition = 'bottom-fixed' | 'top-fixed' | 'floating-br' | 'floating-bl';
export type ToolbarStyle = 'pill' | 'flat' | 'glass' | 'minimal';

export interface ToolbarButton {
  id: string;
  emoji: string;
  label: string;
  action: 'scroll-top' | 'fullscreen' | 'theme-toggle' | 'font-size' | 'custom';
  enabled: boolean;
}

export interface ToolbarConfig {
  enabled: boolean;
  position: ToolbarPosition;
  style: ToolbarStyle;
  buttons: ToolbarButton[];
  showLabels: boolean;
  compact: boolean;                // chỉ icon
  bgColor: string;
  textColor: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// READING / FULLSCREEN MODE
// ═══════════════════════════════════════════════════════════════════════════

export interface ReadingModeConfig {
  enableFullscreen: boolean;
  enableFontSizeControl: boolean;  // user tự chỉnh
  fontSizeMin: number;             // px (10-16)
  fontSizeMax: number;             // px (18-32)
  enableLineWidthControl: boolean;
  showScrollToTop: boolean;
  showChapterNav: boolean;
  readingBg: string;               // bg riêng cho reading mode
}

// ═══════════════════════════════════════════════════════════════════════════
// MULTI-PAGE / WIZARD
// ═══════════════════════════════════════════════════════════════════════════

export type PageNavStyle = 'dots' | 'arrows' | 'sidebar' | 'tabs';

export interface PageItem {
  id: string;
  label: string;
  emoji: string;
  enabled: boolean;
}

export interface MultiPageConfig {
  enabled: boolean;
  pages: PageItem[];
  navStyle: PageNavStyle;
  pageTransition: SceneTransition;
  showPageCounter: boolean;        // 1/5
  allowDirectJump: boolean;
  navPosition: 'top' | 'bottom' | 'both';
}

// ═══════════════════════════════════════════════════════════════════════════
// COLLAPSIBLE SECTIONS
// ═══════════════════════════════════════════════════════════════════════════

export type CollapseIcon = 'arrow' | 'plus-minus' | 'chevron' | 'none';
export type CollapseAnimation = 'slide' | 'fade' | 'none';

export interface CollapsibleConfig {
  defaultState: 'open' | 'closed';
  iconStyle: CollapseIcon;
  animation: CollapseAnimation;
  enableNested: boolean;
  borderStyle: 'solid' | 'dashed' | 'none' | 'accent';
  headerStyle: 'bold' | 'accent-bg' | 'underline' | 'plain';
  borderRadius: number;            // px (0-16)
}

// ═══════════════════════════════════════════════════════════════════════════
// CURRENCY / ECONOMY
// ═══════════════════════════════════════════════════════════════════════════

export interface CurrencyItem {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export interface CurrencyConfig {
  currencies: CurrencyItem[];
  displayStyle: 'inline' | 'badge' | 'row';
  showIcon: boolean;
  animateChange: boolean;
  format: 'full' | 'abbreviated';  // 1500 vs 1.5K
}

// ═══════════════════════════════════════════════════════════════════════════
// BADGES / ACHIEVEMENTS / TITLES
// ═══════════════════════════════════════════════════════════════════════════

export type BadgeShape = 'pill' | 'circle' | 'square' | 'ribbon';
export type BadgePosition = 'inline' | 'floating' | 'header';

export interface BadgesConfig {
  enabled: boolean;
  shape: BadgeShape;
  position: BadgePosition;
  titleDisplay: 'above-name' | 'below-name' | 'badge';
  rarityGlow: boolean;
  maxVisible: number;              // 1-10
  badgeBg: string;
  badgeText: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CSS VARIABLES / ADVANCED
// ═══════════════════════════════════════════════════════════════════════════

export interface CssVariable {
  id: string;
  name: string;                    // e.g. --accent-color
  value: string;
}

export interface CssAdvancedConfig {
  customVariables: CssVariable[];
  additionalFontUrls: string[];    // Google Fonts URLs
  customCssSnippet: string;        // raw CSS
  boxSizingReset: boolean;
  scrollbarStyle: 'default' | 'thin' | 'hidden' | 'custom';
  scrollbarColor: string;
  selectionColor: string;
  selectionBg: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT POPUP
// ═══════════════════════════════════════════════════════════════════════════

export type PopupSeverity = 'info' | 'warning' | 'danger' | 'success' | 'royal';
export type PopupLayout = 'centered' | 'side-icon' | 'full-width' | 'compact';

export interface EventPopupConfig {
  enabled: boolean;
  layout: PopupLayout;
  showIcon: boolean;
  iconPosition: 'top' | 'left';
  showSeverityBadge: boolean;
  defaultSeverity: PopupSeverity;
  showChoices: boolean;            // render lựa chọn bên trong popup
  choiceStyle: 'buttons' | 'cards' | 'list';
  animateEntry: boolean;
  entryAnimation: 'slideDown' | 'fadeIn' | 'scaleUp' | 'none';
  popupBg: string;
  popupBorder: string;
  popupAccent: string;
  borderRadius: number;            // px (0-20)
  showCloseButton: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA TABLE / GRID
// ═══════════════════════════════════════════════════════════════════════════

export type TableStyle = 'striped' | 'bordered' | 'minimal' | 'card';
export type TableDensity = 'compact' | 'normal' | 'spacious';

export interface DataTableConfig {
  enabled: boolean;
  tableStyle: TableStyle;
  density: TableDensity;
  showHeader: boolean;
  stickyHeader: boolean;
  hoverHighlight: boolean;
  alternateRowColor: boolean;
  headerBg: string;
  headerText: string;
  rowBg: string;
  rowAltBg: string;
  borderColor: string;
  borderRadius: number;            // px (0-16)
  maxHeight: number;               // px (0 = auto, 200-600)
  enableSorting: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM ELEMENTS
// ═══════════════════════════════════════════════════════════════════════════

export type FormStyle = 'modern' | 'classic' | 'minimal' | 'parchment';

export interface FormElementsConfig {
  enabled: boolean;
  formStyle: FormStyle;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  inputRadius: number;             // px (0-16)
  inputPadding: number;            // px (4-16)
  focusColor: string;              // focus ring color
  labelStyle: 'above' | 'inline' | 'floating' | 'hidden';
  selectStyle: 'native' | 'custom-dropdown';
  sliderAccent: string;
  sliderTrackBg: string;
  buttonSubmitBg: string;
  buttonSubmitText: string;
  buttonCancelBg: string;
  buttonCancelText: string;
  fieldsetBorder: boolean;
  fieldGap: number;                // px (4-20)
}
