/**
 * worldbookConfig.ts — Entry Category System + Presets
 * Theo "Hướng dẫn worldbook" guide: chiến lược kích hoạt, vị trí, thứ tự, đệ quy
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Phân loại entry theo guide Worldbook */
export type EntryCategory =
  | 'worldview'              // Thế giới quan / Thiết lập bối cảnh
  | 'region_overview'        // Xem lướt khu vực
  | 'character_overview'     // Xem lướt nhân vật
  | 'character_detail'       // Thông tin chi tiết nhân vật cốt lõi
  | 'npc'                    // NPC
  | 'scene'                  // Cảnh vật / Sự kiện
  | 'secondary_explanation'  // Giải thích lần hai (D0)
  | 'custom';                // Tuỳ chỉnh tự do

/** Loại thẻ: đơn nhân vật vs nhiều nhân vật */
export type CardType = 'single' | 'multi';

/** Config presets cho mỗi loại entry */
export interface CategoryPreset {
  label: string;
  labelVi: string;
  icon: string;
  description: string;
  defaults: {
    constant: boolean;
    selective: boolean;
    position: 0 | 1 | 4;
    depth: number;
    role: 0 | 1 | 2 | null;
    insertion_order: number;
    scan_depth: number | null;
    exclude_recursion: true;
    prevent_recursion: true;
  };
  keywordHint: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// LABELS
// ═══════════════════════════════════════════════════════════════════════════

export const ENTRY_CATEGORY_LABELS: Record<EntryCategory, { label: string; icon: string }> = {
  worldview:              { label: 'Thế giới quan / Bối cảnh',     icon: '🌍' },
  region_overview:        { label: 'Xem lướt khu vực',             icon: '🗺' },
  character_overview:     { label: 'Xem lướt nhân vật',            icon: '👥' },
  character_detail:       { label: 'Chi tiết nhân vật cốt lõi',    icon: '🧑' },
  npc:                    { label: 'NPC',                          icon: '🤝' },
  scene:                  { label: 'Cảnh vật / Sự kiện',           icon: '🏞' },
  secondary_explanation:  { label: 'Giải thích lần hai (D0)',      icon: '🎯' },
  custom:                 { label: 'Tuỳ chỉnh tự do',             icon: '⚙️' },
};

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  single: 'Nhân vật đơn (1 nhân vật cốt lõi)',
  multi: 'Nhiều nhân vật (2+ nhân vật cốt lõi)',
};

// ═══════════════════════════════════════════════════════════════════════════
// PRESETS — Thẻ nhân vật ĐƠN (single)
// Guide: "Thẻ nhân vật đơn, tất cả mục toàn bộ đèn xanh dương. Quy luật thép."
// ═══════════════════════════════════════════════════════════════════════════

export const SINGLE_CARD_PRESETS: Record<Exclude<EntryCategory, 'custom'>, CategoryPreset> = {
  worldview: {
    label: 'Worldview',
    labelVi: 'Thế giới quan / Bối cảnh',
    icon: '🌍',
    description: 'Tổng cương thế giới, bối cảnh, quy tắc. Luôn thường trú (đèn xanh dương).',
    defaults: {
      constant: true,
      selective: false,
      position: 0,           // before_char
      depth: 4,
      role: null,
      insertion_order: 1,
      scan_depth: null,       // constant → không cần scan
      exclude_recursion: true,
      prevent_recursion: true,
    },
    keywordHint: 'Entry thường trú → không cần từ khóa.',
  },

  region_overview: {
    label: 'Region Overview',
    labelVi: 'Xem lướt khu vực',
    icon: '🗺',
    description: 'Liệt kê khu vực + 1 câu định vị. Thường trú.',
    defaults: {
      constant: true,
      selective: false,
      position: 0,
      depth: 4,
      role: null,
      insertion_order: 2,
      scan_depth: null,
      exclude_recursion: true,
      prevent_recursion: true,
    },
    keywordHint: 'Entry thường trú → không cần từ khóa.',
  },

  character_overview: {
    label: 'Character Overview',
    labelVi: 'Xem lướt nhân vật',
    icon: '👥',
    description: 'Giới thiệu vắn tắt tất cả nhân vật. Thường trú.',
    defaults: {
      constant: true,
      selective: false,
      position: 0,
      depth: 4,
      role: null,
      insertion_order: 4,
      scan_depth: null,
      exclude_recursion: true,
      prevent_recursion: true,
    },
    keywordHint: 'Entry thường trú → không cần từ khóa.',
  },

  character_detail: {
    label: 'Character Detail',
    labelVi: 'Chi tiết nhân vật cốt lõi',
    icon: '🧑',
    // Thẻ đơn: QUY LUẬT THÉP — toàn bộ constant!
    description: '⚡ QUY LUẬT THÉP: Thẻ đơn → tất cả mục nhân vật PHẢI thường trú (đèn xanh dương).',
    defaults: {
      constant: true,         // QUY LUẬT THÉP cho thẻ đơn!
      selective: false,
      position: 1,            // after_char
      depth: 4,
      role: null,
      insertion_order: 99,
      scan_depth: null,
      exclude_recursion: true,
      prevent_recursion: true,
    },
    keywordHint: 'Entry thường trú (thẻ đơn) → không cần từ khóa.',
  },

  npc: {
    label: 'NPC',
    labelVi: 'NPC',
    icon: '🤝',
    description: 'Vai phụ, tải theo nhu cầu. Từ khóa = tên + biệt danh + chức vụ.',
    defaults: {
      constant: false,
      selective: true,
      position: 1,
      depth: 4,
      role: null,
      insertion_order: 100,
      scan_depth: 2,
      exclude_recursion: true,
      prevent_recursion: true,
    },
    keywordHint: 'Tên đầy đủ, biệt danh, ngoại hiệu, chức vụ. VD: "Vương Tĩnh,Cô giáo Vương,Giáo viên chủ nhiệm"',
  },

  scene: {
    label: 'Scene/Event',
    labelVi: 'Cảnh vật / Sự kiện',
    icon: '🏞',
    description: 'Tải theo nhu cầu. Từ khóa = tên địa danh + tên gọi khác + hành động liên quan.',
    defaults: {
      constant: false,
      selective: true,
      position: 1,
      depth: 4,
      role: null,
      insertion_order: 80,
      scan_depth: 2,
      exclude_recursion: true,
      prevent_recursion: true,
    },
    keywordHint: 'Tên cảnh vật, địa danh, tên gọi khác, hành động. VD: "Thư viện,Thư viện trường,Mượn sách"',
  },

  secondary_explanation: {
    label: 'Secondary Explanation (D0)',
    labelVi: 'Giải thích lần hai (D0)',
    icon: '🎯',
    description: 'Chỉ đạo AI — vị trí D0, role=system. Sức ảnh hưởng mạnh nhất.',
    defaults: {
      constant: false,        // xanh lá — chỉ kích hoạt khi nhắc đến nhân vật
      selective: true,
      position: 4,            // @depth
      depth: 0,               // D0 — cuối cùng AI đọc
      role: 0,                // system
      insertion_order: 1,
      scan_depth: 2,
      exclude_recursion: true,
      prevent_recursion: true,
    },
    keywordHint: 'Tên nhân vật cần điều chỉnh. VD: "Lâm Tiểu Vũ,Tiểu Vũ"',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// PRESETS — Thẻ NHIỀU nhân vật (multi)
// Guide: "Xem lướt = xanh dương, Chi tiết = xanh lá"
// ═══════════════════════════════════════════════════════════════════════════

export const MULTI_CARD_PRESETS: Record<Exclude<EntryCategory, 'custom'>, CategoryPreset> = {
  // worldview, region_overview, character_overview — giống thẻ đơn
  worldview:          { ...SINGLE_CARD_PRESETS.worldview },
  region_overview:    { ...SINGLE_CARD_PRESETS.region_overview },
  character_overview: { ...SINGLE_CARD_PRESETS.character_overview },

  character_detail: {
    label: 'Character Detail',
    labelVi: 'Chi tiết nhân vật cốt lõi',
    icon: '🧑',
    description: 'Thẻ nhiều NV → xanh lá, kích hoạt bằng từ khóa. Chỉ tải khi nhắc đến.',
    defaults: {
      constant: false,        // Khác thẻ đơn: xanh LÁ
      selective: true,
      position: 1,
      depth: 4,
      role: null,
      insertion_order: 99,
      scan_depth: 2,
      exclude_recursion: true,
      prevent_recursion: true,
    },
    keywordHint: 'Tên nhân vật + biệt danh + ngoại hiệu. VD: "Thu Minh Nguyệt,Minh Nguyệt,Nguyệt Nguyệt,Chị Thu"',
  },

  npc: { ...SINGLE_CARD_PRESETS.npc },
  scene: { ...SINGLE_CARD_PRESETS.scene },

  secondary_explanation: {
    ...SINGLE_CARD_PRESETS.secondary_explanation,
    description: 'Chỉ đạo AI — D0, role=system. Dùng xanh lá, kích hoạt bằng tên nhân vật.',
    defaults: {
      ...SINGLE_CARD_PRESETS.secondary_explanation.defaults,
      // Thẻ nhiều: thứ tự có thể khác (NV A=1, NV B=2)
      insertion_order: 1,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lấy preset đúng dựa trên cardType + category.
 * Trả về undefined nếu category='custom'.
 */
export function getPreset(
  category: EntryCategory,
  cardType: CardType,
): CategoryPreset | undefined {
  if (category === 'custom') return undefined;
  return cardType === 'single'
    ? SINGLE_CARD_PRESETS[category]
    : MULTI_CARD_PRESETS[category];
}

/**
 * Mô tả chiến lược kích hoạt dạng label ngắn gọn.
 */
export function getStrategyLabel(constant: boolean, selective: boolean): {
  label: string;
  icon: string;
  color: string;
} {
  if (constant) {
    return { label: 'Đèn xanh dương — Thường trú', icon: '🔵', color: 'text-blue-400' };
  }
  if (selective) {
    return { label: 'Đèn xanh lá — Kích hoạt bằng từ khóa', icon: '🟢', color: 'text-emerald-400' };
  }
  return { label: 'Không lọc — Luôn gửi', icon: '⚪', color: 'text-muted-foreground' };
}
