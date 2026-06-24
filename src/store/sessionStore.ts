import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { CopilotMessage } from '../lib/ai/copilotTypes';
import type { ChatMessage } from '../types';

export interface ChatSession {
  id: string;
  projectId: string;
  name: string;
  messages: CopilotMessage[];
  chatHistory: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface SessionState {
  sessions: ChatSession[];
  
  createSession: (projectId: string, name?: string) => string;
  deleteSession: (id: string) => void;
  updateSessionName: (id: string, name: string) => void;
  
  saveSessionState: (id: string, messages: CopilotMessage[], chatHistory: ChatMessage[]) => void;
  getSession: (id: string) => ChatSession | undefined;
  getProjectSessions: (projectId: string) => ChatSession[];
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      
      createSession: (projectId, name) => {
        const id = uuidv4();
        const newSession: ChatSession = {
          id,
          projectId,
          name: name || `Phiên ${new Date().toLocaleTimeString()}`,
          messages: [],
          chatHistory: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set(s => ({ sessions: [...s.sessions, newSession] }));
        return id;
      },
      
      deleteSession: (id) => {
        set(s => ({ sessions: s.sessions.filter(ss => ss.id !== id) }));
      },
      
      updateSessionName: (id, name) => {
        set(s => ({
          sessions: s.sessions.map(ss => ss.id === id ? { ...ss, name, updatedAt: Date.now() } : ss)
        }));
      },
      
      saveSessionState: (id, messages, chatHistory) => {
        set(s => ({
          sessions: s.sessions.map(ss => ss.id === id ? { ...ss, messages, chatHistory, updatedAt: Date.now() } : ss)
        }));
      },
      
      getSession: (id) => get().sessions.find(ss => ss.id === id),
      getProjectSessions: (projectId) => get().sessions.filter(ss => ss.projectId === projectId).sort((a, b) => b.updatedAt - a.updatedAt),
    }),
    {
      name: 'tcs.sessions.v1',
    }
  )
);
