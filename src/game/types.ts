export type GameState = 'loading' | 'intro' | 'tutorial' | 'playing' | 'celebration' | 'greeting' | 'error'
export const isFinalState = (state: GameState) => state === 'celebration' || state === 'greeting'
export type FloorPhase = 'swinging' | 'falling' | 'perfect' | 'success' | 'fail' | 'collapse'
export type LandingResult = 'perfect' | 'success' | 'fail'
export type PerformanceMode = 'high' | 'medium' | 'low'
export interface PlacedFloor { id: number; x: number; y: number; perfect: boolean }
export interface TelegramUser { id: number; firstName: string; lastName?: string }
export interface Feedback { result: LandingResult; attemptId: number; createdAt: number }
