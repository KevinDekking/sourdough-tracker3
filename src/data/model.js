export const flourTypes = ["ap", "bread", "whole_wheat", "rye", "spelt"];
export const personalities = ["fast", "normal", "slow"];
export const smellOptions = ["neutral", "yeasty", "acidic", "alcoholic", "funky"];
export const textureOptions = ["smooth", "bubbly", "stringy", "dense"];
export const bubbleOptions = ["none", "few", "moderate", "vigorous"];

export function createStarterModel() {
  return {
    globalCorrectionFactor: 1.0,
    correctionHistory: [],
    contextCorrections: {
      flourType: {
        ap: 1.0, bread: 1.0, whole_wheat: 1.0, rye: 1.0, spelt: 1.0,
      },
      temperatureRange: {
        cold: 1.0, cool: 1.0, room: 1.0, warm: 1.0, hot: 1.0,
      },
      hydrationRange: {
        stiff: 1.0, medium: 1.0, wet: 1.0,
      },
    },
    peakSamples:      [],
    feedCount:        0,
    observationCount: 0,
  };
}

export function createStarter({ id, name, personality = "normal" }) {
  return {
    id,
    name,
    personality,
    createdAt:     new Date().toISOString(),
    feeds:         [],
    model:         createStarterModel(),
    schemaVersion: 1,
  };
}

export function createFeed({
  id,
  starterId,
  starterG,
  flourG,
  waterG,
  flourType = "ap",
  temperature,
  timestamp = new Date().toISOString(),
}) {
  return {
    id,
    starterId,
    starterG:    Number(starterG),
    flourG:      Number(flourG),
    waterG:      Number(waterG),
    flourType,
    temperature: Number(temperature),
    timestamp,
    prediction:  null,
    observation: null,
  };
}

export function createObservation({
  feedId,
  timestamp         = new Date().toISOString(),
  risePercent       = 0,
  smell             = "neutral",
  texture           = "smooth",
  bubbles           = "none",
  notes             = "",
  actualPeakMinutes = null,
}) {
  return {
    feedId,
    timestamp,
    risePercent,
    smell,
    texture,
    bubbles,
    notes,
    actualPeakMinutes,
  };
}

export function migrateStarter(starter) {
  if (starter.schemaVersion === 1) return starter;
  return { ...starter, schemaVersion: 1 };
}
