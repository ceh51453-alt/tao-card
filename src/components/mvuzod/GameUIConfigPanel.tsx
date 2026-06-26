/**
 * GameUIConfigPanel — Bảng tùy chỉnh giao diện cho AI Regex Generator
 * 14 section collapsible: Typography, Images, Layout, Effects, Colors, Text Styling,
 * Tabs, Progress Bars, Buttons, NPC Cards, Inventory, Notifications, Transitions, Responsive
 */

import { useState, useCallback } from 'react';
import {
  ChevronDown, ChevronRight,
  Type, Image, Layout, Sparkles, Palette, MessageSquare,
  Plus, Trash2, ExternalLink, ZoomIn, Eye,
  Columns3, BarChart3, MousePointerClick, Users, Package,
  Bell, Zap, Smartphone,
  Moon, Monitor, Music, PanelBottom, BookOpen, FileStack,
  ChevronUp, Coins, Award, Code2,
  AlertCircle, Table2, TextCursorInput,
} from 'lucide-react';
import type {
  GameUIConfig,
  ConfigSection,
  TypographyConfig,
  CharacterImage,
  ImagePosition, ImageShape, ImageSize,
  GameComponentTarget,
  StatusBarPosition, StatusBarStyle, DialogueBoxStyle,
  AnimationType,
  ColorPreset,
  TextStylingConfig,
  TabStyle,
  BarStyle,
  ButtonShape, ButtonVariant,
  NpcCardLayout, MoodDisplay,
  InventoryLayout, ItemRarity,
  ToastPosition, ToastStyle,
  SceneTransition,
  PlayerStyle, PlayerPosition,
  ToolbarPosition, ToolbarStyle,
  PageNavStyle,
  CollapseIcon, CollapseAnimation,
  BadgeShape, BadgePosition,
  PopupLayout, PopupSeverity,
  TableStyle, TableDensity,
  FormStyle,
} from '../../types/gameUiConfig.types';
import {
  POPULAR_FONTS,
  PRESET_LABELS,
  COLOR_PRESETS,
  createDefaultCharacterImage,
  applyColorPreset,
  IMAGE_SIZE_PX,
  createTabItem,
  createToolbarButton,
  createPageItem,
  createCurrencyItem,
  createCssVariable,
} from '../../lib/mvuzod/gameUiDefaults';
import { cn } from '../../lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════

interface GameUIConfigPanelProps {
  config: GameUIConfig;
  onChange: (config: GameUIConfig) => void;
  disabled?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function SliderRow({ label, value, min, max, step, unit, onChange, disabled }: {
  label: string; value: number; min: number; max: number; step?: number;
  unit?: string; onChange: (v: number) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-muted-foreground w-24 shrink-0">{label}</span>
      <input
        type="range" min={min} max={max} step={step ?? 1} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="flex-1 h-1.5 accent-primary"
      />
      <span className="text-[10px] text-muted-foreground w-12 text-right tabular-nums">
        {value}{unit ?? 'px'}
      </span>
    </div>
  );
}

function ColorRow({ label, value, onChange, disabled }: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-24 shrink-0">{label}</span>
      <input
        type="color" value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-6 h-6 rounded border border-border cursor-pointer bg-transparent"
      />
      <input
        type="text" value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-20 px-1.5 py-0.5 text-[10px] font-mono rounded border border-border bg-background
          focus:outline-none focus:ring-1 focus:ring-primary/30"
      />
    </div>
  );
}

function ToggleRow({ label, value, onChange, disabled }: {
  label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <button
        onClick={() => onChange(!value)}
        disabled={disabled}
        className={cn(
          'w-8 h-4.5 rounded-full transition-colors relative',
          value ? 'bg-primary' : 'bg-muted',
        )}
      >
        <span className={cn(
          'absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform shadow-sm',
          value ? 'translate-x-4' : 'translate-x-0.5',
        )} />
      </button>
    </div>
  );
}

function RadioRow<T extends string>({ label, value, options, onChange, disabled }: {
  label: string; value: T; options: { value: T; label: string }[];
  onChange: (v: T) => void; disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            className={cn(
              'px-2 py-1 rounded text-[9px] font-medium transition-colors border',
              value === opt.value
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border bg-background/50 text-muted-foreground hover:border-primary/20',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

function Section({ icon: Icon, title, summary, defaultOpen, enabled, onToggleEnabled, children }: {
  icon: typeof Type; title: string; summary?: string;
  defaultOpen?: boolean; enabled: boolean; onToggleEnabled: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className={cn('rounded-lg border overflow-hidden transition-opacity', enabled ? 'border-border' : 'border-border/40 opacity-60')}>
      <div className="flex items-center">
        {/* Enable/disable toggle */}
        <button
          onClick={e => { e.stopPropagation(); onToggleEnabled(); }}
          className="px-2 py-2.5 hover:bg-muted/20 transition-colors group"
          title={enabled ? 'Tắt section này' : 'Bật section này'}
        >
          <span className={cn(
            'block w-2.5 h-2.5 rounded-full border-2 transition-colors',
            enabled
              ? 'bg-emerald-400 border-emerald-500/50'
              : 'bg-transparent border-muted-foreground/40 group-hover:border-emerald-400/60',
          )} />
        </button>

        {/* Section header */}
        <button
          onClick={() => { if (enabled) setOpen(!open); }}
          className={cn('flex-1 pr-3 py-2.5 flex items-center gap-2 transition-colors', enabled ? 'hover:bg-muted/20 cursor-pointer' : 'cursor-default')}
        >
          {enabled && (open ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />)}
          <Icon className={cn('w-3.5 h-3.5', enabled ? 'text-primary' : 'text-muted-foreground/50')} />
          <span className={cn('text-[11px] font-medium flex-1 text-left', !enabled && 'text-muted-foreground/70')}>{title}</span>
          {enabled && summary && <span className="text-[9px] text-muted-foreground truncate max-w-[140px]">{summary}</span>}
          {!enabled && <span className="text-[8px] text-muted-foreground/50 italic">tắt</span>}
        </button>
      </div>
      {enabled && open && (
        <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-border/50 bg-background/30">
          {children}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function GameUIConfigPanel({ config, onChange, disabled }: GameUIConfigPanelProps) {
  const update = useCallback(<K extends keyof GameUIConfig>(key: K, val: GameUIConfig[K]) => {
    onChange({ ...config, [key]: val });
  }, [config, onChange]);

  const updateTypo = useCallback((partial: Partial<TypographyConfig>) => {
    update('typography', { ...config.typography, ...partial });
  }, [config.typography, update]);

  const updateText = useCallback((partial: Partial<TextStylingConfig>) => {
    update('textStyling', { ...config.textStyling, ...partial });
  }, [config.textStyling, update]);

  // ─── Typography summary ───
  const typoSummary = `${config.typography.fontFamily}, ${config.typography.fontSize}px`;

  // ─── Image management ───
  const addCharImage = useCallback(() => {
    update('images', {
      ...config.images,
      characters: [...config.images.characters, createDefaultCharacterImage()],
    });
  }, [config.images, update]);

  const removeCharImage = useCallback((id: string) => {
    update('images', {
      ...config.images,
      characters: config.images.characters.filter(c => c.id !== id),
    });
  }, [config.images, update]);

  const updateCharImage = useCallback((id: string, partial: Partial<CharacterImage>) => {
    update('images', {
      ...config.images,
      characters: config.images.characters.map(c =>
        c.id === id ? { ...c, ...partial } : c,
      ),
    });
  }, [config.images, update]);

  const imgSummary = config.images.characters.length > 0
    ? `${config.images.characters.length} ảnh`
    : undefined;

  // ─── Color preset apply ───
  const handlePresetChange = useCallback((preset: ColorPreset) => {
    update('colorScheme', applyColorPreset(preset));
  }, [update]);

  const toggleSection = useCallback((key: ConfigSection) => {
    onChange({
      ...config,
      enabledSections: { ...config.enabledSections, [key]: !config.enabledSections[key] },
    });
  }, [config, onChange]);

  const [customFontInput, setCustomFontInput] = useState('');

  const s = config.enabledSections; // shorthand

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-0.5">
        Tùy chỉnh giao diện <span className="text-[8px] opacity-60">(● bật/tắt từng mục)</span>
      </p>

      {/* ─── TYPOGRAPHY ─── */}
      <Section icon={Type} title="Typography" summary={typoSummary} defaultOpen enabled={s.typography} onToggleEnabled={() => toggleSection('typography')}>
        {/* Font selector */}
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">Font chính</span>
          <select
            value={POPULAR_FONTS.find(f => f.name === config.typography.fontFamily) ? config.typography.fontFamily : '__custom__'}
            onChange={e => {
              if (e.target.value !== '__custom__') updateTypo({ fontFamily: e.target.value });
            }}
            disabled={disabled}
            className="w-full px-2 py-1.5 text-xs rounded border border-border bg-background
              focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            <optgroup label="Sans-serif">
              {POPULAR_FONTS.filter(f => f.category === 'sans-serif').map(f => (
                <option key={f.name} value={f.name}>{f.name}</option>
              ))}
            </optgroup>
            <optgroup label="Serif">
              {POPULAR_FONTS.filter(f => f.category === 'serif').map(f => (
                <option key={f.name} value={f.name}>{f.name}</option>
              ))}
            </optgroup>
            <optgroup label="Display">
              {POPULAR_FONTS.filter(f => f.category === 'display').map(f => (
                <option key={f.name} value={f.name}>{f.name}</option>
              ))}
            </optgroup>
            <optgroup label="Monospace">
              {POPULAR_FONTS.filter(f => f.category === 'monospace').map(f => (
                <option key={f.name} value={f.name}>{f.name}</option>
              ))}
            </optgroup>
            <option value="__custom__">— Nhập font khác —</option>
          </select>
          {/* Custom font input */}
          {!POPULAR_FONTS.find(f => f.name === config.typography.fontFamily) && (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customFontInput || config.typography.fontFamily}
                onChange={e => setCustomFontInput(e.target.value)}
                onBlur={() => { if (customFontInput.trim()) updateTypo({ fontFamily: customFontInput.trim() }); }}
                onKeyDown={e => { if (e.key === 'Enter' && customFontInput.trim()) updateTypo({ fontFamily: customFontInput.trim() }); }}
                placeholder="Tên font (Google Fonts hoặc system)"
                disabled={disabled}
                className="flex-1 px-2 py-1 text-[10px] rounded border border-border bg-background
                  focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          )}
        </div>

        {/* Heading font */}
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">Font heading</span>
          <select
            value={config.typography.headingFont}
            onChange={e => updateTypo({ headingFont: e.target.value })}
            disabled={disabled}
            className="w-full px-2 py-1.5 text-xs rounded border border-border bg-background
              focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            {POPULAR_FONTS.map(f => (
              <option key={f.name} value={f.name}>{f.name}</option>
            ))}
          </select>
        </div>

        <SliderRow label="Cỡ chữ" value={config.typography.fontSize} min={10} max={24} onChange={v => updateTypo({ fontSize: v })} disabled={disabled} />
        <SliderRow label="Line height" value={config.typography.lineHeight} min={1.0} max={2.5} step={0.1} unit="" onChange={v => updateTypo({ lineHeight: v })} disabled={disabled} />
        <SliderRow label="Letter spacing" value={config.typography.letterSpacing} min={-1} max={3} step={0.1} unit="px" onChange={v => updateTypo({ letterSpacing: v })} disabled={disabled} />

        <RadioRow
          label="Font weight"
          value={config.typography.fontWeight}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'normal', label: 'Normal' },
            { value: 'medium', label: 'Medium' },
            { value: 'bold', label: 'Bold' },
          ]}
          onChange={v => updateTypo({ fontWeight: v })}
          disabled={disabled}
        />

        {/* Live preview */}
        <div
          className="rounded-lg border border-border p-3 space-y-1"
          style={{
            fontFamily: `"${config.typography.fontFamily}", system-ui, sans-serif`,
            fontSize: `${config.typography.fontSize}px`,
            fontWeight: config.typography.fontWeight === 'light' ? 300 : config.typography.fontWeight === 'medium' ? 500 : config.typography.fontWeight === 'bold' ? 700 : 400,
            lineHeight: config.typography.lineHeight,
            letterSpacing: `${config.typography.letterSpacing}px`,
          }}
        >
          <p style={{ color: config.textStyling.dialogueColor }}>
            {config.textStyling.showQuoteMarks ? '"' : ''}Xin chào, tôi là Minh Nguyệt.{config.textStyling.showQuoteMarks ? '"' : ''}
          </p>
          <p style={{ color: config.textStyling.actionColor, fontStyle: config.textStyling.actionStyle === 'italic' ? 'italic' : 'normal' }}>
            *Cô ấy mỉm cười nhẹ nhàng.*
          </p>
          <p style={{ color: config.textStyling.narrativeColor }}>
            Ánh trăng chiếu rọi qua cửa sổ phòng khách.
          </p>
        </div>
      </Section>

      {/* ─── IMAGES ─── */}
      <Section icon={Image} title="Hình ảnh" summary={imgSummary} enabled={s.images} onToggleEnabled={() => toggleSection('images')}>
        {/* Character images list */}
        {config.images.characters.map((img) => (
          <div key={img.id} className="rounded-lg border border-border p-2.5 space-y-2 bg-muted/10">
            <div className="flex items-start gap-2">
              {/* Preview thumbnail */}
              <div className={cn(
                'w-10 h-10 shrink-0 bg-muted/50 flex items-center justify-center overflow-hidden border',
                img.shape === 'circle' ? 'rounded-full' : img.shape === 'rounded' ? 'rounded-lg' : 'rounded-none',
                img.border ? 'border-primary/40' : 'border-transparent',
              )}>
                {img.imageUrl ? (
                  <img src={img.imageUrl} alt={img.characterName} className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <Image className="w-4 h-4 text-muted-foreground/40" />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <input
                  type="text"
                  value={img.characterName}
                  onChange={e => updateCharImage(img.id, { characterName: e.target.value })}
                  placeholder="Tên nhân vật"
                  disabled={disabled}
                  className="w-full px-2 py-1 text-[11px] font-medium rounded border border-border bg-background
                    focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={img.imageUrl}
                    onChange={e => updateCharImage(img.id, { imageUrl: e.target.value })}
                    placeholder="https://example.com/image.png"
                    disabled={disabled}
                    className="flex-1 px-2 py-1 text-[10px] font-mono rounded border border-border bg-background
                      focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  {img.imageUrl && (
                    <a href={img.imageUrl} target="_blank" rel="noopener noreferrer"
                      className="p-1 rounded hover:bg-muted/50 text-muted-foreground">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              <button
                onClick={() => removeCharImage(img.id)}
                disabled={disabled}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Position / Shape / Size row */}
            <div className="grid grid-cols-3 gap-1.5">
              <div className="space-y-0.5">
                <span className="text-[8px] text-muted-foreground/60 uppercase">Vị trí</span>
                <select value={img.position}
                  onChange={e => updateCharImage(img.id, { position: e.target.value as ImagePosition })}
                  disabled={disabled}
                  className="w-full px-1 py-0.5 text-[9px] rounded border border-border bg-background">
                  <option value="left">⬅️ Left</option>
                  <option value="right">➡️ Right</option>
                  <option value="center">⬆️ Center</option>
                  <option value="background">🖼 Background</option>
                </select>
              </div>
              <div className="space-y-0.5">
                <span className="text-[8px] text-muted-foreground/60 uppercase">Hình dạng</span>
                <select value={img.shape}
                  onChange={e => updateCharImage(img.id, { shape: e.target.value as ImageShape })}
                  disabled={disabled}
                  className="w-full px-1 py-0.5 text-[9px] rounded border border-border bg-background">
                  <option value="circle">🔵 Circle</option>
                  <option value="rounded">◻️ Rounded</option>
                  <option value="square">⬜ Square</option>
                  <option value="none">— None</option>
                </select>
              </div>
              <div className="space-y-0.5">
                <span className="text-[8px] text-muted-foreground/60 uppercase">Kích thước</span>
                <select value={img.size}
                  onChange={e => updateCharImage(img.id, { size: e.target.value as ImageSize })}
                  disabled={disabled}
                  className="w-full px-1 py-0.5 text-[9px] rounded border border-border bg-background">
                  <option value="small">S ({IMAGE_SIZE_PX.small}px)</option>
                  <option value="medium">M ({IMAGE_SIZE_PX.medium}px)</option>
                  <option value="large">L ({IMAGE_SIZE_PX.large}px)</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            {img.size === 'custom' && (
              <SliderRow label="Custom size" value={img.customSizePx} min={24} max={200} unit="px"
                onChange={v => updateCharImage(img.id, { customSizePx: v })} disabled={disabled} />
            )}

            {/* Toggles row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <label className="flex items-center gap-1.5 text-[9px] text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={img.zoomable}
                  onChange={e => updateCharImage(img.id, { zoomable: e.target.checked })}
                  disabled={disabled} className="rounded border-border" />
                <ZoomIn className="w-3 h-3" /> Phóng to
              </label>
              <label className="flex items-center gap-1.5 text-[9px] text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={img.showOnHover}
                  onChange={e => updateCharImage(img.id, { showOnHover: e.target.checked })}
                  disabled={disabled} className="rounded border-border" />
                <Eye className="w-3 h-3" /> Hover
              </label>
              <label className="flex items-center gap-1.5 text-[9px] text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={img.border}
                  onChange={e => updateCharImage(img.id, { border: e.target.checked })}
                  disabled={disabled} className="rounded border-border" />
                Viền
              </label>
            </div>

            {img.border && (
              <ColorRow label="Màu viền" value={img.borderColor}
                onChange={v => updateCharImage(img.id, { borderColor: v })} disabled={disabled} />
            )}

            {/* Used-in checkboxes */}
            <div className="space-y-0.5">
              <span className="text-[8px] text-muted-foreground/60 uppercase">Dùng trong</span>
              <div className="flex gap-2">
                {([
                  { value: 'status_bar' as GameComponentTarget, label: 'Status Bar' },
                  { value: 'game_screen' as GameComponentTarget, label: 'Game Screen' },
                  { value: 'opening_form' as GameComponentTarget, label: 'Opening Form' },
                ] as const).map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-1 text-[9px] text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={img.usedIn.includes(value)}
                      onChange={e => {
                        const newUsedIn = e.target.checked
                          ? [...img.usedIn, value]
                          : img.usedIn.filter(u => u !== value);
                        updateCharImage(img.id, { usedIn: newUsedIn });
                      }}
                      disabled={disabled}
                      className="rounded border-border"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addCharImage}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border
            text-[10px] text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
        >
          <Plus className="w-3 h-3" /> Thêm ảnh nhân vật
        </button>

        {/* Background settings */}
        <div className="space-y-1.5 pt-1 border-t border-border/50">
          <span className="text-[9px] text-muted-foreground/60 uppercase">Ảnh nền chung</span>
          <input
            type="text"
            value={config.images.backgroundUrl}
            onChange={e => update('images', { ...config.images, backgroundUrl: e.target.value })}
            placeholder="URL ảnh nền (tùy chọn)"
            disabled={disabled}
            className="w-full px-2 py-1 text-[10px] font-mono rounded border border-border bg-background
              focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          {config.images.backgroundUrl && (
            <>
              <SliderRow label="Opacity" value={config.images.backgroundOpacity} min={0} max={1} step={0.05} unit=""
                onChange={v => update('images', { ...config.images, backgroundOpacity: v })} disabled={disabled} />
              <SliderRow label="Blur" value={config.images.backgroundBlur} min={0} max={20}
                onChange={v => update('images', { ...config.images, backgroundBlur: v })} disabled={disabled} />
            </>
          )}
        </div>
      </Section>

      {/* ─── LAYOUT ─── */}
      <Section icon={Layout} title="Layout" summary={`${config.layout.maxWidth}px, ${config.layout.dialogueBoxStyle}`} enabled={s.layout} onToggleEnabled={() => toggleSection('layout')}>
        <SliderRow label="Max width" value={config.layout.maxWidth} min={300} max={900} step={10}
          onChange={v => update('layout', { ...config.layout, maxWidth: v })} disabled={disabled} />
        <SliderRow label="Border radius" value={config.layout.borderRadius} min={0} max={32}
          onChange={v => update('layout', { ...config.layout, borderRadius: v })} disabled={disabled} />
        <SliderRow label="Padding" value={config.layout.padding} min={4} max={40}
          onChange={v => update('layout', { ...config.layout, padding: v })} disabled={disabled} />
        <SliderRow label="Gap" value={config.layout.gap} min={2} max={24}
          onChange={v => update('layout', { ...config.layout, gap: v })} disabled={disabled} />

        <RadioRow<StatusBarPosition>
          label="Status bar position"
          value={config.layout.statusBarPosition}
          options={[
            { value: 'top', label: '⬆ Top' },
            { value: 'bottom', label: '⬇ Bottom' },
            { value: 'float', label: '🔲 Float' },
          ]}
          onChange={v => update('layout', { ...config.layout, statusBarPosition: v })}
          disabled={disabled}
        />

        <RadioRow<StatusBarStyle>
          label="Status bar style"
          value={config.layout.statusBarStyle}
          options={[
            { value: 'compact', label: 'Compact' },
            { value: 'detailed', label: 'Detailed' },
            { value: 'minimal', label: 'Minimal' },
          ]}
          onChange={v => update('layout', { ...config.layout, statusBarStyle: v })}
          disabled={disabled}
        />

        <RadioRow<DialogueBoxStyle>
          label="Dialogue style"
          value={config.layout.dialogueBoxStyle}
          options={[
            { value: 'plain', label: 'Plain' },
            { value: 'bubble', label: 'Bubble' },
            { value: 'novel', label: 'Novel' },
            { value: 'vn', label: 'Visual Novel' },
          ]}
          onChange={v => update('layout', { ...config.layout, dialogueBoxStyle: v })}
          disabled={disabled}
        />
      </Section>

      {/* ─── EFFECTS ─── */}
      <Section icon={Sparkles} title="Hiệu ứng" summary={
        [config.effects.enableAnimations && config.effects.animationType, config.effects.enableGlow && 'glow', config.effects.enableGlassmorphism && 'glass'].filter(Boolean).join(', ') || 'none'
      } enabled={s.effects} onToggleEnabled={() => toggleSection('effects')}>
        <ToggleRow label="Animation" value={config.effects.enableAnimations}
          onChange={v => update('effects', { ...config.effects, enableAnimations: v })} disabled={disabled} />
        {config.effects.enableAnimations && (
          <RadioRow<AnimationType>
            label="Loại animation"
            value={config.effects.animationType}
            options={[
              { value: 'fade', label: 'Fade' },
              { value: 'slide', label: 'Slide' },
              { value: 'scale', label: 'Scale' },
              { value: 'none', label: 'None' },
            ]}
            onChange={v => update('effects', { ...config.effects, animationType: v })}
            disabled={disabled}
          />
        )}

        <ToggleRow label="Glow effect" value={config.effects.enableGlow}
          onChange={v => update('effects', { ...config.effects, enableGlow: v })} disabled={disabled} />
        {config.effects.enableGlow && (
          <>
            <ColorRow label="Glow color" value={config.effects.glowColor}
              onChange={v => update('effects', { ...config.effects, glowColor: v })} disabled={disabled} />
            <SliderRow label="Glow intensity" value={config.effects.glowIntensity} min={0} max={30}
              onChange={v => update('effects', { ...config.effects, glowIntensity: v })} disabled={disabled} />
          </>
        )}

        <ToggleRow label="Shadow" value={config.effects.enableShadow}
          onChange={v => update('effects', { ...config.effects, enableShadow: v })} disabled={disabled} />

        <ToggleRow label="Gradient background" value={config.effects.enableGradient}
          onChange={v => update('effects', { ...config.effects, enableGradient: v })} disabled={disabled} />
        {config.effects.enableGradient && (
          <div className="flex gap-2">
            <ColorRow label="From" value={config.effects.gradientFrom}
              onChange={v => update('effects', { ...config.effects, gradientFrom: v })} disabled={disabled} />
            <ColorRow label="To" value={config.effects.gradientTo}
              onChange={v => update('effects', { ...config.effects, gradientTo: v })} disabled={disabled} />
          </div>
        )}

        <ToggleRow label="Glassmorphism" value={config.effects.enableGlassmorphism}
          onChange={v => update('effects', { ...config.effects, enableGlassmorphism: v })} disabled={disabled} />
      </Section>

      {/* ─── COLORS ─── */}
      <Section icon={Palette} title="Màu sắc" summary={`${PRESET_LABELS[config.colorScheme.preset]?.emoji ?? ''} ${PRESET_LABELS[config.colorScheme.preset]?.label ?? config.colorScheme.preset}`} enabled={s.colorScheme} onToggleEnabled={() => toggleSection('colorScheme')}>
        {/* Preset selector */}
        <div className="grid grid-cols-4 gap-1">
          {(Object.keys(PRESET_LABELS) as ColorPreset[]).map(preset => {
            const info = PRESET_LABELS[preset];
            const colors = COLOR_PRESETS[preset];
            return (
              <button
                key={preset}
                onClick={() => handlePresetChange(preset)}
                disabled={disabled}
                className={cn(
                  'flex flex-col items-center gap-1 px-1.5 py-2 rounded-lg border transition-all',
                  config.colorScheme.preset === preset
                    ? 'border-primary/50 bg-primary/10 shadow-sm'
                    : 'border-border hover:border-primary/20',
                )}
              >
                <div className="flex gap-0.5">
                  <span className="w-3 h-3 rounded-full border border-border/50" style={{ background: colors.primaryColor }} />
                  <span className="w-3 h-3 rounded-full border border-border/50" style={{ background: colors.accentColor }} />
                  <span className="w-3 h-3 rounded-full border border-border/50" style={{ background: colors.backgroundColor }} />
                </div>
                <span className="text-[8px] text-muted-foreground">{info.label}</span>
              </button>
            );
          })}
        </div>

        {/* Custom colors */}
        <div className="space-y-1.5 pt-1">
          <ColorRow label="Primary" value={config.colorScheme.primaryColor}
            onChange={v => update('colorScheme', { ...config.colorScheme, preset: 'custom', primaryColor: v })} disabled={disabled} />
          <ColorRow label="Secondary" value={config.colorScheme.secondaryColor}
            onChange={v => update('colorScheme', { ...config.colorScheme, preset: 'custom', secondaryColor: v })} disabled={disabled} />
          <ColorRow label="Accent" value={config.colorScheme.accentColor}
            onChange={v => update('colorScheme', { ...config.colorScheme, preset: 'custom', accentColor: v })} disabled={disabled} />
          <ColorRow label="Background" value={config.colorScheme.backgroundColor}
            onChange={v => update('colorScheme', { ...config.colorScheme, preset: 'custom', backgroundColor: v })} disabled={disabled} />
          <ColorRow label="Surface" value={config.colorScheme.surfaceColor}
            onChange={v => update('colorScheme', { ...config.colorScheme, preset: 'custom', surfaceColor: v })} disabled={disabled} />
          <ColorRow label="Border" value={config.colorScheme.borderColor}
            onChange={v => update('colorScheme', { ...config.colorScheme, preset: 'custom', borderColor: v })} disabled={disabled} />
        </div>
      </Section>

      {/* ─── TEXT STYLING ─── */}
      <Section icon={MessageSquare} title="Text Styling" summary={`đă${config.textStyling.dialogueColor} *${config.textStyling.actionColor}`} enabled={s.textStyling} onToggleEnabled={() => toggleSection('textStyling')}>
        <ColorRow label="Lời thoại" value={config.textStyling.dialogueColor}
          onChange={v => updateText({ dialogueColor: v })} disabled={disabled} />
        <ColorRow label="Hành động" value={config.textStyling.actionColor}
          onChange={v => updateText({ actionColor: v })} disabled={disabled} />
        <ColorRow label="Tường thuật" value={config.textStyling.narrativeColor}
          onChange={v => updateText({ narrativeColor: v })} disabled={disabled} />

        <RadioRow
          label="Dialogue style"
          value={config.textStyling.dialogueStyle}
          options={[
            { value: 'normal', label: 'Normal' },
            { value: 'italic', label: 'Italic' },
            { value: 'bold', label: 'Bold' },
          ]}
          onChange={v => updateText({ dialogueStyle: v })}
          disabled={disabled}
        />
        <RadioRow
          label="Action style"
          value={config.textStyling.actionStyle}
          options={[
            { value: 'italic', label: 'Italic' },
            { value: 'normal', label: 'Normal' },
            { value: 'bold', label: 'Bold' },
          ]}
          onChange={v => updateText({ actionStyle: v })}
          disabled={disabled}
        />

        <ToggleRow label="Hiện dấu ngoặc kép" value={config.textStyling.showQuoteMarks}
          onChange={v => updateText({ showQuoteMarks: v })} disabled={disabled} />
        <ToggleRow label="Highlight tên người nói" value={config.textStyling.highlightSpeaker}
          onChange={v => updateText({ highlightSpeaker: v })} disabled={disabled} />
      </Section>

      {/* ─── TABS ─── */}
      <Section icon={Columns3} title="Tab System" summary={
        config.tabs.enabled ? `${config.tabs.tabs.filter(t => t.enabled).length} tabs, ${config.tabs.style}` : 'tắt'
      } enabled={s.tabs} onToggleEnabled={() => toggleSection('tabs')}>
        <ToggleRow label="Bật tab system" value={config.tabs.enabled}
          onChange={v => update('tabs', { ...config.tabs, enabled: v })} disabled={disabled} />

        {config.tabs.enabled && (
          <>
            <RadioRow<TabStyle>
              label="Tab style"
              value={config.tabs.style}
              options={[
                { value: 'underline', label: 'Underline' },
                { value: 'pill', label: 'Pill' },
                { value: 'card', label: 'Card' },
                { value: 'minimal', label: 'Minimal' },
                { value: 'vertical', label: 'Vertical' },
              ]}
              onChange={v => update('tabs', { ...config.tabs, style: v })}
              disabled={disabled}
            />

            <RadioRow<'top' | 'bottom'>
              label="Vị trí tabs"
              value={config.tabs.position}
              options={[
                { value: 'top', label: '⬆ Top' },
                { value: 'bottom', label: '⬇ Bottom' },
              ]}
              onChange={v => update('tabs', { ...config.tabs, position: v })}
              disabled={disabled}
            />

            <RadioRow<'small' | 'medium' | 'large'>
              label="Tab size"
              value={config.tabs.tabSize}
              options={[
                { value: 'small', label: 'S' },
                { value: 'medium', label: 'M' },
                { value: 'large', label: 'L' },
              ]}
              onChange={v => update('tabs', { ...config.tabs, tabSize: v })}
              disabled={disabled}
            />

            <ToggleRow label="Hiện icon" value={config.tabs.showIcons}
              onChange={v => update('tabs', { ...config.tabs, showIcons: v })} disabled={disabled} />
            <ToggleRow label="Animation" value={config.tabs.animated}
              onChange={v => update('tabs', { ...config.tabs, animated: v })} disabled={disabled} />

            <ColorRow label="Active color" value={config.tabs.activeColor}
              onChange={v => update('tabs', { ...config.tabs, activeColor: v })} disabled={disabled} />
            <ColorRow label="Inactive color" value={config.tabs.inactiveColor}
              onChange={v => update('tabs', { ...config.tabs, inactiveColor: v })} disabled={disabled} />

            {/* Tab list */}
            <div className="space-y-1 pt-1 border-t border-border/50">
              <span className="text-[9px] text-muted-foreground/60 uppercase">Tabs (bật/tắt)</span>
              {config.tabs.tabs.map((tab) => (
                <div key={tab.id} className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 flex-1 cursor-pointer">
                    <input type="checkbox" checked={tab.enabled}
                      onChange={e => {
                        const updated = config.tabs.tabs.map(t => t.id === tab.id ? { ...t, enabled: e.target.checked } : t);
                        update('tabs', { ...config.tabs, tabs: updated });
                      }}
                      disabled={disabled} className="rounded" />
                    <span className="text-[10px]">{tab.emoji}</span>
                    <input type="text" value={tab.label}
                      onChange={e => {
                        const updated = config.tabs.tabs.map(t => t.id === tab.id ? { ...t, label: e.target.value } : t);
                        update('tabs', { ...config.tabs, tabs: updated });
                      }}
                      disabled={disabled}
                      className="flex-1 px-1.5 py-0.5 text-[10px] rounded border border-border bg-background
                        focus:outline-none focus:ring-1 focus:ring-primary/30" />
                  </label>
                  <button
                    onClick={() => update('tabs', { ...config.tabs, tabs: config.tabs.tabs.filter(t => t.id !== tab.id) })}
                    disabled={disabled}
                    className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => update('tabs', { ...config.tabs, tabs: [...config.tabs.tabs, createTabItem()] })}
                disabled={disabled}
                className="w-full flex items-center justify-center gap-1 px-2 py-1 rounded border border-dashed border-border
                  text-[9px] text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors">
                <Plus className="w-2.5 h-2.5" /> Thêm tab
              </button>
            </div>
          </>
        )}
      </Section>

      {/* ─── PROGRESS BARS ─── */}
      <Section icon={BarChart3} title="Progress Bars" summary={`${config.progressBars.style}, ${config.progressBars.height}px`} enabled={s.progressBars} onToggleEnabled={() => toggleSection('progressBars')}>
        <RadioRow<BarStyle>
          label="Style"
          value={config.progressBars.style}
          options={[
            { value: 'linear', label: 'Linear' },
            { value: 'circular', label: 'Circular' },
            { value: 'segmented', label: 'Segmented' },
            { value: 'gradient', label: 'Gradient' },
          ]}
          onChange={v => update('progressBars', { ...config.progressBars, style: v })}
          disabled={disabled}
        />

        <SliderRow label="Chiều cao" value={config.progressBars.height} min={4} max={24}
          onChange={v => update('progressBars', { ...config.progressBars, height: v })} disabled={disabled} />
        <SliderRow label="Bo góc" value={config.progressBars.borderRadius} min={0} max={12}
          onChange={v => update('progressBars', { ...config.progressBars, borderRadius: v })} disabled={disabled} />

        <ToggleRow label="Hiện label %" value={config.progressBars.showLabel}
          onChange={v => update('progressBars', { ...config.progressBars, showLabel: v })} disabled={disabled} />
        <ToggleRow label="Hiện giá trị X/Max" value={config.progressBars.showValue}
          onChange={v => update('progressBars', { ...config.progressBars, showValue: v })} disabled={disabled} />
        <ToggleRow label="Animation khi thay đổi" value={config.progressBars.animateOnChange}
          onChange={v => update('progressBars', { ...config.progressBars, animateOnChange: v })} disabled={disabled} />
        <ToggleRow label="Hiệu ứng sọc" value={config.progressBars.stripedEffect}
          onChange={v => update('progressBars', { ...config.progressBars, stripedEffect: v })} disabled={disabled} />

        <div className="space-y-1.5 pt-1 border-t border-border/50">
          <span className="text-[9px] text-muted-foreground/60 uppercase">Màu bars</span>
          <ColorRow label="❤️ HP" value={config.progressBars.barColors.hp}
            onChange={v => update('progressBars', { ...config.progressBars, barColors: { ...config.progressBars.barColors, hp: v } })} disabled={disabled} />
          <ColorRow label="💙 MP" value={config.progressBars.barColors.mp}
            onChange={v => update('progressBars', { ...config.progressBars, barColors: { ...config.progressBars.barColors, mp: v } })} disabled={disabled} />
          <ColorRow label="⭐ EXP" value={config.progressBars.barColors.exp}
            onChange={v => update('progressBars', { ...config.progressBars, barColors: { ...config.progressBars.barColors, exp: v } })} disabled={disabled} />
          <ColorRow label="💚 Stamina" value={config.progressBars.barColors.stamina}
            onChange={v => update('progressBars', { ...config.progressBars, barColors: { ...config.progressBars.barColors, stamina: v } })} disabled={disabled} />
          <ColorRow label="💜 Generic" value={config.progressBars.barColors.generic}
            onChange={v => update('progressBars', { ...config.progressBars, barColors: { ...config.progressBars.barColors, generic: v } })} disabled={disabled} />
          <ColorRow label="Track" value={config.progressBars.trackColor}
            onChange={v => update('progressBars', { ...config.progressBars, trackColor: v })} disabled={disabled} />
        </div>
      </Section>

      {/* ─── BUTTONS ─── */}
      <Section icon={MousePointerClick} title="Buttons" summary={`${config.buttons.shape}, ${config.buttons.variant}`} enabled={s.buttons} onToggleEnabled={() => toggleSection('buttons')}>
        <RadioRow<ButtonShape>
          label="Hình dạng"
          value={config.buttons.shape}
          options={[
            { value: 'rounded', label: 'Rounded' },
            { value: 'pill', label: 'Pill' },
            { value: 'sharp', label: 'Sharp' },
            { value: 'circle', label: 'Circle' },
          ]}
          onChange={v => update('buttons', { ...config.buttons, shape: v })}
          disabled={disabled}
        />

        <RadioRow<ButtonVariant>
          label="Variant"
          value={config.buttons.variant}
          options={[
            { value: 'solid', label: 'Solid' },
            { value: 'outline', label: 'Outline' },
            { value: 'ghost', label: 'Ghost' },
            { value: 'gradient', label: 'Gradient' },
          ]}
          onChange={v => update('buttons', { ...config.buttons, variant: v })}
          disabled={disabled}
        />

        <RadioRow<'small' | 'medium' | 'large'>
          label="Size"
          value={config.buttons.size}
          options={[
            { value: 'small', label: 'S' },
            { value: 'medium', label: 'M' },
            { value: 'large', label: 'L' },
          ]}
          onChange={v => update('buttons', { ...config.buttons, size: v })}
          disabled={disabled}
        />

        <RadioRow<'lift' | 'glow' | 'scale' | 'color' | 'none'>
          label="Hover effect"
          value={config.buttons.hoverEffect}
          options={[
            { value: 'lift', label: 'Lift' },
            { value: 'glow', label: 'Glow' },
            { value: 'scale', label: 'Scale' },
            { value: 'color', label: 'Color' },
            { value: 'none', label: 'None' },
          ]}
          onChange={v => update('buttons', { ...config.buttons, hoverEffect: v })}
          disabled={disabled}
        />

        <RadioRow<'ripple' | 'pulse' | 'shrink' | 'none'>
          label="Click feedback"
          value={config.buttons.clickFeedback}
          options={[
            { value: 'ripple', label: 'Ripple' },
            { value: 'pulse', label: 'Pulse' },
            { value: 'shrink', label: 'Shrink' },
            { value: 'none', label: 'None' },
          ]}
          onChange={v => update('buttons', { ...config.buttons, clickFeedback: v })}
          disabled={disabled}
        />

        <ColorRow label="Primary" value={config.buttons.primaryColor}
          onChange={v => update('buttons', { ...config.buttons, primaryColor: v })} disabled={disabled} />
        <ColorRow label="Text" value={config.buttons.textColor}
          onChange={v => update('buttons', { ...config.buttons, textColor: v })} disabled={disabled} />

        <ToggleRow label="Shadow" value={config.buttons.showShadow}
          onChange={v => update('buttons', { ...config.buttons, showShadow: v })} disabled={disabled} />

        <RadioRow<'before' | 'after' | 'none'>
          label="Icon position"
          value={config.buttons.iconPosition}
          options={[
            { value: 'before', label: 'Before' },
            { value: 'after', label: 'After' },
            { value: 'none', label: 'None' },
          ]}
          onChange={v => update('buttons', { ...config.buttons, iconPosition: v })}
          disabled={disabled}
        />
      </Section>

      {/* ─── NPC CARDS ─── */}
      <Section icon={Users} title="NPC / Character Cards" summary={config.npcCards.layout} enabled={s.npcCards} onToggleEnabled={() => toggleSection('npcCards')}>
        <RadioRow<NpcCardLayout>
          label="Layout"
          value={config.npcCards.layout}
          options={[
            { value: 'horizontal', label: 'Horizontal' },
            { value: 'vertical', label: 'Vertical' },
            { value: 'mini', label: 'Mini' },
            { value: 'portrait', label: 'Portrait' },
          ]}
          onChange={v => update('npcCards', { ...config.npcCards, layout: v })}
          disabled={disabled}
        />

        <ToggleRow label="Hiện avatar" value={config.npcCards.showAvatar}
          onChange={v => update('npcCards', { ...config.npcCards, showAvatar: v })} disabled={disabled} />

        {config.npcCards.showAvatar && (
          <>
            <SliderRow label="Avatar size" value={config.npcCards.avatarSize} min={32} max={128}
              onChange={v => update('npcCards', { ...config.npcCards, avatarSize: v })} disabled={disabled} />
            <RadioRow<ImageShape>
              label="Avatar shape"
              value={config.npcCards.avatarShape}
              options={[
                { value: 'circle', label: 'Circle' },
                { value: 'rounded', label: 'Rounded' },
                { value: 'square', label: 'Square' },
                { value: 'none', label: 'None' },
              ]}
              onChange={v => update('npcCards', { ...config.npcCards, avatarShape: v })}
              disabled={disabled}
            />
          </>
        )}

        <ToggleRow label="Hiện quan hệ" value={config.npcCards.showRelationship}
          onChange={v => update('npcCards', { ...config.npcCards, showRelationship: v })} disabled={disabled} />
        {config.npcCards.showRelationship && (
          <RadioRow<'hearts' | 'bar' | 'number' | 'stars'>
            label="Kiểu hiển thị"
            value={config.npcCards.relationshipStyle}
            options={[
              { value: 'hearts', label: '❤️ Hearts' },
              { value: 'bar', label: '📊 Bar' },
              { value: 'number', label: '#️⃣ Number' },
              { value: 'stars', label: '⭐ Stars' },
            ]}
            onChange={v => update('npcCards', { ...config.npcCards, relationshipStyle: v })}
            disabled={disabled}
          />
        )}

        <ToggleRow label="Hiện tâm trạng" value={config.npcCards.showMood}
          onChange={v => update('npcCards', { ...config.npcCards, showMood: v })} disabled={disabled} />
        {config.npcCards.showMood && (
          <RadioRow<MoodDisplay>
            label="Kiểu tâm trạng"
            value={config.npcCards.moodDisplay}
            options={[
              { value: 'emoji', label: 'Emoji' },
              { value: 'bar', label: 'Bar' },
              { value: 'text', label: 'Text' },
              { value: 'color', label: 'Color' },
            ]}
            onChange={v => update('npcCards', { ...config.npcCards, moodDisplay: v })}
            disabled={disabled}
          />
        )}

        <ToggleRow label="Hiện chức danh" value={config.npcCards.showTitle}
          onChange={v => update('npcCards', { ...config.npcCards, showTitle: v })} disabled={disabled} />

        <RadioRow<'solid' | 'gradient' | 'transparent'>
          label="Card background"
          value={config.npcCards.cardBackground}
          options={[
            { value: 'solid', label: 'Solid' },
            { value: 'gradient', label: 'Gradient' },
            { value: 'transparent', label: 'Transparent' },
          ]}
          onChange={v => update('npcCards', { ...config.npcCards, cardBackground: v })}
          disabled={disabled}
        />

        <SliderRow label="Cards/row" value={config.npcCards.maxCardsPerRow} min={1} max={4} unit=""
          onChange={v => update('npcCards', { ...config.npcCards, maxCardsPerRow: v })} disabled={disabled} />
      </Section>

      {/* ─── INVENTORY ─── */}
      <Section icon={Package} title="Inventory / Vật phẩm" summary={`${config.inventory.layout}, ${config.inventory.gridColumns}col`} enabled={s.inventory} onToggleEnabled={() => toggleSection('inventory')}>
        <RadioRow<InventoryLayout>
          label="Layout"
          value={config.inventory.layout}
          options={[
            { value: 'grid', label: 'Grid' },
            { value: 'list', label: 'List' },
            { value: 'compact', label: 'Compact' },
            { value: 'detailed', label: 'Detailed' },
          ]}
          onChange={v => update('inventory', { ...config.inventory, layout: v })}
          disabled={disabled}
        />

        {config.inventory.layout === 'grid' && (
          <SliderRow label="Cột" value={config.inventory.gridColumns} min={2} max={6} unit=""
            onChange={v => update('inventory', { ...config.inventory, gridColumns: v })} disabled={disabled} />
        )}

        <ToggleRow label="Hiện số lượng" value={config.inventory.showQuantity}
          onChange={v => update('inventory', { ...config.inventory, showQuantity: v })} disabled={disabled} />
        <ToggleRow label="Hiện độ hiếm" value={config.inventory.showRarity}
          onChange={v => update('inventory', { ...config.inventory, showRarity: v })} disabled={disabled} />
        <ToggleRow label="Hiện danh mục" value={config.inventory.showCategory}
          onChange={v => update('inventory', { ...config.inventory, showCategory: v })} disabled={disabled} />
        <ToggleRow label="Hiện icon vật phẩm" value={config.inventory.showItemIcon}
          onChange={v => update('inventory', { ...config.inventory, showItemIcon: v })} disabled={disabled} />
        <ToggleRow label="Kéo thả sắp xếp" value={config.inventory.enableDragSort}
          onChange={v => update('inventory', { ...config.inventory, enableDragSort: v })} disabled={disabled} />
        <ToggleRow label="Hiện ô trống" value={config.inventory.showEmptySlots}
          onChange={v => update('inventory', { ...config.inventory, showEmptySlots: v })} disabled={disabled} />

        <RadioRow<'flat' | 'raised' | 'bordered' | 'glass'>
          label="Item card style"
          value={config.inventory.itemCardStyle}
          options={[
            { value: 'flat', label: 'Flat' },
            { value: 'raised', label: 'Raised' },
            { value: 'bordered', label: 'Bordered' },
            { value: 'glass', label: 'Glass' },
          ]}
          onChange={v => update('inventory', { ...config.inventory, itemCardStyle: v })}
          disabled={disabled}
        />

        {config.inventory.showRarity && (
          <div className="space-y-1.5 pt-1 border-t border-border/50">
            <span className="text-[9px] text-muted-foreground/60 uppercase">Màu theo độ hiếm</span>
            {(Object.keys(config.inventory.rarityColors) as ItemRarity[]).map(rarity => (
              <ColorRow key={rarity} label={rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                value={config.inventory.rarityColors[rarity]}
                onChange={v => update('inventory', {
                  ...config.inventory,
                  rarityColors: { ...config.inventory.rarityColors, [rarity]: v },
                })} disabled={disabled} />
            ))}
          </div>
        )}
      </Section>

      {/* ─── NOTIFICATIONS ─── */}
      <Section icon={Bell} title="Thông báo / Toasts" summary={
        config.notifications.enabled ? `${config.notifications.style}, ${config.notifications.position}` : 'tắt'
      } enabled={s.notifications} onToggleEnabled={() => toggleSection('notifications')}>
        <ToggleRow label="Bật thông báo" value={config.notifications.enabled}
          onChange={v => update('notifications', { ...config.notifications, enabled: v })} disabled={disabled} />

        {config.notifications.enabled && (
          <>
            <RadioRow<ToastPosition>
              label="Vị trí"
              value={config.notifications.position}
              options={[
                { value: 'top-right', label: '↗ Top-R' },
                { value: 'top-center', label: '⬆ Top-C' },
                { value: 'top-left', label: '↖ Top-L' },
                { value: 'bottom-right', label: '↘ Bot-R' },
                { value: 'bottom-center', label: '⬇ Bot-C' },
              ]}
              onChange={v => update('notifications', { ...config.notifications, position: v })}
              disabled={disabled}
            />

            <RadioRow<ToastStyle>
              label="Style"
              value={config.notifications.style}
              options={[
                { value: 'minimal', label: 'Minimal' },
                { value: 'card', label: 'Card' },
                { value: 'banner', label: 'Banner' },
                { value: 'floating', label: 'Floating' },
              ]}
              onChange={v => update('notifications', { ...config.notifications, style: v })}
              disabled={disabled}
            />

            <SliderRow label="Duration" value={config.notifications.duration} min={1000} max={10000} step={500} unit="ms"
              onChange={v => update('notifications', { ...config.notifications, duration: v })} disabled={disabled} />
            <SliderRow label="Max hiện" value={config.notifications.maxVisible} min={1} max={5} unit=""
              onChange={v => update('notifications', { ...config.notifications, maxVisible: v })} disabled={disabled} />

            <ColorRow label="Accent" value={config.notifications.accentColor}
              onChange={v => update('notifications', { ...config.notifications, accentColor: v })} disabled={disabled} />

            <div className="space-y-1 pt-1 border-t border-border/50">
              <span className="text-[9px] text-muted-foreground/60 uppercase">Hiện thông báo khi</span>
              <ToggleRow label="Nhận vật phẩm" value={config.notifications.showForItems}
                onChange={v => update('notifications', { ...config.notifications, showForItems: v })} disabled={disabled} />
              <ToggleRow label="Stat thay đổi" value={config.notifications.showForStats}
                onChange={v => update('notifications', { ...config.notifications, showForStats: v })} disabled={disabled} />
              <ToggleRow label="Sự kiện game" value={config.notifications.showForEvents}
                onChange={v => update('notifications', { ...config.notifications, showForEvents: v })} disabled={disabled} />
            </div>
          </>
        )}
      </Section>

      {/* ─── TRANSITIONS ─── */}
      <Section icon={Zap} title="Transitions" summary={`${config.transitions.sceneTransition}, ${config.transitions.transitionDuration}ms`} enabled={s.transitions} onToggleEnabled={() => toggleSection('transitions')}>
        <RadioRow<SceneTransition>
          label="Scene transition"
          value={config.transitions.sceneTransition}
          options={[
            { value: 'fade', label: 'Fade' },
            { value: 'slide-left', label: 'Slide ←' },
            { value: 'slide-up', label: 'Slide ↑' },
            { value: 'zoom', label: 'Zoom' },
            { value: 'flip', label: 'Flip' },
            { value: 'blur', label: 'Blur' },
            { value: 'none', label: 'None' },
          ]}
          onChange={v => update('transitions', { ...config.transitions, sceneTransition: v })}
          disabled={disabled}
        />

        <SliderRow label="Duration" value={config.transitions.transitionDuration} min={200} max={1500} step={50} unit="ms"
          onChange={v => update('transitions', { ...config.transitions, transitionDuration: v })} disabled={disabled} />

        <RadioRow<'instant' | 'fade-in' | 'slide-up' | 'cascade'>
          label="Content reveal"
          value={config.transitions.contentReveal}
          options={[
            { value: 'instant', label: 'Instant' },
            { value: 'fade-in', label: 'Fade In' },
            { value: 'slide-up', label: 'Slide Up' },
            { value: 'cascade', label: 'Cascade' },
          ]}
          onChange={v => update('transitions', { ...config.transitions, contentReveal: v })}
          disabled={disabled}
        />

        <ToggleRow label="Text typewriter" value={config.transitions.enableTextTypewriter}
          onChange={v => update('transitions', { ...config.transitions, enableTextTypewriter: v })} disabled={disabled} />
        {config.transitions.enableTextTypewriter && (
          <SliderRow label="Speed" value={config.transitions.typewriterSpeed} min={10} max={100} unit="ms/char"
            onChange={v => update('transitions', { ...config.transitions, typewriterSpeed: v })} disabled={disabled} />
        )}

        <ToggleRow label="Parallax scrolling" value={config.transitions.enableParallax}
          onChange={v => update('transitions', { ...config.transitions, enableParallax: v })} disabled={disabled} />
        <ToggleRow label="Page flip (novel)" value={config.transitions.enablePageFlip}
          onChange={v => update('transitions', { ...config.transitions, enablePageFlip: v })} disabled={disabled} />
      </Section>

      {/* ─── RESPONSIVE ─── */}
      <Section icon={Smartphone} title="Responsive / Mobile" summary={
        config.responsive.enableMobileOptimize ? `${config.responsive.mobileBreakpoint}px, ×${config.responsive.mobileFontScale}` : 'tắt'
      } enabled={s.responsive} onToggleEnabled={() => toggleSection('responsive')}>
        <ToggleRow label="Tối ưu mobile" value={config.responsive.enableMobileOptimize}
          onChange={v => update('responsive', { ...config.responsive, enableMobileOptimize: v })} disabled={disabled} />

        {config.responsive.enableMobileOptimize && (
          <>
            <SliderRow label="Breakpoint" value={config.responsive.mobileBreakpoint} min={320} max={768} step={10}
              onChange={v => update('responsive', { ...config.responsive, mobileBreakpoint: v })} disabled={disabled} />
            <SliderRow label="Font scale" value={config.responsive.mobileFontScale} min={0.7} max={1.3} step={0.05} unit="×"
              onChange={v => update('responsive', { ...config.responsive, mobileFontScale: v })} disabled={disabled} />

            <ToggleRow label="Compact mode" value={config.responsive.compactModeOnMobile}
              onChange={v => update('responsive', { ...config.responsive, compactModeOnMobile: v })} disabled={disabled} />
            <ToggleRow label="Ẩn ảnh trên mobile" value={config.responsive.hideImagesOnMobile}
              onChange={v => update('responsive', { ...config.responsive, hideImagesOnMobile: v })} disabled={disabled} />
            <ToggleRow label="Stack cột trên mobile" value={config.responsive.stackColumnsOnMobile}
              onChange={v => update('responsive', { ...config.responsive, stackColumnsOnMobile: v })} disabled={disabled} />
            <ToggleRow label="Touch-friendly" value={config.responsive.touchFriendly}
              onChange={v => update('responsive', { ...config.responsive, touchFriendly: v })} disabled={disabled} />
            <ToggleRow label="Swipe gestures" value={config.responsive.swipeGestures}
              onChange={v => update('responsive', { ...config.responsive, swipeGestures: v })} disabled={disabled} />
          </>
        )}
      </Section>

      {/* ─── THEME / DARK-LIGHT ─── */}
      <Section icon={Moon} title="Theme / Dark-Light" summary={
        config.theme.enableDualTheme ? `${config.theme.defaultTheme}, eye-care: ${config.theme.enableEyeCare ? 'có' : 'không'}` : 'single'
      } enabled={s.theme} onToggleEnabled={() => toggleSection('theme')}>
        <ToggleRow label="Dual theme (Dark + Light)" value={config.theme.enableDualTheme}
          onChange={v => update('theme', { ...config.theme, enableDualTheme: v })} disabled={disabled} />
        {config.theme.enableDualTheme && (
          <>
            <RadioRow<'dark' | 'light'>
              label="Theme mặc định"
              value={config.theme.defaultTheme}
              options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]}
              onChange={v => update('theme', { ...config.theme, defaultTheme: v })} disabled={disabled} />
            <ToggleRow label="Auto-detect (system)" value={config.theme.autoDetect}
              onChange={v => update('theme', { ...config.theme, autoDetect: v })} disabled={disabled} />
            <ColorRow label="Light bg" value={config.theme.lightBg}
              onChange={v => update('theme', { ...config.theme, lightBg: v })} disabled={disabled} />
            <ColorRow label="Light text" value={config.theme.lightText}
              onChange={v => update('theme', { ...config.theme, lightText: v })} disabled={disabled} />
            <ColorRow label="Light accent" value={config.theme.lightAccent}
              onChange={v => update('theme', { ...config.theme, lightAccent: v })} disabled={disabled} />
            <ColorRow label="Light surface" value={config.theme.lightSurface}
              onChange={v => update('theme', { ...config.theme, lightSurface: v })} disabled={disabled} />
          </>
        )}
        <ToggleRow label="Eye care mode" value={config.theme.enableEyeCare}
          onChange={v => update('theme', { ...config.theme, enableEyeCare: v })} disabled={disabled} />
        {config.theme.enableEyeCare && (
          <SliderRow label="Sepia strength" value={config.theme.eyeCareStrength} min={5} max={50} step={5}
            onChange={v => update('theme', { ...config.theme, eyeCareStrength: v })} disabled={disabled} />
        )}
      </Section>

      {/* ─── RETRO EFFECTS ─── */}
      <Section icon={Monitor} title="Retro / CRT Effects" summary={
        [config.retroEffects.enableScanlines && 'scanline', config.retroEffects.enableCrtVignette && 'CRT', config.retroEffects.enableNoiseTexture && 'noise', config.retroEffects.enableTerminalStyle && 'terminal'].filter(Boolean).join(', ') || 'tắt'
      } enabled={s.retroEffects} onToggleEnabled={() => toggleSection('retroEffects')}>
        <ToggleRow label="Scanlines" value={config.retroEffects.enableScanlines}
          onChange={v => update('retroEffects', { ...config.retroEffects, enableScanlines: v })} disabled={disabled} />
        {config.retroEffects.enableScanlines && (
          <>
            <SliderRow label="Scanline opacity" value={config.retroEffects.scanlineOpacity} min={0.01} max={0.15} step={0.01}
              onChange={v => update('retroEffects', { ...config.retroEffects, scanlineOpacity: v })} disabled={disabled} />
            <SliderRow label="Scanline gap (px)" value={config.retroEffects.scanlineGap} min={2} max={8} step={1}
              onChange={v => update('retroEffects', { ...config.retroEffects, scanlineGap: v })} disabled={disabled} />
          </>
        )}
        <ToggleRow label="CRT vignette" value={config.retroEffects.enableCrtVignette}
          onChange={v => update('retroEffects', { ...config.retroEffects, enableCrtVignette: v })} disabled={disabled} />
        {config.retroEffects.enableCrtVignette && (
          <SliderRow label="CRT intensity" value={config.retroEffects.crtIntensity} min={10} max={80} step={5}
            onChange={v => update('retroEffects', { ...config.retroEffects, crtIntensity: v })} disabled={disabled} />
        )}
        <ToggleRow label="Noise texture" value={config.retroEffects.enableNoiseTexture}
          onChange={v => update('retroEffects', { ...config.retroEffects, enableNoiseTexture: v })} disabled={disabled} />
        {config.retroEffects.enableNoiseTexture && (
          <SliderRow label="Noise opacity" value={config.retroEffects.noiseOpacity} min={0.005} max={0.1} step={0.005}
            onChange={v => update('retroEffects', { ...config.retroEffects, noiseOpacity: v })} disabled={disabled} />
        )}
        <ToggleRow label="Terminal style (monospace)" value={config.retroEffects.enableTerminalStyle}
          onChange={v => update('retroEffects', { ...config.retroEffects, enableTerminalStyle: v })} disabled={disabled} />
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">Custom overlay URL</span>
          <input type="text" value={config.retroEffects.customOverlayUrl} placeholder="https://..."
            onChange={e => update('retroEffects', { ...config.retroEffects, customOverlayUrl: e.target.value })}
            disabled={disabled} className="w-full px-2 py-1 rounded text-[10px] bg-background border border-border" />
        </div>
        <RadioRow<'normal' | 'multiply' | 'screen' | 'overlay'>
          label="Overlay blend"
          value={config.retroEffects.overlayBlendMode}
          options={[{ value: 'normal', label: 'Normal' }, { value: 'multiply', label: 'Multiply' }, { value: 'screen', label: 'Screen' }, { value: 'overlay', label: 'Overlay' }]}
          onChange={v => update('retroEffects', { ...config.retroEffects, overlayBlendMode: v })} disabled={disabled} />
      </Section>

      {/* ─── AUDIO PLAYER ─── */}
      <Section icon={Music} title="Audio / Music Player" summary={
        config.audioPlayer.enabled ? `${config.audioPlayer.playerStyle}, ${config.audioPlayer.position}` : 'tắt'
      } enabled={s.audioPlayer} onToggleEnabled={() => toggleSection('audioPlayer')}>
        <ToggleRow label="Bật player" value={config.audioPlayer.enabled}
          onChange={v => update('audioPlayer', { ...config.audioPlayer, enabled: v })} disabled={disabled} />
        {config.audioPlayer.enabled && (
          <>
            <RadioRow<PlayerStyle>
              label="Style"
              value={config.audioPlayer.playerStyle}
              options={[{ value: 'mini', label: 'Mini' }, { value: 'full', label: 'Full' }, { value: 'floating', label: 'Floating' }]}
              onChange={v => update('audioPlayer', { ...config.audioPlayer, playerStyle: v })} disabled={disabled} />
            <RadioRow<PlayerPosition>
              label="Vị trí"
              value={config.audioPlayer.position}
              options={[{ value: 'bottom', label: 'Dưới' }, { value: 'top', label: 'Trên' }, { value: 'floating-br', label: 'Float ↘' }, { value: 'floating-bl', label: 'Float ↙' }]}
              onChange={v => update('audioPlayer', { ...config.audioPlayer, position: v })} disabled={disabled} />
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground">Track URL</span>
              <input type="text" value={config.audioPlayer.defaultTrackUrl} placeholder="https://..."
                onChange={e => update('audioPlayer', { ...config.audioPlayer, defaultTrackUrl: e.target.value })}
                disabled={disabled} className="w-full px-2 py-1 rounded text-[10px] bg-background border border-border" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground">Track label</span>
              <input type="text" value={config.audioPlayer.trackLabel}
                onChange={e => update('audioPlayer', { ...config.audioPlayer, trackLabel: e.target.value })}
                disabled={disabled} className="w-full px-2 py-1 rounded text-[10px] bg-background border border-border" />
            </div>
            <ToggleRow label="Auto-play" value={config.audioPlayer.autoPlay}
              onChange={v => update('audioPlayer', { ...config.audioPlayer, autoPlay: v })} disabled={disabled} />
            <ToggleRow label="Hiện volume" value={config.audioPlayer.showVolume}
              onChange={v => update('audioPlayer', { ...config.audioPlayer, showVolume: v })} disabled={disabled} />
            <ToggleRow label="Hiện seek bar" value={config.audioPlayer.showSeek}
              onChange={v => update('audioPlayer', { ...config.audioPlayer, showSeek: v })} disabled={disabled} />
            <ToggleRow label="Loop" value={config.audioPlayer.loop}
              onChange={v => update('audioPlayer', { ...config.audioPlayer, loop: v })} disabled={disabled} />
            <ColorRow label="Player bg" value={config.audioPlayer.playerBg}
              onChange={v => update('audioPlayer', { ...config.audioPlayer, playerBg: v })} disabled={disabled} />
            <ColorRow label="Player accent" value={config.audioPlayer.playerAccent}
              onChange={v => update('audioPlayer', { ...config.audioPlayer, playerAccent: v })} disabled={disabled} />
          </>
        )}
      </Section>

      {/* ─── TOOLBAR ─── */}
      <Section icon={PanelBottom} title="Toolbar / Action Bar" summary={
        config.toolbar.enabled ? `${config.toolbar.style}, ${config.toolbar.buttons.filter(b => b.enabled).length} nút` : 'tắt'
      } enabled={s.toolbar} onToggleEnabled={() => toggleSection('toolbar')}>
        <ToggleRow label="Bật toolbar" value={config.toolbar.enabled}
          onChange={v => update('toolbar', { ...config.toolbar, enabled: v })} disabled={disabled} />
        {config.toolbar.enabled && (
          <>
            <RadioRow<ToolbarPosition>
              label="Vị trí"
              value={config.toolbar.position}
              options={[{ value: 'bottom-fixed', label: 'Dưới' }, { value: 'top-fixed', label: 'Trên' }, { value: 'floating-br', label: 'Float ↘' }, { value: 'floating-bl', label: 'Float ↙' }]}
              onChange={v => update('toolbar', { ...config.toolbar, position: v })} disabled={disabled} />
            <RadioRow<ToolbarStyle>
              label="Style"
              value={config.toolbar.style}
              options={[{ value: 'pill', label: 'Pill' }, { value: 'flat', label: 'Flat' }, { value: 'glass', label: 'Glass' }, { value: 'minimal', label: 'Minimal' }]}
              onChange={v => update('toolbar', { ...config.toolbar, style: v })} disabled={disabled} />
            <ToggleRow label="Hiện labels" value={config.toolbar.showLabels}
              onChange={v => update('toolbar', { ...config.toolbar, showLabels: v })} disabled={disabled} />
            <ToggleRow label="Compact (chỉ icon)" value={config.toolbar.compact}
              onChange={v => update('toolbar', { ...config.toolbar, compact: v })} disabled={disabled} />
            <ColorRow label="Background" value={config.toolbar.bgColor}
              onChange={v => update('toolbar', { ...config.toolbar, bgColor: v })} disabled={disabled} />
            <ColorRow label="Text" value={config.toolbar.textColor}
              onChange={v => update('toolbar', { ...config.toolbar, textColor: v })} disabled={disabled} />

            {/* Toolbar buttons list */}
            <div className="space-y-1 pt-1 border-t border-border/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Các nút toolbar</span>
                <button onClick={() => update('toolbar', { ...config.toolbar, buttons: [...config.toolbar.buttons, createToolbarButton()] })}
                  disabled={disabled} className="flex items-center gap-0.5 text-[9px] text-primary hover:underline">
                  <Plus className="w-3 h-3" /> Thêm
                </button>
              </div>
              {config.toolbar.buttons.map((btn) => (
                <div key={btn.id} className="flex items-center gap-1.5 p-1.5 rounded bg-muted/10 border border-border/40">
                  <input type="text" value={btn.emoji} maxLength={4}
                    onChange={e => update('toolbar', { ...config.toolbar, buttons: config.toolbar.buttons.map(b => b.id === btn.id ? { ...b, emoji: e.target.value } : b) })}
                    className="w-8 text-center text-[12px] bg-transparent border-none outline-none" />
                  <input type="text" value={btn.label}
                    onChange={e => update('toolbar', { ...config.toolbar, buttons: config.toolbar.buttons.map(b => b.id === btn.id ? { ...b, label: e.target.value } : b) })}
                    className="flex-1 text-[10px] bg-transparent border-none outline-none text-foreground" />
                  <button onClick={() => update('toolbar', { ...config.toolbar, buttons: config.toolbar.buttons.map(b => b.id === btn.id ? { ...b, enabled: !b.enabled } : b) })}
                    className={cn('w-2 h-2 rounded-full border', btn.enabled ? 'bg-emerald-400 border-emerald-500/50' : 'bg-transparent border-muted-foreground/40')} />
                  <button onClick={() => update('toolbar', { ...config.toolbar, buttons: config.toolbar.buttons.filter(b => b.id !== btn.id) })}
                    className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* ─── READING MODE ─── */}
      <Section icon={BookOpen} title="Reading / Fullscreen" summary={
        [config.readingMode.enableFullscreen && 'fullscreen', config.readingMode.enableFontSizeControl && 'font±', config.readingMode.showScrollToTop && '↑top'].filter(Boolean).join(', ') || 'tắt'
      } enabled={s.readingMode} onToggleEnabled={() => toggleSection('readingMode')}>
        <ToggleRow label="Nút fullscreen" value={config.readingMode.enableFullscreen}
          onChange={v => update('readingMode', { ...config.readingMode, enableFullscreen: v })} disabled={disabled} />
        <ToggleRow label="User chỉnh font size" value={config.readingMode.enableFontSizeControl}
          onChange={v => update('readingMode', { ...config.readingMode, enableFontSizeControl: v })} disabled={disabled} />
        {config.readingMode.enableFontSizeControl && (
          <>
            <SliderRow label="Font min (px)" value={config.readingMode.fontSizeMin} min={10} max={16} step={1}
              onChange={v => update('readingMode', { ...config.readingMode, fontSizeMin: v })} disabled={disabled} />
            <SliderRow label="Font max (px)" value={config.readingMode.fontSizeMax} min={18} max={32} step={1}
              onChange={v => update('readingMode', { ...config.readingMode, fontSizeMax: v })} disabled={disabled} />
          </>
        )}
        <ToggleRow label="Chỉnh line width" value={config.readingMode.enableLineWidthControl}
          onChange={v => update('readingMode', { ...config.readingMode, enableLineWidthControl: v })} disabled={disabled} />
        <ToggleRow label="Nút scroll to top" value={config.readingMode.showScrollToTop}
          onChange={v => update('readingMode', { ...config.readingMode, showScrollToTop: v })} disabled={disabled} />
        <ToggleRow label="Chapter navigation" value={config.readingMode.showChapterNav}
          onChange={v => update('readingMode', { ...config.readingMode, showChapterNav: v })} disabled={disabled} />
        <ColorRow label="Reading bg" value={config.readingMode.readingBg}
          onChange={v => update('readingMode', { ...config.readingMode, readingBg: v })} disabled={disabled} />
      </Section>

      {/* ─── MULTI-PAGE ─── */}
      <Section icon={FileStack} title="Multi-page / Wizard" summary={
        config.multiPage.enabled ? `${config.multiPage.pages.filter(p => p.enabled).length} pages, ${config.multiPage.navStyle}` : 'tắt'
      } enabled={s.multiPage} onToggleEnabled={() => toggleSection('multiPage')}>
        <ToggleRow label="Bật multi-page" value={config.multiPage.enabled}
          onChange={v => update('multiPage', { ...config.multiPage, enabled: v })} disabled={disabled} />
        {config.multiPage.enabled && (
          <>
            <RadioRow<PageNavStyle>
              label="Navigation style"
              value={config.multiPage.navStyle}
              options={[{ value: 'dots', label: 'Dots' }, { value: 'arrows', label: 'Arrows' }, { value: 'sidebar', label: 'Sidebar' }, { value: 'tabs', label: 'Tabs' }]}
              onChange={v => update('multiPage', { ...config.multiPage, navStyle: v })} disabled={disabled} />
            <RadioRow<SceneTransition>
              label="Transition"
              value={config.multiPage.pageTransition}
              options={[{ value: 'fade', label: 'Fade' }, { value: 'slide-left', label: 'Slide' }, { value: 'zoom', label: 'Zoom' }, { value: 'flip', label: 'Flip' }, { value: 'blur', label: 'Blur' }]}
              onChange={v => update('multiPage', { ...config.multiPage, pageTransition: v })} disabled={disabled} />
            <RadioRow<'top' | 'bottom' | 'both'>
              label="Nav position"
              value={config.multiPage.navPosition}
              options={[{ value: 'top', label: 'Trên' }, { value: 'bottom', label: 'Dưới' }, { value: 'both', label: 'Cả hai' }]}
              onChange={v => update('multiPage', { ...config.multiPage, navPosition: v })} disabled={disabled} />
            <ToggleRow label="Hiện số trang (1/5)" value={config.multiPage.showPageCounter}
              onChange={v => update('multiPage', { ...config.multiPage, showPageCounter: v })} disabled={disabled} />
            <ToggleRow label="Cho nhảy trang" value={config.multiPage.allowDirectJump}
              onChange={v => update('multiPage', { ...config.multiPage, allowDirectJump: v })} disabled={disabled} />

            {/* Pages list */}
            <div className="space-y-1 pt-1 border-t border-border/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Danh sách trang</span>
                <button onClick={() => update('multiPage', { ...config.multiPage, pages: [...config.multiPage.pages, createPageItem()] })}
                  disabled={disabled} className="flex items-center gap-0.5 text-[9px] text-primary hover:underline">
                  <Plus className="w-3 h-3" /> Thêm
                </button>
              </div>
              {config.multiPage.pages.map((pg) => (
                <div key={pg.id} className="flex items-center gap-1.5 p-1.5 rounded bg-muted/10 border border-border/40">
                  <input type="text" value={pg.emoji} maxLength={4}
                    onChange={e => update('multiPage', { ...config.multiPage, pages: config.multiPage.pages.map(p => p.id === pg.id ? { ...p, emoji: e.target.value } : p) })}
                    className="w-8 text-center text-[12px] bg-transparent border-none outline-none" />
                  <input type="text" value={pg.label}
                    onChange={e => update('multiPage', { ...config.multiPage, pages: config.multiPage.pages.map(p => p.id === pg.id ? { ...p, label: e.target.value } : p) })}
                    className="flex-1 text-[10px] bg-transparent border-none outline-none text-foreground" />
                  <button onClick={() => update('multiPage', { ...config.multiPage, pages: config.multiPage.pages.map(p => p.id === pg.id ? { ...p, enabled: !p.enabled } : p) })}
                    className={cn('w-2 h-2 rounded-full border', pg.enabled ? 'bg-emerald-400 border-emerald-500/50' : 'bg-transparent border-muted-foreground/40')} />
                  <button onClick={() => update('multiPage', { ...config.multiPage, pages: config.multiPage.pages.filter(p => p.id !== pg.id) })}
                    className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* ─── COLLAPSIBLES ─── */}
      <Section icon={ChevronUp} title="Collapsible Sections" summary={`${config.collapsibles.iconStyle}, ${config.collapsibles.animation}`}
        enabled={s.collapsibles} onToggleEnabled={() => toggleSection('collapsibles')}>
        <RadioRow<'open' | 'closed'>
          label="Trạng thái mặc định"
          value={config.collapsibles.defaultState}
          options={[{ value: 'open', label: 'Mở' }, { value: 'closed', label: 'Đóng' }]}
          onChange={v => update('collapsibles', { ...config.collapsibles, defaultState: v })} disabled={disabled} />
        <RadioRow<CollapseIcon>
          label="Icon style"
          value={config.collapsibles.iconStyle}
          options={[{ value: 'arrow', label: '▶ Arrow' }, { value: 'plus-minus', label: '+/- Plus' }, { value: 'chevron', label: '› Chevron' }, { value: 'none', label: 'Không' }]}
          onChange={v => update('collapsibles', { ...config.collapsibles, iconStyle: v })} disabled={disabled} />
        <RadioRow<CollapseAnimation>
          label="Animation"
          value={config.collapsibles.animation}
          options={[{ value: 'slide', label: 'Slide' }, { value: 'fade', label: 'Fade' }, { value: 'none', label: 'Không' }]}
          onChange={v => update('collapsibles', { ...config.collapsibles, animation: v })} disabled={disabled} />
        <ToggleRow label="Cho phép lồng nhau" value={config.collapsibles.enableNested}
          onChange={v => update('collapsibles', { ...config.collapsibles, enableNested: v })} disabled={disabled} />
        <RadioRow<'solid' | 'dashed' | 'none' | 'accent'>
          label="Border style"
          value={config.collapsibles.borderStyle}
          options={[{ value: 'solid', label: 'Solid' }, { value: 'dashed', label: 'Dashed' }, { value: 'accent', label: 'Accent' }, { value: 'none', label: 'Không' }]}
          onChange={v => update('collapsibles', { ...config.collapsibles, borderStyle: v })} disabled={disabled} />
        <RadioRow<'bold' | 'accent-bg' | 'underline' | 'plain'>
          label="Header style"
          value={config.collapsibles.headerStyle}
          options={[{ value: 'bold', label: 'Bold' }, { value: 'accent-bg', label: 'Accent bg' }, { value: 'underline', label: 'Underline' }, { value: 'plain', label: 'Plain' }]}
          onChange={v => update('collapsibles', { ...config.collapsibles, headerStyle: v })} disabled={disabled} />
        <SliderRow label="Border radius" value={config.collapsibles.borderRadius} min={0} max={16} step={2}
          onChange={v => update('collapsibles', { ...config.collapsibles, borderRadius: v })} disabled={disabled} />
      </Section>

      {/* ─── CURRENCY ─── */}
      <Section icon={Coins} title="Tiền tệ / Economy" summary={`${config.currency.currencies.length} loại, ${config.currency.displayStyle}`}
        enabled={s.currency} onToggleEnabled={() => toggleSection('currency')}>
        <RadioRow<'inline' | 'badge' | 'row'>
          label="Display style"
          value={config.currency.displayStyle}
          options={[{ value: 'inline', label: 'Inline' }, { value: 'badge', label: 'Badge' }, { value: 'row', label: 'Row' }]}
          onChange={v => update('currency', { ...config.currency, displayStyle: v })} disabled={disabled} />
        <ToggleRow label="Hiện icon" value={config.currency.showIcon}
          onChange={v => update('currency', { ...config.currency, showIcon: v })} disabled={disabled} />
        <ToggleRow label="Animate thay đổi" value={config.currency.animateChange}
          onChange={v => update('currency', { ...config.currency, animateChange: v })} disabled={disabled} />
        <RadioRow<'full' | 'abbreviated'>
          label="Format số"
          value={config.currency.format}
          options={[{ value: 'full', label: '1500' }, { value: 'abbreviated', label: '1.5K' }]}
          onChange={v => update('currency', { ...config.currency, format: v })} disabled={disabled} />

        {/* Currencies list */}
        <div className="space-y-1 pt-1 border-t border-border/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Danh sách tiền tệ</span>
            <button onClick={() => update('currency', { ...config.currency, currencies: [...config.currency.currencies, createCurrencyItem()] })}
              disabled={disabled} className="flex items-center gap-0.5 text-[9px] text-primary hover:underline">
              <Plus className="w-3 h-3" /> Thêm
            </button>
          </div>
          {config.currency.currencies.map((cur) => (
            <div key={cur.id} className="flex items-center gap-1.5 p-1.5 rounded bg-muted/10 border border-border/40">
              <input type="text" value={cur.emoji} maxLength={4}
                onChange={e => update('currency', { ...config.currency, currencies: config.currency.currencies.map(c => c.id === cur.id ? { ...c, emoji: e.target.value } : c) })}
                className="w-8 text-center text-[12px] bg-transparent border-none outline-none" />
              <input type="text" value={cur.name}
                onChange={e => update('currency', { ...config.currency, currencies: config.currency.currencies.map(c => c.id === cur.id ? { ...c, name: e.target.value } : c) })}
                className="flex-1 text-[10px] bg-transparent border-none outline-none text-foreground" />
              <input type="color" value={cur.color}
                onChange={e => update('currency', { ...config.currency, currencies: config.currency.currencies.map(c => c.id === cur.id ? { ...c, color: e.target.value } : c) })}
                className="w-5 h-5 rounded border-none cursor-pointer" />
              <button onClick={() => update('currency', { ...config.currency, currencies: config.currency.currencies.filter(c => c.id !== cur.id) })}
                className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      </Section>

      {/* ─── BADGES ─── */}
      <Section icon={Award} title="Badges / Titles" summary={
        config.badges.enabled ? `${config.badges.shape}, ${config.badges.position}` : 'tắt'
      } enabled={s.badges} onToggleEnabled={() => toggleSection('badges')}>
        <ToggleRow label="Bật badges" value={config.badges.enabled}
          onChange={v => update('badges', { ...config.badges, enabled: v })} disabled={disabled} />
        {config.badges.enabled && (
          <>
            <RadioRow<BadgeShape>
              label="Hình dạng"
              value={config.badges.shape}
              options={[{ value: 'pill', label: 'Pill' }, { value: 'circle', label: 'Circle' }, { value: 'square', label: 'Square' }, { value: 'ribbon', label: 'Ribbon' }]}
              onChange={v => update('badges', { ...config.badges, shape: v })} disabled={disabled} />
            <RadioRow<BadgePosition>
              label="Vị trí"
              value={config.badges.position}
              options={[{ value: 'inline', label: 'Inline' }, { value: 'floating', label: 'Floating' }, { value: 'header', label: 'Header' }]}
              onChange={v => update('badges', { ...config.badges, position: v })} disabled={disabled} />
            <RadioRow<'above-name' | 'below-name' | 'badge'>
              label="Title display"
              value={config.badges.titleDisplay}
              options={[{ value: 'above-name', label: 'Trên tên' }, { value: 'below-name', label: 'Dưới tên' }, { value: 'badge', label: 'Badge' }]}
              onChange={v => update('badges', { ...config.badges, titleDisplay: v })} disabled={disabled} />
            <ToggleRow label="Rarity glow" value={config.badges.rarityGlow}
              onChange={v => update('badges', { ...config.badges, rarityGlow: v })} disabled={disabled} />
            <SliderRow label="Max visible" value={config.badges.maxVisible} min={1} max={10} step={1}
              onChange={v => update('badges', { ...config.badges, maxVisible: v })} disabled={disabled} />
            <ColorRow label="Badge bg" value={config.badges.badgeBg}
              onChange={v => update('badges', { ...config.badges, badgeBg: v })} disabled={disabled} />
            <ColorRow label="Badge text" value={config.badges.badgeText}
              onChange={v => update('badges', { ...config.badges, badgeText: v })} disabled={disabled} />
          </>
        )}
      </Section>

      {/* ─── CSS ADVANCED ─── */}
      <Section icon={Code2} title="CSS / Advanced" summary={
        `${config.cssAdvanced.customVariables.length} vars, scrollbar: ${config.cssAdvanced.scrollbarStyle}`
      } enabled={s.cssAdvanced} onToggleEnabled={() => toggleSection('cssAdvanced')}>
        <ToggleRow label="Box-sizing reset" value={config.cssAdvanced.boxSizingReset}
          onChange={v => update('cssAdvanced', { ...config.cssAdvanced, boxSizingReset: v })} disabled={disabled} />
        <RadioRow<'default' | 'thin' | 'hidden' | 'custom'>
          label="Scrollbar"
          value={config.cssAdvanced.scrollbarStyle}
          options={[{ value: 'default', label: 'Default' }, { value: 'thin', label: 'Thin' }, { value: 'hidden', label: 'Hidden' }, { value: 'custom', label: 'Custom' }]}
          onChange={v => update('cssAdvanced', { ...config.cssAdvanced, scrollbarStyle: v })} disabled={disabled} />
        {config.cssAdvanced.scrollbarStyle === 'custom' && (
          <ColorRow label="Scrollbar color" value={config.cssAdvanced.scrollbarColor}
            onChange={v => update('cssAdvanced', { ...config.cssAdvanced, scrollbarColor: v })} disabled={disabled} />
        )}
        <ColorRow label="Selection text" value={config.cssAdvanced.selectionColor}
          onChange={v => update('cssAdvanced', { ...config.cssAdvanced, selectionColor: v })} disabled={disabled} />
        <ColorRow label="Selection bg" value={config.cssAdvanced.selectionBg}
          onChange={v => update('cssAdvanced', { ...config.cssAdvanced, selectionBg: v })} disabled={disabled} />

        {/* Custom CSS variables */}
        <div className="space-y-1 pt-1 border-t border-border/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">CSS Variables</span>
            <button onClick={() => update('cssAdvanced', { ...config.cssAdvanced, customVariables: [...config.cssAdvanced.customVariables, createCssVariable()] })}
              disabled={disabled} className="flex items-center gap-0.5 text-[9px] text-primary hover:underline">
              <Plus className="w-3 h-3" /> Thêm
            </button>
          </div>
          {config.cssAdvanced.customVariables.map((v) => (
            <div key={v.id} className="flex items-center gap-1 p-1.5 rounded bg-muted/10 border border-border/40">
              <input type="text" value={v.name} placeholder="--var-name"
                onChange={e => update('cssAdvanced', { ...config.cssAdvanced, customVariables: config.cssAdvanced.customVariables.map(cv => cv.id === v.id ? { ...cv, name: e.target.value } : cv) })}
                className="w-24 text-[10px] font-mono bg-transparent border-none outline-none text-foreground" />
              <span className="text-[9px] text-muted-foreground">:</span>
              <input type="text" value={v.value} placeholder="#fff"
                onChange={e => update('cssAdvanced', { ...config.cssAdvanced, customVariables: config.cssAdvanced.customVariables.map(cv => cv.id === v.id ? { ...cv, value: e.target.value } : cv) })}
                className="flex-1 text-[10px] font-mono bg-transparent border-none outline-none text-foreground" />
              <button onClick={() => update('cssAdvanced', { ...config.cssAdvanced, customVariables: config.cssAdvanced.customVariables.filter(cv => cv.id !== v.id) })}
                className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>

        {/* Additional font URLs */}
        <div className="space-y-1 pt-1 border-t border-border/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Google Fonts bổ sung</span>
            <button onClick={() => update('cssAdvanced', { ...config.cssAdvanced, additionalFontUrls: [...config.cssAdvanced.additionalFontUrls, ''] })}
              disabled={disabled} className="flex items-center gap-0.5 text-[9px] text-primary hover:underline">
              <Plus className="w-3 h-3" /> Thêm
            </button>
          </div>
          {config.cssAdvanced.additionalFontUrls.map((url, i) => (
            <div key={i} className="flex items-center gap-1 p-1 rounded bg-muted/10 border border-border/40">
              <input type="text" value={url} placeholder="https://fonts.googleapis.com/css2?family=..."
                onChange={e => { const urls = [...config.cssAdvanced.additionalFontUrls]; urls[i] = e.target.value; update('cssAdvanced', { ...config.cssAdvanced, additionalFontUrls: urls }); }}
                className="flex-1 text-[9px] font-mono bg-transparent border-none outline-none text-foreground" />
              <button onClick={() => update('cssAdvanced', { ...config.cssAdvanced, additionalFontUrls: config.cssAdvanced.additionalFontUrls.filter((_, j) => j !== i) })}
                className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>

        {/* Custom CSS snippet */}
        <div className="space-y-1 pt-1 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground">Custom CSS</span>
          <textarea
            value={config.cssAdvanced.customCssSnippet}
            onChange={e => update('cssAdvanced', { ...config.cssAdvanced, customCssSnippet: e.target.value })}
            placeholder=".custom-class { color: #fff; }"
            disabled={disabled}
            rows={4}
            className="w-full px-2 py-1.5 rounded text-[10px] font-mono bg-background border border-border resize-y"
          />
        </div>
      </Section>

      {/* ═══ 25. EVENT POPUP ═══ */}
      <Section title="Event / Popup" icon={AlertCircle} summary={config.eventPopup.enabled ? `${config.eventPopup.layout} • ${config.eventPopup.defaultSeverity}` : ''} enabled={s.eventPopup} onToggleEnabled={() => toggleSection('eventPopup')}>
        <ToggleRow label="Bật Event Popup" value={config.eventPopup.enabled}
          onChange={v => update('eventPopup', { ...config.eventPopup, enabled: v })} disabled={disabled} />

        {config.eventPopup.enabled && (
          <div className="space-y-2">
            <RadioRow label="Layout" value={config.eventPopup.layout}
              options={(['centered','side-icon','full-width','compact'] as PopupLayout[]).map(v => ({ value: v, label: v }))}
              onChange={v => update('eventPopup', { ...config.eventPopup, layout: v as PopupLayout })} disabled={disabled} />
            <RadioRow label="Severity mặc định" value={config.eventPopup.defaultSeverity}
              options={(['info','warning','danger','success','royal'] as PopupSeverity[]).map(v => ({ value: v, label: v }))}
              onChange={v => update('eventPopup', { ...config.eventPopup, defaultSeverity: v as PopupSeverity })} disabled={disabled} />
            <ToggleRow label="Hiện icon" value={config.eventPopup.showIcon}
              onChange={v => update('eventPopup', { ...config.eventPopup, showIcon: v })} disabled={disabled} />
            {config.eventPopup.showIcon && (
              <RadioRow label="Vị trí icon" value={config.eventPopup.iconPosition}
                options={[{ value: 'top', label: 'Trên' }, { value: 'left', label: 'Bên trái' }]}
                onChange={v => update('eventPopup', { ...config.eventPopup, iconPosition: v as 'top'|'left' })} disabled={disabled} />
            )}
            <ToggleRow label="Badge mức độ" value={config.eventPopup.showSeverityBadge}
              onChange={v => update('eventPopup', { ...config.eventPopup, showSeverityBadge: v })} disabled={disabled} />
            <ToggleRow label="Hiện lựa chọn" value={config.eventPopup.showChoices}
              onChange={v => update('eventPopup', { ...config.eventPopup, showChoices: v })} disabled={disabled} />
            {config.eventPopup.showChoices && (
              <RadioRow label="Kiểu lựa chọn" value={config.eventPopup.choiceStyle}
                options={[{ value: 'buttons', label: 'Nút bấm' }, { value: 'cards', label: 'Thẻ' }, { value: 'list', label: 'Danh sách' }]}
                onChange={v => update('eventPopup', { ...config.eventPopup, choiceStyle: v as 'buttons'|'cards'|'list' })} disabled={disabled} />
            )}
            <ToggleRow label="Animation vào" value={config.eventPopup.animateEntry}
              onChange={v => update('eventPopup', { ...config.eventPopup, animateEntry: v })} disabled={disabled} />
            {config.eventPopup.animateEntry && (
              <RadioRow label="Loại animation" value={config.eventPopup.entryAnimation}
                options={[{ value: 'slideDown', label: 'Slide Down' }, { value: 'fadeIn', label: 'Fade In' }, { value: 'scaleUp', label: 'Scale Up' }, { value: 'none', label: 'Không' }]}
                onChange={v => update('eventPopup', { ...config.eventPopup, entryAnimation: v as 'slideDown'|'fadeIn'|'scaleUp'|'none' })} disabled={disabled} />
            )}
            <SliderRow label="Border radius" value={config.eventPopup.borderRadius} min={0} max={20} unit="px"
              onChange={v => update('eventPopup', { ...config.eventPopup, borderRadius: v })} disabled={disabled} />
            <ToggleRow label="Nút đóng" value={config.eventPopup.showCloseButton}
              onChange={v => update('eventPopup', { ...config.eventPopup, showCloseButton: v })} disabled={disabled} />

            <div className="grid grid-cols-3 gap-2 pt-1">
              <ColorRow label="Nền" value={config.eventPopup.popupBg}
                onChange={v => update('eventPopup', { ...config.eventPopup, popupBg: v })} disabled={disabled} />
              <ColorRow label="Viền" value={config.eventPopup.popupBorder}
                onChange={v => update('eventPopup', { ...config.eventPopup, popupBorder: v })} disabled={disabled} />
              <ColorRow label="Accent" value={config.eventPopup.popupAccent}
                onChange={v => update('eventPopup', { ...config.eventPopup, popupAccent: v })} disabled={disabled} />
            </div>
          </div>
        )}
      </Section>

      {/* ═══ 26. DATA TABLE ═══ */}
      <Section title="Data Table / Grid" icon={Table2} summary={config.dataTable.enabled ? `${config.dataTable.tableStyle} • ${config.dataTable.density}` : ''} enabled={s.dataTable} onToggleEnabled={() => toggleSection('dataTable')}>
        <ToggleRow label="Bật Data Table" value={config.dataTable.enabled}
          onChange={v => update('dataTable', { ...config.dataTable, enabled: v })} disabled={disabled} />

        {config.dataTable.enabled && (
          <div className="space-y-2">
            <RadioRow label="Style" value={config.dataTable.tableStyle}
              options={(['striped','bordered','minimal','card'] as TableStyle[]).map(v => ({ value: v, label: v }))}
              onChange={v => update('dataTable', { ...config.dataTable, tableStyle: v as TableStyle })} disabled={disabled} />
            <RadioRow label="Mật độ" value={config.dataTable.density}
              options={(['compact','normal','spacious'] as TableDensity[]).map(v => ({ value: v, label: v }))}
              onChange={v => update('dataTable', { ...config.dataTable, density: v as TableDensity })} disabled={disabled} />
            <ToggleRow label="Hiện header" value={config.dataTable.showHeader}
              onChange={v => update('dataTable', { ...config.dataTable, showHeader: v })} disabled={disabled} />
            <ToggleRow label="Sticky header" value={config.dataTable.stickyHeader}
              onChange={v => update('dataTable', { ...config.dataTable, stickyHeader: v })} disabled={disabled} />
            <ToggleRow label="Hover highlight" value={config.dataTable.hoverHighlight}
              onChange={v => update('dataTable', { ...config.dataTable, hoverHighlight: v })} disabled={disabled} />
            <ToggleRow label="Alternate row color" value={config.dataTable.alternateRowColor}
              onChange={v => update('dataTable', { ...config.dataTable, alternateRowColor: v })} disabled={disabled} />
            <ToggleRow label="Cho phép sort" value={config.dataTable.enableSorting}
              onChange={v => update('dataTable', { ...config.dataTable, enableSorting: v })} disabled={disabled} />
            <SliderRow label="Border radius" value={config.dataTable.borderRadius} min={0} max={16} unit="px"
              onChange={v => update('dataTable', { ...config.dataTable, borderRadius: v })} disabled={disabled} />
            <SliderRow label="Max height" value={config.dataTable.maxHeight} min={0} max={600} unit="px"
              onChange={v => update('dataTable', { ...config.dataTable, maxHeight: v })} disabled={disabled} />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <ColorRow label="Header BG" value={config.dataTable.headerBg}
                onChange={v => update('dataTable', { ...config.dataTable, headerBg: v })} disabled={disabled} />
              <ColorRow label="Header Text" value={config.dataTable.headerText}
                onChange={v => update('dataTable', { ...config.dataTable, headerText: v })} disabled={disabled} />
              <ColorRow label="Row BG" value={config.dataTable.rowBg}
                onChange={v => update('dataTable', { ...config.dataTable, rowBg: v })} disabled={disabled} />
              <ColorRow label="Row Alt BG" value={config.dataTable.rowAltBg}
                onChange={v => update('dataTable', { ...config.dataTable, rowAltBg: v })} disabled={disabled} />
              <ColorRow label="Border" value={config.dataTable.borderColor}
                onChange={v => update('dataTable', { ...config.dataTable, borderColor: v })} disabled={disabled} />
            </div>
          </div>
        )}
      </Section>

      {/* ═══ 27. FORM ELEMENTS ═══ */}
      <Section title="Form Elements" icon={TextCursorInput} summary={config.formElements.enabled ? `${config.formElements.formStyle} • label ${config.formElements.labelStyle}` : ''} enabled={s.formElements} onToggleEnabled={() => toggleSection('formElements')}>
        <ToggleRow label="Bật Form Elements" value={config.formElements.enabled}
          onChange={v => update('formElements', { ...config.formElements, enabled: v })} disabled={disabled} />

        {config.formElements.enabled && (
          <div className="space-y-2">
            <RadioRow label="Style tổng" value={config.formElements.formStyle}
              options={(['modern','classic','minimal','parchment'] as FormStyle[]).map(v => ({ value: v, label: v }))}
              onChange={v => update('formElements', { ...config.formElements, formStyle: v as FormStyle })} disabled={disabled} />
            <RadioRow label="Label" value={config.formElements.labelStyle}
              options={[{ value: 'above', label: 'Trên' }, { value: 'inline', label: 'Cùng dòng' }, { value: 'floating', label: 'Nổi' }, { value: 'hidden', label: 'Ẩn' }]}
              onChange={v => update('formElements', { ...config.formElements, labelStyle: v as 'above'|'inline'|'floating'|'hidden' })} disabled={disabled} />
            <RadioRow label="Select style" value={config.formElements.selectStyle}
              options={[{ value: 'native', label: 'Native' }, { value: 'custom-dropdown', label: 'Custom' }]}
              onChange={v => update('formElements', { ...config.formElements, selectStyle: v as 'native'|'custom-dropdown' })} disabled={disabled} />
            <SliderRow label="Input radius" value={config.formElements.inputRadius} min={0} max={16} unit="px"
              onChange={v => update('formElements', { ...config.formElements, inputRadius: v })} disabled={disabled} />
            <SliderRow label="Input padding" value={config.formElements.inputPadding} min={4} max={16} unit="px"
              onChange={v => update('formElements', { ...config.formElements, inputPadding: v })} disabled={disabled} />
            <SliderRow label="Khoảng cách field" value={config.formElements.fieldGap} min={4} max={20} unit="px"
              onChange={v => update('formElements', { ...config.formElements, fieldGap: v })} disabled={disabled} />
            <ToggleRow label="Fieldset border" value={config.formElements.fieldsetBorder}
              onChange={v => update('formElements', { ...config.formElements, fieldsetBorder: v })} disabled={disabled} />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <ColorRow label="Input BG" value={config.formElements.inputBg}
                onChange={v => update('formElements', { ...config.formElements, inputBg: v })} disabled={disabled} />
              <ColorRow label="Input Border" value={config.formElements.inputBorder}
                onChange={v => update('formElements', { ...config.formElements, inputBorder: v })} disabled={disabled} />
              <ColorRow label="Input Text" value={config.formElements.inputText}
                onChange={v => update('formElements', { ...config.formElements, inputText: v })} disabled={disabled} />
              <ColorRow label="Focus Ring" value={config.formElements.focusColor}
                onChange={v => update('formElements', { ...config.formElements, focusColor: v })} disabled={disabled} />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/30">
              <ColorRow label="Slider Accent" value={config.formElements.sliderAccent}
                onChange={v => update('formElements', { ...config.formElements, sliderAccent: v })} disabled={disabled} />
              <ColorRow label="Slider Track" value={config.formElements.sliderTrackBg}
                onChange={v => update('formElements', { ...config.formElements, sliderTrackBg: v })} disabled={disabled} />
              <ColorRow label="Submit BG" value={config.formElements.buttonSubmitBg}
                onChange={v => update('formElements', { ...config.formElements, buttonSubmitBg: v })} disabled={disabled} />
              <ColorRow label="Submit Text" value={config.formElements.buttonSubmitText}
                onChange={v => update('formElements', { ...config.formElements, buttonSubmitText: v })} disabled={disabled} />
              <ColorRow label="Cancel BG" value={config.formElements.buttonCancelBg}
                onChange={v => update('formElements', { ...config.formElements, buttonCancelBg: v })} disabled={disabled} />
              <ColorRow label="Cancel Text" value={config.formElements.buttonCancelText}
                onChange={v => update('formElements', { ...config.formElements, buttonCancelText: v })} disabled={disabled} />
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
