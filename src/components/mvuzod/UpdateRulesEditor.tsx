/**
 * UpdateRulesEditor — Auto-generate [mvu_update] worldbook entries from schema
 * References: MVU_ZOD指南.md "第五步：编写变量提示词" + "変量更新規則"
 * Generates both 変量更新規則 and 変量出力格式 entries
 */

import { useState, useMemo, useCallback } from 'react';
import {
  FileText, Copy, Check,
  Sparkles, Eye, RefreshCw, Wand2, Loader2,
} from 'lucide-react';
import type { MVUZODSchema, MVUZODField } from '../../types/mvuzod.types';
import { useCardStore } from '../../store/cardStore';
import { useSettingsStore } from '../../store/settingsStore';
import { callAI } from '../../lib/ai/client';
import type { ChatMessage } from '../../types';
import { MVUZOD_UPDATE_RULES_PROMPT } from '../../prompts/modeMVUZOD';
import { parseSchemaInferenceResponse } from '../../lib/mvuzod/schemaInferencer';

// ─── YAML Generator ──────────────────────────────────────────────────────

function generateUpdateRulesYAML(schema: MVUZODSchema): string {
  const lines: string[] = ['変量更新規則:'];

  function processField(field: MVUZODField, indent: number, parentPath: string) {
    const name = field.path.split('/').filter(Boolean).pop() ?? field.path;
    const fullPath = parentPath ? `${parentPath}.${name}` : name;
    const pad = '  '.repeat(indent);

    // Skip readonly fields (prefixed with _)
    if (name.startsWith('_') || field.constraints?.readOnly) return;

    // If has children, recurse
    if (field.children?.length) {
      lines.push(`${pad}${name}:`);
      for (const child of field.children) {
        processField(child, indent + 1, fullPath);
      }
      return;
    }

    // Leaf field — generate update rule
    lines.push(`${pad}${name}:`);

    // Type
    if (field.constraints?.updateType) {
      lines.push(`${pad}  type: |-`);
      for (const line of field.constraints.updateType.split('\n')) {
        lines.push(`${pad}    ${line}`);
      }
    } else if (field.type === 'number') {
      lines.push(`${pad}  type: number`);
    } else if (field.type === 'record') {
      lines.push(`${pad}  type: |-`);
      lines.push(`${pad}    {`);
      const keyDesc = field.constraints?.describe ?? 'key';
      lines.push(`${pad}      [${keyDesc}: string]: ${field.children?.length ? 'object' : 'string'}`);
      lines.push(`${pad}    }`);
    }

    // Range
    if (field.constraints?.updateRange) {
      lines.push(`${pad}  range: ${field.constraints?.updateRange}`);
    } else if (field.constraints?.clamp) {
      lines.push(`${pad}  range: ${field.constraints?.clamp[0]}~${field.constraints?.clamp[1]}`);
    }

    // Format
    if (field.constraints?.updateFormat) {
      lines.push(`${pad}  format: ${field.constraints?.updateFormat}`);
    }

    // Check rules
    if (field.constraints?.checkRules?.length) {
      lines.push(`${pad}  check:`);
      for (const rule of field.constraints.checkRules) {
        lines.push(`${pad}    - ${rule}`);
      }
    } else {
      // Auto-generate basic check rule
      const autoCheck = generateAutoCheck(field, name);
      if (autoCheck.length) {
        lines.push(`${pad}  check:`);
        for (const rule of autoCheck) {
          lines.push(`${pad}    - ${rule}`);
        }
      }
    }
  }

  for (const field of schema.fields) {
    processField(field, 1, '');
  }

  return lines.join('\n');
}

function generateAutoCheck(field: MVUZODField, name: string): string[] {
  const checks: string[] = [];

  if (field.type === 'number' && field.constraints?.clamp) {
    const [min, max] = field.constraints.clamp;
    checks.push(`Phạm vi: ${min}~${max}`);
    checks.push(`Chỉ update khi có sự kiện liên quan trực tiếp`);
  }

  if (field.type === 'record') {
    checks.push(`Thêm/xóa items khi có sự kiện liên quan`);
    if (field.constraints?.transform === 'pickBy') {
      checks.push(`Số lượng = 0 → tự động xóa`);
    }
  }

  // Don't generate for self-explanatory names
  const selfExplanatory = ['thời_gian', 'địa_điểm', 'vị_trí', 'tên', 'name', 'location', 'time'];
  if (selfExplanatory.some(s => name.toLowerCase().includes(s))) {
    return []; // Tên tự giải thích
  }

  return checks;
}

// ─── Output Format Generator ─────────────────────────────────────────────

function generateOutputFormatYAML(): string {
  return `変量出力格式:
  rule:
    - Output update analysis + commands ở CUỐI mỗi reply
    - Format: JSON Patch (RFC 6902), JSON array chứa operation objects
    - Operations hỗ trợ: replace, delta, insert, remove, move
    - KHÔNG update fields bắt đầu bằng _ (readonly)
  format: |-
    <UpdateVariable>
    <Analysis>$(Tiếng Anh, tối đa 80 từ)
    - \${tính thời gian trôi qua: ...}
    - \${phán đoán có cho phép thay đổi lớn không: có/không}
    - \${phân tích từng biến theo check rules, chỉ dựa trên reply hiện tại: ...}
    </Analysis>
    <JSONPatch>
    [
      { "op": "replace", "path": "\${/đường/dẫn/biến}", "value": "\${giá trị mới}" },
      { "op": "delta", "path": "\${/đường/dẫn/số}", "value": "\${delta +/-}" },
      { "op": "insert", "path": "\${/đường/dẫn/object/key mới}", "value": "\${giá trị}" },
      { "op": "remove", "path": "\${/đường/dẫn/object/key}" },
      ...
    ]
    </JSONPatch>
    </UpdateVariable>`;
}

// ─── Variable List Generator ─────────────────────────────────────────────

function generateVariableListYAML(schema: MVUZODSchema): string {
  const lines: string[] = ['---', '<status_current_variable>'];

  function addField(field: MVUZODField, prefix: string) {
    const name = field.path.split('/').filter(Boolean).pop() ?? field.path;
    const path = prefix ? `${prefix}.${name}` : name;

    if (field.children?.length) {
      lines.push(`${name}:`);
      lines.push(`  {{format_message_variable::stat_data.${path}}}`);
    } else {
      lines.push(`${name}: {{format_message_variable::stat_data.${path}}}`);
    }
  }

  for (const field of schema.fields) {
    addField(field, '');
  }

  lines.push('</status_current_variable>');
  return lines.join('\n');
}

// ─── Main Component ──────────────────────────────────────────────────────

export function UpdateRulesEditor({ schema }: {
  schema: MVUZODSchema | null;
}) {
  const [activeTab, setActiveTab] = useState<'rules' | 'format' | 'varlist'>('rules');
  const [copied, setCopied] = useState<string | null>(null);

  const rulesYAML = useMemo(() =>
    schema ? generateUpdateRulesYAML(schema) : '(Chưa có schema)',
    [schema]
  );

  const formatYAML = useMemo(() => generateOutputFormatYAML(), []);

  const varListYAML = useMemo(() =>
    schema ? generateVariableListYAML(schema) : '(Chưa có schema)',
    [schema]
  );

  const handleCopy = useCallback((content: string, label: string) => {
    navigator.clipboard.writeText(content);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const tabs = [
    { id: 'rules' as const, label: 'Update Rules', icon: FileText, yaml: rulesYAML,
      entryName: '[mvu_update]変量更新規則', description: 'Hướng dẫn AI khi nào và cách nào update biến' },
    { id: 'format' as const, label: 'Output Format', icon: Sparkles, yaml: formatYAML,
      entryName: '[mvu_update]変量出力格式', description: 'Template <Analysis> CoT + <JSONPatch>' },
    { id: 'varlist' as const, label: 'Variable List', icon: Eye, yaml: varListYAML,
      entryName: '変量列表', description: 'Macro hiển thị giá trị biến cho AI đọc' },
  ];

  const activeTabData = tabs.find(t => t.id === activeTab)!;

  if (!schema) {
    return (
      <div className="rounded-xl border border-border bg-card/50 p-6 text-center">
        <RefreshCw className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Tạo Schema trước để generate Update Rules</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Tab bar */}
      <div className="flex gap-1 p-0.5 rounded-lg bg-muted/30">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Entry info */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-foreground">
            Entry: <code className="text-primary">{activeTabData.entryName}</code>
          </p>
          <p className="text-[10px] text-muted-foreground">{activeTabData.description}</p>
        </div>
        <button
          onClick={() => handleCopy(activeTabData.yaml, activeTab)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary
            text-xs font-medium hover:bg-primary/20 transition-colors"
        >
          {copied === activeTab ? (
            <><Check className="w-3 h-3" /> Đã copy!</>
          ) : (
            <><Copy className="w-3 h-3" /> Copy nội dung</>
          )}
        </button>
        {activeTab === 'rules' && <AIUpdateRulesButton schema={schema} />}
      </div>

      {/* YAML Preview */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-muted/20 flex items-center gap-2">
          <FileText className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-medium">Nội dung Worldbook Entry</span>
          <span className="text-[9px] text-muted-foreground ml-auto">
            {activeTab === 'rules' ? 'Vị trí: D0 hoặc D3~D4' :
             activeTab === 'format' ? 'Vị trí: D0 (Gemini) hoặc D4 (Claude)' :
             'Vị trí: D0 hoặc D1, Order: 200'}
          </span>
        </div>
        <pre className="p-4 max-h-96 overflow-y-auto text-xs font-mono text-foreground/80
          whitespace-pre-wrap leading-relaxed scrollbar-thin">
          {activeTabData.yaml}
        </pre>
      </div>

      {/* Quick tips */}
      <div className="rounded-lg border border-border bg-muted/10 p-3">
        <p className="text-[10px] font-medium text-muted-foreground mb-1">💡 Hướng dẫn sử dụng</p>
        {activeTab === 'rules' && (
          <ul className="text-[10px] text-muted-foreground space-y-0.5">
            <li>• Copy nội dung → Paste vào worldbook entry <code>[mvu_update]変量更新規則</code></li>
            <li>• Mỗi biến cần <code>check</code> rules cụ thể — edit trong Schema Editor (tab ℹ️)</li>
            <li>• Biến <code>_</code> readonly tự động bị bỏ qua</li>
            <li>• Gộp biến cùng nhóm: <code>着装.$&#123;上装|下装|...&#125;</code></li>
          </ul>
        )}
        {activeTab === 'format' && (
          <ul className="text-[10px] text-muted-foreground space-y-0.5">
            <li>• <code>&lt;Analysis&gt;</code> CoT bắt AI phân tích TRƯỚC khi update — giảm hallucination</li>
            <li>• 5 operations: replace, delta, insert, remove, move</li>
            <li>• Path bắt đầu từ root (KHÔNG có <code>stat_data</code> prefix)</li>
          </ul>
        )}
        {activeTab === 'varlist' && (
          <ul className="text-[10px] text-muted-foreground space-y-0.5">
            <li>• Dùng macro <code>&#123;&#123;format_message_variable::stat_data.X&#125;&#125;</code></li>
            <li>• Đặt ở D0/D1 để AI đọc giá trị mới nhất</li>
            <li>• Có thể tách thành nhiều entries với đèn xanh/đèn lam khác nhau</li>
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── AI Update Rules Generator ──────────────────────────────────────────

function AIUpdateRulesButton({ schema }: { schema: MVUZODSchema }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const entries = useCardStore(s => s.card.data.character_book?.entries ?? []);
  const setMvuzodSchema = useCardStore(s => s.setMvuzodSchema);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStatus('Đang kết nối AI...');
    try {
      const activeProfile = useSettingsStore.getState().getActiveProfile();
      const params = useSettingsStore.getState().generationParams;
      if (!activeProfile?.apiKey) throw new Error('Chưa cấu hình API AI.');

      const schemaDesc = JSON.stringify(schema, null, 2);
      const sampleEntries = entries.slice(0, 30).map(e =>
        `Comment: ${e.comment}\nContent:\n${e.content.slice(0, 400)}`
      ).join('\n---\n');

      setStatus(`Gửi schema + ${Math.min(30, entries.length)} entries...`);

      const messages: ChatMessage[] = [
        { role: 'system', content: MVUZOD_UPDATE_RULES_PROMPT },
        { role: 'user', content: `SCHEMA:\n${schemaDesc}\n\nLOREBOOK (${entries.length} entries, mẫu ${Math.min(30, entries.length)}):\n${sampleEntries}\n\nHãy sinh check rules cho từng biến.` },
      ];

      const response = await callAI({
        profile: activeProfile,
        params: { ...params, useJsonResponseFormat: true },
        messages,
      });

      setStatus('Phân tích phản hồi...');
      const parsed = parseSchemaInferenceResponse(response.text);
      const rules = (parsed as Record<string, unknown>).updateRules as Record<string, {
        type?: string;
        range?: string;
        format?: string;
        checkRules?: string[];
      }>;

      if (!rules || typeof rules !== 'object') throw new Error('AI không trả về updateRules hợp lệ.');

      // Apply rules to schema fields
      const updatedSchema = structuredClone(schema);
      applyRulesToFields(updatedSchema.fields, rules);
      setMvuzodSchema(updatedSchema);
      setStatus('✅ Đã cập nhật check rules!');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('');
    } finally {
      setLoading(false);
    }
  }, [schema, entries, setMvuzodSchema]);

  return (
    <div className="flex items-center gap-2">
      <button onClick={handleGenerate} disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500/80 to-primary/80
          text-white text-xs font-medium hover:from-violet-500 hover:to-primary transition-all
          disabled:opacity-50 disabled:cursor-wait">
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
        {loading ? 'AI đang tạo...' : 'AI tạo check rules'}
      </button>
      {status && <span className="text-[10px] text-muted-foreground">{status}</span>}
      {error && <span className="text-[10px] text-red-400 max-w-xs truncate" title={error}>{error}</span>}
    </div>
  );
}

function applyRulesToFields(
  fields: MVUZODField[],
  rules: Record<string, { type?: string; range?: string; format?: string; checkRules?: string[] }>,
) {
  for (const field of fields) {
    const ruleData = rules[field.path];
    if (ruleData) {
      if (!field.constraints) field.constraints = {};
      if (ruleData.checkRules?.length) field.constraints.checkRules = ruleData.checkRules;
      if (ruleData.range) field.constraints.updateRange = ruleData.range;
      if (ruleData.format) field.constraints.updateFormat = ruleData.format;
    }
    if (field.children?.length) {
      applyRulesToFields(field.children, rules);
    }
  }
}

