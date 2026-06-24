/**
 * src/lib/sync/syncTypes.ts — Types cho SillyTavern Sync Service
 */

/** Chế độ kết nối */
export type SyncMode = 'rest' | 'websocket' | 'plugin';

/** Trạng thái kết nối */
export type SyncConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Cấu hình sync */
export interface SyncSettings {
  mode: SyncMode;
  /** REST API: URL gốc SillyTavern (e.g. http://localhost:8000) */
  stBaseUrl: string;
  /** WebSocket URL (e.g. ws://localhost:5001) */
  wsUrl: string;
  /** Server Plugin endpoint (e.g. http://localhost:8000/api/plugins/card-sync) */
  pluginUrl: string;
  /** Tự động sync khi save */
  autoSync: boolean;
  /** CDN URL cho MVU bundle */
  cdnUrl: string;
  /** Auto-reconnect cho WS mode */
  wsAutoReconnect: boolean;
}

/** Kết quả sync */
export interface SyncResult {
  success: boolean;
  message: string;
  timestamp: number;
  /** Tên nhân vật trong ST (nếu push thành công) */
  characterName?: string;
}

/** Event từ sync service */
export interface SyncEvent {
  type: 'connected' | 'disconnected' | 'error' | 'synced' | 'message';
  message: string;
  timestamp: number;
  data?: unknown;
}

/** Nhân vật trong SillyTavern */
export interface STCharacterInfo {
  name: string;
  avatar: string;
  create_date: string;
}

/** Default settings */
export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  mode: 'rest',
  stBaseUrl: 'http://localhost:8000',
  wsUrl: 'ws://localhost:5001',
  pluginUrl: 'http://localhost:8000/api/plugins/card-sync',
  autoSync: false,
  cdnUrl: 'https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate/artifact/bundle.js',
  wsAutoReconnect: true,
};
