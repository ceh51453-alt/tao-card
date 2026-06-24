/**
 * TemplateGallery — Browse and apply card + schema templates
 * Grid layout with preview, category filter, and one-click apply.
 * Rendered as a modal from TopBar or landing.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  LayoutGrid, X, ChevronRight, Sparkles, BookOpen, Shield,
  Check, Eye, Wand2, FileCode, Database, Zap, Package,
} from 'lucide-react';
import { useCardStore } from '../../store/cardStore';
import {
  CARD_TEMPLATES, applyCardTemplate,
  type CardTemplate,
} from '../../lib/templates/cardTemplates';
import { MVUZOD_TEMPLATES, type MVUZODTemplate } from '../../lib/mvuzod/templateLibrary';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface TemplateGalleryProps {
  open: boolean;
  onClose: () => void;
}

type FilterCategory = 'all' | 'card' | 'schema';

const CATEGORY_ICONS: Record<string, typeof Sparkles> = {
  romance: Sparkles,
  adventure: Shield,
  system: Database,
  creative: Wand2,
};

const CATEGORY_COLORS: Record<string, string> = {
  romance: 'from-pink-500/20 to-rose-500/20 border-pink-500/30',
  adventure: 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
  system: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  creative: 'from-violet-500/20 to-purple-500/20 border-violet-500/30',
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function TemplateGallery({ open, onClose }: TemplateGalleryProps) {
  const { card, setCard, createSnapshot } = useCardStore();
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [previewCard, setPreviewCard] = useState<CardTemplate | null>(null);
  const [previewSchema, setPreviewSchema] = useState<MVUZODTemplate | null>(null);
  const [applied, setApplied] = useState<string | null>(null);

  const filteredCards = useMemo(() => {
    if (filter === 'schema') return [];
    return CARD_TEMPLATES;
  }, [filter]);

  const filteredSchemas = useMemo(() => {
    if (filter === 'card') return [];
    return MVUZOD_TEMPLATES;
  }, [filter]);

  const handleApplyCard = useCallback((template: CardTemplate) => {
    createSnapshot('Apply template');
    const newCard = applyCardTemplate(template, card);
    setCard(newCard);
    setApplied(template.id);
    setTimeout(() => setApplied(null), 2000);
  }, [card, setCard, createSnapshot]);

  const handleApplySchema = useCallback((template: MVUZODTemplate) => {
    createSnapshot('Apply schema');
    const clone = structuredClone(card);
    (clone.data.extensions as unknown as Record<string, unknown>).mvuzod = { schema: template.schema };
    setCard(clone);
    setApplied(template.id);
    setTimeout(() => setApplied(null), 2000);
  }, [card, setCard, createSnapshot]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Template Gallery</h2>
              <p className="text-[10px] text-muted-foreground">
                {CARD_TEMPLATES.length} card + {MVUZOD_TEMPLATES.length} schema templates
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-5 py-2.5 border-b border-border/50 bg-muted/10">
          {([
            { id: 'all' as const, label: 'Tất cả', count: CARD_TEMPLATES.length + MVUZOD_TEMPLATES.length },
            { id: 'card' as const, label: '📦 Card Templates', count: CARD_TEMPLATES.length },
            { id: 'schema' as const, label: '🔧 Schema Templates', count: MVUZOD_TEMPLATES.length },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                filter === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/30'
              }`}
            >
              {tab.label}
              <span className="text-[9px] opacity-50">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Card Templates */}
          {filteredCards.length > 0 && (
            <div className="mb-6">
              {filter === 'all' && (
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Package className="w-3 h-3" /> Card Templates
                </h3>
              )}
              <div className="grid grid-cols-2 gap-3">
                {filteredCards.map(template => (
                  <CardTemplateCard
                    key={template.id}
                    template={template}
                    applied={applied === template.id}
                    onPreview={() => setPreviewCard(template)}
                    onApply={() => handleApplyCard(template)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Schema Templates */}
          {filteredSchemas.length > 0 && (
            <div>
              {filter === 'all' && (
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FileCode className="w-3 h-3" /> Schema Templates (MVUZOD)
                </h3>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredSchemas.map(template => (
                  <SchemaTemplateCard
                    key={template.id}
                    template={template}
                    applied={applied === template.id}
                    onPreview={() => setPreviewSchema(template)}
                    onApply={() => handleApplySchema(template)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preview sidepanel */}
        {previewCard && (
          <CardPreviewPanel
            template={previewCard}
            onClose={() => setPreviewCard(null)}
            onApply={() => { handleApplyCard(previewCard); setPreviewCard(null); }}
          />
        )}
        {previewSchema && (
          <SchemaPreviewPanel
            template={previewSchema}
            onClose={() => setPreviewSchema(null)}
            onApply={() => { handleApplySchema(previewSchema); setPreviewSchema(null); }}
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CARD TEMPLATE CARD
// ═══════════════════════════════════════════════════════════════════════════

function CardTemplateCard({
  template, applied, onPreview, onApply,
}: {
  template: CardTemplate;
  applied: boolean;
  onPreview: () => void;
  onApply: () => void;
}) {
  const Icon = CATEGORY_ICONS[template.category] ?? Sparkles;
  const colorClass = CATEGORY_COLORS[template.category] ?? 'from-primary/20 to-violet-500/20 border-primary/30';

  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 transition-all hover:shadow-lg hover:scale-[1.01] ${colorClass}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{template.icon}</span>
          <div>
            <h4 className="text-xs font-semibold leading-tight">{template.name}</h4>
          </div>
        </div>
        <Icon className="w-4 h-4 text-muted-foreground/50" />
      </div>

      <p className="text-[10px] text-muted-foreground mb-3 line-clamp-2">{template.description}</p>

      {/* Includes badges */}
      <div className="flex flex-wrap gap-1 mb-3">
        {template.includes.schema && <Badge text="Schema" color="text-violet-400" />}
        {template.includes.worldbook && <Badge text={`${template.preview.entryCount} entries`} color="text-emerald-400" />}
        {template.includes.systemPrompt && <Badge text="System Prompt" color="text-blue-400" />}
        {template.includes.firstMessage && <Badge text="First Msg" color="text-amber-400" />}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {template.preview.tags.map(tag => (
          <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] bg-background/40 text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5">
        <button
          onClick={onPreview}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium border border-border/50 bg-background/50 hover:bg-background/80 transition-colors"
        >
          <Eye className="w-3 h-3" /> Xem
        </button>
        <button
          onClick={onApply}
          disabled={applied}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
            applied
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {applied ? <><Check className="w-3 h-3" /> Đã áp dụng</> : <><Zap className="w-3 h-3" /> Áp dụng</>}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA TEMPLATE CARD
// ═══════════════════════════════════════════════════════════════════════════

function SchemaTemplateCard({
  template, applied, onPreview, onApply,
}: {
  template: MVUZODTemplate;
  applied: boolean;
  onPreview: () => void;
  onApply: () => void;
}) {
  const fieldCount = template.schema.fields.length;

  return (
    <div className="rounded-xl border border-border bg-card/50 p-3 transition-all hover:shadow-md hover:border-primary/20">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{template.icon}</span>
        <h4 className="text-[11px] font-semibold flex-1 truncate">{template.name}</h4>
      </div>
      <p className="text-[10px] text-muted-foreground mb-2 line-clamp-2">{template.description}</p>
      <div className="flex items-center gap-2 mb-2">
        <Badge text={`${fieldCount} fields`} color="text-violet-400" />
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={onPreview}
          className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] border border-border/50 hover:bg-muted/30 transition-colors"
        >
          <Eye className="w-3 h-3" /> Xem
        </button>
        <button
          onClick={onApply}
          disabled={applied}
          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-medium transition-all ${
            applied
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-primary/80 text-primary-foreground hover:bg-primary'
          }`}
        >
          {applied ? <><Check className="w-3 h-3" /> OK</> : <><Zap className="w-3 h-3" /> Dùng</>}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PREVIEW PANELS
// ═══════════════════════════════════════════════════════════════════════════

function CardPreviewPanel({
  template, onClose, onApply,
}: {
  template: CardTemplate;
  onClose: () => void;
  onApply: () => void;
}) {
  const built = template.build();

  return (
    <div className="absolute inset-0 bg-card/95 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xl">{template.icon}</span>
          <h3 className="text-sm font-semibold">{template.name}</h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <p className="text-xs text-muted-foreground">{template.description}</p>

        {/* Includes */}
        <div className="flex flex-wrap gap-1.5">
          {template.includes.schema && <Badge text="✅ MVUZOD Schema" color="text-violet-400" />}
          {template.includes.worldbook && <Badge text={`✅ ${template.preview.entryCount} Worldbook entries`} color="text-emerald-400" />}
          {template.includes.systemPrompt && <Badge text="✅ System Prompt" color="text-blue-400" />}
          {template.includes.firstMessage && <Badge text="✅ First Message" color="text-amber-400" />}
          {template.includes.regex && <Badge text="✅ Regex Patterns" color="text-pink-400" />}
        </div>

        {/* System prompt preview */}
        {built.data?.system_prompt && (
          <PreviewSection title="System Prompt" content={built.data.system_prompt} />
        )}

        {/* First message preview */}
        {built.data?.first_mes && (
          <PreviewSection title="First Message" content={built.data.first_mes} />
        )}

        {/* Description preview */}
        {built.data?.description && (
          <PreviewSection title="Description" content={built.data.description} />
        )}

        {/* Worldbook entries */}
        {built.data?.character_book?.entries && built.data.character_book.entries.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Worldbook Entries ({built.data.character_book.entries.length})
            </h4>
            <div className="space-y-1">
              {built.data.character_book.entries.map((entry, i) => (
                <div key={i} className="px-3 py-2 rounded-lg bg-muted/20 border border-border/50">
                  <div className="text-[10px] font-medium">{entry.comment}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{entry.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-border flex items-center justify-between bg-muted/10">
        <span className="text-[10px] text-muted-foreground">
          ~{template.preview.estimatedTokens.toLocaleString()} tokens
        </span>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs border border-border hover:bg-muted/50 transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={onApply}
            className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-primary to-violet-500 text-primary-foreground hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
          >
            <Zap className="w-3 h-3" /> Áp dụng Template
          </button>
        </div>
      </div>
    </div>
  );
}

function SchemaPreviewPanel({
  template, onClose, onApply,
}: {
  template: MVUZODTemplate;
  onClose: () => void;
  onApply: () => void;
}) {
  return (
    <div className="absolute inset-0 bg-card/95 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xl">{template.icon}</span>
          <h3 className="text-sm font-semibold">{template.name}</h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <p className="text-xs text-muted-foreground">{template.description}</p>

        {/* Schema tree */}
        <div>
          <h4 className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
            <FileCode className="w-3 h-3" /> Schema Fields
          </h4>
          <div className="rounded-xl border border-border bg-background/50 p-3">
            <SchemaFieldTree fields={template.schema.fields} depth={0} />
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 bg-muted/10">
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs border border-border hover:bg-muted/50 transition-colors">
          Đóng
        </button>
        <button
          onClick={onApply}
          className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Zap className="w-3 h-3" /> Áp dụng Schema
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED
// ═══════════════════════════════════════════════════════════════════════════

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium bg-background/30 ${color}`}>
      {text}
    </span>
  );
}

function PreviewSection({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold text-muted-foreground mb-1.5">{title}</h4>
      <pre className="text-[10px] text-foreground/70 whitespace-pre-wrap font-sans p-3 rounded-lg bg-muted/20 border border-border/50 max-h-40 overflow-y-auto">
        {content}
      </pre>
    </div>
  );
}

function SchemaFieldTree({ fields, depth }: { fields: Array<{ path: string; type: string; label: string; children?: unknown[] }>; depth: number }) {
  const typeColors: Record<string, string> = {
    number: 'text-blue-400',
    string: 'text-emerald-400',
    boolean: 'text-amber-400',
    object: 'text-violet-400',
    record: 'text-pink-400',
    array: 'text-cyan-400',
  };

  return (
    <div className="space-y-0.5">
      {fields.map(field => {
        const name = field.path.split('/').filter(Boolean).pop() ?? field.path;
        const hasChildren = field.children && (field.children as unknown[]).length > 0;
        return (
          <div key={field.path}>
            <div className="flex items-center gap-1.5" style={{ paddingLeft: `${depth * 12}px` }}>
              {hasChildren && <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/40" />}
              {!hasChildren && <div className="w-2.5" />}
              <span className={`text-[10px] font-mono ${typeColors[field.type] ?? 'text-foreground/60'}`}>
                {field.type}
              </span>
              <span className="text-[10px] font-medium">{name}</span>
              <span className="text-[9px] text-muted-foreground/50">— {field.label}</span>
            </div>
            {hasChildren && (
              <SchemaFieldTree
                fields={field.children as Array<{ path: string; type: string; label: string; children?: unknown[] }>}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
