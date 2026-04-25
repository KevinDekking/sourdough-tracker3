import { useState, useEffect }                  from "react";
import { useStarters }                          from "../context/StarterContext.jsx";
import { getPhase, getProgress, getPrediction } from "../data/predictions.js";
import JarAnimation                             from "../components/JarAnimation.jsx";

const PHASE_LABEL = { rising: "Rising", peak: "Peak", declining: "Declining", hungry: "Hungry" };
const CONFIDENCE_LABEL = { low: "Low confidence", medium: "Medium confidence", high: "High confidence" };
const PHASE_COLOR = {
  rising:   "var(--color-text-info)",
  peak:     "var(--color-text-success)",
  declining:"var(--color-text-warning)",
  hungry:   "var(--color-text-danger)",
};

function formatMinutes(minutes) {
  if (minutes == null || isNaN(minutes)) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatTimestamp(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function getElapsedMinutes(timestamp) {
  return Math.round((Date.now() - new Date(timestamp).getTime()) / 60000);
}

function getRemainingMinutes(timestamp, targetMinutes) {
  return Math.max(0, targetMinutes - getElapsedMinutes(timestamp));
}

export default function Dashboard({ starterId, navigate }) {
  const { starters, setActiveStarter } = useStarters();
  const [, setTick] = useState(0);

  const resolvedId = starterId;
  const starter    = starters[resolvedId] ?? null;

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  if (!starter) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "1rem" }}>No starter selected.</p>
        <button onClick={() => navigate("starterList")}>Go to starters</button>
      </div>
    );
  }

  const latestFeed = starter.feeds?.length
    ? starter.feeds.reduce((latest, f) =>
        new Date(f.timestamp) > new Date(latest.timestamp) ? f : latest, starter.feeds[0])
    : null;

  const prediction = latestFeed
    ? getPrediction({
        starterG:    latestFeed.starterG,
        flourG:      latestFeed.flourG,
        waterG:      latestFeed.waterG,
        flourType:   latestFeed.flourType,
        temperature: latestFeed.temperature,
        personality: starter.personality,
        model:       starter.model,
      })
    : null;

  const phase    = latestFeed ? getPhase(latestFeed.timestamp, prediction)    : "hungry";
  const progress = latestFeed ? getProgress(latestFeed.timestamp, prediction) : 0;

  const elapsedSinceFeed = latestFeed ? getElapsedMinutes(latestFeed.timestamp) : null;
  const riseRemaining    = prediction && latestFeed ? getRemainingMinutes(latestFeed.timestamp, prediction.riseMinutes) : null;
  const peakRemaining    = prediction && latestFeed ? getRemainingMinutes(latestFeed.timestamp, prediction.peakMinutes) : null;
  const feedRemaining    = prediction && latestFeed ? getRemainingMinutes(latestFeed.timestamp, prediction.feedMinutes) : null;

  const pastRise = elapsedSinceFeed != null && prediction && elapsedSinceFeed >= prediction.riseMinutes;
  const pastPeak = elapsedSinceFeed != null && prediction && elapsedSinceFeed >= prediction.peakMinutes;
  const pastFeed = elapsedSinceFeed != null && prediction && elapsedSinceFeed >= prediction.feedMinutes;

  const otherStarters = Object.values(starters).filter(s => s.id !== resolvedId);

  function handleSwitch(id) {
    setActiveStarter(id);
    navigate("dashboard", { starterId: id });
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: "480px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 500 }}>{starter.name}</h1>
          <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>{starter.personality} starter</span>
        </div>
        <button style={{ fontSize: "13px", padding: "6px 12px" }} onClick={() => navigate("starterList")}>
          All starters
        </button>
      </div>

      {/* Quick-switch */}
      {otherStarters.length > 0 && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "1.25rem" }}>
          {otherStarters.map(s => (
            <button key={s.id} style={{ fontSize: "12px", padding: "3px 10px" }} onClick={() => handleSwitch(s.id)}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Jar + Phase */}
      <div style={{
        display: "flex", alignItems: "center", gap: "1.5rem",
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "1.25rem", marginBottom: "1rem",
      }}>
        <JarAnimation phase={phase} progress={progress} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "26px", fontWeight: 500, color: PHASE_COLOR[phase], marginBottom: "4px" }}>
            {PHASE_LABEL[phase]}
          </div>
          <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "10px" }}>
            {progress}% of peak
          </div>
          <div style={{ height: "5px", borderRadius: "3px", background: "var(--color-background-secondary)", overflow: "hidden", marginBottom: "10px" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: PHASE_COLOR[phase], borderRadius: "3px", transition: "width 1s ease" }} />
          </div>
          {prediction && (
            <div style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
              {CONFIDENCE_LABEL[prediction.confidence]} · {starter.model.observationCount ?? 0} observation{starter.model.observationCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {/* Timers */}
      {prediction ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px", marginBottom: "1rem" }}>
          {[
            { label: "Active rise", value: riseRemaining, done: pastRise },
            { label: "Peak",        value: peakRemaining, done: pastPeak },
            { label: "Next feed",   value: feedRemaining, done: pastFeed },
          ].map(({ label, value, done }) => (
            <div key={label} style={{
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-md)",
              padding: "10px 8px", textAlign: "center",
            }}>
              <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "4px" }}>{label}</div>
              <div style={{ fontSize: "15px", fontWeight: 500, color: done ? "var(--color-text-secondary)" : "var(--color-text-primary)" }}>
                {done ? "done" : formatMinutes(value)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)", padding: "1rem", marginBottom: "1rem",
          fontSize: "14px", color: "var(--color-text-secondary)", textAlign: "center",
        }}>
          No feeds logged yet. Log a feed to see predictions.
        </div>
      )}

      {/* Last feed summary */}
      {latestFeed && (
        <div style={{
          background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)", padding: "10px 14px", marginBottom: "1rem",
          fontSize: "12px", color: "var(--color-text-secondary)", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center",
        }}>
          <span>Last fed: {formatTimestamp(latestFeed.timestamp)}</span>
          <span>{latestFeed.starterG}g starter · {latestFeed.flourG}g flour · {latestFeed.waterG}g water</span>
          <span>{latestFeed.temperature}°C · {latestFeed.flourType.replace("_", " ")}</span>
          {latestFeed.observation && <span style={{ color: "var(--color-text-success)" }}>Observed ✓</span>}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <button style={{ width: "100%", padding: "12px", fontSize: "15px" }} onClick={() => navigate("newFeed", { starterId: resolvedId })}>
          Log feed
        </button>
        <button
          style={{ width: "100%", padding: "12px", fontSize: "15px" }}
          disabled={!latestFeed}
          onClick={() => latestFeed && navigate("newObservation", { starterId: resolvedId, feedId: latestFeed.id })}
        >
          Log observation
        </button>
        <button
          style={{ width: "100%", padding: "10px", fontSize: "13px", color: "var(--color-text-secondary)" }}
          onClick={() => navigate("history", { starterId: resolvedId })}
        >
          View history
        </button>
      </div>
    </div>
  );
}
