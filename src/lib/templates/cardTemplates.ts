/**
 * src/lib/templates/cardTemplates.ts — Full Card Templates
 *
 * Complete card presets that include:
 * - Character data (name, description, personality, system prompt, first_mes)
 * - Worldbook entries (sample entries)
 * - MVUZOD schema (linked from templateLibrary)
 * - Recommended regex patterns
 *
 * 3 card archetypes: Romance, Adventure, System
 */

import type { CharacterCardV3 } from '../../types/card.types';
import type { LorebookEntry } from '../../types/lorebook.types';
import { createEmptyCard } from '../converters/cardDefaults';
import { materializeEntry } from '../converters/cardDefaults';
import { MVUZOD_TEMPLATES, type MVUZODTemplate } from '../mvuzod/templateLibrary';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CardTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Category for filtering */
  category: 'romance' | 'adventure' | 'system' | 'creative';
  /** What the template includes */
  includes: {
    schema: boolean;
    worldbook: boolean;
    regex: boolean;
    systemPrompt: boolean;
    firstMessage: boolean;
  };
  /** Linked MVUZOD schema template ID (from templateLibrary) */
  schemaTemplateId?: string;
  /** Preview info */
  preview: {
    entryCount: number;
    estimatedTokens: number;
    tags: string[];
  };
  /** Builder function */
  build: () => Partial<CharacterCardV3>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════════════════════

function entry(
  id: number,
  comment: string,
  content: string,
  opts: { keys?: string[]; constant?: boolean; position?: number; enabled?: boolean } = {},
): LorebookEntry {
  return materializeEntry(
    { comment, content, keys: opts.keys ?? [] },
    { defaultPosition: (opts.position ?? 0) as 0, insertionOrderStart: 100 + id },
    id,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 1: ROMANCE / DATING SIM
// ═══════════════════════════════════════════════════════════════════════════

const romanceTemplate: CardTemplate = {
  id: 'card_romance',
  name: '恋愛カード — Romance Card',
  description: 'Card hẹn hò với hệ thống 好感度 (tình cảm), sự kiện, trang phục, xưng hô. Kèm schema Dating Sim.',
  icon: '💕',
  category: 'romance',
  schemaTemplateId: 'dating_sim',
  includes: { schema: true, worldbook: true, regex: false, systemPrompt: true, firstMessage: true },
  preview: { entryCount: 5, estimatedTokens: 2800, tags: ['Dating', 'Tình cảm', 'Visual Novel'] },
  build: () => {
    const base = createEmptyCard();
    base.data.name = '{{char}}';
    base.data.description = [
      '【Thông tin cơ bản】',
      'Tên: {{char}}',
      'Tuổi: (tùy thiết lập)',
      'Ngoại hình: (mô tả chi tiết ngoại hình)',
      'Tính cách: (mô tả tính cách nhân vật)',
      '',
      '【Hệ thống tình cảm】',
      'Mỗi hành động của {{user}} sẽ ảnh hưởng đến 好感度 (tình cảm) của {{char}}.',
      'Mức độ: 0-30 (Lạnh nhạt), 31-60 (Quen thuộc), 61-80 (Thân mật), 81-100 (Yêu thương).',
      '{{char}} sẽ thay đổi cách xưng hô và thái độ theo mức tình cảm.',
    ].join('\n');

    base.data.personality = '(Tùy chỉnh tính cách nhân vật)';

    base.data.system_prompt = [
      'Bạn đang đóng vai {{char}} trong một câu chuyện tương tác.',
      '',
      '【Quy tắc quan trọng】',
      '1. LUÔN viết output theo đúng format biến. Không bao giờ quên cập nhật <UpdateVariable>.',
      '2. Thay đổi cách xưng hô và thái độ theo mức 好感度 hiện tại.',
      '3. Mỗi response PHẢI có mô tả hành động, cảm xúc, suy nghĩ nội tâm.',
      '4. Sự kiện đặc biệt sẽ tự động kích hoạt khi 好感度 đạt ngưỡng.',
      '5. Không phá vỡ nhân vật (OOC).',
    ].join('\n');

    base.data.first_mes = [
      '*{{char}} đang ngồi một mình trên ghế đá công viên, dưới tán cây anh đào đang rụng lá.*',
      '',
      '*Cô ấy ngước lên khi thấy {{user}} đi ngang qua, ánh mắt thoáng chút tò mò.*',
      '',
      '"Ồ... xin lỗi, tôi không để ý. Bạn cũng đến đây thường xuyên à?"',
      '',
      '*{{char}} hơi nghiêng đầu, một chiếc lá rơi nhẹ xuống vai cô.*',
    ].join('\n');

    base.data.tags = ['romance', 'dating-sim', 'mvuzod'];

    // Sample worldbook entries
    const entries: LorebookEntry[] = [
      entry(1, '好感度 giai đoạn 1: Lạnh nhạt', [
        '{{char}} ở giai đoạn LẠT NHẠT (好感度 0-30):',
        '- Xưng hô: gọi {{user}} là "bạn" hoặc gọi tên',
        '- Thái độ: lịch sự nhưng giữ khoảng cách, ít cười',
        '- Hành vi: trả lời ngắn gọn, ít chia sẻ chuyện riêng',
        '- Từ chối lời mời ăn tối hoặc đi chơi xa',
      ].join('\n'), { constant: true }),

      entry(2, '好感度 giai đoạn 2: Quen thuộc', [
        '{{char}} ở giai đoạn QUEN THUỘC (好感度 31-60):',
        '- Xưng hô: gọi tên thân mật, có biệt danh',
        '- Thái độ: thoải mái, hay cười, chủ động trò chuyện',
        '- Hành vi: chia sẻ sở thích, chấp nhận lời mời',
        '- Đôi khi nhắn tin hỏi thăm {{user}}',
      ].join('\n'), { constant: true }),

      entry(3, '好感度 giai đoạn 3: Thân mật', [
        '{{char}} ở giai đoạn THÂN MẬT (好感度 61-80):',
        '- Xưng hô: dùng tên thân thiết, đôi khi trêu chọc',
        '- Thái độ: quan tâm sâu sắc, hay lo lắng cho {{user}}',
        '- Hành vi: chạm tay, ngồi gần, chia sẻ bí mật',
        '- Ghen tuông nhẹ khi {{user}} thân với người khác',
      ].join('\n'), { constant: true }),

      entry(4, '好感度 giai đoạn 4: Yêu thương', [
        '{{char}} ở giai đoạn YÊU THƯƠNG (好感度 81-100):',
        '- Xưng hô: dùng cách gọi yêu thương riêng',
        '- Thái độ: hoàn toàn tin tưởng, mở lòng',
        '- Hành vi: thể hiện tình cảm rõ ràng, luôn muốn ở bên',
        '- Có thể confession nếu hoàn cảnh phù hợp',
      ].join('\n'), { constant: true }),

      entry(5, 'Quy tắc cập nhật biến Dating', [
        '【Quy tắc cập nhật biến】',
        '- Mỗi hành động tích cực: +3~8 好感度',
        '- Mỗi hành động tiêu cực: -5~15 好感度',
        '- Tặng quà phù hợp sở thích: +10~15',
        '- Tặng quà sai sở thích: -3',
        '- Sự kiện đặc biệt: +15~25',
        '- 好感度 KHÔNG BAO GIỜ vượt quá 100 hoặc dưới 0',
      ].join('\n'), { constant: true }),
    ];

    base.data.character_book = { name: base.data.name, entries };

    // Link schema
    const schemaTemplate = MVUZOD_TEMPLATES.find(t => t.id === 'dating_sim');
    if (schemaTemplate) {
      (base.data.extensions as unknown as Record<string, unknown>).mvuzod = { schema: schemaTemplate.schema };
    }

    return base;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 2: ADVENTURE / RPG
// ═══════════════════════════════════════════════════════════════════════════

const adventureTemplate: CardTemplate = {
  id: 'card_adventure',
  name: '冒険カード — Adventure Card',
  description: 'Card phiêu lưu RPG với hệ thống chiến đấu, kỹ năng, vật phẩm, NPC. Kèm schema RPG Cơ Bản.',
  icon: '⚔️',
  category: 'adventure',
  schemaTemplateId: 'rpg_basic',
  includes: { schema: true, worldbook: true, regex: false, systemPrompt: true, firstMessage: true },
  preview: { entryCount: 5, estimatedTokens: 3200, tags: ['RPG', 'Chiến đấu', 'Phiêu lưu'] },
  build: () => {
    const base = createEmptyCard();
    base.data.name = 'Game Master';
    base.data.description = [
      '【Game Master — Hệ thống phiêu lưu RPG】',
      'Đây là một trò chơi nhập vai phiêu lưu với hệ thống chiến đấu theo lượt.',
      'Game Master điều khiển thế giới, NPC, quái vật, và các sự kiện.',
      '',
      '【Thế giới】',
      'Một thế giới fantasy với nhiều vùng đất: rừng, núi, thành phố, dungeon.',
      'Mỗi khu vực có quái vật, NPC, và nhiệm vụ riêng.',
    ].join('\n');

    base.data.system_prompt = [
      'Bạn là Game Master của một trò chơi nhập vai phiêu lưu.',
      '',
      '【Quy tắc chiến đấu】',
      '1. Chiến đấu theo lượt: {{user}} tấn công → Quái vật phản đòn',
      '2. Sát thương = ATK - DEF đối phương (tối thiểu 1)',
      '3. Khi HP = 0 → thua/thắng tùy bên',
      '4. Kỹ năng tiêu tốn MP',
      '',
      '【Quy tắc chung】',
      '1. LUÔN cập nhật biến qua <UpdateVariable>',
      '2. Vật phẩm nhặt được → thêm vào Hành trang',
      '3. Kinh nghiệm chiến đấu → cộng EXP',
      '4. Đủ EXP → lên cấp → tăng stats',
      '5. Mỗi response phải có StatusPlaceHolder ở cuối',
    ].join('\n');

    base.data.first_mes = [
      '*Bạn tỉnh dậy trong một căn phòng nhỏ tại quán trọ. Ánh nắng buổi sáng chiếu qua cửa sổ.*',
      '',
      '*Một tấm bảng thông báo treo trên tường ghi: "Tuyển người phiêu lưu — thưởng hậu hĩnh."*',
      '',
      '**[Lựa chọn]**',
      '1. 🗡️ Đi đến quầy tiếp nhận nhiệm vụ',
      '2. 🛒 Ghé cửa hàng mua đồ trước',
      '3. 🗣️ Hỏi thăm chủ quán về khu vực xung quanh',
      '',
      '> HP: 100/100 | MP: 50/50 | Bạc: 0 | Cấp: 1',
    ].join('\n');

    base.data.tags = ['adventure', 'rpg', 'game', 'mvuzod'];

    const entries: LorebookEntry[] = [
      entry(1, 'Hệ thống chiến đấu chi tiết', [
        '【HỆ THỐNG CHIẾN ĐẤU】',
        '- Tấn công thường: Sát thương = ATK người tấn công - DEF người bị tấn công (min 1)',
        '- Kỹ năng: Sát thương = ATK × hệ số kỹ năng - DEF, tiêu tốn MP',
        '- Né tránh: 10% cơ hội né (tùy DEX nếu có)',
        '- Critical: 5% cơ hội gây x2 sát thương',
        '- Khi HP ≤ 20%: trạng thái "Nguy hiểm" — hiệu suất giảm 20%',
      ].join('\n'), { constant: true }),

      entry(2, 'Quy tắc lên cấp', [
        '【LÊN CẤP】',
        '- EXP cần cho cấp tiếp = Cấp hiện tại × 100',
        '- Mỗi lần lên cấp: +10 HP max, +5 MP max, +2 ATK, +1 DEF',
        '- Mỗi 5 cấp: mở kỹ năng mới',
        '- Mỗi 10 cấp: mở chức nghiệp (class) mới',
      ].join('\n'), { constant: true }),

      entry(3, 'Hệ thống vật phẩm', [
        '【VẬT PHẨM】',
        '- Hồi phục: Thuốc HP (+30 HP), Thuốc MP (+20 MP)',
        '- Trang bị: Vũ khí (+ATK), Giáp (+DEF)',
        '- Đặc biệt: Bản đồ, Chìa khóa, Cuộn ma thuật',
        '- Hành trang tối đa: 20 slot',
        '- Có thể bán vật phẩm cho NPC để lấy Bạc',
      ].join('\n'), { constant: true }),

      entry(4, 'Danh sách NPC mẫu', [
        '【NPC QUAN TRỌNG】',
        '- Lão Trần (Chủ quán trọ): Cung cấp thông tin, nhiệm vụ đầu',
        '- Lý Thiết (Thợ rèn): Bán vũ khí/giáp, nâng cấp trang bị',
        '- Tiểu Hoa (Dược sĩ): Bán thuốc hồi phục, giải độc',
        '- Đoàn Trưởng Vương (Binh lính): Đưa nhiệm vụ diệt quái cao cấp',
      ].join('\n'), { keys: ['NPC', 'nhân vật'] }),

      entry(5, 'Format output chiến đấu', [
        '【FORMAT OUTPUT CHIẾN ĐẤU】',
        'Khi chiến đấu, PHẢI viết theo format:',
        '',
        '*[Mô tả hành động chiến đấu sinh động]*',
        '> 💥 {{user}} tấn công → [Tên quái] nhận [X] sát thương!',
        '> ❤️ HP quái: [còn lại]/[tổng]',
        '> 🛡️ [Tên quái] phản đòn → {{user}} nhận [Y] sát thương!',
        '> ❤️ HP {{user}}: [còn lại]/[tổng]',
      ].join('\n'), { constant: true }),
    ];

    base.data.character_book = { name: 'Game Master', entries };

    const schemaTemplate = MVUZOD_TEMPLATES.find(t => t.id === 'rpg_basic');
    if (schemaTemplate) {
      (base.data.extensions as unknown as Record<string, unknown>).mvuzod = { schema: schemaTemplate.schema };
    }

    return base;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 3: SYSTEM / NPC MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

const systemTemplate: CardTemplate = {
  id: 'card_system',
  name: '系統カード — System Card',
  description: 'Card hệ thống NPC quản lý nhiều nhân vật, nhiệm vụ, quản lý tiến độ câu chuyện. Kèm schema Đời Thường.',
  icon: '🎮',
  category: 'system',
  schemaTemplateId: 'slice_of_life',
  includes: { schema: true, worldbook: true, regex: false, systemPrompt: true, firstMessage: true },
  preview: { entryCount: 4, estimatedTokens: 2400, tags: ['System', 'Multi-NPC', 'Story Manager'] },
  build: () => {
    const base = createEmptyCard();
    base.data.name = 'Narrator';
    base.data.description = [
      '【Narrator — Hệ thống quản lý câu chuyện】',
      'Narrator là hệ thống AI điều phối câu chuyện, quản lý nhiều NPC,',
      'theo dõi nhiệm vụ, và tạo ra các sự kiện dựa trên hành động của người chơi.',
      '',
      '【Vai trò】',
      '- Kể chuyện góc nhìn ngôi thứ ba',
      '- Điều khiển tất cả NPC (đối thoại, hành vi)',
      '- Quản lý tiến độ nhiệm vụ',
      '- Tạo sự kiện ngẫu nhiên phù hợp bối cảnh',
    ].join('\n');

    base.data.system_prompt = [
      'Bạn là Narrator — hệ thống kể chuyện tương tác.',
      '',
      '【Nguyên tắc kể chuyện】',
      '1. Viết theo góc nhìn ngôi thứ ba, văn phong tiểu thuyết',
      '2. Mỗi NPC có tính cách riêng, KHÔNG lẫn lộn giọng nói',
      '3. Mô tả cảm xúc, hành động, bối cảnh chi tiết',
      '4. Tôn trọng lựa chọn của {{user}} — không ép hướng',
      '5. LUÔN cập nhật biến khi có thay đổi',
      '',
      '【Quản lý nhiệm vụ】',
      '- Nhiệm vụ tự động kích hoạt khi điều kiện thỏa mãn',
      '- Nhiệm vụ phụ xuất hiện ngẫu nhiên dựa trên địa điểm',
      '- Hoàn thành nhiệm vụ → thưởng + mở nội dung mới',
    ].join('\n');

    base.data.first_mes = [
      '*Buổi sáng thức dậy. Ánh nắng len qua rèm cửa, tiếng chim hót ngoài ban công.*',
      '',
      '*Điện thoại rung nhẹ — một tin nhắn mới từ nhóm chat lớp.*',
      '',
      '*Hôm nay là thứ Hai. Bạn có thể:*',
      '',
      '1. 📱 Đọc tin nhắn nhóm',
      '2. 🏫 Chuẩn bị đi học',
      '3. 🛌 Ngủ thêm 5 phút',
      '4. 🍳 Xuống bếp nấu bữa sáng',
    ].join('\n');

    base.data.tags = ['system', 'narrator', 'multi-npc', 'mvuzod'];

    const entries: LorebookEntry[] = [
      entry(1, 'Quy tắc quản lý NPC', [
        '【QUẢN LÝ NPC】',
        '- Mỗi NPC có: Tên, Tính cách, Quan hệ với {{user}}, Lịch trình',
        '- NPC chỉ xuất hiện khi {{user}} ở đúng địa điểm + thời gian',
        '- Quan hệ NPC thay đổi theo hành động (±5 mỗi tương tác)',
        '- NPC có thể chủ động liên hệ {{user}} qua tin nhắn',
        '- Tối đa 3 NPC xuất hiện trong cùng một cảnh',
      ].join('\n'), { constant: true }),

      entry(2, 'Hệ thống thời gian', [
        '【HỆ THỐNG THỜI GIAN】',
        '- Mỗi hành động tiêu tốn thời gian: Di chuyển (~30 phút), Hoạt động (~1-2 giờ)',
        '- Thời gian trong ngày: Sáng → Trưa → Chiều → Tối → Đêm',
        '- Một số sự kiện chỉ xảy ra vào thời gian cụ thể',
        '- Khi Đêm: năng lượng giảm, nên về nhà nghỉ ngơi',
        '- Ngủ = hồi phục năng lượng + chuyển sang ngày mới',
      ].join('\n'), { constant: true }),

      entry(3, 'Hệ thống sự kiện', [
        '【SỰ KIỆN】',
        '- Sự kiện cố định: Sinh nhật NPC, lễ hội mùa, kỳ thi',
        '- Sự kiện ngẫu nhiên: 20% mỗi lần di chuyển',
        '- Sự kiện dây chuyền: Hoàn thành A → mở B',
        '- Mỗi sự kiện có reward: tiền, items, quan hệ NPC, nội dung mới',
      ].join('\n'), { constant: true }),

      entry(4, 'Format output Narrator', [
        '【FORMAT OUTPUT】',
        'Mỗi response của Narrator phải bao gồm:',
        '1. *Mô tả cảnh vật/bối cảnh* (nghiêng)',
        '2. Đối thoại NPC "trong ngoặc kép"',
        '3. *Hành động NPC* (nghiêng)',
        '4. Lựa chọn cho {{user}} (nếu có)',
        '5. <UpdateVariable> (luôn có)',
      ].join('\n'), { constant: true }),
    ];

    base.data.character_book = { name: 'Narrator', entries };

    const schemaTemplate = MVUZOD_TEMPLATES.find(t => t.id === 'slice_of_life');
    if (schemaTemplate) {
      (base.data.extensions as unknown as Record<string, unknown>).mvuzod = { schema: schemaTemplate.schema };
    }

    return base;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 4: CREATIVE / BLANK MVUZOD
// ═══════════════════════════════════════════════════════════════════════════

const creativeTemplate: CardTemplate = {
  id: 'card_creative',
  name: 'クリエイティブ — Creative Blank',
  description: 'Template trống với system prompt MVUZOD cơ bản. Tự do tạo nhân vật và thế giới.',
  icon: '✨',
  category: 'creative',
  includes: { schema: false, worldbook: false, regex: false, systemPrompt: true, firstMessage: false },
  preview: { entryCount: 0, estimatedTokens: 800, tags: ['Blank', 'Creative', 'MVUZOD-ready'] },
  build: () => {
    const base = createEmptyCard();
    base.data.name = '{{char}}';
    base.data.system_prompt = [
      '【Quy tắc hệ thống MVUZOD】',
      '1. Mỗi response PHẢI kết thúc bằng block <UpdateVariable> chứa JSON Patch.',
      '2. Cập nhật TẤT CẢ biến có thay đổi (stats, quan hệ, vật phẩm, thời gian...).',
      '3. Biến được quản lý bởi hệ thống bên ngoài — AI chỉ cần xuất <UpdateVariable>.',
      '4. KHÔNG bao giờ bịa ra biến mới, chỉ cập nhật biến đã có trong schema.',
      '5. Sử dụng JSON Patch RFC 6902 format: op, path, value.',
      '',
      '【Format <UpdateVariable>】',
      '<UpdateVariable>',
      '[',
      '  {"op": "replace", "path": "/path/to/field", "value": newValue}',
      ']',
      '</UpdateVariable>',
    ].join('\n');
    base.data.tags = ['mvuzod', 'creative', 'blank'];
    return base;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const CARD_TEMPLATES: CardTemplate[] = [
  romanceTemplate,
  adventureTemplate,
  systemTemplate,
  creativeTemplate,
];

/**
 * Get card template by ID.
 */
export function getCardTemplate(id: string): CardTemplate | undefined {
  return CARD_TEMPLATES.find(t => t.id === id);
}

/**
 * Apply a card template — merges template card data into current card structure.
 * Returns a new card object (does not mutate input).
 */
export function applyCardTemplate(template: CardTemplate, existingCard: CharacterCardV3): CharacterCardV3 {
  const built = template.build();
  const clone = structuredClone(existingCard);

  // Merge fields — template wins over empty defaults
  if (built.data) {
    if (built.data.name && built.data.name !== 'New Character') clone.data.name = built.data.name;
    if (built.data.description) clone.data.description = built.data.description;
    if (built.data.personality) clone.data.personality = built.data.personality;
    if (built.data.scenario) clone.data.scenario = built.data.scenario;
    if (built.data.system_prompt) clone.data.system_prompt = built.data.system_prompt;
    if (built.data.first_mes) clone.data.first_mes = built.data.first_mes;
    if (built.data.tags?.length) clone.data.tags = built.data.tags;

    // Worldbook — append, don't replace
    if (built.data.character_book?.entries?.length) {
      if (!clone.data.character_book) {
        clone.data.character_book = { name: clone.data.name, entries: [] };
      }
      const existingIds = new Set(clone.data.character_book.entries.map(e => e.comment));
      const newEntries = built.data.character_book.entries.filter(e => !existingIds.has(e.comment));
      clone.data.character_book.entries.push(...newEntries);
    }

    // Extensions (schema etc.) — merge
    if (built.data.extensions) {
      const ext = built.data.extensions as unknown as Record<string, unknown>;
      const targetExt = clone.data.extensions as unknown as Record<string, unknown>;
      for (const [key, value] of Object.entries(ext)) {
        if (key !== 'talkativeness' && key !== 'fav') {
          targetExt[key] = value;
        }
      }
    }
  }

  // Sync top-level fields
  clone.name = clone.data.name;
  clone.description = clone.data.description;

  return clone;
}

/**
 * Get all schema templates (from templateLibrary) together with card templates.
 */
export function getAllTemplates(): {
  cardTemplates: CardTemplate[];
  schemaTemplates: MVUZODTemplate[];
} {
  return {
    cardTemplates: CARD_TEMPLATES,
    schemaTemplates: MVUZOD_TEMPLATES,
  };
}
