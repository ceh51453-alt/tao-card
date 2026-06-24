/**
 * src/lib/sync/tavernSyncService.ts — Singleton Sync Service
 * Quản lý kết nối, adapter lifecycle, và push card
 */

import type { CharacterCardV3 } from '../../types/card.types';
import type { SyncSettings, SyncResult, SyncEvent, SyncConnectionStatus, STCharacterInfo } from './syncTypes';
import { DEFAULT_SYNC_SETTINGS } from './syncTypes';
import { createAdapter, type SyncAdapter } from './adapters';

const STORAGE_KEY = 'tavern_sync_settings';

class TavernSyncService {
  private adapter: SyncAdapter | null = null;
  private settings: SyncSettings;
  private eventListeners: Set<(event: SyncEvent) => void> = new Set();
  private syncLog: SyncEvent[] = [];

  constructor() {
    this.settings = this.loadSettings();
  }

  // ─── Settings ───────────────────────────────────────────────────

  private loadSettings(): SyncSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        return { ...DEFAULT_SYNC_SETTINGS, ...saved };
      }
    } catch { /* ignore */ }
    return { ...DEFAULT_SYNC_SETTINGS };
  }

  getSettings(): SyncSettings {
    return { ...this.settings };
  }

  updateSettings(patch: Partial<SyncSettings>): void {
    this.settings = { ...this.settings, ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
  }

  // ─── Connection ─────────────────────────────────────────────────

  async connect(): Promise<boolean> {
    // Disconnect cũ nếu có
    this.disconnect();

    const adapter = createAdapter(this.settings.mode, this.settings);

    // Wire event handler cho WS adapter
    if (adapter.onEvent) {
      adapter.onEvent((event) => {
        this.addLog(event);
        this.notifyListeners(event);
      });
    }

    this.adapter = adapter;
    this.addLog({ type: 'message', message: `Đang kết nối qua ${adapter.name}...`, timestamp: Date.now() });

    const ok = await adapter.connect();
    if (ok) {
      this.addLog({ type: 'connected', message: `✅ Kết nối ${adapter.name} thành công`, timestamp: Date.now() });
    } else {
      this.addLog({ type: 'error', message: `❌ Không thể kết nối ${adapter.name}`, timestamp: Date.now() });
    }

    this.notifyListeners({
      type: ok ? 'connected' : 'error',
      message: ok ? 'Connected' : 'Connection failed',
      timestamp: Date.now(),
    });

    return ok;
  }

  disconnect(): void {
    if (this.adapter) {
      this.adapter.disconnect();
      this.adapter = null;
      this.addLog({ type: 'disconnected', message: 'Đã ngắt kết nối', timestamp: Date.now() });
      this.notifyListeners({ type: 'disconnected', message: 'Disconnected', timestamp: Date.now() });
    }
  }

  getStatus(): SyncConnectionStatus {
    return this.adapter?.getStatus() ?? 'disconnected';
  }

  isConnected(): boolean {
    return this.getStatus() === 'connected';
  }

  // ─── Sync Operations ───────────────────────────────────────────

  async pushCard(card: CharacterCardV3): Promise<SyncResult> {
    if (!this.adapter || !this.isConnected()) {
      // Auto-connect nếu chưa kết nối
      const ok = await this.connect();
      if (!ok) {
        return {
          success: false,
          message: '❌ Không thể kết nối tới SillyTavern',
          timestamp: Date.now(),
        };
      }
    }

    this.addLog({ type: 'message', message: `→ Đang push "${card.data.name}"...`, timestamp: Date.now() });
    const result = await this.adapter!.pushCard(card);
    this.addLog({
      type: result.success ? 'synced' : 'error',
      message: result.message,
      timestamp: result.timestamp,
    });
    this.notifyListeners({
      type: result.success ? 'synced' : 'error',
      message: result.message,
      timestamp: result.timestamp,
    });

    return result;
  }

  async listCharacters(): Promise<STCharacterInfo[]> {
    if (!this.adapter || !this.isConnected()) {
      const ok = await this.connect();
      if (!ok) return [];
    }
    return this.adapter!.listCharacters();
  }

  // ─── Events ─────────────────────────────────────────────────────

  addEventListener(handler: (event: SyncEvent) => void): () => void {
    this.eventListeners.add(handler);
    return () => this.eventListeners.delete(handler);
  }

  private notifyListeners(event: SyncEvent): void {
    for (const handler of this.eventListeners) {
      try { handler(event); } catch { /* ignore */ }
    }
  }

  // ─── Log ────────────────────────────────────────────────────────

  private addLog(event: SyncEvent): void {
    this.syncLog.push(event);
    // Giữ tối đa 50 events
    if (this.syncLog.length > 50) {
      this.syncLog = this.syncLog.slice(-50);
    }
  }

  getLog(): SyncEvent[] {
    return [...this.syncLog];
  }

  clearLog(): void {
    this.syncLog = [];
  }
}

// Singleton
export const tavernSync = new TavernSyncService();
