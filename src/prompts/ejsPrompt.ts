/**
 * src/prompts/ejsPrompt.ts — AI Prompt cho EJS Code Generation
 * Dạy AI sinh EJS @@preprocessing code cho SillyTavern TavernHelper
 */

import type { MVUZODSchema, MVUZODField } from '../types/mvuzod.types';
import type { LorebookEntry } from '../types';
import { formatExamplesForPrompt } from './ejsExamples';

// ─── EJS TEMPLATE CATEGORIES ────────────────────────────────────────────────

export type EJSTemplateCategory =
  | 'conditional_entry'
  | 'dynamic_content'
  | 'stat_reader'
  | 'multi_stage'
  | 'variable_display'
  | 'custom';

export const EJS_TEMPLATE_LABELS: Record<EJSTemplateCategory, { label: string; emoji: string; desc: string }> = {
  conditional_entry: {
    label: 'Bật/Tắt Entries theo điều kiện',
    emoji: '🔀',
    desc: 'Tự động bật/tắt worldbook entries dựa trên giá trị biến (era, mood, stats...)',
  },
  dynamic_content: {
    label: 'Sinh nội dung động',
    emoji: '✨',
    desc: 'Tạo nội dung text động dựa trên stat_data (mô tả trạng thái, tóm tắt...)',
  },
  stat_reader: {
    label: 'Đọc và hiển thị biến',
    emoji: '📊',
    desc: 'Đọc biến từ stat_data và xuất dạng text cho AI context',
  },
  multi_stage: {
    label: 'Multi-stage Persona',
    emoji: '🎭',
    desc: 'Thay đổi persona/tính cách nhân vật theo giá trị stat (ví dụ: corruption level)',
  },
  variable_display: {
    label: 'Hiển thị biến cho AI',
    emoji: '📋',
    desc: 'Xuất bảng stat cho AI đọc, dạng structured text',
  },
  custom: {
    label: 'Tự mô tả yêu cầu',
    emoji: '🛠️',
    desc: 'Nhập mô tả tự do, AI sẽ sinh EJS phù hợp',
  },
};

// ─── SYSTEM PROMPT ──────────────────────────────────────────────────────────

export const EJS_SYSTEM_PROMPT = `
Bạn là chuyên gia viết EJS template cho SillyTavern TavernHelper (@@preprocessing).
Nhiệm vụ: sinh ra code EJS hoàn chỉnh, chạy được ngay trong worldbook entry.

═══ CÚ PHÁP EJS ═══

Code EJS nằm trong worldbook entry, BẮT BUỘC bắt đầu bằng @@preprocessing ở dòng đầu.

Tag types:
  <%_  _%>    Statement (logic, khai báo biến) — dùng nhiều nhất
  <%=  %>     Expression output (in giá trị ra prompt)
  <%-  %>     Raw output (in HTML không escape)
  <%#  %>     Comment (bị bỏ qua khi render)

Ví dụ cấu trúc cơ bản:
\`\`\`
@@preprocessing
<%_
  // Đọc biến
  var hp = getvar('stat_data.Nhân vật.HP', { defaults: 100 });
  var era = getvar('stat_data.Trạng thái.Thời đại', { defaults: 'Hiện đại' });
_%>
\`\`\`

═══ BUILT-IN FUNCTIONS ═══

📖 ĐỌC/GHI BIẾN:
  getvar(key, opts)             Đọc biến. opts: { defaults, scope }
                                Key dùng dấu chấm: 'stat_data.Nhân vật.HP'
  setvar(key, value)            Ghi biến

📝 OUTPUT:
  print(text)                   In text vào prompt context
  <%= expr %>                   In giá trị expression

📚 WORLDBOOK:
  getwi(comment)                Đọc nội dung entry theo comment
  activateEntry(id, bool)       Bật/tắt entry theo ID số
  setEntryEnabled(comment, bool)  Bật/tắt entry theo comment text
  setEntryContent(comment, text)  Ghi nội dung entry

💉 INJECTION:
  injectPrompt(opts)            Inject text vào prompt
                                opts: { text, position: 'in_chat', depth: N }

💬 CHAT:
  getChatMessages(idx, role)    Đọc tin nhắn chat (-1 = cuối)

📌 MVU DATA:
  Mvu.getMvuData(opts)          Đọc MVU state
                                opts: {type:'message', message_id:'latest'}

═══ SLASH COMMANDS QUAN TRỌNG (dùng trong STScript, KHÔNG dùng trong EJS) ═══

/getvar key                     Đọc local variable
/setvar key=name value          Ghi local variable
/getglobalvar key               Đọc global variable
/setglobalvar key=name value    Ghi global variable
/ejs code                       Chạy EJS template
/ejs-refresh                    Preload world info
/sendas name=CharName text      Gửi tin nhắn dưới tên nhân vật
/trigger                        Trigger AI response
/echo text                      Hiển thị toast message

═══ QUY TẮC QUAN TRỌNG ═══

1. LUÔN bắt đầu bằng @@preprocessing
2. KHÔNG dùng this.variables — dùng getvar()
3. stat_data dùng dấu chấm (.) làm path separator, KHÔNG dùng gạch chéo (/)
4. Khai báo biến dùng var (KHÔNG dùng let/const — scoping khác trong EJS)
5. getvar trả về string — cần parse nếu so sánh số: Number(getvar(...))
6. Comment entry nên có prefix "EJS:" để dễ nhận biết
7. Dùng <%_ _%> (whitespace slurp) để tránh xuống dòng thừa
8. Logic phức tạp nên chia nhỏ thành nhiều entries

═══ ĐỊNH DẠNG OUTPUT ═══

Trả về JSON object:
{
  "explanation": "Giải thích ngắn gọn EJS code làm gì",
  "entryComment": "Tên ngắn cho entry (prefix EJS:)",
  "code": "@@preprocessing\\n<%_ ... _%>"
}

CHỈ trả về JSON. KHÔNG markdown, KHÔNG giải thích bên ngoài JSON.
`;

// ─── USER PROMPT BUILDERS ───────────────────────────────────────────────────

export function buildEjsUserPrompt(
  category: EJSTemplateCategory,
  schema: MVUZODSchema | null,
  entries: LorebookEntry[],
  characterName: string,
  customInstructions: string,
  options?: {
    selectedEntryIds?: number[];
    selectedFieldPaths?: string[];
    iterationCode?: string;  // existing code for AI to improve
    iterationFeedback?: string;  // user feedback for iteration
  },
): string {
  const parts: string[] = [];

  // 1. Schema context (optionally filtered)
  if (schema) {
    if (options?.selectedFieldPaths?.length) {
      const filtered = filterSchemaFields(schema.fields, options.selectedFieldPaths);
      parts.push(`=== MVUZOD SCHEMA (${options.selectedFieldPaths.length} fields được chọn) ===\n${formatSchemaTree(filtered, 0)}`);
    } else {
      parts.push(`=== MVUZOD SCHEMA ===\n${formatSchemaForEjsPrompt(schema)}`);
    }
  } else {
    parts.push('=== SCHEMA: Không có MVUZOD schema ===\nKhông có schema. Dùng getvar() với path tự do.');
  }

  // 2. Existing entries context (optionally filtered)
  const allNonEjsEntries = entries.filter(e => !e.content.trimStart().startsWith('@@preprocessing'));
  const ejsEntries = entries.filter(e => e.content.trimStart().startsWith('@@preprocessing'));

  // If user selected specific entries, highlight them
  const selectedIds = options?.selectedEntryIds;
  const nonEjsEntries = selectedIds?.length
    ? allNonEjsEntries.filter(e => selectedIds.includes(e.id))
    : allNonEjsEntries;

  if (nonEjsEntries.length > 0) {
    const prefix = selectedIds?.length ? `(${nonEjsEntries.length} entries ĐƯỢC CHỌN)` : `(${nonEjsEntries.length} entries thường)`;
    parts.push(`=== WORLDBOOK ENTRIES ${prefix} ===
${nonEjsEntries.slice(0, 30).map(e => {
  const status = e.enabled ? '🟢' : '🔴';
  const keys = e.keys.length > 0 ? ` | keys: ${e.keys.slice(0, 5).join(', ')}` : '';
  return `  ${status} [id=${e.id}] "${e.comment || '(no comment)'}"${keys}`;
}).join('\n')}${nonEjsEntries.length > 30 ? `\n  ... và ${nonEjsEntries.length - 30} entries khác` : ''}`);
  }

  if (ejsEntries.length > 0) {
    parts.push(`=== EJS ENTRIES ĐÃ CÓ (${ejsEntries.length}) ===
${ejsEntries.map(e => `  [id=${e.id}] "${e.comment}" — ${e.content.split('\n').length} dòng`).join('\n')}
KHÔNG tạo lại logic đã có trong các EJS entries trên.`);
  }

  // 3. Character context
  if (characterName) {
    parts.push(`=== NHÂN VẬT ===\nTên: ${characterName}`);
  }

  // 4. Category-specific prompt
  parts.push(getCategoryPrompt(category, schema, nonEjsEntries));

  // 5. Few-shot examples (Phase 2)
  const examples = formatExamplesForPrompt(category);
  if (examples) {
    parts.push(examples);
  }

  // 6. Iteration mode (Phase 2) — send existing code + feedback
  if (options?.iterationCode) {
    parts.push(`=== CODE HIỆN TẠI (CẦN SỬA) ===
\`\`\`
${options.iterationCode}
\`\`\`

NGƯỜI DÙNG YÊU CẦU: ${options.iterationFeedback || 'Cải thiện code này'}

Hãy sửa/cải thiện code trên theo yêu cầu. Giữ lại logic tốt, chỉ sửa phần cần thiết.`);
  }

  // 7. Custom instructions
  if (customInstructions.trim()) {
    parts.push(`=== YÊU CẦU TỪ NGƯỜI DÙNG ===\n${customInstructions.trim()}`);
  }

  return parts.join('\n\n');
}

// ─── CATEGORY PROMPTS ───────────────────────────────────────────────────────

function getCategoryPrompt(
  category: EJSTemplateCategory,
  schema: MVUZODSchema | null,
  entries: LorebookEntry[],
): string {
  switch (category) {
    case 'conditional_entry':
      return buildConditionalEntryPrompt(schema, entries);
    case 'dynamic_content':
      return buildDynamicContentPrompt(schema);
    case 'stat_reader':
      return buildStatReaderPrompt(schema);
    case 'multi_stage':
      return buildMultiStagePrompt(schema);
    case 'variable_display':
      return buildVariableDisplayPrompt(schema);
    case 'custom':
      return '=== YÊU CẦU: TỰ DO ===\nSinh EJS code theo mô tả của người dùng bên dưới.';
  }
}

function buildConditionalEntryPrompt(schema: MVUZODSchema | null, entries: LorebookEntry[]): string {
  const enumFields = schema ? collectLeafFields(schema.fields).filter(f => f.constraints?.enumValues?.length) : [];
  const boolFields = schema ? collectLeafFields(schema.fields).filter(f => f.type === 'boolean') : [];
  const numFields = schema ? collectLeafFields(schema.fields).filter(f => f.type === 'number') : [];

  const toggleableEntries = entries.filter(e => e.comment && !e.constant);

  return `=== YÊU CẦU: BẬT/TẮT ENTRIES THEO ĐIỀU KIỆN ===

Tạo EJS code đọc biến từ stat_data và bật/tắt worldbook entries tương ứng.

${enumFields.length > 0 ? `Field enum có thể dùng làm điều kiện:\n${enumFields.map(f => `  - ${f.label}: [${f.constraints?.enumValues?.join(', ')}]`).join('\n')}` : ''}
${boolFields.length > 0 ? `Field boolean:\n${boolFields.map(f => `  - ${f.label}`).join('\n')}` : ''}
${numFields.length > 0 ? `Field số (dùng so sánh ngưỡng):\n${numFields.slice(0, 10).map(f => `  - ${f.label} (${f.constraints?.clamp ? `range: ${f.constraints.clamp[0]}~${f.constraints.clamp[1]}` : 'number'})`).join('\n')}` : ''}

${toggleableEntries.length > 0 ? `Entries có thể bật/tắt:\n${toggleableEntries.slice(0, 20).map(e => `  [id=${e.id}] "${e.comment}" — ${e.enabled ? 'đang bật' : 'đang tắt'}`).join('\n')}` : 'Không có entries rõ ràng để toggle. Tạo ví dụ generic.'}

PATTERN:
\`\`\`
@@preprocessing
<%_
  var era = getvar('stat_data.Trạng thái.Thời đại', { defaults: 'Hiện đại' });
  setEntryEnabled('WB: Cổ đại', era === 'Cổ đại');
  setEntryEnabled('WB: Hiện đại', era === 'Hiện đại');
_%>
\`\`\``;
}

function buildDynamicContentPrompt(schema: MVUZODSchema | null): string {
  const fields = schema ? collectLeafFields(schema.fields).filter(f => !f.constraints?.hidden) : [];

  return `=== YÊU CẦU: SINH NỘI DUNG ĐỘNG ===

Tạo EJS code đọc biến và sinh text mô tả trạng thái hiện tại, inject vào context cho AI đọc.

${fields.length > 0 ? `Các biến có thể dùng:\n${fields.slice(0, 15).map(f => `  - ${f.label} (${f.type}${f.defaultValue !== undefined ? `, default: ${JSON.stringify(f.defaultValue)}` : ''})`).join('\n')}` : ''}

PATTERN:
\`\`\`
@@preprocessing
<%_
  var hp = Number(getvar('stat_data.Nhân vật.HP', { defaults: 100 }));
  var mood = getvar('stat_data.Nhân vật.Tâm trạng', { defaults: 'Bình thường' });
  
  var desc = '';
  if (hp < 30) desc += 'Nhân vật đang bị thương nặng, sắp ngất. ';
  if (mood === 'Tức giận') desc += 'Đang rất tức giận, lời nói gay gắt. ';
  
  if (desc) print('[Trạng thái hiện tại: ' + desc.trim() + ']');
_%>
\`\`\``;
}

function buildStatReaderPrompt(schema: MVUZODSchema | null): string {
  const fields = schema ? collectLeafFields(schema.fields).filter(f => !f.constraints?.hidden) : [];

  return `=== YÊU CẦU: ĐỌC VÀ HIỂN THỊ BIẾN ===

Tạo EJS code đọc tất cả biến quan trọng và print dạng structured text.

${fields.length > 0 ? `Các biến:\n${fields.slice(0, 20).map(f => `  - ${f.label} (${f.type})`).join('\n')}` : ''}

PATTERN:
\`\`\`
@@preprocessing
<%_
  var hp = getvar('stat_data.Nhân vật.HP', { defaults: 100 });
  var mp = getvar('stat_data.Nhân vật.MP', { defaults: 50 });
  print('[Stats: HP=' + hp + ', MP=' + mp + ']');
_%>
\`\`\``;
}

function buildMultiStagePrompt(schema: MVUZODSchema | null): string {
  const numericFields = schema ? collectLeafFields(schema.fields).filter(f => f.type === 'number' && f.constraints?.clamp) : [];
  const enumFields = schema ? collectLeafFields(schema.fields).filter(f => f.constraints?.enumValues?.length) : [];

  return `=== YÊU CẦU: MULTI-STAGE PERSONA ===

Tạo EJS code thay đổi persona/hành vi nhân vật theo stat (ví dụ: mức độ thân mật, corruption, mood level).

${numericFields.length > 0 ? `Field số có range (tốt cho multi-stage):\n${numericFields.slice(0, 10).map(f => `  - ${f.label}: ${f.constraints?.clamp?.[0]}~${f.constraints?.clamp?.[1]}`).join('\n')}` : ''}
${enumFields.length > 0 ? `Field enum (tốt cho mode switching):\n${enumFields.slice(0, 5).map(f => `  - ${f.label}: [${f.constraints?.enumValues?.join(', ')}]`).join('\n')}` : ''}

PATTERN:
\`\`\`
@@preprocessing
<%_
  var corruption = Number(getvar('stat_data.Nhân vật.Corruption', { defaults: 0 }));
  var stage = '';
  
  if (corruption < 25) stage = 'Ngây thơ, trong sáng, từ chối mọi hành vi xấu.';
  else if (corruption < 50) stage = 'Bắt đầu tò mò, dễ bị dao động.';
  else if (corruption < 75) stage = 'Chủ động tìm kiếm, thích thú với điều cấm kỵ.';
  else stage = 'Hoàn toàn sa ngã, không còn kiềm chế.';
  
  print('[Persona hiện tại: ' + stage + ']');
_%>
\`\`\``;
}

function buildVariableDisplayPrompt(schema: MVUZODSchema | null): string {
  const fields = schema ? schema.fields.filter(f => !f.constraints?.hidden) : [];

  return `=== YÊU CẦU: HIỂN THỊ BẢNG BIẾN CHO AI ===

Tạo EJS code xuất tất cả biến dạng bảng structured text để AI context luôn cập nhật.

${fields.length > 0 ? `Schema structure:\n${formatSchemaTree(fields, 0)}` : 'Không có schema. Tạo ví dụ generic.'}

PATTERN:
\`\`\`
@@preprocessing
<%_
  var data = Mvu.getMvuData({type:'message', message_id:'latest'});
  var stats = data?.stat_data ?? {};
  
  var lines = ['[== TRẠNG THÁI HIỆN TẠI ==]'];
  // Iterate và format
  print(lines.join('\\n'));
_%>
\`\`\``;
}

// ─── PARSE RESPONSE ─────────────────────────────────────────────────────────

export interface EJSGenerationResult {
  explanation: string;
  entryComment: string;
  code: string;
}

/**
 * Parse AI response JSON into EJSGenerationResult.
 * Handles common AI quirks: markdown fences, trailing commas, etc.
 */
export function parseEjsResponse(rawText: string): EJSGenerationResult {
  // Strip markdown fences if present
  let text = rawText.trim();
  text = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
  text = text.replace(/^```\s*/i, '').replace(/```\s*$/i, '');

  // Try to find JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI không trả về JSON hợp lệ. Vui lòng thử lại.');
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      explanation: parsed.explanation ?? '',
      entryComment: parsed.entryComment ?? 'EJS: Generated',
      code: parsed.code ?? '',
    };
  } catch {
    // Try fixing trailing commas
    const fixed = jsonMatch[0].replace(/,\s*([\]}])/g, '$1');
    try {
      const parsed = JSON.parse(fixed);
      return {
        explanation: parsed.explanation ?? '',
        entryComment: parsed.entryComment ?? 'EJS: Generated',
        code: parsed.code ?? '',
      };
    } catch {
      throw new Error('Không thể parse JSON từ phản hồi AI. Vui lòng thử lại.');
    }
  }
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function formatSchemaForEjsPrompt(schema: MVUZODSchema): string {
  return formatSchemaTree(schema.fields, 0);
}

function formatSchemaTree(fields: MVUZODField[], indent: number): string {
  const lines: string[] = [];
  for (const f of fields) {
    const pad = '  '.repeat(indent);
    const name = f.path.split('/').filter(Boolean).pop() ?? f.path;
    const extras: string[] = [];
    if (f.constraints?.hidden) extras.push('hidden');
    if (f.constraints?.readOnly) extras.push('readOnly');
    if (f.constraints?.clamp) extras.push(`range: ${f.constraints.clamp[0]}~${f.constraints.clamp[1]}`);
    if (f.constraints?.enumValues?.length) extras.push(`enum: [${f.constraints.enumValues.join(', ')}]`);
    if (f.defaultValue !== undefined) extras.push(`default: ${JSON.stringify(f.defaultValue)}`);
    const extStr = extras.length ? ` (${extras.join(', ')})` : '';
    lines.push(`${pad}${name}: ${f.type}${f.label !== name ? ` [${f.label}]` : ''}${extStr}`);
    if (f.children?.length) {
      lines.push(formatSchemaTree(f.children, indent + 1));
    }
  }
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

/**
 * Filter schema fields to only include those matching selected paths.
 * Keeps parent hierarchy intact when a child is selected.
 */
function filterSchemaFields(fields: MVUZODField[], selectedPaths: string[]): MVUZODField[] {
  const result: MVUZODField[] = [];
  for (const f of fields) {
    if (selectedPaths.includes(f.path)) {
      result.push(f);
    } else if (f.children?.length) {
      const filtered = filterSchemaFields(f.children, selectedPaths);
      if (filtered.length > 0) {
        result.push({ ...f, children: filtered });
      }
    }
  }
  return result;
}

/**
 * Flatten all fields (including nested) into a flat list for field picker UI.
 */
export function flattenAllFields(fields: MVUZODField[], prefix = ''): Array<{
  path: string;
  label: string;
  type: string;
  depth: number;
}> {
  const result: Array<{ path: string; label: string; type: string; depth: number }> = [];
  for (const f of fields) {
    const depth = f.path.split('/').filter(Boolean).length - 1;
    result.push({ path: f.path, label: f.label, type: f.type, depth });
    if (f.children?.length) {
      result.push(...flattenAllFields(f.children, prefix + f.path));
    }
  }
  return result;
}
