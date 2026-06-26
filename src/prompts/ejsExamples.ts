/**
 * src/prompts/ejsExamples.ts — Few-shot examples cho AI EJS generation
 * Mỗi category có 2-3 ví dụ hoàn chỉnh để AI tham khảo phong cách.
 */

import type { EJSTemplateCategory } from './ejsPrompt';

export interface EJSExample {
  title: string;
  description: string;
  code: string;
}

export const EJS_FEWSHOT_EXAMPLES: Record<EJSTemplateCategory, EJSExample[]> = {
  conditional_entry: [
    {
      title: 'Bật/tắt entry theo thời đại',
      description: 'Đọc biến era, bật entry tương ứng, tắt các entry khác',
      code: `@@preprocessing
<%_
var era = getvar('stat_data.Trạng thái thế giới.Thời đại hiện tại', { defaults: 'Hiện đại' });

setEntryEnabled('WB: Thiết lập cổ đại', era === 'Cổ đại');
setEntryEnabled('WB: Thiết lập hiện đại', era === 'Hiện đại');
setEntryEnabled('WB: Thiết lập tương lai', era === 'Tương lai');
_%>`,
    },
    {
      title: 'Bật entry theo ngưỡng HP',
      description: 'Khi HP dưới ngưỡng, bật entry mô tả trạng thái nguy hiểm',
      code: `@@preprocessing
<%_
var hp = Number(getvar('stat_data.Nhân vật.HP', { defaults: 100 }));
var maxHp = Number(getvar('stat_data.Nhân vật.MaxHP', { defaults: 100 }));
var ratio = maxHp > 0 ? hp / maxHp : 1;

setEntryEnabled('WB: Trạng thái nguy kịch', ratio < 0.2);
setEntryEnabled('WB: Trạng thái bị thương', ratio >= 0.2 && ratio < 0.5);
setEntryEnabled('WB: Trạng thái khoẻ mạnh', ratio >= 0.5);
_%>`,
    },
    {
      title: 'Bật entry theo combo điều kiện',
      description: 'Kết hợp nhiều biến để quyết định entry nào bật',
      code: `@@preprocessing
<%_
var mood = getvar('stat_data.Nhân vật.Tâm trạng', { defaults: 'Bình thường' });
var location = getvar('stat_data.Thế giới.Địa điểm', { defaults: 'Nhà' });
var timeOfDay = getvar('stat_data.Thế giới.Thời gian', { defaults: 'Ngày' });

// Bật scenario đặc biệt khi ở nghĩa địa + ban đêm
setEntryEnabled('WB: Sự kiện ma quỷ', location === 'Nghĩa địa' && timeOfDay === 'Đêm');

// Bật entry tâm lý đặc biệt
setEntryEnabled('WB: Persona giận dữ', mood === 'Tức giận');
setEntryEnabled('WB: Persona buồn bã', mood === 'Buồn');
_%>`,
    },
  ],

  dynamic_content: [
    {
      title: 'Mô tả trạng thái nhân vật',
      description: 'Sinh text mô tả động dựa trên HP, mood, và trang bị',
      code: `@@preprocessing
<%_
var hp = Number(getvar('stat_data.Nhân vật.HP', { defaults: 100 }));
var mood = getvar('stat_data.Nhân vật.Tâm trạng', { defaults: 'Bình thường' });
var weapon = getvar('stat_data.Nhân vật.Vũ khí', { defaults: 'Không' });

var desc = [];
if (hp < 20) desc.push('đang kiệt sức, thở hổn hển');
else if (hp < 50) desc.push('có vài vết thương, hơi đau đớn');

if (mood === 'Tức giận') desc.push('đôi mắt đỏ rực giận dữ');
else if (mood === 'Sợ hãi') desc.push('run rẩy, mắt liếc xung quanh');

if (weapon !== 'Không') desc.push('tay cầm ' + weapon);

if (desc.length > 0) {
  print('[Ngoại hình {{char}}: ' + desc.join(', ') + ']');
}
_%>`,
    },
    {
      title: 'Tóm tắt tình huống hiện tại',
      description: 'Inject mô tả cảnh dựa trên nhiều biến',
      code: `@@preprocessing
<%_
var scene = getvar('stat_data.Thế giới.Loại cảnh', { defaults: 'Hàng ngày' });
var danger = Number(getvar('stat_data.Thế giới.Mức nguy hiểm', { defaults: 0 }));
var weather = getvar('stat_data.Thế giới.Thời tiết', { defaults: 'Nắng' });

var atmosphere = '';
if (scene === 'Chiến đấu') {
  atmosphere = danger > 70 ? 'Tình thế cực kỳ nguy hiểm!' : 'Đang trong trận chiến.';
} else if (scene === 'Khám phá') {
  atmosphere = 'Đang khám phá khu vực mới, đầy bí ẩn.';
} else {
  atmosphere = 'Không khí yên bình, ' + weather.toLowerCase() + '.';
}

print('[Bối cảnh: ' + atmosphere + ']');
_%>`,
    },
  ],

  stat_reader: [
    {
      title: 'Đọc stats cơ bản',
      description: 'Xuất HP, MP, Gold dạng text',
      code: `@@preprocessing
<%_
var hp = getvar('stat_data.Nhân vật.HP', { defaults: 100 });
var mp = getvar('stat_data.Nhân vật.MP', { defaults: 50 });
var gold = getvar('stat_data.Nhân vật.Gold', { defaults: 0 });
var level = getvar('stat_data.Nhân vật.Level', { defaults: 1 });

print('[📊 Stats: Lv.' + level + ' | HP:' + hp + ' | MP:' + mp + ' | 💰' + gold + 'G]');
_%>`,
    },
    {
      title: 'Đọc stats với format đẹp',
      description: 'Xuất nhiều nhóm stats với emoji',
      code: `@@preprocessing
<%_
var hp = getvar('stat_data.Nhân vật.HP', { defaults: 100 });
var maxHp = getvar('stat_data.Nhân vật.MaxHP', { defaults: 100 });
var str = getvar('stat_data.Nhân vật.Sức mạnh', { defaults: 10 });
var agi = getvar('stat_data.Nhân vật.Nhanh nhẹn', { defaults: 10 });
var int = getvar('stat_data.Nhân vật.Trí tuệ', { defaults: 10 });
var location = getvar('stat_data.Thế giới.Địa điểm', { defaults: '???');
var time = getvar('stat_data.Thế giới.Thời gian', { defaults: 'Ngày' });

print('═══ TRẠNG THÁI ═══');
print('❤️ HP: ' + hp + '/' + maxHp);
print('💪 STR:' + str + ' | 🏃 AGI:' + agi + ' | 🧠 INT:' + int);
print('📍 ' + location + ' | 🕐 ' + time);
print('═══════════════════');
_%>`,
    },
  ],

  multi_stage: [
    {
      title: 'Persona theo mức thân mật',
      description: '4 giai đoạn persona dựa trên affinity',
      code: `@@preprocessing
<%_
var affinity = Number(getvar('stat_data.Nhân vật.Độ thân mật', { defaults: 0 }));

var persona = '';
if (affinity < 25) {
  persona = '{{char}} rất lạnh lùng, nói ngắn gọn, thường từ chối yêu cầu của {{user}}.';
} else if (affinity < 50) {
  persona = '{{char}} bắt đầu quen, đôi khi cười nhẹ, sẵn sàng giúp đỡ cơ bản.';
} else if (affinity < 75) {
  persona = '{{char}} thân thiện, hay đùa giỡn, chủ động rủ {{user}} đi chơi.';
} else {
  persona = '{{char}} cực kỳ thân thiết, chia sẻ bí mật, lo lắng khi {{user}} gặp nguy.';
}

print('[Hướng dẫn roleplay: ' + persona + ']');
_%>`,
    },
    {
      title: 'Persona theo corruption level',
      description: '5 stages dựa trên mức corruption, ảnh hưởng cách nói chuyện',
      code: `@@preprocessing
<%_
var corruption = Number(getvar('stat_data.Nhân vật.Corruption', { defaults: 0 }));

var stage;
if (corruption < 20) {
  stage = 'PURE - Ngây thơ trong sáng, xấu hổ khi nghe chuyện tế nhị, nói năng lịch sự.';
} else if (corruption < 40) {
  stage = 'CURIOUS - Bắt đầu tò mò về thế giới tối, lén đọc sách cấm, vẫn giữ vẻ ngoài thuần khiết.';
} else if (corruption < 60) {
  stage = 'AWAKENED - Không còn che giấu, chủ động tìm kiếm trải nghiệm mới, đôi khi khiêu khích.';
} else if (corruption < 80) {
  stage = 'FALLEN - Thao túng người khác, tận hưởng quyền lực, ngôn từ sắc bén và đầy ẩn ý.';
} else {
  stage = 'ABYSS - Hoàn toàn chìm trong bóng tối, cười khoái trá trước sự hủy diệt, không còn đạo đức.';
}

print('[Corruption Stage: ' + stage + ']');
_%>`,
    },
  ],

  variable_display: [
    {
      title: 'Bảng stat đầy đủ cho AI',
      description: 'Liệt kê tất cả biến dạng bảng, AI luôn biết trạng thái',
      code: `@@preprocessing
<%_
var data = Mvu.getMvuData({type:'message', message_id:'latest'});
var stats = data?.stat_data ?? {};

var lines = ['[== TRẠNG THÁI GAME ==]'];

function printGroup(obj, prefix) {
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      var val = obj[key];
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        lines.push(prefix + '【' + key + '】');
        printGroup(val, prefix + '  ');
      } else {
        lines.push(prefix + key + ': ' + String(val));
      }
    }
  }
}

printGroup(stats, '');
lines.push('[== END ==]');
print(lines.join('\\n'));
_%>`,
    },
    {
      title: 'Bảng stat với format columns',
      description: 'Hiển thị stats theo 2 cột gọn gàng',
      code: `@@preprocessing
<%_
var hp = getvar('stat_data.Nhân vật.HP', { defaults: 100 });
var mp = getvar('stat_data.Nhân vật.MP', { defaults: 50 });
var str = getvar('stat_data.Nhân vật.Sức mạnh', { defaults: 10 });
var def = getvar('stat_data.Nhân vật.Phòng thủ', { defaults: 10 });
var spd = getvar('stat_data.Nhân vật.Tốc độ', { defaults: 10 });
var luk = getvar('stat_data.Nhân vật.May mắn', { defaults: 10 });

print('┌────────────────────────┐');
print('│   BẢNG TRẠNG THÁI     │');
print('├────────────────────────┤');
print('│ HP: ' + hp + '  │ MP: ' + mp + '  │');
print('│ STR: ' + str + ' │ DEF: ' + def + ' │');
print('│ SPD: ' + spd + ' │ LUK: ' + luk + ' │');
print('└────────────────────────┘');
_%>`,
    },
  ],

  custom: [
    {
      title: 'Event listener setup',
      description: 'Lắng nghe sự kiện và phản ứng',
      code: `@@preprocessing
<%_
var lastEvent = getvar('stat_data.Events.LastEvent', { defaults: '' });

if (lastEvent === 'BATTLE_WON') {
  var exp = Number(getvar('stat_data.Nhân vật.EXP', { defaults: 0 }));
  setvar('stat_data.Nhân vật.EXP', exp + 50);
  setvar('stat_data.Events.LastEvent', '');
  print('[🎉 Thắng trận! +50 EXP]');
} else if (lastEvent === 'ITEM_FOUND') {
  setvar('stat_data.Events.LastEvent', '');
  print('[📦 Tìm được vật phẩm mới!]');
}
_%>`,
    },
  ],
};

/**
 * Format few-shot examples cho injection vào prompt.
 */
export function formatExamplesForPrompt(category: EJSTemplateCategory): string {
  const examples = EJS_FEWSHOT_EXAMPLES[category];
  if (!examples || examples.length === 0) return '';

  const formatted = examples.map((ex, i) => (
    `--- Ví dụ ${i + 1}: ${ex.title} ---
Mô tả: ${ex.description}
\`\`\`
${ex.code}
\`\`\``
  )).join('\n\n');

  return `=== VÍ DỤ THAM KHẢO (${examples.length} examples) ===
Tham khảo phong cách viết từ các ví dụ dưới đây. KHÔNG copy y nguyên — hãy adapt theo schema và yêu cầu cụ thể.

${formatted}`;
}
