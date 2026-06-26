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
} from '../../types/gameUiConfig.types';
import {
  POPULAR_FONTS,
  PRESET_LABELS,
  COLOR_PRESETS,
  createDefaultCharacterImage,
  applyColorPreset,
  IMAGE_SIZE_PX,
  createTabItem,
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
    </div>
  );
}
