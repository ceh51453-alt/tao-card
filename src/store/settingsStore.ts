import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { ProxyProfile, GenerationParams } from '../types';
import { DEFAULT_GENERATION_PARAMS } from '../types';
import { DEFAULT_STEPS, DEFAULT_MASTER_INSTRUCTION } from '../lib/ai/worldbuildingDefaults';

interface SettingsState {
  profiles: ProxyProfile[];
  activeProfileId: string | null;
  generationParams: GenerationParams;
  keepKeyOnlyInSession: boolean;

  // Actions
  addProfile: (label: string, providerType: ProxyProfile['providerType']) => string;
  updateProfile: (id: string, patch: Partial<ProxyProfile>) => void;
  deleteProfile: (id: string) => void;
  duplicateProfile: (id: string) => string | null;
  setActiveProfile: (id: string) => void;
  setGenerationParams: (patch: Partial<GenerationParams>) => void;
  getActiveProfile: () => ProxyProfile | undefined;
  restoreDefaultSteps: (id: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,
      generationParams: { ...DEFAULT_GENERATION_PARAMS },
      keepKeyOnlyInSession: false,

      addProfile: (label, providerType) => {
        const id = uuidv4();
        const profile: ProxyProfile = {
          id,
          label,
          providerType,
          baseUrl: '',
          apiKey: '',
          customHeaders: [],
          selectedModel: '',
          cachedModels: [],
          cachedModelsAt: null,
          supportsNativeToolCalling: null,
          steps: structuredClone(DEFAULT_STEPS),
          masterInstruction: DEFAULT_MASTER_INSTRUCTION,
          semanticDedup: true,
          enableGoogleSearchGrounding: false,
          enableWebScraperFallback: false,
          webSearchProxyUrl: 'https://corsproxy.io/?',
        };
        set(s => ({
          profiles: [...s.profiles, profile],
          activeProfileId: s.activeProfileId ?? id,
        }));
        return id;
      },

      updateProfile: (id, patch) => {
        set(s => ({
          profiles: s.profiles.map(p =>
            p.id === id ? { ...p, ...patch } : p
          ),
        }));
      },

      deleteProfile: (id) => {
        set(s => {
          const filtered = s.profiles.filter(p => p.id !== id);
          return {
            profiles: filtered,
            activeProfileId: s.activeProfileId === id
              ? (filtered[0]?.id ?? null)
              : s.activeProfileId,
          };
        });
      },

      duplicateProfile: (id) => {
        const original = get().profiles.find(p => p.id === id);
        if (!original) return null;
        const newId = uuidv4();
        const copy: ProxyProfile = {
          ...structuredClone(original),
          id: newId,
          label: `${original.label} (Copy)`,
        };
        set(s => ({ profiles: [...s.profiles, copy] }));
        return newId;
      },

      setActiveProfile: (id) => set({ activeProfileId: id }),

      setGenerationParams: (patch) => {
        set(s => ({
          generationParams: { ...s.generationParams, ...patch },
        }));
      },

      getActiveProfile: () => {
        const s = get();
        return s.profiles.find(p => p.id === s.activeProfileId);
      },

      restoreDefaultSteps: (id) => {
        set(s => ({
          profiles: s.profiles.map(p =>
            p.id === id ? { ...p, steps: structuredClone(DEFAULT_STEPS) } : p
          ),
        }));
      },
    }),
    {
      name: 'tcs.settings.v1',
      partialize: (state) => ({
        profiles: state.keepKeyOnlyInSession
          ? state.profiles.map(p => ({ ...p, apiKey: '' }))
          : state.profiles,
        activeProfileId: state.activeProfileId,
        generationParams: state.generationParams,
        keepKeyOnlyInSession: state.keepKeyOnlyInSession,
      }),
    }
  )
);

// Auto migration for existing profiles in storage
const migrateOldProfiles = () => {
  const store = useSettingsStore.getState();
  let changed = false;
  const migrated = store.profiles.map(p => {
    let pChanged = false;
    const patch: Partial<ProxyProfile> = {};
    if (!p.steps) {
      patch.steps = structuredClone(DEFAULT_STEPS);
      pChanged = true;
    }
    if (p.masterInstruction === undefined) {
      patch.masterInstruction = DEFAULT_MASTER_INSTRUCTION;
      pChanged = true;
    }
    if (p.semanticDedup === undefined) {
      patch.semanticDedup = true;
      pChanged = true;
    }
    if (p.enableGoogleSearchGrounding === undefined) {
      patch.enableGoogleSearchGrounding = false;
      patch.enableWebScraperFallback = false;
      patch.webSearchProxyUrl = 'https://corsproxy.io/?';
      pChanged = true;
    }
    if (pChanged) {
      changed = true;
      return { ...p, ...patch };
    }
    return p;
  });
  if (changed) {
    useSettingsStore.setState({ profiles: migrated });
  }
};

if (typeof window !== 'undefined') {
  setTimeout(migrateOldProfiles, 0);
}
