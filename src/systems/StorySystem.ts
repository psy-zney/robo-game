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
}

const DEFAULT_STORY: DayStory = {
  title: 'Calibration',
  mission: 'RUN DIAGNOSTICS. SWEEP ANY LOOSE DUST.',
  introStatus: 'NEW SHIFT: RUNNING BASELINE CLEAN PROTOCOL.',
  dustColor: 0xcccccc,
};

const DAY_STORIES: Record<number, DayStory> = {
  1: {
    title: 'Boot-Up',
    mission: 'FIRST DAY IN THE HOUSE. CLEAR LIGHT DUST.',
    introStatus: 'DAY 1 ONLINE. SENSOR ARRAY CALIBRATING...',
    dustColor: 0xcccccc,
    dirtWeights: { Dust: 1.2, 'Thick Dust': 0.6 },
  },
  2: {
    title: 'Coffee Incident',
    mission: 'OWNER IS IN A RUSH. MOP COFFEE SPILLS.',
    introStatus: 'ALERT: KITCHEN ZONE REPORTS NEW LIQUID HAZARD.',
    dustColor: 0xb8b8b8,
    dirtWeights: { 'Coffee Spill': 1.6, Dust: 0.8, 'Thick Dust': 0.7 },
  },
  3: {
    title: 'Late-Night Mystery',
    mission: 'SOMETHING DRIPPED. CLEAN STUBBORN STAINS.',
    introStatus: 'ANOMALY DETECTED. VISUAL RESIDUE ON FLOOR SURFACES.',
    dustColor: 0xa0a0a0,
    dirtWeights: { 'Blood Stain': 1.3, 'Coffee Spill': 0.8, 'Thick Dust': 0.9 },
  },
  4: {
    title: 'Mud Tracks',
    mission: 'TRACKS EVERYWHERE. SWEEP THEN MOP THE MESS.',
    introStatus: 'EXTERNAL CONTAMINATION: PARTICULATE + MOISTURE MIX.',
    dustColor: 0x9aa6b2,
    dirtWeights: { 'Stubborn Dirt': 1.6, Dust: 0.6, 'Thick Dust': 0.6 },
  },
  5: {
    title: 'Grime Build-Up',
    mission: 'DEEP CLEAN DAY. HEAVY GRIME REQUIRES MULTI-STEPS.',
    introStatus: 'MAINTENANCE ESCALATION: SURFACE FILM THICKENING.',
    dustColor: 0x8f9aa6,
    dirtWeights: { 'Heavy Grime': 1.8, 'Stubborn Dirt': 1.0, 'Thick Dust': 0.7 },
  },
};

export function getDayStory(day: number): DayStory {
  if (DAY_STORIES[day]) return DAY_STORIES[day];
  // After day 5: keep escalation but rotate tone a bit
  const tier = Math.min(3, Math.floor((day - 1) / 2));
  const titles = ['Routine', 'Overflow', 'Containment'];
  const missions = [
    'KEEP UP WITH THE MESS. PRIORITIZE QUICK CLEAN.',
    'STORAGE STRESS TEST. CLEAN FAST, CHARGE OFTEN.',
    'SYSTEM UNDER LOAD. AVOID HUSKY AND FINISH THE JOB.',
  ];
  const intros = [
    'NEW SHIFT: STANDARD CLEAN CYCLE.',
    'ALERT: HIGH DEBRIS VOLUME DETECTED.',
    'WARNING: HOUSEHOLD THREATS INCREASED.',
  ];
  const dustColors = [0x9aa0a6, 0x7f8c8d, 0x6c7a89];

  return {
    ...DEFAULT_STORY,
    title: titles[tier] ?? DEFAULT_STORY.title,
    mission: missions[tier] ?? DEFAULT_STORY.mission,
    introStatus: intros[tier] ?? DEFAULT_STORY.introStatus,
    dustColor: dustColors[tier] ?? DEFAULT_STORY.dustColor,
    dirtWeights: tier >= 2 ? { 'Heavy Grime': 1.2, 'Stubborn Dirt': 1.0, 'Blood Stain': 0.9 } : undefined,
  };
}

