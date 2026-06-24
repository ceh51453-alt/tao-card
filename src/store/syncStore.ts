/**
 * src/store/syncStore.ts — Zustand store cho SillyTavern Sync
 */

import { create } from 'zustand';
import { tavernSync } from '../lib/sync/tavernSyncService';
import type { SyncSettings, SyncConnectionStatus, SyncResult, SyncEvent } from '../lib/sync/syncTypes';
import type { CharacterCardV3 } from '../types/card.types';

interface SyncState {
  // Status
  status: SyncConnectionStatus;
  lastSync: SyncResult | null;
  log: SyncEvent[];
  isSyncing: boolean;

  // Settings (mirrors service)
  settings: SyncSettings;

  // Actions
  updateSettings: (patch: Partial<SyncSettings>) => void;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  syncNow: (card: CharacterCardV3) => Promise<SyncResult>;
  refreshStatus: () => void;
  clearLog: () => void;
}

export const useSyncStore = create<SyncState>((set) => {
  // Listen to service events
  tavernSync.addEventListener((event) => {
    set({
      status: tavernSync.getStatus(),
      log: tavernSync.getLog(),
    });

    if (event.type === 'synced' || event.type === 'error') {
      set({ isSyncing: false });
    }
  });

  return {
    status: tavernSync.getStatus(),
    lastSync: null,
    log: tavernSync.getLog(),
    isSyncing: false,
    settings: tavernSync.getSettings(),

    updateSettings: (patch) => {
      tavernSync.updateSettings(patch);
      set({ settings: tavernSync.getSettings() });
    },

    connect: async () => {
      const ok = await tavernSync.connect();
      set({ status: tavernSync.getStatus(), log: tavernSync.getLog() });
      return ok;
    },

    disconnect: () => {
      tavernSync.disconnect();
      set({ status: 'disconnected', log: tavernSync.getLog() });
    },

    syncNow: async (card) => {
      set({ isSyncing: true });
      const result = await tavernSync.pushCard(card);
      set({
        isSyncing: false,
        lastSync: result,
        status: tavernSync.getStatus(),
        log: tavernSync.getLog(),
      });
      return result;
    },

    refreshStatus: () => {
      set({ status: tavernSync.getStatus(), log: tavernSync.getLog() });
    },

    clearLog: () => {
      tavernSync.clearLog();
      set({ log: [] });
    },
  };
});
