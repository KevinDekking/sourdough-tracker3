const MAX_HISTORY = 50;

function getContext(starterG, flourG, waterG, temperature) {
  const hydration = (waterG / flourG) * 100;
  const ratio     = starterG / flourG;
  return { temperature, hydration, ratio };
}

function similarity(a, b) {
  const tempDiff  = Math.abs(a.temperature - b.temperature) / 10;
  const hydDiff   = Math.abs(a.hydration   - b.hydration)   / 20;
  const ratioDiff = Math.abs(a.ratio       - b.ratio)       / 0.5;
  const distance  = tempDiff + hydDiff + ratioDiff;
  return 1 / (1 + distance);
}

function getTemperatureKey(temp) {
  if (temp < 18) return "cold";
  if (temp < 22) return "cool";
  if (temp < 26) return "room";
  if (temp < 30) return "warm";
  return "hot";
}

function getHydrationKey(hydration) {
  if (hydration < 70)  return "stiff";
  if (hydration <= 90) return "medium";
  return "wet";
}

function updateRangeFactors(rangeMap, value, newFactor, keyFn) {
  const key     = keyFn(value);
  const current = rangeMap[key] ?? 1.0;
  const updated = current * 0.7 + newFactor * 0.3;
  return { ...rangeMap, [key]: updated };
}

export function recordCorrection(model, {
  starterG, flourG, waterG, temperature, predictedMinutes, actualMinutes,
}) {
  if (!predictedMinutes || !actualMinutes) return model;

  const factor   = actualMinutes / predictedMinutes;
  const context  = getContext(starterG, flourG, waterG, temperature);
  const hydration = (waterG / flourG) * 100;

  const entry = {
    timestamp: new Date().toISOString(),
    predicted: predictedMinutes,
    actual:    actualMinutes,
    factor,
    context,
  };

  const history      = [entry, ...model.correctionHistory].slice(0, MAX_HISTORY);
  const globalFactor = history.reduce((sum, e) => sum + e.factor, 0) / history.length;

  return {
    ...model,
    correctionHistory:      history,
    globalCorrectionFactor: globalFactor,
    observationCount:       (model.observationCount ?? 0) + 1,
    peakSamples:            [...(model.peakSamples ?? []).slice(-49), actualMinutes],
    contextCorrections: {
      ...model.contextCorrections,
      temperatureRange: updateRangeFactors(
        model.contextCorrections.temperatureRange,
        temperature,
        factor,
        getTemperatureKey,
      ),
      hydrationRange: updateRangeFactors(
        model.contextCorrections.hydrationRange,
        hydration,
        factor,
        getHydrationKey,
      ),
    },
  };
}

export function getWeightedCorrection(model, { starterG, flourG, waterG, temperature }) {
  if (!model) return 1.0;

  const history = model.correctionHistory ?? [];
  if (!history.length) return model.globalCorrectionFactor ?? 1.0;

  const context   = getContext(starterG, flourG, waterG, temperature);
  const MIN_SIM   = 0.2;

  const weighted = history
    .map(entry => ({ weight: similarity(context, entry.context), factor: entry.factor }))
    .filter(e => e.weight >= MIN_SIM);

  if (!weighted.length) return model.globalCorrectionFactor ?? 1.0;

  const totalWeight = weighted.reduce((sum, e) => sum + e.weight, 0);
  const weightedSum = weighted.reduce((sum, e) => sum + e.weight * e.factor, 0);

  return weightedSum / totalWeight;
}
