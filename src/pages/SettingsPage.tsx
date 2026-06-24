/**
 * SettingsPage — Module 1: Cài đặt kết nối AI
 * Spec Phần 5: Proxy profiles, model scan, generation params, connection test
 */

import { useState, useCallback } from 'react';
import {
  Settings, Plus, Copy, Trash2, Search, Zap, Eye, EyeOff,
  ChevronDown, ChevronRight, Check, X, Loader2, AlertTriangle,
} from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { scanModels } from '../lib/ai/modelScanner';
import { testConnection, callAI } from '../lib/ai/client';
import type { ProxyProfile, GenerationParams, ModelInfo, WorldbuildingStep } from '../types';
import type { ConnectionTestResult } from '../lib/ai/client';
import { DEFAULT_MASTER_INSTRUCTION } from '../lib/ai/worldbuildingDefaults';

const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI-compatible' },
  { value: 'claude', label: 'Claude (Anthropic)' },
  { value: 'gemini', label: 'Gemini (Google AI)' },
  { value: 'custom', label: 'Custom Endpoint' },
] as const;

export function SettingsPage() {
  const {
    profiles, activeProfileId, generationParams, keepKeyOnlyInSession,
    addProfile, updateProfile, deleteProfile, duplicateProfile,
    setActiveProfile, setGenerationParams, restoreDefaultSteps,
  } = useSettingsStore();

  const activeProfile = profiles.find(p => p.id === activeProfileId);

  // ─── Helpers ────────────────────────────────────────────────────────

  const updateField = useCallback((field: keyof ProxyProfile, value: unknown) => {
    if (!activeProfileId) return;
    updateProfile(activeProfileId, { [field]: value } as Partial<ProxyProfile>);
  }, [activeProfileId, updateProfile]);

  const updateParam = useCallback((field: keyof GenerationParams, value: unknown) => {
    setGenerationParams({ [field]: value } as Partial<GenerationParams>);
  }, [setGenerationParams]);

  // Local UI state
  const [showApiKey, setShowApiKey] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [showHeaders, setShowHeaders] = useState(false);
  const [showAdvancedParams, setShowAdvancedParams] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  
  // Phase 3 Sub-Tabs state
  const [activeSubTab, setActiveSubTab] = useState<'connection' | 'guide' | 'pipeline'>('connection');
  const [readingGuide, setReadingGuide] = useState(false);

  // ─── Profile Management ─────────────────────────────────────────────

  const handleAddProfile = useCallback(() => {
    const id = addProfile('Profile mới', 'openai');
    setActiveProfile(id);
  }, [addProfile, setActiveProfile]);

  const handleDeleteProfile = useCallback(() => {
    if (!activeProfileId) return;
    if (!confirm(`Xóa profile "${activeProfile?.label}"?`)) return;
    deleteProfile(activeProfileId);
  }, [activeProfileId, activeProfile?.label, deleteProfile]);

  const handleDuplicateProfile = useCallback(() => {
    if (!activeProfileId) return;
    const newId = duplicateProfile(activeProfileId);
    if (newId) setActiveProfile(newId);
  }, [activeProfileId, duplicateProfile, setActiveProfile]);

  // ─── Model Scanning ─────────────────────────────────────────────────

  const handleScanModels = useCallback(async () => {
    if (!activeProfile) return;
    setScanning(true);
    setScanError(null);
    try {
      const models = await scanModels(activeProfile);
      updateProfile(activeProfile.id, {
        cachedModels: models,
        cachedModelsAt: Date.now(),
      });
    } catch (e) {
      setScanError(e instanceof Error ? e.message : String(e));
    } finally {
      setScanning(false);
    }
  }, [activeProfile, updateProfile]);

  // ─── Connection Test ────────────────────────────────────────────────

  const handleTestConnection = useCallback(async () => {
    if (!activeProfile) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection(activeProfile, generationParams);
      setTestResult(result);
      if (result.supportsToolCalling !== activeProfile.supportsNativeToolCalling) {
        updateProfile(activeProfile.id, { supportsNativeToolCalling: result.supportsToolCalling });
      }
    } catch {
      setTestResult({ ok: false, latencyMs: 0, modelUsed: '', supportsToolCalling: false, error: 'Unexpected error' });
    } finally {
      setTesting(false);
    }
  }, [activeProfile, generationParams, updateProfile]);

  // ─── AI Read Guide ──────────────────────────────────────────────────

  const handleAIReadGuide = useCallback(async () => {
    if (!activeProfile) return;
    setReadingGuide(true);
    try {
      const prompt = `Bạn là một trợ lý AI dễ thương và hơi ngốc nghếch (baka). Hãy đọc hướng dẫn tổng sau đây và tóm tắt lại các ý cốt lõi quan trọng nhất thành một bản ghi nhớ siêu ngắn gọn (dưới 5 ý gạch đầu dòng) để lưu vào bộ nhớ AI.
Yêu cầu bắt buộc:
- Trả lời bằng tiếng Việt.
- Sử dụng tông giọng "baka~" dễ thương nhí nhảnh, có các từ như baka, oii~, 🌸, nya~.
- Chỉ trả về bản tóm tắt, không nói thêm lời thừa.

Nội dung Hướng dẫn tổng:
${activeProfile.masterInstruction || ''}`;

      const result = await callAI({
        profile: activeProfile,
        params: generationParams,
        messages: [{ role: 'user', content: prompt }]
      });

      updateField('aiPipelineMemory', result.text);
    } catch (e) {
      alert(`Lỗi khi gọi AI: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setReadingGuide(false);
    }
  }, [activeProfile, generationParams, updateField]);

  // ─── Pipeline Steps Management ──────────────────────────────────────

  const moveStep = useCallback((index: number, direction: 'up' | 'down') => {
    if (!activeProfile || !activeProfile.steps) return;
    const newSteps = [...activeProfile.steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;
    
    // Swap
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;
    
    updateField('steps', newSteps);
  }, [activeProfile, updateField]);

  const handleAddStep = useCallback(() => {
    if (!activeProfile) return;
    const currentSteps = activeProfile.steps || [];
    const newStep: WorldbuildingStep = {
      id: `step_${Math.random().toString(36).substring(2, 9)}`,
      name: `Bước mới ${currentSteps.length + 1}`,
      prompt: '',
      enabled: true,
      singleton: false
    };
    updateField('steps', [...currentSteps, newStep]);
  }, [activeProfile, updateField]);

  const handleDeleteStep = useCallback((index: number) => {
    if (!activeProfile || !activeProfile.steps) return;
    const newSteps = activeProfile.steps.filter((_, i) => i !== index);
    updateField('steps', newSteps);
  }, [activeProfile, updateField]);

  const handleUpdateStep = useCallback((index: number, patch: Partial<WorldbuildingStep>) => {
    if (!activeProfile || !activeProfile.steps) return;
    const newSteps = activeProfile.steps.map((step, i) => 
      i === index ? { ...step, ...patch } : step
    );
    updateField('steps', newSteps);
  }, [activeProfile, updateField]);

  const handleRestoreDefaultSteps = useCallback(() => {
    if (!activeProfile) return;
    if (confirm('Khôi phục quy trình trích xuất về 5 bước mặc định? Thao tác này sẽ ghi đè các chỉnh sửa hiện tại.')) {
      restoreDefaultSteps(activeProfile.id);
    }
  }, [activeProfile, restoreDefaultSteps]);

  // ─── Model Filtering ────────────────────────────────────────────────

  const filteredModels = activeProfile?.cachedModels.filter(m =>
    m.id.toLowerCase().includes(modelSearch.toLowerCase())
  ) ?? [];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Cài đặt kết nối AI</h1>
          <p className="text-sm text-muted-foreground">
            Cấu hình proxy URL, API key, và tham số sinh AI.
          </p>
        </div>
      </div>

      {/* ═══════════════════ PROFILE SELECTOR ═══════════════════ */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Profile kết nối</h2>
          <div className="flex gap-1.5">
            <button onClick={handleAddProfile} title="Thêm profile"
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={handleDuplicateProfile} disabled={!activeProfileId} title="Sao chép"
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30">
              <Copy className="w-4 h-4" />
            </button>
            <button onClick={handleDeleteProfile} disabled={!activeProfileId || profiles.length <= 1} title="Xóa"
              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive disabled:opacity-30">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Profile tabs */}
        {profiles.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">Chưa có profile nào.</p>
            <button onClick={handleAddProfile}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> Tạo profile đầu tiên
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-1 px-4 pt-3 overflow-x-auto">
              {profiles.map(p => (
                <button key={p.id} onClick={() => setActiveProfile(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${
                    p.id === activeProfileId
                      ? 'bg-primary/10 text-primary font-medium border border-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}>
                  {p.label || 'Untitled'}
                </button>
              ))}
            </div>

            {/* ═══════════ ACTIVE PROFILE EDITOR ═══════════ */}
            {activeProfile && (
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Profile Name */}
                  <div>
                    <label className="settings-label">Tên Profile</label>
                    <input type="text" value={activeProfile.label}
                      onChange={e => updateField('label', e.target.value)}
                      className="settings-input" placeholder="Tên hiển thị" />
                  </div>

                  {/* Provider Type */}
                  <div>
                    <label className="settings-label">Loại Provider</label>
                    <select value={activeProfile.providerType}
                      onChange={e => updateField('providerType', e.target.value)}
                      className="settings-input">
                      {PROVIDER_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sub-Tabs selector */}
                <div className="flex border-b border-border gap-2 mt-2">
                  <button onClick={() => setActiveSubTab('connection')}
                    className={`px-4 py-2 text-xs font-semibold transition-all border-b-2 -mb-[1px] ${
                      activeSubTab === 'connection'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}>
                    Kết nối & Model
                  </button>
                  <button onClick={() => setActiveSubTab('guide')}
                    className={`px-4 py-2 text-xs font-semibold transition-all border-b-2 -mb-[1px] ${
                      activeSubTab === 'guide'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}>
                    Hướng Dẫn Tổng (Guide)
                  </button>
                  <button onClick={() => setActiveSubTab('pipeline')}
                    className={`px-4 py-2 text-xs font-semibold transition-all border-b-2 -mb-[1px] ${
                      activeSubTab === 'pipeline'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}>
                    Quy Trình Trích Xuất (Pipeline Steps)
                  </button>
                </div>

                {/* Tab 1: Kết nối & Model */}
                {activeSubTab === 'connection' && (
                  <div className="space-y-5 pt-2">
                    {/* Proxy URL */}
                    <div>
                      <label className="settings-label">Proxy URL / Base URL</label>
                      <input type="url" value={activeProfile.baseUrl}
                        onChange={e => updateField('baseUrl', e.target.value)}
                        className="settings-input"
                        placeholder={
                          activeProfile.providerType === 'gemini'
                            ? 'https://generativelanguage.googleapis.com'
                            : 'https://api.openai.com'
                        } />
                    </div>

                    {/* API Key */}
                    <div>
                      <label className="settings-label">API Key</label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={activeProfile.apiKey}
                          onChange={e => updateField('apiKey', e.target.value)}
                          className="settings-input pr-10"
                          placeholder="sk-..." />
                        <button onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Chỉ lưu trên máy bạn (localStorage).
                      </p>
                    </div>

                    {/* Session-only key */}
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input type="checkbox" checked={keepKeyOnlyInSession}
                        onChange={e => useSettingsStore.setState({ keepKeyOnlyInSession: e.target.checked })}
                        className="settings-checkbox" />
                      Chỉ giữ API Key trong phiên làm việc
                    </label>

                    {/* ─── Đa Model & Concurrency (Mix Mode / RPM) ─── */}
                    <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-primary flex items-center gap-1.5">
                          ⚡ Cấu hình Đa Model & Song công
                        </span>
                      </div>

                      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <input type="checkbox" checked={activeProfile.enableSecondaryModel || false}
                          onChange={e => updateField('enableSecondaryModel', e.target.checked)}
                          className="settings-checkbox" />
                        Kích hoạt Model Phụ (Flash) cho tác vụ ngắn
                      </label>

                      {activeProfile.enableSecondaryModel && (
                        <div className="space-y-4 pl-4 border-l-2 border-border/50">
                          <div>
                            <label className="settings-label">Model Phụ (Flash)</label>
                            <select value={activeProfile.secondaryModel || ''}
                              onChange={e => updateField('secondaryModel', e.target.value)}
                              className="settings-input">
                              <option value="">-- Chọn model phụ --</option>
                              {activeProfile.cachedModels.map(m => (
                                <option key={m.id} value={m.id}>{m.id}</option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="settings-label">RPM Model Chính (Pro)</label>
                              <input type="number" value={activeProfile.primaryRpm ?? 5}
                                onChange={e => updateField('primaryRpm', parseInt(e.target.value) || 5)}
                                className="settings-input" min={1} />
                            </div>
                            <div>
                              <label className="settings-label">RPM Model Phụ (Flash)</label>
                              <input type="number" value={activeProfile.secondaryRpm ?? 10}
                                onChange={e => updateField('secondaryRpm', parseInt(e.target.value) || 10)}
                                className="settings-input" min={1} />
                            </div>
                          </div>

                          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                            <input type="checkbox" checked={activeProfile.mixMode !== false}
                              onChange={e => updateField('mixMode', e.target.checked)}
                              className="settings-checkbox" />
                            Chế độ Mix (Chạy song song Pro + Flash)
                          </label>

                          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                            <input type="checkbox" checked={activeProfile.superMix || false}
                              onChange={e => updateField('superMix', e.target.checked)}
                              className="settings-checkbox" />
                            Super Mix (Quét 5 nhóm trong 1 request)
                          </label>

                          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                            <input type="checkbox" checked={activeProfile.enableCompletenessProtocol || false}
                              onChange={e => updateField('enableCompletenessProtocol', e.target.checked)}
                              className="settings-checkbox" />
                            Giao thức hoàn thiện tối đa (Zero Omission)
                          </label>
                        </div>
                      )}
                    </div>

                    {/* ─── Custom Headers ─── */}
                    <div className="rounded-lg border border-border overflow-hidden">
                      <button onClick={() => setShowHeaders(!showHeaders)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                        Header tuỳ chỉnh ({activeProfile.customHeaders.length})
                        {showHeaders ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      {showHeaders && (
                        <div className="px-4 pb-3 space-y-2 border-t border-border pt-3">
                          {activeProfile.customHeaders.map((h, i) => (
                            <div key={i} className="flex gap-2">
                              <input type="text" value={h.key} placeholder="Header name"
                                onChange={e => {
                                  const next = [...activeProfile.customHeaders];
                                  next[i] = { ...next[i], key: e.target.value };
                                  updateField('customHeaders', next);
                                }}
                                className="settings-input flex-1 text-xs" />
                              <input type="text" value={h.value} placeholder="Value"
                                onChange={e => {
                                  const next = [...activeProfile.customHeaders];
                                  next[i] = { ...next[i], value: e.target.value };
                                  updateField('customHeaders', next);
                                }}
                                className="settings-input flex-1 text-xs" />
                              <button onClick={() => {
                                const next = activeProfile.customHeaders.filter((_, j) => j !== i);
                                updateField('customHeaders', next);
                              }} className="p-1.5 text-muted-foreground hover:text-destructive">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          <button onClick={() => {
                            updateField('customHeaders', [...activeProfile.customHeaders, { key: '', value: '' }]);
                          }}
                            className="text-xs text-primary hover:text-primary/80 transition-colors">
                            + Thêm header
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ─── Model Selection ─── */}
                    <div className="space-y-2">
                      <label className="settings-label">Model</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input type="text" value={activeProfile.selectedModel}
                            onChange={e => updateField('selectedModel', e.target.value)}
                            className="settings-input" placeholder="Nhập hoặc chọn model" />
                        </div>
                        <button onClick={handleScanModels} disabled={scanning || !activeProfile.baseUrl || !activeProfile.apiKey}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 border border-border text-sm font-medium transition-colors disabled:opacity-40"
                          title="Quét danh sách model">
                          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                          Quét
                        </button>
                      </div>

                      {scanError && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {scanError}
                        </p>
                      )}

                      {/* Model dropdown */}
                      {activeProfile.cachedModels.length > 0 && (
                        <div className="rounded-lg border border-border bg-background overflow-hidden">
                          <div className="px-3 py-2 border-b border-border">
                            <input type="text" value={modelSearch} onChange={e => setModelSearch(e.target.value)}
                              placeholder="Tìm model..." className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredModels.length === 0 ? (
                              <p className="p-3 text-xs text-muted-foreground text-center">Không tìm thấy model.</p>
                            ) : (
                              filteredModels.map((m: ModelInfo) => (
                                <button key={m.id} onClick={() => { updateField('selectedModel', m.id); setModelSearch(''); }}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center justify-between ${
                                    m.id === activeProfile.selectedModel ? 'bg-primary/5 text-primary' : 'text-foreground'
                                  }`}>
                                  <span className="truncate">{m.id}</span>
                                  {m.id === activeProfile.selectedModel && <Check className="w-3.5 h-3.5 shrink-0" />}
                                </button>
                              ))
                            )}
                          </div>
                          {activeProfile.cachedModelsAt && (
                            <p className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border">
                              Quét lúc {new Date(activeProfile.cachedModelsAt).toLocaleTimeString()} · {activeProfile.cachedModels.length} models
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ─── JSON Response Format ─── */}
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input type="checkbox" checked={generationParams.useJsonResponseFormat}
                        onChange={e => updateParam('useJsonResponseFormat', e.target.checked)}
                        className="settings-checkbox" />
                      Dùng JSON Response Format
                    </label>

                    {/* ─── Connection Test ─── */}
                    <div className="flex items-center gap-3">
                      <button onClick={handleTestConnection}
                        disabled={testing || !activeProfile.baseUrl || !activeProfile.apiKey || !activeProfile.selectedModel}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        Kiểm tra kết nối
                      </button>
                      {testResult && (
                        <div className={`text-xs flex items-center gap-1.5 ${testResult.ok ? 'text-emerald-400' : 'text-destructive'}`}>
                          {testResult.ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                          <span>
                            {testResult.ok
                              ? `OK · ${testResult.latencyMs}ms · Tool-calling: ${testResult.supportsToolCalling ? 'Có' : 'Không'}`
                              : testResult.error?.slice(0, 100)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 2: Hướng Dẫn Tổng (Guide) */}
                {activeSubTab === 'guide' && (
                  <div className="space-y-5 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="settings-label mb-0 font-semibold text-primary">Hướng Dẫn Tổng (Master Instruction)</label>
                      <button
                        onClick={() => {
                          if (confirm('Khôi phục Hướng dẫn tổng về mặc định?')) {
                            updateField('masterInstruction', DEFAULT_MASTER_INSTRUCTION);
                          }
                        }}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Nạp lại mặc định
                      </button>
                    </div>
                    <textarea
                      value={activeProfile.masterInstruction || ''}
                      onChange={e => updateField('masterInstruction', e.target.value)}
                      className="settings-input font-mono text-xs h-64 resize-y leading-relaxed bg-background"
                      placeholder="Nhập luật tổng cương chung dài, được chèn ở đầu mỗi bước của AI..."
                    />

                    <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-primary flex items-center gap-1.5">
                          🧠 Bộ Nhớ AI (aiPipelineMemory)
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={handleAIReadGuide}
                            disabled={readingGuide || !activeProfile.baseUrl || !activeProfile.apiKey}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
                          >
                            {readingGuide ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Đang xử lý...
                              </>
                            ) : (
                              <>
                                <Zap className="w-3 h-3" />
                                Gửi cho AI đọc hiểu
                              </>
                            )}
                          </button>
                          {activeProfile.aiPipelineMemory && (
                            <button
                              onClick={() => updateField('aiPipelineMemory', '')}
                              className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Xóa bộ nhớ
                            </button>
                          )}
                        </div>
                      </div>

                      {activeProfile.aiPipelineMemory ? (
                        <div className="bg-background p-3.5 rounded-lg border border-border text-sm leading-relaxed whitespace-pre-wrap font-sans text-foreground">
                          {activeProfile.aiPipelineMemory}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          AI chưa được đọc tài liệu. Nhấp "Gửi cho AI đọc hiểu" để AI phân tích và tóm tắt hướng dẫn tổng.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 3: Quy Trình Trích Xuất (Pipeline Steps) */}
                {activeSubTab === 'pipeline' && (
                  <div className="space-y-5 pt-2">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Quy trình các bước trích xuất</h3>
                        <p className="text-xs text-muted-foreground">
                          Thiết lập thứ tự và chỉ dẫn chi tiết cho từng bước dệt bối cảnh.
                        </p>
                      </div>
                      <button
                        onClick={handleRestoreDefaultSteps}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Khôi phục 5 bước gốc
                      </button>
                    </div>

                    {/* Semantic Dedup checkbox */}
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none pb-2 border-b border-border/50">
                      <input type="checkbox" checked={activeProfile.semanticDedup !== false}
                        onChange={e => updateField('semanticDedup', e.target.checked)}
                        className="settings-checkbox" />
                      <div>
                        <span className="font-semibold text-foreground">Bật cơ chế dọn trùng lặp ngữ nghĩa</span>
                        <p className="text-xs text-muted-foreground">
                          Sử dụng AI quét và gộp các thực thể trùng ngữ nghĩa sau khi hoàn tất trích xuất.
                        </p>
                      </div>
                    </label>

                    {/* Steps list */}
                    <div className="space-y-4">
                      {((activeProfile.steps as WorldbuildingStep[]) || []).map((step, idx) => (
                        <div key={step.id} className="border border-border rounded-xl p-4 bg-muted/20 space-y-3 relative">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              {/* Step Name */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                  #{idx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={step.name || ''}
                                  onChange={e => handleUpdateStep(idx, { name: e.target.value })}
                                  className="settings-input font-medium py-1 text-sm flex-1 bg-background"
                                  placeholder="Tên bước"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {/* Move Up */}
                              <button
                                onClick={() => moveStep(idx, 'up')}
                                disabled={idx === 0}
                                className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30"
                                title="Di chuyển lên"
                              >
                                <ChevronDown className="w-4 h-4 rotate-180" />
                              </button>
                              {/* Move Down */}
                              <button
                                onClick={() => moveStep(idx, 'down')}
                                disabled={idx === (activeProfile.steps?.length || 0) - 1}
                                className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30"
                                title="Di chuyển xuống"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteStep(idx)}
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                title="Xóa bước"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Options check row */}
                          <div className="flex gap-4">
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={step.enabled}
                                onChange={e => handleUpdateStep(idx, { enabled: e.target.checked })}
                                className="settings-checkbox"
                              />
                              Kích hoạt bước này
                            </label>
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={step.singleton || false}
                                onChange={e => handleUpdateStep(idx, { singleton: e.target.checked })}
                                className="settings-checkbox"
                              />
                              Chỉ chạy 1 lần trên toàn tài liệu (Singleton)
                            </label>
                          </div>

                          {/* Prompt instruction */}
                          <div>
                            <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">
                              Prompt Chỉ Dẫn Của AI
                            </label>
                            <textarea
                              value={step.prompt || ''}
                              onChange={e => handleUpdateStep(idx, { prompt: e.target.value })}
                              className="settings-input font-mono text-xs h-36 resize-y bg-background"
                              placeholder="Nhập prompt chỉ dẫn cụ thể cho bước này..."
                            />
                          </div>
                        </div>
                      ))}

                      {(!activeProfile.steps || activeProfile.steps.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Chưa có bước nào trong quy trình. Nhấp "Khôi phục 5 bước gốc" để nạp mặc định.
                        </p>
                      )}

                      <button
                        onClick={handleAddStep}
                        className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Thêm bước trích xuất mới
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* ═══════════════════ GENERATION PARAMS ═══════════════════ */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <h2 className="text-sm font-medium text-foreground">Tham số sinh AI</h2>
        </div>
        <div className="p-5 space-y-5">
          {/* Core params grid */}
          <div className="grid grid-cols-2 gap-4">
            <ParamSlider label="Temperature" value={generationParams.temperature}
              onChange={v => updateParam('temperature', v)} min={0} max={2} step={0.05} />
            <ParamSlider label="Top P" value={generationParams.top_p}
              onChange={v => updateParam('top_p', v)} min={0} max={1} step={0.05} />
            <ParamNumber label="Max Tokens" value={generationParams.max_tokens}
              onChange={v => updateParam('max_tokens', v)} min={1} max={128000} />
            <ParamNumber label="Context Size" value={generationParams.context_size}
              onChange={v => updateParam('context_size', v)} min={1000} max={2000000} />
            <ParamNumber label="Min Tokens (Độ dài tối thiểu)" value={generationParams.minTokens ?? 2000}
              onChange={v => updateParam('minTokens', v)} min={500} max={20000} />
          </div>

          {/* Reasoning Effort */}
          <div>
            <label className="settings-label">Reasoning Effort</label>
            <select value={generationParams.reasoning_effort}
              onChange={e => updateParam('reasoning_effort', e.target.value)}
              className="settings-input">
              <option value="auto">Auto</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Advanced (Accordion) */}
          <div className="rounded-lg border border-border overflow-hidden">
            <button onClick={() => setShowAdvancedParams(!showAdvancedParams)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              Tham số nâng cao
              {showAdvancedParams ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {showAdvancedParams && (
              <div className="px-4 pb-4 pt-3 border-t border-border grid grid-cols-2 gap-4">
                <ParamSlider label="Top K" value={generationParams.top_k}
                  onChange={v => updateParam('top_k', v)} min={0} max={100} step={1} />
                <ParamSlider label="Top A" value={generationParams.top_a}
                  onChange={v => updateParam('top_a', v)} min={0} max={1} step={0.01} />
                <ParamSlider label="Min P" value={generationParams.min_p}
                  onChange={v => updateParam('min_p', v)} min={0} max={1} step={0.01} />
                <ParamSlider label="Frequency Penalty" value={generationParams.frequency_penalty}
                  onChange={v => updateParam('frequency_penalty', v)} min={-2} max={2} step={0.1} />
                <ParamSlider label="Presence Penalty" value={generationParams.presence_penalty}
                  onChange={v => updateParam('presence_penalty', v)} min={-2} max={2} step={0.1} />
                <ParamSlider label="Repetition Penalty" value={generationParams.repetition_penalty}
                  onChange={v => updateParam('repetition_penalty', v)} min={0.5} max={2} step={0.05} />
                <ParamNumber label="Seed (-1 = random)" value={generationParams.seed}
                  onChange={v => updateParam('seed', v)} min={-1} max={999999} />
                <div>
                  <label className="settings-label">Stop Sequences</label>
                  <input type="text" value={generationParams.stop.join(', ')}
                    onChange={e => updateParam('stop', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    className="settings-input text-xs" placeholder="Phân cách bằng dấu phẩy" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      {/* ─── Section: Tavern Helper Connection ──────────────────────────── */}
      <section className="settings-section">
        <h2 className="settings-heading flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Tavern Helper Connection
        </h2>
        <TavernHelperSettings />
      </section>
    </div>
  );
}

// ─── Reusable param components ──────────────────────────────────────────────

function ParamSlider({ label, value, onChange, min, max, step }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <span className="text-xs font-mono text-foreground">{value}</span>
      </div>
      <input type="range" value={value} onChange={e => onChange(parseFloat(e.target.value))}
        min={min} max={max} step={step} className="settings-range w-full" />
    </div>
  );
}

function ParamNumber({ label, value, onChange, min, max }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number;
}) {
  return (
    <div>
      <label className="settings-label">{label}</label>
      <input type="number" value={value}
        onChange={e => onChange(parseInt(e.target.value) || min)}
        min={min} max={max} className="settings-input text-sm" />
    </div>
  );
}

// ─── Tavern Helper Settings ───────────────────────────────────────────────────

function TavernHelperSettings() {
  const STORAGE_KEY = 'tavern_helper_settings';

  const getSettings = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as { wsUrl: string; autoSync: boolean; cdnUrl: string };
    } catch { /* ignore */ }
    return {
      wsUrl: 'ws://localhost:5001',
      autoSync: false,
      cdnUrl: 'https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate/artifact/bundle.js',
    };
  };

  const [settings, setSettings] = useState(getSettings);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');

  const updateSettings = useCallback((patch: Partial<typeof settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleTestConnection = useCallback(async () => {
    setStatus('connecting');
    try {
      const ws = new WebSocket(settings.wsUrl);
      const timeout = setTimeout(() => {
        ws.close();
        setStatus('error');
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        setStatus('connected');
        ws.close();
        setTimeout(() => setStatus('idle'), 3000);
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      };
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, [settings.wsUrl]);

  const statusIndicator = {
    idle: 'bg-muted-foreground/30',
    connecting: 'bg-amber-400 animate-pulse',
    connected: 'bg-emerald-400',
    error: 'bg-red-400',
  };

  const statusText = {
    idle: 'Chưa kết nối',
    connecting: 'Đang kết nối...',
    connected: '✅ Kết nối thành công',
    error: '❌ Không thể kết nối',
  };

  return (
    <div className="space-y-4 p-4">
      <p className="text-xs text-muted-foreground">
        Cấu hình kết nối với SillyTavern qua Tavern Helper WebSocket để đồng bộ live.
      </p>

      {/* WebSocket URL */}
      <div>
        <label className="settings-label">WebSocket URL</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={settings.wsUrl}
            onChange={e => updateSettings({ wsUrl: e.target.value })}
            className="settings-input flex-1 text-sm font-mono"
            placeholder="ws://localhost:5001"
          />
          <button
            onClick={handleTestConnection}
            disabled={status === 'connecting'}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
          >
            Test
          </button>
        </div>
        {/* Status */}
        <div className="flex items-center gap-1.5 mt-2">
          <div className={`w-2 h-2 rounded-full ${statusIndicator[status]}`} />
          <span className="text-[10px] text-muted-foreground">{statusText[status]}</span>
        </div>
      </div>

      {/* Auto-sync toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
        <div>
          <div className="text-xs font-medium">Auto-sync khi lưu</div>
          <div className="text-[10px] text-muted-foreground">Tự động push card data qua WebSocket khi lưu</div>
        </div>
        <button
          onClick={() => updateSettings({ autoSync: !settings.autoSync })}
          className={`w-9 h-5 rounded-full transition-colors relative ${
            settings.autoSync ? 'bg-primary' : 'bg-muted-foreground/30'
          }`}
        >
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            settings.autoSync ? 'left-[18px]' : 'left-0.5'
          }`} />
        </button>
      </div>

      {/* CDN URL */}
      <div>
        <label className="settings-label">MVU Bundle CDN URL</label>
        <input
          type="text"
          value={settings.cdnUrl}
          onChange={e => updateSettings({ cdnUrl: e.target.value })}
          className="settings-input text-[10px] font-mono"
          placeholder="https://cdn.jsdelivr.net/..."
        />
        <p className="text-[9px] text-muted-foreground mt-1">
          URL của MVU bundle script. Sử dụng khi inject Tavern Helper scripts.
        </p>
      </div>
    </div>
  );
}

