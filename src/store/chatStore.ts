/**
 * Chat store — AI Copilot state
 */

import { create } from 'zustand';
import type { WorldbuildingMode, ChatMessage } from '../types';

export interface ChatBubble {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thought?: string;
  actions?: unknown[];
  timestamp: number;
}

interface ChatState {
  mode: WorldbuildingMode;
  messages: ChatBubble[];
  isRunning: boolean;
  isPaused: boolean;
  isStopped: boolean;
  statusText: string | null;
  autoApply: boolean;
  documentChunks: string[] | null;

  // Internal chat history for API calls
  chatHistory: ChatMessage[];

  // Actions
  setMode: (mode: WorldbuildingMode) => void;
  addMessage: (bubble: Omit<ChatBubble, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  setIsRunning: (running: boolean) => void;
  setPaused: (paused: boolean) => void;
  setStopped: (stopped: boolean) => void;
  setStatusText: (text: string | null) => void;
  setAutoApply: (auto: boolean) => void;
  setDocumentChunks: (chunks: string[] | null) => void;
  appendChatHistory: (msg: ChatMessage) => void;
  resetChatHistory: () => void;
}

let msgCounter = 0;

export const useChatStore = create<ChatState>()((set) => ({
  mode: 'genesis',
  messages: [],
  isRunning: false,
  isPaused: false,
  isStopped: false,
  statusText: null,
  autoApply: false,
  documentChunks: null,
  chatHistory: [],

  setMode: (mode) => set({ mode }),

  addMessage: (bubble) => {
    msgCounter++;
    set(s => ({
      messages: [...s.messages, {
        ...bubble,
        id: `msg-${msgCounter}-${Date.now()}`,
        timestamp: Date.now(),
      }],
    }));
  },

  clearMessages: () => set({ messages: [], chatHistory: [] }),

  setIsRunning: (running) => set({
    isRunning: running,
    ...(running ? { isStopped: false, isPaused: false } : {}),
  }),

  setPaused: (paused) => set({ isPaused: paused }),
  setStopped: (stopped) => set({ isStopped: stopped, isRunning: false }),
  setStatusText: (text) => set({ statusText: text }),
  setAutoApply: (auto) => set({ autoApply: auto }),
  setDocumentChunks: (chunks) => set({ documentChunks: chunks }),

  appendChatHistory: (msg) => set(s => ({
    chatHistory: [...s.chatHistory, msg],
  })),

  resetChatHistory: () => set({ chatHistory: [] }),
}));
