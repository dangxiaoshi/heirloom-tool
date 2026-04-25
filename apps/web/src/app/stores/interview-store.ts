import { create } from "zustand";

type InterviewState = {
  currentSessionId?: string;
  setCurrentSessionId: (sessionId: string) => void;
};

export const useInterviewStore = create<InterviewState>((set) => ({
  currentSessionId: undefined,
  setCurrentSessionId: (currentSessionId) => set({ currentSessionId }),
}));
