import { create } from 'zustand'
import type { CelebrationPhase } from './timeline'
// Only semantic stages cross into React; the animation clock stays out of store.
export const useCelebrationStore = create<{ sessionId: number | null; phase: CelebrationPhase; reduced: boolean }>(() => ({ sessionId: null, phase: 'idle', reduced: false }))
