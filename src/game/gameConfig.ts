import construction from './constructionConfig.json'

export const GAME_CONFIG = {
  ...construction,
  campaignId: 'ida-2027',
  targetFloors: 15,
  maxLives: 3,
  restartDelayMs: 2500,
  collapseDelayMs: 3500,
  // A connected frame resists a small overturning moment; the base is heavier.
  jointBalanceReserve: 0.6 * (3.72 / 3),
  foundationMass: 4,
  perfectOverlap: 0.94,
  successOverlap: 0.62,
  floorWidth: 3.72,
  floorDepth: 3.22,
  floorHeight: 1.35,
  baseHeight: 1.35,
  dropHeight: 3.9,
  gravity: -12,
  supportThickness: 0.12,
  successDelayMs: 650,
  retryDelayMs: 750,
  floorTimeoutSeconds: 4,
  swingSpeed: 1.175,
  swingAmplitude: 1.75 * (3.72 / 3),
  swingPhase: Math.PI / 2,
} as const
