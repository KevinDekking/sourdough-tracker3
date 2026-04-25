import { getWeightedCorrection } from "./learning.js";

const PERSONALITY_MULTIPLIER = {
  fast:   0.8,
  normal: 1.0,
  slow:   1.2,
};

const FLOUR_MULTIPLIER = {
  ap:          1.0,
  bread:       0.95,
  whole_wheat: 0.85,
  rye:         0.75,
  spelt:       0.90,
};

const HYDRATION_MULTIPLIER = {
  stiff:  1.15,
  medium: 1.0,
  wet:    0.90,
};

const TEMP_MULTIPLIER = {
  cold: 2.0,
  cool: 1.4,
  room: 1.0,
  warm: 0.75,
  hot:  0.55,
};

const BASE_PEAK_MINUTES = 480;

export function getTemperatureRange(temp) {
  if (temp < 18) return "cold";
  if (temp < 22) return "cool";
  if (temp < 26) return "room";
  if (temp < 30) return "warm";
  return "hot";
}

export function getHydrationRange(hydrationPercent) {
  if (hydrationPercent < 70)  return "stiff";
  if (hydrationPercent <= 90) return "medium";
  return "wet";
}

function getRatioMultiplier(starterG, flourG) {
  const ratio = starterG / flourG;
  if (ratio >= 0.5)  return 0.70;
  if (ratio >= 0.25) return 0.85;
  if (ratio >= 0.1)  return 1.00;
  return 1.30;
}

function getConfidence(model) {
  const count = model.observationCount ?? 0;
  if (count >= 8) return "high";
  if (count >= 3) return "medium";
  return "low";
}

export function calculatePeakTime({
  starterG, flourG, waterG, flourType, temperature, personality, model,
}) {
  const hydrationPercent = (waterG / flourG) * 100;
  const tempRange        = getTemperatureRange(temperature);
  const hydrationRange   = getHydrationRange(hydrationPercent);

  const base = BASE_PEAK_MINUTES
    * (PERSONALITY_MULTIPLIER[personality]   ?? 1.0)
    * (FLOUR_MULTIPLIER[flourType]           ?? 1.0)
    * (HYDRATION_MULTIPLIER[hydrationRange]  ?? 1.0)
    * (TEMP_MULTIPLIER[tempRange]            ?? 1.0)
    * getRatioMultiplier(starterG, flourG);

  const weightedCorrection = getWeightedCorrection(model, {
    starterG, flourG, waterG, temperature,
  });

  return Math.round(base * weightedCorrection);
}

export function calculateRiseTime(peakMinutes) {
  return Math.round(peakMinutes * 0.65);
}

export function calculateFeedTime(peakMinutes) {
  return Math.round(peakMinutes * 1.6);
}

export function getPrediction({
  starterG, flourG, waterG, flourType, temperature, personality, model,
}) {
  const peakMinutes = calculatePeakTime({
    starterG, flourG, waterG, flourType, temperature, personality, model,
  });
  const riseMinutes = calculateRiseTime(peakMinutes);
  const feedMinutes = calculateFeedTime(peakMinutes);
  const confidence  = getConfidence(model);

  return {
    riseMinutes,
    peakMinutes,
    feedMinutes,
    confidence,
    generatedAt: new Date().toISOString(),
  };
}

export function getPhase(feedTimestamp, prediction) {
  if (!prediction) return "hungry";
  const elapsed = (Date.now() - new Date(feedTimestamp).getTime()) / 60000;
  const { riseMinutes, peakMinutes, feedMinutes } = prediction;
  if (elapsed < riseMinutes)  return "rising";
  if (elapsed < peakMinutes)  return "peak";
  if (elapsed < feedMinutes)  return "declining";
  return "hungry";
}

export function getProgress(feedTimestamp, prediction) {
  if (!prediction) return 0;
  const elapsed = (Date.now() - new Date(feedTimestamp).getTime()) / 60000;
  const { peakMinutes, feedMinutes } = prediction;
  if (elapsed <= peakMinutes) {
    return Math.min(100, Math.round((elapsed / peakMinutes) * 100));
  }
  const decline       = elapsed - peakMinutes;
  const declineWindow = feedMinutes - peakMinutes;
  return Math.max(0, Math.round(100 - (decline / declineWindow) * 100));
}
