/**
 * src/lib/mvuzod/templateLibrary.ts — MVUZOD Schema Templates
 * Spec Phụ Lục C: 7 RPG template presets
 */

import type { MVUZODSchema, MVUZODField } from '../../types/mvuzod.types';

export interface MVUZODTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  schema: MVUZODSchema;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════════════════════

function f(path: string, type: MVUZODField['type'], label: string, defaultValue: unknown, extra?: Partial<MVUZODField>): MVUZODField {
  return {
    path: `/${path}`, type, label, defaultValue,
    constraints: { prefault: defaultValue, ...(extra?.constraints ?? {}) },
    ...extra,
  };
}

function obj(path: string, label: string, children: MVUZODField[]): MVUZODField {
  return { path: `/${path}`, type: 'object', label, defaultValue: {}, constraints: { prefault: {} }, children };
}

function num(path: string, label: string, def: number, clamp?: [number, number]): MVUZODField {
  return f(path, 'number', label, def, { constraints: { coerce: true, clamp, prefault: def } });
}

function str(path: string, label: string, def = 'Chờ khởi tạo'): MVUZODField {
  return f(path, 'string', label, def);
}

function rec(path: string, label: string, desc: string): MVUZODField {
  return f(path, 'record', label, {}, { description: desc });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export const MVUZOD_TEMPLATES: MVUZODTemplate[] = [
  {
    id: 'rpg_basic',
    name: 'RPG Cơ Bản',
    description: 'HP, MP, EXP, Cấp, Bạc, Túi Đồ, Kỹ Năng, Trạng Thái',
    icon: '⚔️',
    schema: { version: '1.0', fields: [
      obj('Trạng thái thế giới', 'Thế giới', [
        str('Khu vực hiện tại', 'Khu vực'),
        str('Cảnh hiện tại', 'Cảnh'),
        f('Loại cảnh hiện tại', 'string', 'Loại cảnh', 'Hàng ngày', {
          description: "enum['Hàng ngày','Chiến đấu','Khám phá','Mua bán','Nghỉ ngơi']",
        }),
      ]),
      obj('Người chơi', 'Người chơi', [
        obj('Thông tin cơ bản', 'Cơ bản', [
          str('Họ tên', 'Tên'),
          num('Cấp', 'Cấp', 1, [1, 100]),
          num('EXP', 'EXP', 0, [0, 10000]),
        ]),
        obj('Chỉ số', 'Stats', [
          num('HP', 'HP', 100, [0, 9999]),
          num('MP', 'MP', 50, [0, 9999]),
          num('ATK', 'ATK', 10),
          num('DEF', 'DEF', 5),
        ]),
        num('Bạc', 'Bạc', 0, [0, 999999]),
        rec('Hành trang', 'Đồ vật', "Record<tên, {Mô tả, Số lượng}>"),
        rec('Kỹ năng', 'Kỹ năng', "Record<tên, {Cấp, Mô tả}>"),
      ]),
      rec('NPC', 'NPC', "Record<tênNPC, {Cấp, HP, Quan hệ, Có mặt}>"),
    ]},
  },
  {
    id: 'cultivation',
    name: 'Tu Tiên / Tu Luyện',
    description: 'Cảnh Giới, Linh Lực, Đan Điền, Kỹ Pháp, Bí Kíp, Linh Thảo',
    icon: '🏯',
    schema: { version: '1.0', fields: [
      obj('Trạng thái thế giới', 'Thế giới', [
        str('Khu vực hiện tại', 'Khu vực'),
        str('Thời đại hiện tại', 'Thời đại'),
        f('Loại cảnh hiện tại', 'string', 'Loại cảnh', 'Hàng ngày', {
          description: "enum['Hàng ngày','Chiến đấu','Tu luyện','Liệp hồn','Thi đấu','Thân mật']",
        }),
        str('Chương cốt truyện', 'Chương'),
      ]),
      obj('Người chơi', 'Người chơi', [
        obj('Thông tin cơ bản', 'Cơ bản', [
          str('Họ tên', 'Tên'),
          num('Tuổi', 'Tuổi', 16),
          str('Chủng tộc', 'Chủng tộc', 'Nhân loại'),
        ]),
        obj('Tu luyện', 'Tu luyện', [
          str('Cảnh giới', 'Cảnh giới'),
          num('Linh lực', 'Linh lực', 0, [0, 10000]),
          num('Đan điền', 'Đan điền', 100, [0, 100]),
        ]),
        rec('Kỹ pháp', 'Kỹ pháp', "Record<tên, {Cấp, Hệ, Mô tả}>"),
        rec('Bí kíp', 'Bí kíp', "Record<tên, {Đẳng cấp, Tiến độ}>"),
        rec('Linh thảo', 'Linh thảo', "Record<tên, {Số lượng, Phẩm chất}>"),
      ]),
      rec('NPC', 'NPC', "Record<tênNPC, {Cảnh giới, Chủng tộc, Quan hệ, Có mặt}>"),
    ]},
  },
  {
    id: 'dating_sim',
    name: 'Hẹn Hò / Dating Sim',
    description: 'Tình Cảm (NPC→0-100), Sự Kiện, Ngày, Địa Điểm',
    icon: '💕',
    schema: { version: '1.0', fields: [
      obj('Trạng thái', 'Trạng thái', [
        str('Ngày hiện tại', 'Ngày'),
        str('Thời gian', 'Thời gian', 'Sáng'),
        str('Địa điểm hiện tại', 'Địa điểm'),
        f('Mùa', 'string', 'Mùa', 'Xuân', { description: "enum['Xuân','Hạ','Thu','Đông']" }),
      ]),
      obj('Người chơi', 'Người chơi', [
        str('Tên', 'Tên'),
        num('Tiền', 'Tiền', 1000, [0, 999999]),
        rec('Quà tặng', 'Quà tặng', "Record<tên, {Số lượng}>"),
      ]),
      rec('Nhân vật', 'Nhân vật', "Record<tên, {Tình cảm: number[0-100], Trạng thái, Địa điểm, Sự kiện đã mở: string[]}>"),
      rec('Sự kiện đã mở', 'Sự kiện', "Record<tên, {Hoàn thành, Ngày}>"),
    ]},
  },
  {
    id: 'dungeon',
    name: 'Dungeon Crawler',
    description: 'HP, Giáp, ATK, DEF, Tầng, Phòng, Boss',
    icon: '🏰',
    schema: { version: '1.0', fields: [
      obj('Dungeon', 'Dungeon', [
        num('Tầng hiện tại', 'Tầng', 1, [1, 100]),
        num('Phòng hiện tại', 'Phòng', 1),
        rec('Phòng đã qua', 'Đã qua', "Record<tầng-phòng, {Loại, Đã dọn}>"),
        rec('Boss đã chết', 'Boss chết', "Record<tên, {Tầng, Phần thưởng}>"),
      ]),
      obj('Người chơi', 'Người chơi', [
        num('HP', 'HP', 100, [0, 999]),
        num('Giáp', 'Giáp', 10, [0, 999]),
        num('ATK', 'ATK', 15),
        num('DEF', 'DEF', 8),
        rec('Hành trang', 'Đồ vật', "Record<tên, {Loại, Sát thương/Phòng thủ, Số lượng}>"),
        rec('Buff', 'Buff', "Record<tên, {Thời hạn, Hiệu ứng}>"),
      ]),
    ]},
  },
  {
    id: 'economy',
    name: 'Kinh Tế Thương Mại',
    description: 'Vàng, Hàng Hoá, Danh Tiếng, Hợp Đồng, Quan Hệ NPC',
    icon: '💰',
    schema: { version: '1.0', fields: [
      obj('Thị trường', 'Thị trường', [
        str('Thành phố hiện tại', 'Thành phố'),
        f('Mùa buôn bán', 'string', 'Mùa', 'Bình thường', {
          description: "enum['Bình thường','Cao điểm','Suy thoái','Chiến tranh']",
        }),
      ]),
      obj('Người chơi', 'Người chơi', [
        num('Vàng', 'Vàng', 1000, [0, 999999]),
        num('Danh tiếng', 'Danh tiếng', 0, [-100, 100]),
        rec('Hàng hoá', 'Hàng hoá', "Record<tên, {Số lượng, Giá mua, Giá bán}>"),
        rec('Hợp đồng', 'Hợp đồng', "Record<tên, {Loại, Hạn, Thưởng, Trạng thái}>"),
      ]),
      rec('NPC', 'NPC', "Record<tên, {Nghề, Quan hệ: number[-100,100], Thành phố}>"),
    ]},
  },
  {
    id: 'slice_of_life',
    name: 'Đời Thường / Slice of Life',
    description: 'Ngày, Thời Tiết, Tâm Trạng, Công Việc, Quan Hệ, Sở Thích',
    icon: '🌸',
    schema: { version: '1.0', fields: [
      obj('Thế giới', 'Thế giới', [
        str('Ngày', 'Ngày'),
        f('Thời tiết', 'string', 'Thời tiết', 'Nắng', {
          description: "enum['Nắng','Mưa','Âm u','Tuyết','Gió','Nóng']",
        }),
        str('Địa điểm', 'Địa điểm', 'Nhà'),
      ]),
      obj('Người chơi', 'Người chơi', [
        str('Tên', 'Tên'),
        f('Tâm trạng', 'string', 'Tâm trạng', 'Bình thường', {
          description: "enum['Vui','Buồn','Bình thường','Mệt','Phấn khích','Lo lắng']",
        }),
        str('Công việc', 'Công việc'),
        num('Năng lượng', 'Năng lượng', 100, [0, 100]),
        num('Tiền', 'Tiền', 5000, [0, 999999]),
        rec('Sở thích', 'Sở thích', "Record<tên, {Cấp độ, Mô tả}>"),
      ]),
      rec('Quan hệ', 'Quan hệ', "Record<tên, {Loại, Mức độ: number[0-100], Ghi chú}>"),
    ]},
  },
  {
    id: 'mystery',
    name: 'Trinh Thám / Mystery',
    description: 'Manh Mối, Nghi Phạm, Địa Điểm Đã Thăm, Bằng Chứng',
    icon: '🔍',
    schema: { version: '1.0', fields: [
      obj('Vụ án', 'Vụ án', [
        str('Tên vụ án', 'Tên'),
        str('Trạng thái', 'Trạng thái', 'Đang điều tra'),
        num('Ngày điều tra', 'Ngày', 1),
      ]),
      obj('Thám tử', 'Thám tử', [
        str('Tên', 'Tên'),
        rec('Manh mối', 'Manh mối', "Record<tên, {Nguồn, Mô tả, Đã xác minh}>"),
        rec('Bằng chứng', 'Bằng chứng', "Record<tên, {Loại, Tìm ở, Liên quan đến}>"),
      ]),
      rec('Nghi phạm', 'Nghi phạm', "Record<tên, {Động cơ, Alibi, Mức nghi ngờ: number[0-100]}>"),
      rec('Địa điểm', 'Địa điểm', "Record<tên, {Đã thăm, Manh mối tìm được}>"),
    ]},
  },
];

/**
 * Get template by ID.
 */
export function getTemplate(id: string): MVUZODTemplate | undefined {
  return MVUZOD_TEMPLATES.find(t => t.id === id);
}
