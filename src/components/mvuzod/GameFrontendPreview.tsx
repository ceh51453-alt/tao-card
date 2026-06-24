/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * GameFrontendPreview — Enhanced Game Frontend Preview Component
 * Previews game UI components (Status Bar, Opening Form, Game Screen)
 * AND generates the corresponding frontend code for Tavern Helper integration.
 *
 * References:
 * - 前端項目改造指南.md (gameInitializer, variableReader, requestHandler patterns)
 * - adventure project structure
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Gamepad2, Copy, Check, FileCode, Eye,
  LayoutGrid, FormInput, Monitor,
  ChevronRight, Sparkles,
} from 'lucide-react';
import type { MVUZODSchema, MVUZODField } from '../../types/mvuzod.types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type PreviewComponent = 'status_bar' | 'opening_form' | 'game_screen';

interface ComponentOption {
  id: PreviewComponent;
  label: string;
  icon: typeof LayoutGrid;
  desc: string;
}

const COMPONENTS: ComponentOption[] = [
  { id: 'status_bar', label: 'Status Bar', icon: LayoutGrid, desc: 'Thanh trạng thái biến số' },
  { id: 'opening_form', label: 'Opening Form', icon: FormInput, desc: 'Form thiết lập mở đầu' },
  { id: 'game_screen', label: 'Game Screen', icon: Monitor, desc: 'Màn hình game chính' },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface GameFrontendPreviewProps {
  schema: MVUZODSchema | null;
}

export function GameFrontendPreview({ schema }: GameFrontendPreviewProps) {
  const [selectedComponent, setSelectedComponent] = useState<PreviewComponent>('status_bar');
  const [showCode, setShowCode] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const mockState = useMemo(() => {
    if (!schema) return {};
    return buildMockState(schema.fields);
  }, [schema]);

  const handleCopy = useCallback(async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  if (!schema) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Gamepad2 className="w-8 h-8 mb-3 opacity-40" />
        <p className="text-sm">Cần tạo Schema trước</p>
      </div>
    );
  }

  const generatedCode = generateComponentCode(selectedComponent, schema);

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="rounded-lg bg-cyan-500/5 border border-cyan-500/20 p-3">
        <p className="text-xs text-cyan-400">
          <strong>Game Frontend Preview</strong> — Xem trước giao diện game chạy trong SillyTavern.
          Giao diện render qua <code className="px-1 py-0.5 rounded bg-cyan-500/10">{'<StatusPlaceHolderImpl/>'}</code>.
        </p>
      </div>

      {/* Component selector */}
      <div className="flex gap-2">
        {COMPONENTS.map(comp => {
          const Icon = comp.icon;
          const isActive = selectedComponent === comp.id;
          return (
            <button
              key={comp.id}
              onClick={() => setSelectedComponent(comp.id)}
              className={`flex-1 p-3 rounded-lg border transition-all text-left ${
                isActive
                  ? 'border-primary/40 bg-primary/5 shadow-sm shadow-primary/5'
                  : 'border-border hover:border-primary/20 hover:bg-muted/30'
              }`}
            >
              <Icon className={`w-4 h-4 mb-1 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="text-xs font-medium">{comp.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{comp.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Toggle: Preview / Code */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowCode(false)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            !showCode ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/30'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          Preview
        </button>
        <button
          onClick={() => setShowCode(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showCode ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/30'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          Code
        </button>
      </div>

      {/* Preview / Code content */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/20 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Gamepad2 className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium">
              {showCode ? 'Generated Code' : 'Preview'}: {COMPONENTS.find(c => c.id === selectedComponent)?.label}
            </span>
          </div>
          {showCode && (
            <button
              onClick={() => handleCopy(generatedCode, 'game-code')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                copiedId === 'game-code'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {copiedId === 'game-code' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedId === 'game-code' ? 'Đã copy!' : 'Copy Code'}
            </button>
          )}
        </div>

        <div className="p-4">
          {showCode ? (
            <pre className="text-xs font-mono text-foreground/80 overflow-x-auto max-h-[500px] overflow-y-auto leading-relaxed whitespace-pre-wrap">
              {generatedCode}
            </pre>
          ) : (
            <>
              {selectedComponent === 'status_bar' && (
                <EnhancedStatusBarPreview schema={schema} mockState={mockState} />
              )}
              {selectedComponent === 'opening_form' && (
                <EnhancedOpeningFormPreview schema={schema} />
              )}
              {selectedComponent === 'game_screen' && (
                <EnhancedGameScreenPreview schema={schema} mockState={mockState} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PREVIEW COMPONENTS — Enhanced versions with better UI
// ═══════════════════════════════════════════════════════════════════════════

function EnhancedStatusBarPreview({ schema, mockState }: { schema: MVUZODSchema; mockState: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      {/* Compact status pills */}
      <div className="flex flex-wrap gap-2 pb-3 border-b border-border/50">
        {schema.fields.map(field => {
          const name = getFieldName(field);
          const value = mockState[name];

          if (field.type === 'object' && field.children?.length) {
            return field.children
              .filter(c => c.type === 'number' && !c.constraints.hidden)
              .slice(0, 3)
              .map(child => {
                const childName = getFieldName(child);
                const childValue = (value as Record<string, unknown>)?.[childName];
                const numVal = Number(childValue ?? 0);
                const max = child.constraints.clamp?.[1] ?? child.constraints.max ?? 100;
                const pct = Math.min(100, (numVal / max) * 100);

                return (
                  <div key={child.path} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-border/50">
                    <span className="text-[10px] text-muted-foreground">{child.label}</span>
                    <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all bg-gradient-to-r from-primary to-violet-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-medium w-6 text-right">{numVal}</span>
                  </div>
                );
              });
          }
          return null;
        })}
      </div>

      {/* Detailed sections */}
      {schema.fields.map(field => {
        const name = getFieldName(field);
        const value = mockState[name];

        if (field.children?.length && typeof value === 'object' && value !== null) {
          return (
            <div key={field.path} className="rounded-lg bg-muted/20 p-3">
              <div className="text-[10px] font-semibold text-primary/80 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                {field.label}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {field.children.filter(c => !c.constraints.hidden).map(child => {
                  const childName = getFieldName(child);
                  const childValue = (value as Record<string, unknown>)[childName];
                  return (
                    <div key={child.path} className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground truncate mr-2">{child.label}</span>
                      {child.type === 'number' ? (
                        <span className="text-[11px] font-mono font-medium text-foreground/90 tabular-nums">
                          {String(childValue ?? 0)}
                        </span>
                      ) : child.type === 'boolean' ? (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${childValue ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {childValue ? '✓' : '✗'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-foreground/70 truncate max-w-[120px]">
                          {typeof childValue === 'object' ? JSON.stringify(childValue) : String(childValue ?? '-')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        return (
          <div key={field.path} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/10">
            <span className="text-xs text-muted-foreground">{field.label}</span>
            <span className="text-xs font-mono">{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '-')}</span>
          </div>
        );
      })}
    </div>
  );
}

function EnhancedOpeningFormPreview({ schema }: { schema: MVUZODSchema }) {
  const editableFields = useMemo(() => {
    const result: MVUZODField[] = [];
    function collect(fields: MVUZODField[]) {
      for (const f of fields) {
        if (f.children?.length) collect(f.children);
        else if (!f.constraints.readOnly && !f.constraints.hidden) result.push(f);
      }
    }
    collect(schema.fields);
    return result.slice(0, 10);
  }, [schema]);

  return (
    <div className="max-w-md mx-auto">
      {/* Title */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 border border-primary/10 flex items-center justify-center">
          <Gamepad2 className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-base font-semibold">🎮 Thiết lập mở đầu</h3>
        <p className="text-[11px] text-muted-foreground mt-1">Tùy chỉnh thông số ban đầu trước khi bắt đầu câu chuyện</p>
      </div>

      {/* Form fields */}
      <div className="space-y-3.5">
        {editableFields.map(field => (
          <div key={field.path}>
            <label className="text-[11px] text-muted-foreground mb-1 block font-medium">
              {field.label}
              {field.description && (
                <span className="text-[9px] text-muted-foreground/60 ml-1">— {field.description}</span>
              )}
            </label>
            {field.type === 'number' ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  defaultValue={Number(field.defaultValue ?? 0)}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                />
                {field.constraints.clamp && (
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                    ({field.constraints.clamp[0]}~{field.constraints.clamp[1]})
                  </span>
                )}
              </div>
            ) : field.type === 'boolean' ? (
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 text-[11px] rounded-lg bg-primary/10 text-primary border border-primary/20 font-medium">
                  Có
                </button>
                <button className="flex-1 px-3 py-2 text-[11px] rounded-lg bg-muted text-muted-foreground border border-border">
                  Không
                </button>
              </div>
            ) : field.constraints.enumValues?.length ? (
              <select className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                {field.constraints.enumValues.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                defaultValue={String(field.defaultValue ?? '')}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
            )}
          </div>
        ))}
      </div>

      {/* Submit */}
      <button className="w-full mt-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-violet-500 text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
        Bắt đầu cuộc phiêu lưu →
      </button>
    </div>
  );
}

function EnhancedGameScreenPreview({ schema, mockState }: { schema: MVUZODSchema; mockState: Record<string, unknown> }) {
  return (
    <div className="space-y-4">
      {/* Story text */}
      <div className="rounded-lg bg-muted/20 p-4">
        <div className="text-[10px] text-muted-foreground/60 mb-1 uppercase tracking-wider">Phản hồi AI</div>
        <p className="text-xs text-foreground/80 leading-relaxed italic">
          &ldquo;Ánh trăng chiếu qua cánh cửa sổ cũ kỹ, bạn bước vào căn phòng tối om.
          Mùi ẩm mốc phảng phất trong không khí. Đâu đó trong bóng tối, bạn nghe thấy tiếng thì thào...&rdquo;
        </p>
      </div>

      {/* Status pills */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {schema.fields.slice(0, 5).map(field => {
          const name = getFieldName(field);
          const value = mockState[name];
          return (
            <div key={field.path} className="shrink-0 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/50">
              <div className="text-[8px] text-muted-foreground/60 uppercase tracking-wider">{field.label}</div>
              <div className="text-[11px] font-mono font-medium mt-0.5">
                {typeof value === 'object' ? '...' : String(value ?? '-')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Options */}
      <div className="space-y-1.5">
        {['Tiến sâu hơn vào căn phòng', 'Quay lại hành lang chính', 'Tìm kiếm manh mối xung quanh', 'Gọi to xem có ai không'].map((opt, i) => (
          <button
            key={i}
            className="w-full text-left px-4 py-2.5 rounded-lg border border-border/50 bg-muted/10
              hover:bg-primary/5 hover:border-primary/30 transition-all flex items-center gap-2 group"
          >
            <span className="w-5 h-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              {String.fromCharCode(65 + i)}
            </span>
            <span className="text-xs">{opt}</span>
            <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
          </button>
        ))}
      </div>

      {/* Custom input */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Hoặc nhập hành động tùy chỉnh..."
          className="flex-1 px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
          Gửi
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CODE GENERATION — Generate component code for Tavern Helper
// ═══════════════════════════════════════════════════════════════════════════

function generateComponentCode(component: PreviewComponent, schema: MVUZODSchema): string {
  switch (component) {
    case 'status_bar':
      return generateStatusBarCode(schema);
    case 'opening_form':
      return generateOpeningFormCode(schema);
    case 'game_screen':
      return generateGameScreenCode(schema);
  }
}

function generateStatusBarCode(schema: MVUZODSchema): string {
  const varReads = schema.fields
    .filter(f => !f.constraints.hidden)
    .map(f => {
      const name = getFieldName(f);
      return `const ${toVarName(name)} = Mvu.getMvuData({ type: 'message', message_id: 'latest' }).stat_data?.${name};`;
    })
    .join('\n');

  const barItems = schema.fields
    .filter(f => !f.constraints.hidden)
    .map(f => {
      const name = getFieldName(f);
      const varName = toVarName(name);
      if (f.type === 'number' || (f.children?.some(c => c.type === 'number'))) {
        return `  <div class="status-item">
    <span class="status-label">${f.label}</span>
    <span class="status-value">\${JSON.stringify(${varName})}</span>
  </div>`;
      }
      return `  <div class="status-item">
    <span class="status-label">${f.label}</span>
    <span class="status-value">\${typeof ${varName} === 'object' ? JSON.stringify(${varName}) : ${varName}}</span>
  </div>`;
    })
    .join('\n');

  return `// Status Bar Component for Tavern Helper
// Paste this into a Tavern Helper 角色脚本 (character script)

// Read current variables from MVU
${varReads}

// Render status bar HTML
const statusHTML = \`
<div class="mvu-status-bar" style="display:flex;gap:8px;flex-wrap:wrap;padding:8px;background:rgba(0,0,0,0.2);border-radius:8px;margin:4px 0;">
${barItems}
</div>
\`;

// Insert into <StatusPlaceHolderImpl/>
document.querySelectorAll('.mvu-status-placeholder').forEach(el => {
  el.innerHTML = statusHTML;
});`;
}

function generateOpeningFormCode(schema: MVUZODSchema): string {
  const fields: MVUZODField[] = [];
  function collect(ff: MVUZODField[]) {
    for (const f of ff) {
      if (f.children?.length) collect(f.children);
      else if (!f.constraints.readOnly && !f.constraints.hidden) fields.push(f);
    }
  }
  collect(schema.fields);
  const editableFields = fields.slice(0, 10);

  const formFields = editableFields.map(f => {
    const name = getFieldName(f);
    const inputType = f.type === 'number' ? 'number' : 'text';
    const defaultVal = f.defaultValue ?? (f.type === 'number' ? 0 : '');
    return `    <div class="form-field">
      <label>${f.label}</label>
      <input type="${inputType}" name="${name}" value="${defaultVal}" />
    </div>`;
  }).join('\n');

  return `// Opening Form Component for Tavern Helper
// References: 前端項目改造指南.md "步骤 1: gameInitializer.ts"

declare function getVariables(option: { type: 'message'; message_id: number }): Record<string, any>;
declare function updateVariablesWith(
  updater: (vars: Record<string, any>) => Record<string, any>,
  option: { type: 'message'; message_id: number },
): Promise<Record<string, any>>;

// Check if we need to show the opening form (floor 0 = first message)
const lastMessageId = getLastMessageId();
const shouldShowForm = lastMessageId <= 0;

if (shouldShowForm) {
  const formHTML = \`
  <div class="opening-form" style="max-width:400px;margin:0 auto;padding:20px;">
    <h3 style="text-align:center;margin-bottom:16px;">🎮 Thiết lập mở đầu</h3>
    <form id="mvu-opening-form">
${formFields}
      <button type="submit" style="width:100%;padding:10px;margin-top:12px;border-radius:8px;background:var(--accent);color:white;border:none;cursor:pointer;">
        Bắt đầu cuộc phiêu lưu →
      </button>
    </form>
  </div>
  \`;

  // Render form
  document.querySelectorAll('.mvu-status-placeholder').forEach(el => {
    el.innerHTML = formHTML;
  });

  // Handle form submission
  document.getElementById('mvu-opening-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    // Initialize variables in floor 0
    await updateVariablesWith(vars => {
      if (!vars.stat_data) vars.stat_data = {};
${editableFields.map(f => {
    const name = getFieldName(f);
    const path = f.path.split('/').filter(Boolean);
    if (path.length > 1) {
      return `      // ${f.label}\n      if (!vars.stat_data.${path.slice(0, -1).join('.')}) vars.stat_data.${path.slice(0, -1).join('.')} = {};\n      vars.stat_data.${path.join('.')} = formData.get('${name}');`;
    }
    return `      vars.stat_data.${name} = formData.get('${name}');`;
  }).join('\n')}
      return vars;
    }, { type: 'message', message_id: 0 });

    console.log('✅ Opening form submitted, variables initialized');
  });
}`;
}

function generateGameScreenCode(schema: MVUZODSchema): string {
  return `// Game Screen Component for Tavern Helper
// References: 前端項目改造指南.md "步骤 3: requestHandler.ts"
// Combines: messageParser + variableReader + requestHandler

declare function getChatMessages(range: string | number, options?: { role?: string }): Array<{ message: string; message_id: number }>;
declare function getLastMessageId(): number;

// ─── Message Parser ───
function parseMaintext(msg: string): string {
  let cleaned = msg.replace(/<thinking>[\\s\\S]*?<\\/thinking>/gi, '');
  cleaned = cleaned.replace(/<think>[\\s\\S]*?<\\/redacted_reasoning>/gi, '');
  const matches = cleaned.match(/<maintext>([\\s\\S]*?)<\\/maintext>/gi);
  if (!matches?.length) return '';
  const last = matches[matches.length - 1].match(/<maintext>([\\s\\S]*?)<\\/maintext>/i);
  return last ? last[1].trim() : '';
}

function parseOptions(msg: string): Array<{ id: string; text: string }> {
  let cleaned = msg.replace(/<thinking>[\\s\\S]*?<\\/thinking>/gi, '');
  const regex = /<option id="([^"]+)">([^<]+)<\\/option>/g;
  const options: Array<{ id: string; text: string }> = [];
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    options.push({ id: match[1], text: match[2].trim() });
  }
  return options;
}

// ─── Variable Reader ───
const mvuData = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
const vars = mvuData?.stat_data ?? {};

// ─── Render Game Screen ───
const lastId = getLastMessageId();
const messages = getChatMessages(lastId, { role: 'assistant' });
const latestMsg = messages?.[0]?.message ?? '';

const maintext = parseMaintext(latestMsg);
const options = parseOptions(latestMsg);

// Build status bar from variables
const statusItems = ${JSON.stringify(schema.fields.filter(f => !f.constraints.hidden).map(f => ({ name: getFieldName(f), label: f.label })))};

const statusHTML = statusItems
  .map(item => \`<span class="status-pill">\${item.label}: \${JSON.stringify(vars[item.name] ?? '-')}</span>\`)
  .join('');

const optionsHTML = options
  .map(opt => \`<button class="game-option" onclick="handleOption('\${opt.id}')">\${opt.id}. \${opt.text}</button>\`)
  .join('');

const gameHTML = \`
<div class="game-screen">
  <div class="status-bar">\${statusHTML}</div>
  <div class="maintext">\${maintext || 'Đang chờ phản hồi...'}</div>
  <div class="options">\${optionsHTML}</div>
</div>
\`;

document.querySelectorAll('.mvu-status-placeholder').forEach(el => {
  el.innerHTML = gameHTML;
});

// ─── Handle option click ───
window.handleOption = function(optionId) {
  // Send option as user message
  const inputBox = document.getElementById('send_textarea');
  if (inputBox) {
    inputBox.value = optionId;
    document.getElementById('send_but')?.click();
  }
};`;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function getFieldName(field: MVUZODField): string {
  return field.path.split('/').filter(Boolean).pop() ?? field.path;
}

function toVarName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF\u4e00-\u9fff]/g, '_');
}

function buildMockState(fields: MVUZODField[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const f of fields) {
    const name = getFieldName(f);
    if (f.children?.length) {
      obj[name] = buildMockState(f.children);
    } else {
      obj[name] = f.defaultValue ?? (
        f.type === 'number' ? 50
        : f.type === 'boolean' ? true
        : f.type === 'record' ? {}
        : f.type === 'array' ? []
        : 'Sample'
      );
    }
  }
  return obj;
}

