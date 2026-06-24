/**
 * EJS Template Snippets — shared constants
 * Extracted to separate file to avoid Fast Refresh issues
 */

export const EJS_SNIPPETS = [
  {
    id: 'multi-stage',
    label: 'Multi-stage Persona',
    description: 'Thay đổi tính cách AI theo mức độ (ví dụ: 好感度)',
    code: `<%_
if (typeof _affinity === 'undefined') var _affinity = Number(getvar('stat_data.Nhân vật.Cảm xúc.Độ thân mật', { defaults: 0 }));

if (_affinity < 40) {
  print('【{{char}} hiện tại rất dè dặt, không muốn giao tiếp nhiều】');
} else if (_affinity < 80) {
  print('【{{char}} đã quen bạn, sẵn sàng trò chuyện thoải mái】');
} else {
  print('【{{char}} rất thân thiết với bạn, thường kể chuyện riêng tư】');
}
_%>`,
  },
  {
    id: 'variable-display',
    label: 'Variable Display',
    description: 'Hiển thị danh sách biến hiện tại cho AI đọc',
    code: `[Trạng thái hiện tại]
Thời gian: <%= getvar('stat_data.Thế giới.Thời gian hiện tại') %>
Địa điểm: <%= getvar('stat_data.Thế giới.Địa điểm hiện tại') %>
HP: <%= getvar('stat_data.Nhân vật.HP') %> / <%= getvar('stat_data.Nhân vật.MaxHP') %>
Gold: <%= getvar('stat_data.Nhân vật.Gold') %>`,
  },
  {
    id: 'conditional-inject',
    label: 'Conditional Worldbook',
    description: 'Bật/tắt worldbook entry theo điều kiện',
    code: `@@preprocessing
<%_
if (typeof _era === 'undefined') var _era = getvar('stat_data.Thế giới.Thời đại', { defaults: 'Hiện đại' });

// Bật entry theo thời đại
setEntryEnabled('WB: Thiết lập thế giới hiện đại', _era === 'Hiện đại');
setEntryEnabled('WB: Thiết lập thế giới cổ đại', _era === 'Cổ đại');
setEntryEnabled('WB: Thiết lập thế giới tương lai', _era === 'Tương lai');
_%>`,
  },
  {
    id: 'inject-prompt',
    label: '@INJECT Prompt',
    description: 'Inject prompt vào vị trí cụ thể trong context',
    code: `@@preprocessing
<%_
if (typeof _scene === 'undefined') var _scene = getvar('stat_data.Thế giới.Loại cảnh', { defaults: 'Hàng ngày' });

// Inject prompt vào system position
injectPrompt({
  text: \`Hiện tại đang là cảnh \${_scene}. Hãy điều chỉnh phong cách viết phù hợp.\`,
  position: 'in_chat',
  depth: 4,
  scan: true,
});
_%>`,
  },
  {
    id: 'getwi-template',
    label: 'getwi() Template',
    description: 'Đọc và tổ chức worldbook entries theo nhóm',
    code: `<%_
// Đọc nội dung worldbook entry bằng comment
var skillList = getwi('Danh sách kỹ năng');
var inventory = getwi('Kho đồ');

if (skillList) {
  print('[Kỹ năng đã học]\\n');
  print(skillList);
}

if (inventory) {
  print('\\n[Vật phẩm trong túi]\\n');
  print(inventory);
}
_%>`,
  },
];
