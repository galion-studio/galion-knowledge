// Build progress stored on each layer in horbm.json. The page does not derive these numbers.

export function layersOf(data) {
  return ((data && data.bands) || []).flatMap((band) => band.layers || []);
}

export function layerPercent(layer) {
  const value = layer && layer.build ? layer.build.percent : 0;
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(0, Math.round(number)));
}

export function overallPercent(data) {
  const layers = layersOf(data);
  if (!layers.length) return 0;
  const sum = layers.reduce((total, layer) => total + layerPercent(layer), 0);
  return Math.round(sum / layers.length);
}

export function countStates(data) {
  const counts = { planned: 0, "in progress": 0, done: 0, blocked: 0 };
  for (const layer of layersOf(data)) {
    const state = layer.build && layer.build.state;
    if (Object.prototype.hasOwnProperty.call(counts, state)) counts[state] += 1;
  }
  return counts;
}
