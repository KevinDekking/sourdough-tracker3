import { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { loadStarters, saveStarters, loadActiveStarterId, saveActiveStarterId, createAndSaveStarter, deleteStarter, getLatestFeed } from "../data/starterStore.js";
import { recordCorrection }              from "../data/learning.js";
import { getPrediction }                 from "../data/predictions.js";
import { createFeed, createObservation } from "../data/model.js";

const StarterContext = createContext(null);

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function reducer(state, action) {
  switch (action.type) {
    case "INIT": {
      return { ...state, starters: action.starters, activeStarterId: action.activeStarterId, ready: true };
    }
    case "SET_ACTIVE": {
      return { ...state, activeStarterId: action.id };
    }
    case "ADD_STARTER": {
      return {
        ...state,
        starters: { ...state.starters, [action.starter.id]: action.starter },
        activeStarterId: action.starter.id,
      };
    }
    case "DELETE_STARTER": {
      const next = { ...state.starters };
      delete next[action.id];
      const remaining = Object.keys(next);
      const activeStarterId = action.id === state.activeStarterId
        ? (remaining[0] ?? null)
        : state.activeStarterId;
      return { ...state, starters: next, activeStarterId };
    }
    case "RENAME_STARTER": {
      const starter = state.starters[action.id];
      if (!starter) return state;
      return {
        ...state,
        starters: { ...state.starters, [action.id]: { ...starter, name: action.name } },
      };
    }
    case "SAVE_FEED": {
      const { starterId, feed } = action;
      const starter = state.starters[starterId];
      if (!starter) return state;
      const exists = starter.feeds.some(f => f.id === feed.id);
      const feeds  = exists
        ? starter.feeds.map(f => f.id === feed.id ? feed : f)
        : [feed, ...starter.feeds];
      return {
        ...state,
        starters: {
          ...state.starters,
          [starterId]: {
            ...starter,
            feeds,
            model: { ...starter.model, feedCount: starter.model.feedCount + (exists ? 0 : 1) },
          },
        },
      };
    }
    case "DELETE_FEED": {
      const { starterId, feedId } = action;
      const starter = state.starters[starterId];
      if (!starter) return state;
      return {
        ...state,
        starters: {
          ...state.starters,
          [starterId]: { ...starter, feeds: starter.feeds.filter(f => f.id !== feedId) },
        },
      };
    }
    case "SAVE_OBSERVATION": {
      const { starterId, feedId, observation } = action;
      const starter = state.starters[starterId];
      if (!starter) return state;
      const feed = starter.feeds.find(f => f.id === feedId);
      if (!feed) return state;
      let updatedModel = starter.model;
      if (observation.actualPeakMinutes && feed.prediction) {
        updatedModel = recordCorrection(starter.model, {
          starterG:         feed.starterG,
          flourG:           feed.flourG,
          waterG:           feed.waterG,
          temperature:      feed.temperature,
          predictedMinutes: feed.prediction.peakMinutes,
          actualMinutes:    observation.actualPeakMinutes,
        });
      }
      return {
        ...state,
        starters: {
          ...state.starters,
          [starterId]: {
            ...starter,
            model: updatedModel,
            feeds: starter.feeds.map(f => f.id === feedId ? { ...f, observation } : f),
          },
        },
      };
    }
    default:
      return state;
  }
}

const initialState = { starters: {}, activeStarterId: null, ready: false };

export function StarterProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const starters        = loadStarters();
    const savedId         = loadActiveStarterId();
    const activeStarterId = (savedId && starters[savedId])
      ? savedId
      : (Object.keys(starters)[0] ?? null);
    dispatch({ type: "INIT", starters, activeStarterId });
  }, []);

  useEffect(() => {
    if (!state.ready) return;
    saveStarters(state.starters);
    saveActiveStarterId(state.activeStarterId);
  }, [state.starters, state.activeStarterId, state.ready]);

  const addStarter = useCallback(({ name, personality }) => {
    const starter = createAndSaveStarter({ name, personality });
    dispatch({ type: "ADD_STARTER", starter });
    return starter;
  }, []);

  const removeStarter = useCallback((id) => {
    deleteStarter(id);
    dispatch({ type: "DELETE_STARTER", id });
  }, []);

  const renameStarter = useCallback((id, name) => {
    dispatch({ type: "RENAME_STARTER", id, name });
  }, []);

  const setActiveStarter = useCallback((id) => {
    dispatch({ type: "SET_ACTIVE", id });
  }, []);

  const saveFeed = useCallback((starterId, feedData) => {
    const starter = state.starters[starterId];
    if (!starter) return;
    const id   = feedData.id ?? generateId("feed");
    const feed = createFeed({ ...feedData, id, starterId });
    feed.prediction = getPrediction({
      starterG:    feed.starterG,
      flourG:      feed.flourG,
      waterG:      feed.waterG,
      flourType:   feed.flourType,
      temperature: feed.temperature,
      personality: starter.personality,
      model:       starter.model,
    });
    dispatch({ type: "SAVE_FEED", starterId, feed });
    return feed;
  }, [state.starters]);

  const removeFeed = useCallback((starterId, feedId) => {
    dispatch({ type: "DELETE_FEED", starterId, feedId });
  }, []);

  const saveObservation = useCallback((starterId, feedId, obsData) => {
    const observation = createObservation({ ...obsData, feedId });
    dispatch({ type: "SAVE_OBSERVATION", starterId, feedId, observation });
    return observation;
  }, []);

  const activeStarter = state.starters[state.activeStarterId] ?? null;
  const latestFeed    = activeStarter ? getLatestFeed(activeStarter) : null;

  const value = {
    starters:        state.starters,
    activeStarterId: state.activeStarterId,
    activeStarter,
    latestFeed,
    ready:           state.ready,
    addStarter,
    removeStarter,
    renameStarter,
    setActiveStarter,
    saveFeed,
    removeFeed,
    saveObservation,
  };

  return (
    <StarterContext.Provider value={value}>
      {children}
    </StarterContext.Provider>
  );
}

export function useStarters() {
  const ctx = useContext(StarterContext);
  if (!ctx) throw new Error("useStarters must be used inside StarterProvider");
  return ctx;
}
