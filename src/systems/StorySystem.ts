export type DirtWeightMap = Record<string, number>;

export interface DayStory {
  /** Short title shown near Day counter */
  title: string;
  /** One-line mission shown on HUD */
  mission: string;
  /** Temporary status line shown when the day starts */
  introStatus: string;
  /** Dust particle tint for the day */
  dustColor: number;
  /** Optional weighting by DirtConfig.name */
  dirtWeights?: DirtWeightMap;
  /** Difficulty multiplier (1.0 = normal) */
  difficultyMultiplier?: number;
  /** Special events or modifiers for the day */
  specialEvents?: string[];
}

const DEFAULT_STORY: DayStory = {
  title: 'Calibration',
  mission: 'RUN DIAGNOSTICS. SWEEP ANY LOOSE DUST.',
  introStatus: 'NEW SHIFT: RUNNING BASELINE CLEAN PROTOCOL.',
  dustColor: 0xcccccc,
  difficultyMultiplier: 1.0,
};

const DAY_STORIES: Record<number, DayStory> = {
  1: {
    title: 'Boot-Up',
    mission: 'FIRST DAY IN THE HOUSE. CLEAR LIGHT DUST.',
    introStatus: 'DAY 1 ONLINE. SENSOR ARRAY CALIBRATING...',
    dustColor: 0xcccccc,
    dirtWeights: { Dust: 1.2, 'Thick Dust': 0.6 },
    difficultyMultiplier: 0.8, // Easier start
  },
  2: {
    title: 'Coffee Incident',
    mission: 'OWNER IS IN A RUSH. MOP COFFEE SPILLS.',
    introStatus: 'ALERT: KITCHEN ZONE REPORTS NEW LIQUID HAZARD.',
    dustColor: 0xb8b8b8,
    dirtWeights: { 'Coffee Spill': 1.6, Dust: 0.8, 'Thick Dust': 0.7 },
    difficultyMultiplier: 1.0,
  },
  3: {
    title: 'Late-Night Mystery',
    mission: 'SOMETHING DRIPPED. CLEAN STICKY SAUCE STAINS.',
    introStatus: 'ANOMALY DETECTED. RED RESIDUE ON FLOOR SURFACES.',
    dustColor: 0xa0a0a0,
    dirtWeights: { 'Sauce Stain': 1.3, 'Coffee Spill': 0.8, 'Thick Dust': 0.9 },
    difficultyMultiplier: 1.2,
  },
  4: {
    title: 'Mud Tracks',
    mission: 'TRACKS EVERYWHERE. SWEEP THEN MOP THE MESS.',
    introStatus: 'EXTERNAL CONTAMINATION: PARTICULATE + MOISTURE MIX.',
    dustColor: 0x9aa6b2,
    dirtWeights: { 'Stubborn Dirt': 1.6, Dust: 0.6, 'Thick Dust': 0.6 },
    difficultyMultiplier: 1.3,
  },
  5: {
    title: 'Grime Build-Up',
    mission: 'DEEP CLEAN DAY. HEAVY GRIME REQUIRES MULTI-STEPS.',
    introStatus: 'MAINTENANCE ESCALATION: SURFACE FILM THICKENING.',
    dustColor: 0x8f9aa6,
    dirtWeights: { 'Heavy Grime': 1.8, 'Stubborn Dirt': 1.0, 'Thick Dust': 0.7 },
    difficultyMultiplier: 1.5,
  },
  6: {
    title: 'Pet Chaos',
    mission: 'HUSKY GOT INTO EVERYTHING. CLEAN UP THE MESS.',
    introStatus: 'ANIMAL CONTAINMENT BREACH. MULTIPLE HAZARDS DETECTED.',
    dustColor: 0x8a8a8a,
    dirtWeights: { 'Heavy Grime': 1.4, 'Stubborn Dirt': 1.2, 'Sauce Stain': 0.8, 'Coffee Spill': 0.6 },
    difficultyMultiplier: 1.6,
    specialEvents: ['husky_aggressive'],
  },
  7: {
    title: 'Party Aftermath',
    mission: 'GUESTS LEFT A MESS. PRIORITIZE LIQUID SPILLS.',
    introStatus: 'SOCIAL GATHERING DEBRIS. ALCOHOL AND FOOD RESIDUE.',
    dustColor: 0x7a7a7a,
    dirtWeights: { 'Coffee Spill': 2.0, 'Heavy Grime': 1.2, 'Stubborn Dirt': 0.8 },
    difficultyMultiplier: 1.7,
  },
  8: {
    title: 'Renovation Dust',
    mission: 'CONSTRUCTION WORK LEFT DUST EVERYWHERE.',
    introStatus: 'PARTICULATE MATTER ALERT. RESPIRATORY HAZARDS.',
    dustColor: 0x6a6a6a,
    dirtWeights: { 'Thick Dust': 2.2, Dust: 1.5, 'Stubborn Dirt': 0.5 },
    difficultyMultiplier: 1.8,
  },
  9: {
    title: 'Storm Damage',
    mission: 'WINDOW LEAK AND MUD EVERYWHERE. EMERGENCY CLEAN.',
    introStatus: 'WEATHER RELATED CONTAMINATION. WATER DAMAGE DETECTED.',
    dustColor: 0x5a5a5a,
    dirtWeights: { 'Heavy Grime': 1.8, 'Stubborn Dirt': 1.5, 'Coffee Spill': 1.2 },
    difficultyMultiplier: 1.9,
    specialEvents: ['reduced_battery'],
  },
  10: {
    title: 'Final Test',
    mission: 'MASTER CHALLENGE. EVERY TYPE OF MESS AT ONCE.',
    introStatus: 'COMPREHENSIVE EVALUATION. ALL SYSTEMS STRESSED.',
    dustColor: 0x4a4a4a,
    dirtWeights: {
      'Heavy Grime': 1.5,
      'Stubborn Dirt': 1.3,
      'Sauce Stain': 1.0,
      'Coffee Spill': 1.0,
      'Thick Dust': 0.8,
      Dust: 0.5
    },
    difficultyMultiplier: 2.0,
    specialEvents: ['husky_aggressive', 'reduced_battery'],
  },
};

export function getDayStory(day: number): DayStory {
  if (DAY_STORIES[day]) return DAY_STORIES[day];

  // Procedural generation for days beyond 10
  return generateProceduralStory(day);
}

function generateProceduralStory(day: number): DayStory {
  // Calculate progression tier (cycles every 5 days after day 10)
  const tier = ((day - 11) % 5);

  const titles = [
    'Routine Maintenance',
    'Heavy Duty Cycle',
    'Deep Clean Protocol',
    'Emergency Response',
    'System Overload'
  ];

  const missions = [
    'STANDARD CLEANING CYCLE. MAINTAIN EFFICIENCY.',
    'INCREASED CONTAMINATION. OPTIMIZE CLEANING ROUTES.',
    'CRITICAL FILM BUILDUP. AGGRESSIVE CLEANING REQUIRED.',
    'MULTIPLE HAZARD TYPES. ADAPT CLEANING STRATEGY.',
    'MAXIMUM CAPACITY TEST. SURVIVE THE CHAOS.'
  ];

  const intros = [
    'NEW SHIFT: STANDARD OPERATING PROCEDURE.',
    'ALERT: ELEVATED DEBRIS LEVELS DETECTED.',
    'WARNING: SURFACE DEGRADATION ACCELERATING.',
    'CRITICAL: MULTIPLE CONTAMINATION SOURCES.',
    'EMERGENCY: SYSTEM STRESS TEST INITIATED.'
  ];

  const dustColors = [0x9aa0a6, 0x7f8c8d, 0x6c7a89, 0x5a6a7a, 0x4a5a6a];

  // Progressive difficulty scaling
  const baseDifficulty = 2.0 + Math.floor((day - 10) / 5) * 0.3;
  const difficultyMultiplier = Math.min(3.0, baseDifficulty);

  // Progressive dirt weights
  let dirtWeights: DirtWeightMap | undefined;
  if (tier >= 2) {
    dirtWeights = {
      'Heavy Grime': 1.2 + tier * 0.2,
      'Stubborn Dirt': 1.0 + tier * 0.15,
      'Sauce Stain': 0.8 + tier * 0.1,
      'Coffee Spill': 0.8 + tier * 0.1,
      'Thick Dust': 0.6 + tier * 0.05,
    };
  }

  // Special events for later days
  const specialEvents: string[] = [];
  if (day >= 15 && day % 3 === 0) {
    specialEvents.push('husky_aggressive');
  }
  if (day >= 20 && day % 4 === 0) {
    specialEvents.push('reduced_battery');
  }

  return {
    ...DEFAULT_STORY,
    title: titles[tier],
    mission: missions[tier],
    introStatus: intros[tier],
    dustColor: dustColors[tier],
    difficultyMultiplier,
    dirtWeights,
    specialEvents,
  };
}

export function getDifficultyMultiplier(day: number): number {
  const story = getDayStory(day);
  return story.difficultyMultiplier || 1.0;
}

export function hasSpecialEvent(day: number, event: string): boolean {
  const story = getDayStory(day);
  return story.specialEvents?.includes(event) || false;
}
