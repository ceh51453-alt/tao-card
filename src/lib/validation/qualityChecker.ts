/**
 * qualityChecker.ts — Kiểm tra chất lượng theo tiêu chuẩn Minh Nguyệt
 * 
 * Phát hiện "bát cổ" (八股) — các mẫu mô tả sáo rỗng, máy móc.
 * Kiểm tra tag integrity, worldview completeness, palette structure.
 */

import type { LorebookEntry } from '../../types';
import { parseEntryTag, hasTag } from '../worldbook/tagManager';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type QualityIssueLevel = 'error' | 'warning' | 'info';
export type QualityCategory = 'bat_co' | 'tag' | 'structure' | 'content' | 'ejs';

export interface QualityIssue {
  id: string;
  level: QualityIssueLevel;
  category: QualityCategory;
  entryId?: number;
  entryComment?: string;
  message: string;
  suggestion?: string;
  matchedText?: string;     // Đoạn text vi phạm
  lineNumber?: number;
}

export interface QualityReport {
  totalEntries: number;
  issueCount: number;
  issues: QualityIssue[];
  scores: {
    overall: number;           // 0-100
    batCo: number;             // 0-100 (100 = sạch bát cổ)
    tagIntegrity: number;      // 0-100
    structureComplete: number; // 0-100
    contentQuality: number;    // 0-100
  };
  summary: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// BÁT CỔ DETECTION — Phát hiện mô tả sáo rỗng
// ═══════════════════════════════════════════════════════════════════════════

interface BatCoPattern {
  id: string;
  label: string;
  labelVi: string;
  patterns: RegExp[];
  suggestion: string;
}

const BAT_CO_PATTERNS: BatCoPattern[] = [
  {
    id: 'fuzzy_words',
    label: 'Từ mơ hồ',
    labelVi: 'Từ mơ hồ (模糊词)',
    patterns: [
      /dường như|hầu như|tựa hồ|giống như|tựa như|có vẻ như|dường bước|hình như/gi,
      /似乎|仿佛|好像|大概|差不多|像是/g,
    ],
    suggestion: 'Thay bằng mô tả cụ thể, trực tiếp. Bỏ từ mơ hồ.',
  },
  {
    id: 'bad_metaphor',
    label: 'Ẩn dụ kém',
    labelVi: 'Ẩn dụ kém chất lượng (劣质比喻)',
    patterns: [
      /như thú nhỏ|như thỏ con|như mèo con|như tiểu thú|như cáo nhỏ/gi,
      /ném đá xuống hồ|lòng hồ gợn sóng|tim đập loạn nhịp/gi,
      /如小兽|如小猫|如小鹿|投石入湖|心湖泛起涟漪/g,
    ],
    suggestion: 'Xóa ẩn dụ. Dùng bạch miêu (mô tả trực tiếp hành vi).',
  },
  {
    id: 'micro_expression',
    label: 'Vi biểu cảm',
    labelVi: 'Vi biểu cảm (微表情)',
    patterns: [
      /khóe miệng nhếch lên|mắt lóe sáng|đầu ngón tay trắng bệch/gi,
      /mi mắt khẽ rung|hàng mi rung nhẹ|đồng tử co lại/gi,
      /嘴角微微上扬|眼底闪过一丝|指尖泛白|瞳孔微缩|睫毛轻颤/g,
    ],
    suggestion: 'Vi biểu cảm quá tinh tế, AI không thể diễn tự nhiên. Dùng hành vi rõ ràng.',
  },
  {
    id: 'tone_description',
    label: 'Mô tả ngữ khí',
    labelVi: 'Mô tả ngữ khí (语气描写)',
    patterns: [
      /bằng giọng .{2,20}|dùng ngữ điệu .{2,20}|với giọng .{2,20}/gi,
      /用.{1,10}的语气|以.{1,10}的口吻/g,
    ],
    suggestion: 'Để lời thoại tự thể hiện ngữ khí. Không mô tả ngữ khí.',
  },
  {
    id: 'extreme_emotion',
    label: 'Cảm xúc cực đoan',
    labelVi: 'Từ cảm xúc cực đoan (极端情绪词)',
    patterns: [
      /nỗi sợ cực độ|xấu hổ tột cùng|hạnh phúc tột đỉnh|đau đớn cực độ/gi,
      /cơn hoảng loạn|tuyệt vọng tận cùng|giận dữ bùng nổ/gi,
      /陷入了极度|极致的|无尽的|彻骨的/g,
    ],
    suggestion: 'Thể hiện cảm xúc qua hành vi cụ thể, không dùng tính từ cực đoan.',
  },
  {
    id: 'negation_transition',
    label: 'Câu phủ định chuyển',
    labelVi: 'Câu phủ định chuyển (否定转折句)',
    patterns: [
      /không phải\s*[.…]*\s*mà là/gi,
      /不是.*而是.*本质上/g,
    ],
    suggestion: 'Nói thẳng nó LÀ GÌ, không cần phủ định trước.',
  },
  {
    id: 'beauty_template',
    label: 'Mô tả mỹ nhân vạn năng',
    labelVi: 'Mô tả mỹ nhân vạn năng (万能美人描写)',
    patterns: [
      /tinh tế|da trắng ngần|đôi mắt sáng ngời|gương mặt hoàn hảo|vẻ đẹp mê hồn/gi,
      /sắc đẹp nghiêng nước nghiêng thành|dung mạo tuyệt trần/gi,
      /精致的脸|白皙的肌肤|完美的五官|倾国倾城/g,
    ],
    suggestion: 'Chỉ viết đặc trưng KHÁC BIỆT. Xóa mô tả mỹ nhân chung chung.',
  },
  {
    id: 'inner_monologue',
    label: 'Tâm lý quá mức',
    labelVi: 'Tâm lý nội tâm quá mức',
    patterns: [
      /trong lòng thầm nghĩ|nội tâm giằng xé|sâu thẳm trong lòng|tận đáy lòng/gi,
      /内心深处|在心底|灵魂深处|内心挣扎/g,
    ],
    suggestion: 'Giảm nội tâm, tăng hành vi bên ngoài. Show, don\'t tell.',
  },
];

/** Quét content tìm bát cổ */
function detectBatCo(content: string, entryId?: number, entryComment?: string): QualityIssue[] {
  const issues: QualityIssue[] = [];
  
  for (const pattern of BAT_CO_PATTERNS) {
    for (const regex of pattern.patterns) {
      // Reset regex state
      const re = new RegExp(regex.source, regex.flags);
      let match: RegExpExecArray | null;
      
      while ((match = re.exec(content)) !== null) {
        // Tìm line number
        const before = content.substring(0, match.index);
        const lineNum = before.split('\n').length;
        
        issues.push({
          id: `${pattern.id}_${entryId ?? 0}_${match.index}`,
          level: 'warning',
          category: 'bat_co',
          entryId,
          entryComment,
          message: `${pattern.labelVi}: "${match[0]}"`,
          suggestion: pattern.suggestion,
          matchedText: match[0],
          lineNumber: lineNum,
        });
      }
    }
  }
  
  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════
// TAG INTEGRITY CHECK
// ═══════════════════════════════════════════════════════════════════════════

function checkTagIntegrity(entries: LorebookEntry[]): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const tagIds = new Map<number, number[]>();  // tagId → entryIds
  
  for (const entry of entries) {
    if (!entry.content.trim()) continue;
    
    const parsed = parseEntryTag(entry.content);
    
    if (!hasTag(entry.content)) {
      issues.push({
        id: `tag_missing_${entry.id}`,
        level: 'info',
        category: 'tag',
        entryId: entry.id,
        entryComment: entry.comment,
        message: `Entry chưa có tag <tên_idN>`,
        suggestion: 'Chạy "Auto Tag" để tự động gán tag.',
      });
    } else if (parsed) {
      // Theo dõi ID trùng
      const existing = tagIds.get(parsed.tagId) ?? [];
      existing.push(entry.id);
      tagIds.set(parsed.tagId, existing);
    }
    
    // Kiểm tra tag mở nhưng không đóng
    const openMatch = entry.content.match(/<([^/][^>]*_id\d+)>/g);
    const closeMatch = entry.content.match(/<\/([^>]*_id\d+)>/g);
    if (openMatch && (!closeMatch || openMatch.length !== closeMatch.length)) {
      issues.push({
        id: `tag_unclosed_${entry.id}`,
        level: 'error',
        category: 'tag',
        entryId: entry.id,
        entryComment: entry.comment,
        message: `Tag mở nhưng không đóng đúng`,
        suggestion: 'Kiểm tra tag đóng </tên_idN> cuối entry.',
      });
    }
  }
  
  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════
// STRUCTURE CHECK — Kiểm tra cấu trúc bảng điều sắc
// ═══════════════════════════════════════════════════════════════════════════

function checkPaletteStructure(entries: LorebookEntry[]): QualityIssue[] {
  const issues: QualityIssue[] = [];
  
  for (const entry of entries) {
    const content = entry.content.toLowerCase();
    
    // Phát hiện entry bảng điều sắc
    const isPalette = content.includes('điều sắc') || content.includes('调色盘') ||
                      content.includes('màu nền') || content.includes('chủ sắc') ||
                      content.includes('底色') || content.includes('主色调');
    
    if (!isPalette) continue;
    
    // Kiểm tra có đủ thành phần không
    const hasBaseColor = /màu nền|底色/i.test(content);
    const hasMainColor = /chủ sắc|主色调/i.test(content);
    const hasAccent = /điểm xuyết|点缀/i.test(content);
    const hasDerivatives = /phái sinh|衍生/i.test(content);
    
    if (!hasBaseColor) {
      issues.push({
        id: `palette_no_base_${entry.id}`,
        level: 'warning',
        category: 'structure',
        entryId: entry.id,
        entryComment: entry.comment,
        message: 'Bảng điều sắc thiếu "Màu nền" (底色)',
        suggestion: 'Thêm màu nền — nét tính cách sâu nhất, luôn tồn tại.',
      });
    }
    if (!hasMainColor) {
      issues.push({
        id: `palette_no_main_${entry.id}`,
        level: 'warning',
        category: 'structure',
        entryId: entry.id,
        entryComment: entry.comment,
        message: 'Bảng điều sắc thiếu "Chủ sắc" (主色调)',
        suggestion: 'Thêm chủ sắc — nét tính cách nổi bật nhất.',
      });
    }
    if (!hasDerivatives) {
      issues.push({
        id: `palette_no_derivatives_${entry.id}`,
        level: 'error',
        category: 'structure',
        entryId: entry.id,
        entryComment: entry.comment,
        message: 'Bảng điều sắc thiếu "Phái sinh" (衍生) — TRỌNG TÂM!',
        suggestion: 'Phái sinh là phần quan trọng nhất. Mỗi tính cách cần ít nhất 2-3 phái sinh cụ thể.',
      });
    }
    if (!hasAccent) {
      issues.push({
        id: `palette_no_accent_${entry.id}`,
        level: 'info',
        category: 'structure',
        entryId: entry.id,
        entryComment: entry.comment,
        message: 'Bảng điều sắc chưa có "Điểm xuyết" (点缀)',
        suggestion: 'Điểm xuyết là tùy chọn, nhưng thường là phần chân thực nhất của nhân vật.',
      });
    }
  }
  
  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════
// EJS CODE CHECK
// ═══════════════════════════════════════════════════════════════════════════

function checkEjsCode(entries: LorebookEntry[]): QualityIssue[] {
  const issues: QualityIssue[] = [];
  
  for (const entry of entries) {
    const content = entry.content;
    if (!content.includes('<%') && !content.includes('@@preprocessing')) continue;
    
    // Kiểm tra getvar/setvar sử dụng stat_data prefix
    const getvarCalls = content.matchAll(/getvar\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
    for (const match of getvarCalls) {
      if (!match[1].startsWith('stat_data')) {
        issues.push({
          id: `ejs_no_stat_data_${entry.id}_${match.index}`,
          level: 'warning',
          category: 'ejs',
          entryId: entry.id,
          entryComment: entry.comment,
          message: `getvar("${match[1]}") — nên dùng prefix "stat_data" cho biến MVU`,
          suggestion: 'Quy ước: tất cả biến MVU đều bắt đầu bằng stat_data (ví dụ: stat_data_hp)',
        });
      }
    }
    
    // Kiểm tra typeof guard cho getvar
    const hasTypeof = /typeof\s+.*getvar|getvar.*!==?\s*undefined/i.test(content);
    const hasGetvar = /getvar\s*\(/i.test(content);
    if (hasGetvar && !hasTypeof) {
      issues.push({
        id: `ejs_no_typeof_${entry.id}`,
        level: 'info',
        category: 'ejs',
        entryId: entry.id,
        entryComment: entry.comment,
        message: 'getvar() không có typeof guard — có thể undefined nếu biến chưa khởi tạo',
        suggestion: 'Thêm kiểm tra: if (typeof getvar("var") !== "undefined") { ... }',
      });
    }
    
    // Kiểm tra <%- (unescaped) vs <%= (escaped)
    const unescapedCount = (content.match(/<%-/g) || []).length;
    const escapedCount = (content.match(/<%=/g) || []).length;
    if (escapedCount > 0 && unescapedCount === 0) {
      issues.push({
        id: `ejs_escaped_only_${entry.id}`,
        level: 'info',
        category: 'ejs',
        entryId: entry.id,
        entryComment: entry.comment,
        message: 'Chỉ dùng <%= (escaped output). Cần <%- cho HTML/YAML output không escape.',
        suggestion: 'SillyTavern thường cần <%- (unescaped) để output đúng format.',
      });
    }
  }
  
  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CHECKER
// ═══════════════════════════════════════════════════════════════════════════

/** Chạy kiểm tra chất lượng toàn diện */
export function runQualityCheck(entries: LorebookEntry[]): QualityReport {
  const allIssues: QualityIssue[] = [];
  
  // 1. Bát cổ detection
  for (const entry of entries) {
    if (!entry.content.trim()) continue;
    const batCoIssues = detectBatCo(entry.content, entry.id, entry.comment);
    allIssues.push(...batCoIssues);
  }
  
  // 2. Tag integrity
  allIssues.push(...checkTagIntegrity(entries));
  
  // 3. Palette structure
  allIssues.push(...checkPaletteStructure(entries));
  
  // 4. EJS code
  allIssues.push(...checkEjsCode(entries));
  
  // ─── Tính điểm ───
  const batCoCount = allIssues.filter(i => i.category === 'bat_co').length;
  const tagIssues = allIssues.filter(i => i.category === 'tag').length;
  const structureIssues = allIssues.filter(i => i.category === 'structure').length;
  const contentIssues = allIssues.filter(i => i.category === 'content').length;
  
  const totalEntries = entries.length;
  const maxBatCo = totalEntries * 3;  // Giả sử tối đa 3 vấn đề/entry
  
  const batCoScore = Math.max(0, Math.round(100 - (batCoCount / Math.max(maxBatCo, 1)) * 100));
  const tagScore = totalEntries > 0
    ? Math.round(100 - (tagIssues / totalEntries) * 100)
    : 100;
  const structureScore = Math.max(0, 100 - structureIssues * 15);
  const contentScore = Math.max(0, 100 - contentIssues * 10);
  const overall = Math.round((batCoScore + tagScore + structureScore + contentScore) / 4);
  
  // ─── Summary ───
  const errorCount = allIssues.filter(i => i.level === 'error').length;
  const warningCount = allIssues.filter(i => i.level === 'warning').length;
  const infoCount = allIssues.filter(i => i.level === 'info').length;
  
  let summary = `📊 Điểm chất lượng: ${overall}/100`;
  if (errorCount > 0) summary += ` | ❌ ${errorCount} lỗi`;
  if (warningCount > 0) summary += ` | ⚠️ ${warningCount} cảnh báo`;
  if (infoCount > 0) summary += ` | ℹ️ ${infoCount} gợi ý`;
  if (allIssues.length === 0) summary += ' | ✅ Sạch!';
  
  return {
    totalEntries,
    issueCount: allIssues.length,
    issues: allIssues,
    scores: {
      overall,
      batCo: batCoScore,
      tagIntegrity: tagScore,
      structureComplete: structureScore,
      contentQuality: contentScore,
    },
    summary,
  };
}

/** Chỉ kiểm tra bát cổ cho 1 đoạn text */
export function checkTextForBatCo(text: string): QualityIssue[] {
  return detectBatCo(text);
}
