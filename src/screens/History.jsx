import { useState }    from "react";
import { useStarters } from "../context/StarterContext.jsx";

const FLOUR_LABEL = { ap: "All-purpose", bread: "Bread flour", whole_wheat: "Whole wheat", rye: "Rye", spelt: "Spelt" };

function formatTimestamp(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatMinutes(m) {
  if (m == null) return "—";
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min}m`;
  return min === 0 ? `${h}h` : `${h}h ${min}m`;
}

function FeedCard({ feed, onEditFeed, onEditObs, onLogObs }) {
  const [expanded, setExpanded] = useState(false);
  const obs       = feed.observation ?? null;
  const hydration = feed.flourG > 0 ? Math.round((feed.waterG   / feed.flourG) * 100) : null;
  const inoc      = feed.flourG > 0 ? Math.round((feed.starterG / feed.flourG) * 100) : null;

  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden", marginBottom: "10px" }}>
      <div style={{ padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }} onClick={() => setExpanded(e => !e)}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "14px", fontWeight: 500, marginBottom: "3px" }}>{formatTimestamp(feed.timestamp)}</div>
          <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
            {feed.starterG}g starter · {feed.flourG}g {FLOUR_LABEL[feed.flourType] ?? feed.flourType} · {feed.waterG}g water
            {hydration !== null && ` · ${hydration}% hydration`}
            {inoc      !== null && ` · ${inoc}% inoc`}
            {" · "}{feed.temperature}°C
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {obs && (
            <span style={{ fontSize: "11px", color: "var(--color-text-success)", background: "var(--color-background-success)", padding: "2px 7px", borderRadius: "var(--border-radius-md)" }}>
              observed
            </span>
          )}
          <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", padding: "12px 14px" }}>
          {feed.prediction && (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "6px", fontWeight: 500 }}>Prediction at time of feed</div>
              <div style={{ display: "flex", gap: "1rem", fontSize: "12px", color: "var(--color-text-secondary)", flexWrap: "wrap" }}>
                <span>Rise active: {formatMinutes(feed.prediction.riseMinutes)}</span>
                <span>Peak: {formatMinutes(feed.prediction.peakMinutes)}</span>
                <span>Next feed: {formatMinutes(feed.prediction.feedMinutes)}</span>
                <span style={{ textTransform: "capitalize" }}>Confidence: {feed.prediction.confidence}</span>
              </div>
            </div>
          )}

          {obs ? (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: "6px" }}>Observation · {formatTimestamp(obs.timestamp)}</div>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "6px" }}>
                {obs.risePercent > 0 && <span>Rise: {obs.risePercent}%</span>}
                <span>Smell: {obs.smell}</span>
                <span>Texture: {obs.texture}</span>
                <span>Bubbles: {obs.bubbles}</span>
                {obs.actualPeakMinutes != null && (
                  <span style={{ color: "var(--color-text-success)" }}>
                    Actual peak: {formatMinutes(obs.actualPeakMinutes)}
                    {feed.prediction && <span style={{ color: "var(--color-text-secondary)" }}> (predicted: {formatMinutes(feed.prediction.peakMinutes)})</span>}
                  </span>
                )}
              </div>
              {obs.notes && <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", fontStyle: "italic" }}>"{obs.notes}"</div>}
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "12px" }}>No observation logged for this feed.</div>
          )}

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button style={{ fontSize: "12px", padding: "5px 12px" }} onClick={() => onEditFeed(feed.id)}>Edit feed</button>
            {obs
              ? <button style={{ fontSize: "12px", padding: "5px 12px" }} onClick={() => onEditObs(feed.id)}>Edit observation</button>
              : <button style={{ fontSize: "12px", padding: "5px 12px" }} onClick={() => onLogObs(feed.id)}>Log observation</button>
            }
          </div>
        </div>
      )}
    </div>
  );
}

export default function History({ starterId, navigate }) {
  const { starters } = useStarters();
  const [filter, setFilter] = useState("all");
  const starter = starters[starterId] ?? null;

  if (!starter) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Starter not found.
        <br />
        <button style={{ marginTop: "1rem" }} onClick={() => navigate("starterList")}>Go to starters</button>
      </div>
    );
  }

  const sorted   = [...(starter.feeds ?? [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const filtered = filter === "unobserved" ? sorted.filter(f => !f.observation) : sorted;
  const observedCount   = sorted.filter(f =>  f.observation).length;
  const unobservedCount = sorted.filter(f => !f.observation).length;

  return (
    <div style={{ padding: "1.5rem", maxWidth: "480px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
        <button style={{ fontSize: "13px" }} onClick={() => navigate("dashboard", { starterId })}>← Back</button>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 500 }}>History</h1>
      </div>

      <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px 14px", marginBottom: "1rem", fontSize: "13px", color: "var(--color-text-secondary)", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{starter.name}</span>
        <span>{sorted.length} feed{sorted.length !== 1 ? "s" : ""}</span>
        <span>{observedCount} observed</span>
        <span>{starter.model.observationCount ?? 0} corrections logged</span>
      </div>

      {sorted.length > 0 && (
        <div style={{ display: "flex", gap: "6px", marginBottom: "1rem" }}>
          {[{ key: "all", label: `All (${sorted.length})` }, { key: "unobserved", label: `Unobserved (${unobservedCount})` }].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)} style={{
              fontSize: "12px", padding: "4px 12px", borderRadius: "var(--border-radius-md)",
              border:      filter === key ? "2px solid var(--color-border-info)"   : "0.5px solid var(--color-border-tertiary)",
              background:  filter === key ? "var(--color-background-info)"         : "var(--color-background-primary)",
              color:       filter === key ? "var(--color-text-info)"               : "var(--color-text-primary)",
            }}>{label}</button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", fontSize: "14px", color: "var(--color-text-secondary)" }}>
          {sorted.length === 0 ? "No feeds logged yet." : "No feeds match this filter."}
        </div>
      ) : (
        filtered.map(feed => (
          <FeedCard
            key={feed.id}
            feed={feed}
            onEditFeed={feedId => navigate("editFeed",        { starterId, feedId })}
            onEditObs={feedId  => navigate("editObservation", { starterId, feedId, obsId: "current" })}
            onLogObs={feedId   => navigate("newObservation",  { starterId, feedId })}
          />
        ))
      )}
    </div>
  );
}
