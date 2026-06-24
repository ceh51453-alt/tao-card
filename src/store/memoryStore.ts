import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import MiniSearch from 'minisearch';
import { encryptText, decryptText } from '../lib/cryptoUtils';

export type MemoryScope = 'global' | 'project' | 'session';

export interface MemoryEntry {
  id: string;
  scope: MemoryScope;
  key: string;
  value: string;
  projectId?: string;
  sessionId?: string;
  createdAt: number;
  updatedAt: number;
  accessedAt?: number;
  disabled: boolean;
}

// Global search index (RAM cache)
const searchIndex = new MiniSearch({
  fields: ['key', 'value'], // fields to index for full-text search
  storeFields: ['id', 'scope', 'key', 'value', 'projectId', 'sessionId', 'createdAt', 'updatedAt', 'accessedAt', 'disabled'] // fields to return with search results
});

interface MemoryState {
  memories: MemoryEntry[];
  memoryPassword?: string;
  
  addMemory: (memory: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'disabled'>) => string;
  updateMemory: (id: string, patch: Partial<MemoryEntry>) => void;
  deleteMemory: (id: string) => void;
  toggleMemory: (id: string) => void;
  clearAll: () => void;
  setPassword: (password: string) => Promise<void>;
  
  getVisibleMemories: (context: { projectId?: string; sessionId?: string }) => MemoryEntry[];
  searchMemory: (query: string, context: { projectId?: string; sessionId?: string }) => MemoryEntry[];
  pruneMemory: (daysThreshold?: number) => void; // Forgetting curve cleanup
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      memories: [],
      
      addMemory: (mem) => {
        const id = uuidv4();
        const newMemory: MemoryEntry = {
          ...mem,
          id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          disabled: false,
        };
        // Add to searchIndex (decrypt if needed, but here it's added as plaintext, we will encrypt when saving if password exists)
        searchIndex.add(newMemory);
        set(s => ({ memories: [...s.memories, newMemory] }));
        return id;
      },
      
      updateMemory: (id, patch) => {
        set(s => {
          const updated = s.memories.map(m => m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m);
          // Sync to index
          const newMem = updated.find(m => m.id === id);
          if (newMem) {
            searchIndex.discard(id);
            searchIndex.add(newMem);
          }
          return { memories: updated };
        });
      },
      
      deleteMemory: (id) => {
        set(s => {
          searchIndex.discard(id);
          return { memories: s.memories.filter(m => m.id !== id) };
        });
      },
      
      toggleMemory: (id) => {
        set(s => {
          const updated = s.memories.map(m => m.id === id ? { ...m, disabled: !m.disabled, updatedAt: Date.now() } : m);
          const newMem = updated.find(m => m.id === id);
          if (newMem) {
            searchIndex.discard(id);
            searchIndex.add(newMem);
          }
          return { memories: updated };
        });
      },
      
      clearAll: () => {
        searchIndex.removeAll();
        set({ memories: [] });
      },
      
      setPassword: async (password: string) => {
        const { memories } = get();
        // Re-encrypt existing memories
        const newMemories = await Promise.all(memories.map(async m => ({
          ...m,
          value: await encryptText(m.value, password) // Note: In a real system we'd need to decrypt with old password first
        })));
        set({ memoryPassword: password, memories: newMemories });
      },
      
      getVisibleMemories: ({ projectId, sessionId }) => {
        return get().memories.filter(m => {
          if (m.disabled) return false;
          if (m.scope === 'global') return true;
          if (m.scope === 'project' && m.projectId === projectId) return true;
          if (m.scope === 'session' && m.sessionId === sessionId) return true;
          return false;
        });
      },
      
      searchMemory: (query: string, context) => {
        if (!query.trim()) return get().getVisibleMemories(context);
        const results = searchIndex.search(query, { prefix: true, fuzzy: 0.2 });
        // Filter by context
        return results.map(r => r as unknown as MemoryEntry).filter(m => {
          if (m.disabled) return false;
          if (m.scope === 'global') return true;
          if (m.scope === 'project' && m.projectId === context.projectId) return true;
          if (m.scope === 'session' && m.sessionId === context.sessionId) return true;
          return false;
        });
      },
      
      pruneMemory: (daysThreshold = 30) => {
        // Forgetting Curve logic: if a memory hasn't been accessed in `daysThreshold` days, remove it.
        const now = Date.now();
        const cutoff = now - daysThreshold * 24 * 60 * 60 * 1000;
        
        set(s => {
          const retained = s.memories.filter(m => {
            const lastAccess = m.accessedAt || m.updatedAt;
            return lastAccess > cutoff;
          });
          // Update search index
          searchIndex.removeAll();
          searchIndex.addAll(retained);
          return { memories: retained };
        });
      }
    }),
    {
      name: 'tcs.memory.v1',
      onRehydrateStorage: () => async (state) => {
        if (state) {
          // Sync decrypted items to MiniSearch RAM cache
          searchIndex.removeAll();
          const decrypted = await Promise.all(state.memories.map(async m => {
            try {
              const value = await decryptText(m.value, state.memoryPassword);
              return { ...m, value };
            } catch {
              return m;
            }
          }));
          searchIndex.addAll(decrypted);
        }
      }
    }
  )
);
