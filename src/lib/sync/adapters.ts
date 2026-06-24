/**
 * src/lib/sync/adapters.ts — 3 Sync Adapters cho SillyTavern
 * REST API / WebSocket / Server Plugin
 */

import type { CharacterCardV3 } from '../../types/card.types';
import type { SyncResult, SyncConnectionStatus, STCharacterInfo, SyncEvent } from './syncTypes';

// ═══════════════════════════════════════════════════════════════════════════
// ADAPTER INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

export interface SyncAdapter {
  readonly name: string;
  connect(): Promise<boolean>;
  disconnect(): void;
  getStatus(): SyncConnectionStatus;
  pushCard(card: CharacterCardV3): Promise<SyncResult>;
  listCharacters(): Promise<STCharacterInfo[]>;
  onEvent?: (handler: (event: SyncEvent) => void) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. REST ADAPTER — Gọi trực tiếp SillyTavern API
// Không cần extension, hoạt động với mọi bản ST
// ═══════════════════════════════════════════════════════════════════════════

export class RestAdapter implements SyncAdapter {
  readonly name = 'REST API';
  private baseUrl: string;
  private status: SyncConnectionStatus = 'disconnected';

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, ''); // trim trailing slash
  }

  async connect(): Promise<boolean> {
    this.status = 'connecting';
    try {
      // Test bằng cách gọi /api/characters/all
      const res = await fetch(`${this.baseUrl}/api/characters/all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        this.status = 'connected';
        return true;
      }
      this.status = 'error';
      return false;
    } catch {
      this.status = 'error';
      return false;
    }
  }

  disconnect(): void {
    this.status = 'disconnected';
  }

  getStatus(): SyncConnectionStatus {
    return this.status;
  }

  async pushCard(card: CharacterCardV3): Promise<SyncResult> {
    const now = Date.now();
    try {
      // Kiểm tra nhân vật đã tồn tại chưa
      const exists = await this.characterExists(card.data.name);

      const endpoint = exists
        ? `${this.baseUrl}/api/characters/edit`
        : `${this.baseUrl}/api/characters/create`;

      const payload = this.buildFormData(card, exists);

      const res = await fetch(endpoint, {
        method: 'POST',
        body: payload,
      });

      if (res.ok) {
        return {
          success: true,
          message: exists
            ? `✅ Cập nhật "${card.data.name}" thành công`
            : `✅ Tạo mới "${card.data.name}" thành công`,
          timestamp: now,
          characterName: card.data.name,
        };
      }

      const errorText = await res.text().catch(() => 'Unknown error');
      return {
        success: false,
        message: `❌ Lỗi ${res.status}: ${errorText}`,
        timestamp: now,
      };
    } catch (err) {
      return {
        success: false,
        message: `❌ Không thể kết nối: ${err instanceof Error ? err.message : 'Network error'}`,
        timestamp: now,
      };
    }
  }

  async listCharacters(): Promise<STCharacterInfo[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/characters/all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((c: Record<string, unknown>) => ({
          name: String(c.name ?? ''),
          avatar: String(c.avatar ?? ''),
          create_date: String(c.create_date ?? ''),
        }));
      }
      return [];
    } catch {
      return [];
    }
  }

  private async characterExists(name: string): Promise<boolean> {
    const chars = await this.listCharacters();
    return chars.some(c => c.name === name);
  }

  private buildFormData(card: CharacterCardV3, isEdit: boolean): FormData {
    const fd = new FormData();
    // SillyTavern expects JSON string in the body
    const cardJson = JSON.stringify(card);
    const blob = new Blob([cardJson], { type: 'application/json' });
    fd.append('json', blob, `${card.data.name || 'character'}.json`);
    if (isEdit) {
      fd.append('avatar_url', card.avatar || 'none');
    }
    return fd;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. WEBSOCKET ADAPTER — Kết nối WS tới extension bên thứ 3
// Real-time sync, cần extension mở WS server
// ═══════════════════════════════════════════════════════════════════════════

export class WebSocketAdapter implements SyncAdapter {
  readonly name = 'WebSocket';
  private wsUrl: string;
  private ws: WebSocket | null = null;
  private status: SyncConnectionStatus = 'disconnected';
  private autoReconnect: boolean;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private eventHandler: ((event: SyncEvent) => void) | null = null;
  private pendingResolves = new Map<string, (result: SyncResult) => void>();

  constructor(wsUrl: string, autoReconnect = true) {
    this.wsUrl = wsUrl;
    this.autoReconnect = autoReconnect;
  }

  onEvent(handler: (event: SyncEvent) => void): void {
    this.eventHandler = handler;
  }

  private emit(event: SyncEvent): void {
    this.eventHandler?.(event);
  }

  async connect(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.status = 'connecting';
      this.emit({ type: 'message', message: 'Đang kết nối WebSocket...', timestamp: Date.now() });

      try {
        this.ws = new WebSocket(this.wsUrl);

        const timeout = setTimeout(() => {
          this.ws?.close();
          this.status = 'error';
          this.emit({ type: 'error', message: 'Timeout kết nối (5s)', timestamp: Date.now() });
          resolve(false);
        }, 5000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.status = 'connected';
          this.emit({ type: 'connected', message: 'Đã kết nối WebSocket', timestamp: Date.now() });
          resolve(true);
        };

        this.ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(String(ev.data));
            // Xử lý response từ server
            if (msg.id && this.pendingResolves.has(msg.id)) {
              const res: SyncResult = {
                success: msg.success ?? true,
                message: msg.message ?? '✅ OK',
                timestamp: Date.now(),
                characterName: msg.characterName,
              };
              this.pendingResolves.get(msg.id)!(res);
              this.pendingResolves.delete(msg.id);
            }
            this.emit({ type: 'message', message: `← ${JSON.stringify(msg).slice(0, 100)}`, timestamp: Date.now(), data: msg });
          } catch {
            // Non-JSON message — ignore
          }
        };

        this.ws.onerror = () => {
          clearTimeout(timeout);
          this.status = 'error';
          this.emit({ type: 'error', message: 'Lỗi WebSocket', timestamp: Date.now() });
          resolve(false);
        };

        this.ws.onclose = () => {
          this.status = 'disconnected';
          this.emit({ type: 'disconnected', message: 'WebSocket đã đóng', timestamp: Date.now() });
          // Reject all pending
          for (const [id, res] of this.pendingResolves) {
            res({ success: false, message: 'WS disconnected', timestamp: Date.now() });
            this.pendingResolves.delete(id);
          }
          // Auto-reconnect
          if (this.autoReconnect && !this.reconnectTimer) {
            this.reconnectTimer = setTimeout(() => {
              this.reconnectTimer = null;
              this.connect();
            }, 5000);
          }
        };
      } catch {
        this.status = 'error';
        resolve(false);
      }
    });
  }

  disconnect(): void {
    this.autoReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.status = 'disconnected';
  }

  getStatus(): SyncConnectionStatus {
    return this.status;
  }

  async pushCard(card: CharacterCardV3): Promise<SyncResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return { success: false, message: '❌ WebSocket chưa kết nối', timestamp: Date.now() };
    }

    const id = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const message = {
      id,
      type: 'push_card',
      data: card,
    };

    return new Promise<SyncResult>((resolve) => {
      // Timeout 10s
      const timeout = setTimeout(() => {
        this.pendingResolves.delete(id);
        resolve({ success: false, message: '❌ Timeout chờ response (10s)', timestamp: Date.now() });
      }, 10000);

      this.pendingResolves.set(id, (result) => {
        clearTimeout(timeout);
        resolve(result);
      });

      this.ws!.send(JSON.stringify(message));
      this.emit({ type: 'message', message: `→ push_card "${card.data.name}"`, timestamp: Date.now() });
    });
  }

  async listCharacters(): Promise<STCharacterInfo[]> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return [];

    const id = `list_${Date.now()}`;
    const message = { id, type: 'list_characters' };

    return new Promise<STCharacterInfo[]>((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingResolves.delete(id);
        resolve([]);
      }, 5000);

      this.pendingResolves.set(id, (result) => {
        clearTimeout(timeout);
        resolve((result as unknown as { data?: STCharacterInfo[] }).data ?? []);
      });

      this.ws!.send(JSON.stringify(message));
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. PLUGIN ADAPTER — Gọi custom ST Server Plugin endpoint
// Cần cài plugin vào SillyTavern /plugins/
// ═══════════════════════════════════════════════════════════════════════════

export class PluginAdapter implements SyncAdapter {
  readonly name = 'Server Plugin';
  private pluginUrl: string;
  private status: SyncConnectionStatus = 'disconnected';

  constructor(pluginUrl: string) {
    this.pluginUrl = pluginUrl.replace(/\/+$/, '');
  }

  async connect(): Promise<boolean> {
    this.status = 'connecting';
    try {
      const res = await fetch(`${this.pluginUrl}/status`);
      if (res.ok) {
        this.status = 'connected';
        return true;
      }
      this.status = 'error';
      return false;
    } catch {
      this.status = 'error';
      return false;
    }
  }

  disconnect(): void {
    this.status = 'disconnected';
  }

  getStatus(): SyncConnectionStatus {
    return this.status;
  }

  async pushCard(card: CharacterCardV3): Promise<SyncResult> {
    const now = Date.now();
    try {
      const res = await fetch(`${this.pluginUrl}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return {
          success: true,
          message: `✅ Plugin sync "${card.data.name}" thành công`,
          timestamp: now,
          characterName: data.name ?? card.data.name,
        };
      }

      return {
        success: false,
        message: `❌ Plugin error ${res.status}`,
        timestamp: now,
      };
    } catch (err) {
      return {
        success: false,
        message: `❌ Plugin unreachable: ${err instanceof Error ? err.message : 'Error'}`,
        timestamp: now,
      };
    }
  }

  async listCharacters(): Promise<STCharacterInfo[]> {
    try {
      const res = await fetch(`${this.pluginUrl}/characters`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════

import type { SyncMode } from './syncTypes';

export function createAdapter(mode: SyncMode, settings: {
  stBaseUrl: string;
  wsUrl: string;
  pluginUrl: string;
  wsAutoReconnect: boolean;
}): SyncAdapter {
  switch (mode) {
    case 'rest':
      return new RestAdapter(settings.stBaseUrl);
    case 'websocket':
      return new WebSocketAdapter(settings.wsUrl, settings.wsAutoReconnect);
    case 'plugin':
      return new PluginAdapter(settings.pluginUrl);
  }
}
