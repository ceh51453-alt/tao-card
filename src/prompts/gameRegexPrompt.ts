/**
 * src/prompts/gameRegexPrompt.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Prompt chuyên dụng để AI sinh Regex Scripts cho Game UI trong SillyTavern.
 * Dùng bởi GameFrontendPreview component khi user chọn "Tạo Regex Scripts".
 *
 * Reuses kiến thức từ:
 * - modeRegex.ts: RegexScript interface, Pattern Library
 * - modeGameDev.ts: Game component patterns
 */

import type { MVUZODSchema, MVUZODField } from '../types/mvuzod.types';
import type { RegexScript } from '../types';
import type { GameUIConfig } from '../types/gameUiConfig.types';
import { IMAGE_SIZE_PX } from '../lib/mvuzod/gameUiDefaults';

// ─── SYSTEM PROMPT ──────────────────────────────────────────────────────────

export const GAME_REGEX_SYSTEM_PROMPT = `
Bạn là chuyên gia tạo Regex Scripts cho SillyTavern, chuyên về Game UI rendering.
Nhiệm vụ: sinh ra một mảng RegexScript[] để render giao diện game đẹp trong chat.

=== SCHEMA REGEX SCRIPT ===

interface RegexScript {
  scriptName: string;     // tên hiển thị — bắt đầu bằng prefix [Game] hoặc [Render] hoặc [AI]
  findRegex: string;      // pattern dạng "/regex/flags" hoặc plain literal
  replaceString: string;  // HTML thay thế; hỗ trợ $1-$9, {{char}}, {{user}}
  trimStrings: string[];  // mảng chuỗi cần trim
  placement: number[];    // [2] = AI Output (dùng hầu hết)
  disabled: boolean;      // false
  markdownOnly: boolean;  // true = chỉ renderer, AI vẫn thấy tag gốc
  promptOnly: boolean;    // true = chỉ ảnh hưởng context gửi AI
  runOnEdit: boolean;
  substituteRegex: 0|1|2; // 0=None, 1=Raw (thay {{char}}), 2=Escaped
  minDepth: number|null;
  maxDepth: number|null;
}

KHÔNG cần field "id" — app sẽ tự sinh UUID.

=== PLACEMENT ===
1 = User Input, 2 = AI Output (dùng 99%), 3 = Slash, 4 = World Info, 5 = Reasoning

=== MARKDOWNONLY vs PROMPTONLY ===
- markdownOnly=true, promptOnly=false → chỉ render UI đẹp, AI vẫn thấy tag gốc
- markdownOnly=false, promptOnly=true → xóa khỏi context AI, user vẫn thấy
- CẢ HAI true → VÔ NGHĨA, KHÔNG dùng

=== QUY TẮC THIẾT KẾ HTML ===

1. **Inline styles only** — KHÔNG dùng external CSS, class riêng
2. **Dark theme** — background tối (#0f172a, #1a202c, #1e293b), text sáng (#e2e8f0, #f1f5f9)
3. **Border-radius** — Bo góc 8-16px
4. **Font** — Dùng font-family: 'Noto Sans TC','Noto Serif SC', system-ui, sans-serif
5. **Responsive** — max-width + margin auto, không hardcode width lớn
6. **Gradient nhẹ** — background linear-gradient cho premium feel
7. **Mobile-friendly** — padding đủ, touch target >= 40px
8. **CSS Scoping** — prefix tất cả id với "stcs-" để tránh xung đột
9. **Emoji** — Dùng emoji làm icon thay vì img/svg

=== PATTERN QUAN TRỌNG ===

**Pattern A — HTML Widget Renderer (phổ biến nhất):**
findRegex: "<StatusPlaceHolderImpl/>"  ← literal tag
markdownOnly: true, promptOnly: false
substituteRegex: 1 (để thay {{char}}/{{user}} trong HTML)
replaceString: HTML đẹp hiển thị game state

**Pattern B — MVUZOD UpdateVariable (cần 3 scripts):**
Script 1: [AI] Ẩn UpdateVariable khỏi context → promptOnly=true, replaceString=""
Script 2: [Render] Cập nhật biến - Hoàn chỉnh → markdownOnly=true, render accordion
Script 3: [Render] Cập nhật biến - Đang stream → markdownOnly=true, render spinner

**Pattern C — Ẩn tags suy luận/thinking:**
markdownOnly=true, replaceString="" → ẩn khỏi mắt user, AI vẫn thấy

=== LƯU Ý ESCAPE ===
- Trong findRegex dạng "/pattern/flags": mỗi \\ trong regex → \\\\ trong JSON string
- Ví dụ: \\s trong regex → "\\\\s" trong JSON
- Tag đóng: </tag> trong regex → "<\\\\/tag>" trong JSON string
- Dùng flag s (dotAll) cho multi-line content: /pattern/gsi

=== ĐỊNH DẠNG OUTPUT BẮT BUỘC ===

Trả về JSON object:
{
  "explanation": "Giải thích ngắn gọn bộ scripts tạo ra",
  "scripts": [
    {
      "scriptName": "...",
      "findRegex": "...",
      "replaceString": "...",
      "trimStrings": [],
      "placement": [2],
      "disabled": false,
      "markdownOnly": true/false,
      "promptOnly": true/false,
      "runOnEdit": false,
      "substituteRegex": 0,
      "minDepth": null,
      "maxDepth": null
    }
  ]
}

CHỈ trả về JSON. KHÔNG markdown, KHÔNG giải thích bên ngoài JSON.
`;

// ─── USER PROMPT BUILDERS ───────────────────────────────────────────────────

type GameComponent = 'status_bar' | 'opening_form' | 'game_screen' | 'full_set' | 'free_form';

/**
 * Build user prompt cho AI, bao gồm schema + existing scripts + custom instructions.
 */
export function buildGameRegexUserPrompt(
  component: GameComponent,
  schema: MVUZODSchema,
  existingRegexScripts: RegexScript[],
  customInstructions?: string,
  uiConfig?: GameUIConfig,
): string {
  const parts: string[] = [];

  // 1. Schema context
  parts.push(`=== MVUZOD SCHEMA CỦA CARD ===\n${formatSchemaForPrompt(schema)}`);

  // 2. Existing scripts context
  if (existingRegexScripts.length > 0) {
    parts.push(`=== REGEX SCRIPTS ĐÃ CÓ (${existingRegexScripts.length} scripts) ===
${existingRegexScripts.map((s, i) => {
  const mode = s.markdownOnly ? 'Render' : s.promptOnly ? 'AI-only' : 'Both';
  const status = s.disabled ? '🔴 TẮT' : '🟢 BẬT';
  return `  [${i}] ${status} "${s.scriptName}" | find=${s.findRegex.slice(0, 60)}${s.findRegex.length > 60 ? '…' : ''} | ${mode} | placement=${s.placement.join(',')}`;
}).join('\n')}

QUAN TRỌNG: KHÔNG tạo lại scripts đã có. Chỉ tạo scripts MỚI bổ sung.
Nếu đã có scripts render <StatusPlaceHolderImpl/>, KHÔNG tạo lại.`);
  }

  // 3. Component-specific instructions
  parts.push(getComponentPrompt(component, schema, customInstructions));

  // 4. UI Config (structured settings)
  if (uiConfig) {
    parts.push(formatConfigForPrompt(uiConfig));
  }

  // 5. Custom instructions from user (skip for free_form — already embedded in step 3)
  if (component !== 'free_form' && customInstructions?.trim()) {
    parts.push(`=== YÊU CẦU BỔ SUNG TỪ NGƯỜI DÙNG ===\n${customInstructions.trim()}`);
  }

  return parts.join('\n\n');
}

// ─── COMPONENT-SPECIFIC PROMPTS ─────────────────────────────────────────────

function getComponentPrompt(component: GameComponent, schema: MVUZODSchema, customInstructions?: string): string {
  switch (component) {
    case 'status_bar':
      return buildStatusBarPrompt(schema);
    case 'opening_form':
      return buildOpeningFormPrompt(schema);
    case 'game_screen':
      return buildGameScreenPrompt(schema);
    case 'full_set':
      return buildFullSetPrompt(schema);
    case 'free_form':
      return buildFreeFormPrompt(schema, customInstructions ?? '');
  }
}

function buildStatusBarPrompt(schema: MVUZODSchema): string {
  const fields = schema.fields.filter(f => !f.constraints?.hidden);
  const numericFields = collectLeafFields(fields).filter(f => f.type === 'number');
  const enumFields = collectLeafFields(fields).filter(f => f.constraints?.enumValues?.length);

  return `=== YÊU CẦU: TẠO REGEX RENDER STATUS BAR ===

Tạo regex script để render tag <StatusPlaceHolderImpl/> thành bảng trạng thái đẹp.

Thông tin schema:
- Tổng ${fields.length} field gốc
- ${numericFields.length} field số (hiển thị dạng progress bar hoặc counter)
- ${enumFields.length} field enum (hiển thị dạng badge/tag)

Các field chính cần hiển thị:
${fields.map(f => `  - ${f.label} (${f.type}${f.children?.length ? `, ${f.children.length} children` : ''})`).join('\n')}

YÊU CẦU:
1. Tạo 1 script: findRegex = "<StatusPlaceHolderImpl/>"
2. replaceString = HTML widget hiển thị các biến game dạng grid/pills
3. markdownOnly=true, placement=[2], substituteRegex=1
4. Dùng TavernHelper EJS để đọc biến: <% const data = Mvu.getMvuData({type:'message',message_id:'latest'})?.stat_data ?? {}; %>
5. Hiển thị progress bar cho field số, badge cho enum, icon cho boolean
6. Design premium, dark theme, responsive`;
}

function buildOpeningFormPrompt(schema: MVUZODSchema): string {
  const editableFields = collectLeafFields(schema.fields)
    .filter(f => !f.constraints?.readOnly && !f.constraints?.hidden)
    .slice(0, 12);

  return `=== YÊU CẦU: TẠO REGEX RENDER OPENING FORM ===

Tạo regex script để render form mở đầu game (Opening Form / 开场表格).
Form này hiển thị ở tin nhắn đầu tiên, cho phép người chơi thiết lập thông số ban đầu.

Các field có thể chỉnh sửa (${editableFields.length} fields):
${editableFields.map(f => {
  const extras: string[] = [];
  if (f.type === 'number' && f.constraints?.clamp) extras.push(`range: ${f.constraints.clamp[0]}~${f.constraints.clamp[1]}`);
  if (f.constraints?.enumValues?.length) extras.push(`options: ${f.constraints.enumValues.join(', ')}`);
  if (f.defaultValue !== undefined) extras.push(`default: ${f.defaultValue}`);
  return `  - ${f.label} (${f.type}${extras.length ? ' | ' + extras.join(' | ') : ''})`;
}).join('\n')}

YÊU CẦU:
1. Tạo 1 script: findRegex render form vào <StatusPlaceHolderImpl/> hoặc tag custom
2. replaceString = HTML form đẹp với input fields tương ứng
3. markdownOnly=true, placement=[2], substituteRegex=1
4. Form có nút Submit → dùng JavaScript gọi setvar() để ghi biến
5. Input type phù hợp: number cho số (có min/max), select cho enum, checkbox cho boolean
6. minDepth=0, maxDepth=0 → chỉ hiển thị ở tin nhắn đầu tiên
7. Design premium: gradient background, smooth inputs, hover effects`;
}

function buildGameScreenPrompt(schema: MVUZODSchema): string {
  const statusFields = schema.fields.filter(f => !f.constraints?.hidden).slice(0, 8);

  return `=== YÊU CẦU: TẠO REGEX RENDER GAME SCREEN ===

Tạo bộ regex scripts để render màn hình game chính. Cần nhiều scripts:

1. **Parse & render <maintext>**: Tách nội dung AI trả về → hiển thị đẹp
2. **Parse & render <option>**: Các lựa chọn → render dạng button đẹp
3. **Status bar compact**: Hiển thị compact ở đầu mỗi tin nhắn
4. **Ẩn các tag khỏi UI**: <thinking>, <logic_check>, tags hệ thống

Các field cần hiển thị trong status compact:
${statusFields.map(f => `  - ${f.label} (${f.type})`).join('\n')}

YÊU CẦU:
1. Script ẩn <thinking> tags: markdownOnly=true, replaceString=""
2. Script render <maintext>: markdownOnly=true, render text đẹp với typography tốt
3. Script render <option>: markdownOnly=true, render buttons có onclick gửi lựa chọn
4. Script status compact: hiển thị pills/badges ở đầu tin nhắn
5. Các script render dùng substituteRegex=1
6. Design cinematic: immersive feel, good typography, subtle animations`;
}

function buildFullSetPrompt(schema: MVUZODSchema): string {
  return `=== YÊU CẦU: TẠO BỘ ĐẦY ĐỦ REGEX SCRIPTS CHO GAME ===

Tạo bộ hoàn chỉnh regex scripts cho game UI, bao gồm TẤT CẢ các loại:

1. **Status Bar Widget**: Render <StatusPlaceHolderImpl/> → bảng trạng thái
2. **UpdateVariable Beautifier** (3 scripts):
   - [AI] Ẩn khỏi context: promptOnly=true, replaceString=""
   - [Render] Hoàn chỉnh: markdownOnly=true, render accordion đẹp
   - [Render] Đang stream: markdownOnly=true, render spinner
3. **Thinking/Logic Hider**: Ẩn <thinking>, <logic_check> khỏi UI
4. **Text Styling** (tùy chọn):
   - Tô màu lời thoại "..." 
   - Tô màu hành động *...*

Schema info:
${formatSchemaForPrompt(schema)}

Tổng cộng nên tạo 5-8 scripts. Thứ tự quan trọng:
- Scripts promptOnly (ẩn khỏi AI) phải ĐẶT TRƯỚC scripts markdownOnly (render)
- Scripts ẩn tag phải đặt trước scripts render cùng tag`;
}

function buildFreeFormPrompt(schema: MVUZODSchema, instructions: string): string {
  const fields = schema.fields.filter(f => !f.constraints?.hidden);

  return `=== YÊU CẦU: TẠO REGEX SCRIPTS TỰ DO ===

Người dùng mô tả tự do regex scripts cần tạo. Hãy đọc kỹ mô tả bên dưới và tạo CHÍNH XÁC theo yêu cầu.

=== MÔ TẢ TỪ NGƯỜI DÙNG ===
${instructions}

=== CONTEXT: SCHEMA CỦA CARD ===
Schema có ${fields.length} field gốc:
${fields.map(f => `  - ${f.label} (${f.type}${f.children?.length ? `, ${f.children.length} children` : ''})`).join('\n')}

=== HƯỚNG DẪN CHUNG ===
1. Tạo số lượng scripts phù hợp với yêu cầu (1 script đơn giản → nhiều scripts nếu yêu cầu phức tạp)
2. findRegex: chọn pattern phù hợp — có thể là tag HTML, keyword, pattern tùy ý
3. replaceString: HTML với inline styles, design premium dark theme
4. Dùng placement=[2] (AI Output) trừ khi yêu cầu khác
5. markdownOnly=true cho scripts render UI đẹp
6. Có thể dùng TavernHelper EJS: <% const data = Mvu.getMvuData({type:'message',message_id:'latest'})?.stat_data ?? {}; %>
7. KHÔNG bắt buộc phải liên quan đến StatusPlaceHolderImpl hay UpdateVariable
8. Tự do sáng tạo theo mô tả người dùng`;
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function formatSchemaForPrompt(schema: MVUZODSchema): string {
  const lines: string[] = [];

  function walk(fields: MVUZODField[], indent: number) {
    for (const f of fields) {
      const pad = '  '.repeat(indent);
      const name = f.path.split('/').filter(Boolean).pop() ?? f.path;
      const extras: string[] = [];

      if (f.constraints?.hidden) extras.push('hidden');
      if (f.constraints?.readOnly) extras.push('readOnly');
      if (f.constraints?.clamp) extras.push(`clamp[${f.constraints.clamp[0]},${f.constraints.clamp[1]}]`);
      if (f.constraints?.enumValues?.length) extras.push(`enum[${f.constraints.enumValues.join(',')}]`);
      if (f.defaultValue !== undefined) extras.push(`default=${JSON.stringify(f.defaultValue)}`);

      const extrasStr = extras.length ? ` (${extras.join(', ')})` : '';
      lines.push(`${pad}${name}: ${f.type}${f.label !== name ? ` [label: "${f.label}"]` : ''}${extrasStr}`);

      if (f.children?.length) {
        walk(f.children, indent + 1);
      }
    }
  }

  walk(schema.fields, 0);
  return lines.join('\n');
}

function collectLeafFields(fields: MVUZODField[]): MVUZODField[] {
  const result: MVUZODField[] = [];
  function collect(ff: MVUZODField[]) {
    for (const f of ff) {
      if (f.children?.length) collect(f.children);
      else result.push(f);
    }
  }
  collect(fields);
  return result;
}

// ─── CONFIG FORMATTER ───────────────────────────────────────────────────────

function formatConfigForPrompt(config: GameUIConfig): string {
  const sections: string[] = [];
  const en = config.enabledSections;

  // Typography
  if (en.typography) {
    const t = config.typography;
    sections.push(`TYPOGRAPHY:
- Font chính: "${t.fontFamily}", cỡ ${t.fontSize}px, weight: ${t.fontWeight}
- Font heading: "${t.headingFont}"
- Line height: ${t.lineHeight}, letter spacing: ${t.letterSpacing}px`);
  }

  // Text Styling
  if (en.textStyling) {
    const ts = config.textStyling;
    sections.push(`TEXT STYLING:
- Lời thoại "...": màu ${ts.dialogueColor}, style: ${ts.dialogueStyle}
- Hành động *...*: màu ${ts.actionColor}, style: ${ts.actionStyle}
- Tường thuật: màu ${ts.narrativeColor}
- Dấu ngoặc kép: ${ts.showQuoteMarks ? 'hiện' : 'ẩn'}
- Highlight tên người nói: ${ts.highlightSpeaker ? 'có' : 'không'}`);
  }

  // Images
  if (en.images) {
    if (config.images.characters.length > 0) {
      const charLines = config.images.characters.map(img => {
        const sizePx = img.size === 'custom' ? img.customSizePx : IMAGE_SIZE_PX[img.size as 'small' | 'medium' | 'large'] ?? 64;
        const features: string[] = [];
        if (img.zoomable) features.push('zoomable (click phóng to)');
        if (img.showOnHover) features.push('chỉ hiện khi hover');
        if (img.border) features.push(`viền ${img.borderColor}`);
        return `- "${img.characterName}": ${img.imageUrl}
  Vị trí: ${img.position}, hình: ${img.shape}, ${sizePx}px${features.length ? ', ' + features.join(', ') : ''}
  Dùng trong: ${img.usedIn.join(', ')}`;
      }).join('\n');
      sections.push(`HÌNH ẢNH NHÂN VẬT:\n${charLines}`);
    }
    if (config.images.backgroundUrl) {
      sections.push(`ẢNH NỀN: ${config.images.backgroundUrl}
- Opacity: ${config.images.backgroundOpacity}, blur: ${config.images.backgroundBlur}px`);
    }
  }

  // Layout
  if (en.layout) {
    const l = config.layout;
    sections.push(`LAYOUT:
- Max-width: ${l.maxWidth}px, border-radius: ${l.borderRadius}px, padding: ${l.padding}px, gap: ${l.gap}px
- Status bar: vị trí ${l.statusBarPosition}, style ${l.statusBarStyle}
- Dialogue style: ${l.dialogueBoxStyle}`);
  }

  // Effects
  if (en.effects) {
    const e = config.effects;
    const effectList: string[] = [];
    if (e.enableAnimations) effectList.push(`animation: ${e.animationType}`);
    if (e.enableGlow) effectList.push(`glow: ${e.glowColor} (${e.glowIntensity}px)`);
    if (e.enableShadow) effectList.push('box-shadow');
    if (e.enableGradient) effectList.push(`gradient: ${e.gradientFrom} → ${e.gradientTo}`);
    if (e.enableGlassmorphism) effectList.push('glassmorphism (backdrop-filter: blur)');
    if (effectList.length > 0) {
      sections.push(`HIỆU ỨNG:\n${effectList.map(x => `- ${x}`).join('\n')}`);
    }
  }

  // Colors
  if (en.colorScheme) {
    const c = config.colorScheme;
    sections.push(`MÀU SẮC (preset: ${c.preset}):
- Primary: ${c.primaryColor}, Secondary: ${c.secondaryColor}, Accent: ${c.accentColor}
- Background: ${c.backgroundColor}, Surface: ${c.surfaceColor}, Border: ${c.borderColor}`);
  }

  // Tabs
  if (en.tabs && config.tabs.enabled) {
    const enabledTabs = config.tabs.tabs.filter(t => t.enabled);
    sections.push(`TAB SYSTEM:
- Style: ${config.tabs.style}, position: ${config.tabs.position}, size: ${config.tabs.tabSize}
- ${enabledTabs.length} tabs bật: ${enabledTabs.map(t => `${t.emoji} ${t.label}`).join(', ')}
- Active color: ${config.tabs.activeColor}, inactive: ${config.tabs.inactiveColor}
- Show icons: ${config.tabs.showIcons ? 'có' : 'không'}, animated: ${config.tabs.animated ? 'có' : 'không'}`);
  }

  // Progress Bars
  if (en.progressBars) {
    const pb = config.progressBars;
    sections.push(`PROGRESS BARS:
- Style: ${pb.style}, height: ${pb.height}px, border-radius: ${pb.borderRadius}px
- Show label: ${pb.showLabel ? 'có' : 'không'}, show value: ${pb.showValue ? 'có' : 'không'}
- Animate: ${pb.animateOnChange ? 'có' : 'không'}, striped: ${pb.stripedEffect ? 'có' : 'không'}
- Màu: HP=${pb.barColors.hp}, MP=${pb.barColors.mp}, EXP=${pb.barColors.exp}, Stamina=${pb.barColors.stamina}, Generic=${pb.barColors.generic}
- Track: ${pb.trackColor}`);
  }

  // Buttons
  if (en.buttons) {
    const btn = config.buttons;
    sections.push(`BUTTONS:
- Shape: ${btn.shape}, variant: ${btn.variant}, size: ${btn.size}
- Hover: ${btn.hoverEffect}, click: ${btn.clickFeedback}
- Color: ${btn.primaryColor}, text: ${btn.textColor}, shadow: ${btn.showShadow ? 'có' : 'không'}
- Icon position: ${btn.iconPosition}`);
  }

  // NPC Cards
  if (en.npcCards) {
    const npc = config.npcCards;
    sections.push(`NPC / CHARACTER CARDS:
- Layout: ${npc.layout}, max ${npc.maxCardsPerRow} cards/row
- Avatar: ${npc.showAvatar ? `${npc.avatarSize}px, ${npc.avatarShape}` : 'ẩn'}
- Relationship: ${npc.showRelationship ? npc.relationshipStyle : 'ẩn'}
- Mood: ${npc.showMood ? npc.moodDisplay : 'ẩn'}
- Title/chức danh: ${npc.showTitle ? 'hiện' : 'ẩn'}
- Card background: ${npc.cardBackground}`);
  }

  // Inventory
  if (en.inventory) {
    const inv = config.inventory;
    sections.push(`INVENTORY:
- Layout: ${inv.layout}${inv.layout === 'grid' ? `, ${inv.gridColumns} cột` : ''}
- Item card: ${inv.itemCardStyle}
- Hiện: ${[inv.showQuantity && 'số lượng', inv.showRarity && 'độ hiếm', inv.showCategory && 'danh mục', inv.showItemIcon && 'icon'].filter(Boolean).join(', ')}
- Empty slots: ${inv.showEmptySlots ? 'hiện' : 'ẩn'}, drag sort: ${inv.enableDragSort ? 'có' : 'không'}
- Rarity colors: Common=${inv.rarityColors.common}, Uncommon=${inv.rarityColors.uncommon}, Rare=${inv.rarityColors.rare}, Epic=${inv.rarityColors.epic}, Legendary=${inv.rarityColors.legendary}`);
  }

  // Notifications
  if (en.notifications && config.notifications.enabled) {
    const notif = config.notifications;
    sections.push(`NOTIFICATIONS / TOASTS:
- Style: ${notif.style}, position: ${notif.position}
- Duration: ${notif.duration}ms, max visible: ${notif.maxVisible}
- Accent: ${notif.accentColor}
- Hiện khi: ${[notif.showForItems && 'nhận vật phẩm', notif.showForStats && 'stat đổi', notif.showForEvents && 'sự kiện'].filter(Boolean).join(', ')}`);
  }

  // Transitions
  if (en.transitions) {
    const tr = config.transitions;
    sections.push(`TRANSITIONS:
- Scene: ${tr.sceneTransition}, duration: ${tr.transitionDuration}ms
- Content reveal: ${tr.contentReveal}
- Typewriter: ${tr.enableTextTypewriter ? `${tr.typewriterSpeed}ms/char` : 'tắt'}
- Parallax: ${tr.enableParallax ? 'có' : 'không'}, page flip: ${tr.enablePageFlip ? 'có' : 'không'}`);
  }

  // Responsive
  if (en.responsive && config.responsive.enableMobileOptimize) {
    const r = config.responsive;
    sections.push(`RESPONSIVE / MOBILE:
- Breakpoint: ${r.mobileBreakpoint}px, font scale: ×${r.mobileFontScale}
- Compact mode: ${r.compactModeOnMobile ? 'có' : 'không'}, hide images: ${r.hideImagesOnMobile ? 'có' : 'không'}
- Stack columns: ${r.stackColumnsOnMobile ? 'có' : 'không'}, touch-friendly: ${r.touchFriendly ? 'có' : 'không'}
- Swipe gestures: ${r.swipeGestures ? 'có' : 'không'}`);
  }

  // Theme
  if (en.theme) {
    const th = config.theme;
    if (th.enableDualTheme) {
      sections.push(`THEME (DUAL MODE):
- Default: ${th.defaultTheme}, auto-detect: ${th.autoDetect ? 'có' : 'không'}
- Light colors: bg=${th.lightBg}, text=${th.lightText}, accent=${th.lightAccent}, surface=${th.lightSurface}
- Eye care: ${th.enableEyeCare ? `sepia ${th.eyeCareStrength}%` : 'tắt'}`);
    } else if (th.enableEyeCare) {
      sections.push(`THEME: Eye care mode, sepia ${th.eyeCareStrength}%`);
    }
  }

  // Retro Effects
  if (en.retroEffects) {
    const re = config.retroEffects;
    const retroList: string[] = [];
    if (re.enableScanlines) retroList.push(`scanlines (opacity: ${re.scanlineOpacity}, gap: ${re.scanlineGap}px)`);
    if (re.enableCrtVignette) retroList.push(`CRT vignette (${re.crtIntensity}%)`);
    if (re.enableNoiseTexture) retroList.push(`noise (${re.noiseOpacity})`);
    if (re.enableTerminalStyle) retroList.push('terminal style (monospace, green-on-black)');
    if (re.customOverlayUrl) retroList.push(`overlay: ${re.customOverlayUrl} (${re.overlayBlendMode})`);
    if (retroList.length > 0) {
      sections.push(`RETRO / CRT EFFECTS:\n${retroList.map(x => `- ${x}`).join('\n')}`);
    }
  }

  // Audio Player
  if (en.audioPlayer && config.audioPlayer.enabled) {
    const ap = config.audioPlayer;
    sections.push(`AUDIO PLAYER:
- Style: ${ap.playerStyle}, position: ${ap.position}
- Track: "${ap.trackLabel}" ${ap.defaultTrackUrl ? `(${ap.defaultTrackUrl})` : '(no URL)'}
- Auto-play: ${ap.autoPlay ? 'có' : 'không'}, loop: ${ap.loop ? 'có' : 'không'}
- Controls: ${[ap.showVolume && 'volume', ap.showSeek && 'seek'].filter(Boolean).join(', ')}
- Colors: bg=${ap.playerBg}, accent=${ap.playerAccent}`);
  }

  // Toolbar
  if (en.toolbar && config.toolbar.enabled) {
    const tb = config.toolbar;
    const enabledBtns = tb.buttons.filter(b => b.enabled);
    sections.push(`TOOLBAR / ACTION BAR:
- Position: ${tb.position}, style: ${tb.style}, compact: ${tb.compact ? 'có' : 'không'}
- Labels: ${tb.showLabels ? 'hiện' : 'ẩn'}
- Colors: bg=${tb.bgColor}, text=${tb.textColor}
- ${enabledBtns.length} nút: ${enabledBtns.map(b => `${b.emoji} ${b.label} (${b.action})`).join(', ')}`);
  }

  // Reading Mode
  if (en.readingMode) {
    const rm = config.readingMode;
    const rmFeatures = [
      rm.enableFullscreen && 'fullscreen',
      rm.enableFontSizeControl && `font ${rm.fontSizeMin}-${rm.fontSizeMax}px`,
      rm.enableLineWidthControl && 'line-width',
      rm.showScrollToTop && 'scroll-top',
      rm.showChapterNav && 'chapter-nav',
    ].filter(Boolean);
    if (rmFeatures.length > 0) {
      sections.push(`READING MODE:\n${rmFeatures.map(x => `- ${x}`).join('\n')}\n- Reading bg: ${rm.readingBg}`);
    }
  }

  // Multi-page
  if (en.multiPage && config.multiPage.enabled) {
    const mp = config.multiPage;
    const enabledPages = mp.pages.filter(p => p.enabled);
    sections.push(`MULTI-PAGE / WIZARD:
- Nav: ${mp.navStyle}, position: ${mp.navPosition}, transition: ${mp.pageTransition}
- Counter: ${mp.showPageCounter ? 'hiện' : 'ẩn'}, direct jump: ${mp.allowDirectJump ? 'có' : 'không'}
- ${enabledPages.length} pages: ${enabledPages.map(p => `${p.emoji} ${p.label}`).join(', ')}`);
  }

  // Collapsibles
  if (en.collapsibles) {
    const cl = config.collapsibles;
    sections.push(`COLLAPSIBLE SECTIONS:
- Default: ${cl.defaultState}, icon: ${cl.iconStyle}, animation: ${cl.animation}
- Nested: ${cl.enableNested ? 'có' : 'không'}, border: ${cl.borderStyle}, header: ${cl.headerStyle}
- Border radius: ${cl.borderRadius}px`);
  }

  // Currency
  if (en.currency && config.currency.currencies.length > 0) {
    const cr = config.currency;
    sections.push(`CURRENCY / ECONOMY:
- Display: ${cr.displayStyle}, format: ${cr.format}, icon: ${cr.showIcon ? 'hiện' : 'ẩn'}, animate: ${cr.animateChange ? 'có' : 'không'}
- Currencies: ${cr.currencies.map(c => `${c.emoji} ${c.name} (${c.color})`).join(', ')}`);
  }

  // Badges
  if (en.badges && config.badges.enabled) {
    const bg = config.badges;
    sections.push(`BADGES / TITLES:
- Shape: ${bg.shape}, position: ${bg.position}, title: ${bg.titleDisplay}
- Rarity glow: ${bg.rarityGlow ? 'có' : 'không'}, max: ${bg.maxVisible}
- Colors: bg=${bg.badgeBg}, text=${bg.badgeText}`);
  }

  // CSS Advanced
  if (en.cssAdvanced) {
    const css = config.cssAdvanced;
    const cssParts: string[] = [];
    cssParts.push(`box-sizing reset: ${css.boxSizingReset ? 'có' : 'không'}`);
    cssParts.push(`scrollbar: ${css.scrollbarStyle}${css.scrollbarStyle === 'custom' ? ` (${css.scrollbarColor})` : ''}`);
    cssParts.push(`::selection: color=${css.selectionColor}, bg=${css.selectionBg}`);
    if (css.customVariables.length > 0) {
      cssParts.push(`CSS vars: ${css.customVariables.map(v => `${v.name}: ${v.value}`).join('; ')}`);
    }
    if (css.additionalFontUrls.length > 0) {
      cssParts.push(`Extra fonts: ${css.additionalFontUrls.filter(u => u).join(', ')}`);
    }
    if (css.customCssSnippet) {
      cssParts.push(`Custom CSS snippet: \`\`\`${css.customCssSnippet}\`\`\``);
    }
    sections.push(`CSS / ADVANCED:\n${cssParts.map(x => `- ${x}`).join('\n')}`);
  }

  // Event Popup
  if (en.eventPopup && config.eventPopup.enabled) {
    const ep = config.eventPopup;
    sections.push(`EVENT / POPUP:
- Layout: ${ep.layout}, severity: ${ep.defaultSeverity}
- Icon: ${ep.showIcon ? `${ep.iconPosition}` : 'ẩn'}, severity badge: ${ep.showSeverityBadge ? 'có' : 'không'}
- Choices: ${ep.showChoices ? `${ep.choiceStyle}` : 'không hiện'}
- Animation: ${ep.animateEntry ? ep.entryAnimation : 'không'}, radius: ${ep.borderRadius}px
- Close button: ${ep.showCloseButton ? 'có' : 'không'}
- Colors: bg=${ep.popupBg}, border=${ep.popupBorder}, accent=${ep.popupAccent}`);
  }

  // Data Table
  if (en.dataTable && config.dataTable.enabled) {
    const dt = config.dataTable;
    sections.push(`DATA TABLE / GRID:
- Style: ${dt.tableStyle}, density: ${dt.density}
- Header: ${dt.showHeader ? 'hiện' : 'ẩn'}, sticky: ${dt.stickyHeader ? 'có' : 'không'}
- Hover: ${dt.hoverHighlight ? 'có' : 'không'}, alternate rows: ${dt.alternateRowColor ? 'có' : 'không'}
- Sort: ${dt.enableSorting ? 'có' : 'không'}, radius: ${dt.borderRadius}px, max-height: ${dt.maxHeight || 'auto'}
- Colors: header=${dt.headerBg}/${dt.headerText}, row=${dt.rowBg}/${dt.rowAltBg}, border=${dt.borderColor}`);
  }

  // Form Elements
  if (en.formElements && config.formElements.enabled) {
    const fe = config.formElements;
    sections.push(`FORM ELEMENTS:
- Style: ${fe.formStyle}, label: ${fe.labelStyle}, select: ${fe.selectStyle}
- Input: bg=${fe.inputBg}, border=${fe.inputBorder}, text=${fe.inputText}
- Input radius: ${fe.inputRadius}px, padding: ${fe.inputPadding}px, gap: ${fe.fieldGap}px
- Focus: ${fe.focusColor}, fieldset border: ${fe.fieldsetBorder ? 'có' : 'không'}
- Slider: accent=${fe.sliderAccent}, track=${fe.sliderTrackBg}
- Submit btn: bg=${fe.buttonSubmitBg}, text=${fe.buttonSubmitText}
- Cancel btn: bg=${fe.buttonCancelBg}, text=${fe.buttonCancelText}`);
  }

  return `=== CẤU HÌNH GIAO DIỆN (từ config panel) ===
Áp dụng CHÍNH XÁC các giá trị dưới đây vào inline styles của HTML output.

${sections.join('\n\n')}`;
}
