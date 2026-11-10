export type CareerProfile = {
  schemaVersion: 2;
  legacyRuns: number;
  expeditions: number;
  successfulExtractions: number;
  failedExpeditions: number;
  totalSectors: number;
  totalKills: number;
  totalDistance: number;
  bestScore: number;
  bestFlow: number;
  bestSpeed: number;
  bossesDefeated: number;
  dataShards: number;
  researchPoints: number;
  unlockedRegions: string[];
  unlockedModules: string[];
  achievements: Record<string, number>;
  lastDailySeed: string;
};

const STORAGE_KEY = 'flowstate-career-v2';
const LEGACY_KEY = 'flowstate-career-v1';

const DEFAULT_PROFILE: CareerProfile = {
  schemaVersion: 2,
  legacyRuns: 0,
  expeditions: 0,
  successfulExtractions: 0,
  failedExpeditions: 0,
  totalSectors: 0,
  totalKills: 0,
  totalDistance: 0,
  bestScore: 0,
  bestFlow: 1,
  bestSpeed: 0,
  bossesDefeated: 0,
  dataShards: 0,
  researchPoints: 0,
  unlockedRegions: ['industrial'],
  unlockedModules: [],
  achievements: {},
  lastDailySeed: '',
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback;
}

function migrateLegacy(raw: Record<string, unknown>): CareerProfile {
  return {
    ...DEFAULT_PROFILE,
    legacyRuns: finite(raw.runs, 0),
    totalKills: finite(raw.kills, 0),
    totalDistance: finite(raw.distance, 0),
    bestScore: finite(raw.highestScore, 0),
    totalSectors: finite(raw.highestStage, 0),
    bestFlow: Math.max(1, finite(raw.longestCombo, 1)),
    bestSpeed: finite(raw.highestSpeed, 0),
    bossesDefeated: finite(raw.bossesDefeated, 0),
  };
}

function normalize(raw: Partial<CareerProfile>): CareerProfile {
  return {
    ...DEFAULT_PROFILE,
    ...raw,
    schemaVersion: 2,
    legacyRuns: finite(raw.legacyRuns, 0),
    expeditions: finite(raw.expeditions, 0),
    successfulExtractions: finite(raw.successfulExtractions, 0),
    failedExpeditions: finite(raw.failedExpeditions, 0),
    totalSectors: finite(raw.totalSectors, 0),
    totalKills: finite(raw.totalKills, 0),
    totalDistance: finite(raw.totalDistance, 0),
    bestScore: finite(raw.bestScore, 0),
    bestFlow: Math.max(1, finite(raw.bestFlow, 1)),
    bestSpeed: finite(raw.bestSpeed, 0),
    bossesDefeated: finite(raw.bossesDefeated, 0),
    dataShards: finite(raw.dataShards, 0),
    researchPoints: finite(raw.researchPoints, 0),
    unlockedRegions: Array.isArray(raw.unlockedRegions)
      ? [...new Set(raw.unlockedRegions.filter((v): v is string => typeof v === 'string'))]
      : ['industrial'],
    unlockedModules: Array.isArray(raw.unlockedModules)
      ? [...new Set(raw.unlockedModules.filter((v): v is string => typeof v === 'string'))]
      : [],
    achievements: raw.achievements && typeof raw.achievements === 'object' ? raw.achievements : {},
    lastDailySeed: typeof raw.lastDailySeed === 'string' ? raw.lastDailySeed : '',
  };
}

export function loadCareer(): CareerProfile {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return normalize(JSON.parse(current) as Partial<CareerProfile>);
    const legacy = localStorage.getItem(LEGACY_KEY);
    const migrated = legacy ? migrateLegacy(JSON.parse(legacy) as Record<string, unknown>) : { ...DEFAULT_PROFILE };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return { ...DEFAULT_PROFILE, unlockedRegions: ['industrial'], unlockedModules: [], achievements: {} };
  }
}

export function saveCareer(profile: CareerProfile): CareerProfile {
  const normalized = normalize(profile);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Keep the active session playable if browser storage is unavailable or full.
  }
  return normalized;
}

export function updateCareer(
  current: CareerProfile,
  update: (draft: CareerProfile) => void,
): CareerProfile {
  const draft: CareerProfile = {
    ...current,
    unlockedRegions: [...current.unlockedRegions],
    unlockedModules: [...current.unlockedModules],
    achievements: { ...current.achievements },
  };
  update(draft);
  return saveCareer(draft);
}

export function recordLegacyRun(
  current: CareerProfile,
  result: { sectors: number; score: number; kills: number; distance: number; bestFlow: number; bestSpeed: number },
): CareerProfile {
  return updateCareer(current, draft => {
    draft.legacyRuns += 1;
    draft.totalSectors = Math.max(draft.totalSectors, result.sectors);
    draft.bestScore = Math.max(draft.bestScore, result.score);
    draft.totalKills += result.kills;
    draft.totalDistance += Math.floor(result.distance);
    draft.bestFlow = Math.max(draft.bestFlow, result.bestFlow);
    draft.bestSpeed = Math.max(draft.bestSpeed, result.bestSpeed);
  });
}

export function getDailySeed(date = new Date()): string {
  const day = date.toISOString().slice(0, 10);
  let hash = 2166136261;
  for (let i = 0; i < day.length; i++) {
    hash ^= day.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return 'F-' + (hash >>> 0).toString(36).toUpperCase().padStart(7, '0');
}

export function formatCareerDistance(meters: number): string {
  return meters >= 1000 ? (meters / 1000).toFixed(1) + ' km' : Math.floor(meters) + ' m';
}
