import { createStarter, migrateStarter } from "./model.js";

const STORAGE_KEY = "sourdough_starters";
const ACTIVE_KEY  = "sourdough_active_starter";

export function loadStarters() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    const migrated = {};
    for (const [id, starter] of Object.entries(raw)) {
      migrated[id] = migrateStarter(starter);
    }
    return migrated;
  } catch {
    return {};
  }
}

export function saveStarters(starters) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(starters));
}

export function loadActiveStarterId() {
  return localStorage.getItem(ACTIVE_KEY) ?? null;
}

export function saveActiveStarterId(id) {
  if (id == null) {
    localStorage.removeItem(ACTIVE_KEY);
  } else {
    localStorage.setItem(ACTIVE_KEY, id);
  }
}

export function createAndSaveStarter({ name, personality = "normal" }) {
  const starters = loadStarters();
  const id       = `starter_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const starter  = createStarter({ id, name, personality });
  starters[id]   = starter;
  saveStarters(starters);
  return starter;
}

export function deleteStarter(id) {
  const starters = loadStarters();
  delete starters[id];
  saveStarters(starters);
  const remaining = Object.keys(starters);
  const nextId    = remaining[0] ?? null;
  saveActiveStarterId(nextId);
  return nextId;
}

export function getLatestFeed(starter) {
  if (!starter?.feeds?.length) return null;
  return starter.feeds.reduce((latest, f) =>
    new Date(f.timestamp) > new Date(latest.timestamp) ? f : latest
  , starter.feeds[0]);
}
