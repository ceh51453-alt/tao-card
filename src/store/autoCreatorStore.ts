import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  AutoCreatorConfig,
  AutoCreatorStep,
  PipelineLog,
  StepStatus,
  StepPreview,
  CardBlueprint,
} from '../types';

interface AutoCreatorState {
  // Config
  config: AutoCreatorConfig;

  // Pipeline state
  isRunning: boolean;
  isPaused: boolean;
  currentStep: AutoCreatorStep | null;
  stepStatuses: Record<AutoCreatorStep, StepStatus>;
  logs: PipelineLog[];

  // v3: Blueprint
  blueprint: CardBlueprint | null;
  isBlueprintLoading: boolean;

  // v3: Step previews
  stepPreviews: Record<AutoCreatorStep, StepPreview | null>;

  // Step results (summary text)
  stepResults: Record<AutoCreatorStep, string>;

  // Actions — Config
  setIdea: (idea: string) => void;
  toggleStep: (step: AutoCreatorStep) => void;
  reorderSteps: (newOrder: AutoCreatorStep[]) => void;
  updateStepConfig: <K extends keyof AutoCreatorConfig['stepConfigs']>(
    step: K,
    patch: Partial<AutoCreatorConfig['stepConfigs'][K]>
  ) => void;
  setAutoApplyAll: (v: boolean) => void;
  applyPreset: (presetConfig: Partial<AutoCreatorConfig>) => void;
  
  // Actions — Pipeline control
  setIsRunning: (running: boolean) => void;
  setPaused: (paused: boolean) => void;
  setCurrentStep: (step: AutoCreatorStep | null) => void;
  setStepStatus: (step: AutoCreatorStep, status: StepStatus) => void;
  setStepResult: (step: AutoCreatorStep, result: string) => void;
  addLog: (log: Omit<PipelineLog, 'id' | 'timestamp'>) => void;
  resetPipeline: () => void;

  // v3: Blueprint
  setBlueprint: (bp: CardBlueprint | null) => void;
  setBlueprintLoading: (v: boolean) => void;

  // v3: Step previews
  setStepPreview: (step: AutoCreatorStep, preview: StepPreview | null) => void;
  clearAllPreviews: () => void;
}

const ALL_STEPS: AutoCreatorStep[] = [
  'basic_info', 'lorebook', 'regex', 'mvuzod', 'system_prompt', 'first_message', 'mes_example'
];

const DEFAULT_STEPS: AutoCreatorStep[] = [...ALL_STEPS];

const emptyStatuses = (): Record<AutoCreatorStep, StepStatus> => ({
  basic_info: 'pending', lorebook: 'pending', regex: 'pending',
  mvuzod: 'pending', system_prompt: 'pending', first_message: 'pending', mes_example: 'pending'
});

const emptyResults = (): Record<AutoCreatorStep, string> => ({
  basic_info: '', lorebook: '', regex: '',
  mvuzod: '', system_prompt: '', first_message: '', mes_example: ''
});

const emptyPreviews = (): Record<AutoCreatorStep, StepPreview | null> => ({
  basic_info: null, lorebook: null, regex: null,
  mvuzod: null, system_prompt: null, first_message: null, mes_example: null
});

export const useAutoCreatorStore = create<AutoCreatorState>((set) => ({
  config: {
    idea: '',
    selectedSteps: [...DEFAULT_STEPS],
    autoApplyAll: true,
    stepConfigs: {
      basic_info: { includePersonality: true, includeScenario: true, language: 'vi', promptMode: 'default' },
      lorebook: { totalEntries: 20, entriesPerBatch: 5, concurrentBatches: 1, category: 'custom', cardType: 'single', useWebSearch: false, promptMode: 'default' },
      regex: { count: 3, types: ['dialog', 'cleanup', 'style'], promptMode: 'default' },
      mvuzod: { autoDetect: true, createInitVar: true, createVarList: true, createUpdateRules: true, promptMode: 'default' },
      system_prompt: { includeDepthPrompt: true, depthValue: 4, promptMode: 'default' },
      first_message: { alternateGreetings: 2, promptMode: 'default' },
      mes_example: { exampleCount: 2, promptMode: 'default' },
    },
  },

  isRunning: false,
  isPaused: false,
  currentStep: null,
  stepStatuses: emptyStatuses(),
  logs: [],
  stepResults: emptyResults(),
  
  // v3
  blueprint: null,
  isBlueprintLoading: false,
  stepPreviews: emptyPreviews(),

  // ─── Config actions ───
  setIdea: (idea) => set((s) => ({ config: { ...s.config, idea } })),
  
  toggleStep: (step) => set((s) => {
    const isSelected = s.config.selectedSteps.includes(step);
    const selectedSteps = isSelected
      ? s.config.selectedSteps.filter(st => st !== step)
      : [...s.config.selectedSteps, step].sort((a, b) => ALL_STEPS.indexOf(a) - ALL_STEPS.indexOf(b));
    return { config: { ...s.config, selectedSteps } };
  }),

  reorderSteps: (newOrder) => set((s) => ({
    config: { ...s.config, selectedSteps: newOrder }
  })),

  updateStepConfig: (step, patch) => set((s) => ({
    config: {
      ...s.config,
      stepConfigs: {
        ...s.config.stepConfigs,
        [step]: { ...s.config.stepConfigs[step], ...patch }
      }
    }
  })),

  setAutoApplyAll: (autoApplyAll) => set((s) => ({ config: { ...s.config, autoApplyAll } })),

  applyPreset: (presetConfig) => set((s) => {
    const merged = { ...s.config };
    if (presetConfig.selectedSteps) merged.selectedSteps = presetConfig.selectedSteps;
    if (presetConfig.stepConfigs) {
      merged.stepConfigs = {
        ...merged.stepConfigs,
        ...presetConfig.stepConfigs,
      };
    }
    if (presetConfig.presetId !== undefined) merged.presetId = presetConfig.presetId;
    return { config: merged };
  }),

  // ─── Pipeline control ───
  setIsRunning: (isRunning) => set({ isRunning }),
  setPaused: (isPaused) => set({ isPaused }),
  setCurrentStep: (currentStep) => set({ currentStep }),
  setStepStatus: (step, status) => set((s) => ({
    stepStatuses: { ...s.stepStatuses, [step]: status }
  })),
  setStepResult: (step, result) => set((s) => ({
    stepResults: { ...s.stepResults, [step]: result }
  })),
  addLog: (log) => set((s) => ({
    logs: [...s.logs, { ...log, id: uuidv4(), timestamp: Date.now() }]
  })),
  resetPipeline: () => set(() => ({
    isRunning: false,
    isPaused: false,
    currentStep: null,
    stepStatuses: emptyStatuses(),
    logs: [],
    stepResults: emptyResults(),
    stepPreviews: emptyPreviews(),
    blueprint: null,
  })),

  // ─── v3: Blueprint ───
  setBlueprint: (blueprint) => set({ blueprint }),
  setBlueprintLoading: (isBlueprintLoading) => set({ isBlueprintLoading }),

  // ─── v3: Previews ───
  setStepPreview: (step, preview) => set((s) => ({
    stepPreviews: { ...s.stepPreviews, [step]: preview }
  })),
  clearAllPreviews: () => set({ stepPreviews: emptyPreviews() }),
}));
