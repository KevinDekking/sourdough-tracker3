import { useState, useEffect } from "react";
import { useStarters }         from "../context/StarterContext.jsx";

const SMELL_OPTIONS   = ["neutral", "yeasty", "acidic", "alcoholic", "funky"];
const TEXTURE_OPTIONS = ["smooth", "bubbly", "stringy", "dense"];
const BUBBLE_OPTIONS  = ["none", "few", "moderate", "vigorous"];

function toDateTimeLocal(isoString) {
  const d   = new Date(isoString);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDateTimeLocal(value) {
  const [datePart, timePart] = value.split("T");
  const [year, month, day]   = datePart.split("-").map(Number);
  const [hour, minute]       = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

function Field({ label, hint, error, children }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ display: "block", fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "4px" }}>
        {label}{hint && <span style={{ marginLeft: "6px", opacity: 0.7 }}>{hint}</span>}
      </label>
      {children}
      {error && <div style={{ fontSize: "12px", color: "var(--color-text-danger)", marginTop: "3px" }}>{error}</div>}
    </div>
  );
}

function OptionPicker({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)} style={{
          padding: "5px 12px", fontSize: "13px", borderRadius: "var(--border-radius-md)",
          border:      value === opt ? "2px solid var(--color-border-info)"      : "0.5px solid var(--color-border-tertiary)",
          background:  value === opt ? "var(--color-background-info)"            : "var(--color-background-primary)",
          color:       value === opt ? "var(--color-text-info)"                  : "var(--color-text-primary)",
          cursor: "pointer",
        }}>
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function ObservationForm({ starterId, feedId, obsId, navigate }) {
  const { starters, saveObservation } = useStarters();
  const [form,   setForm]   = useState({ timestamp: toDateTimeLocal(new Date().toISOString()), risePercent: "", smell: "neutral", texture: "smooth", bubbles: "none", notes: "", actualPeakMinutes: "" });
  const [errors, setErrors] = useState({});

  const isEdit  = obsId !== null && obsId !== undefined;
  const starter = starters[starterId] ?? null;
  const feed    = starter?.feeds?.find(f => f.id === feedId) ?? null;

  useEffect(() => {
    if (!feed) return;
    if (isEdit && feed.observation) {
      const obs = feed.observation;
      setForm({
        timestamp:         toDateTimeLocal(obs.timestamp),
        risePercent:       String(obs.risePercent ?? ""),
        smell:             obs.smell   ?? "neutral",
        texture:           obs.texture ?? "smooth",
        bubbles:           obs.bubbles ?? "none",
        notes:             obs.notes   ?? "",
        actualPeakMinutes: obs.actualPeakMinutes != null ? String(obs.actualPeakMinutes) : "",
      });
    } else {
      setForm(prev => ({ ...prev, timestamp: toDateTimeLocal(new Date().toISOString()) }));
    }
  }, [feedId, isEdit]);

  function set(field, value) {
    setForm(prev  => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: null }));
  }

  function validate() {
    const e = {};
    if (!form.timestamp) e.timestamp = "Required";
    if (form.risePercent !== "" && (isNaN(Number(form.risePercent)) || Number(form.risePercent) < 0 || Number(form.risePercent) > 1000))
      e.risePercent = "Enter a percentage between 0 and 1000";
    if (form.actualPeakMinutes !== "" && (isNaN(Number(form.actualPeakMinutes)) || Number(form.actualPeakMinutes) <= 0))
      e.actualPeakMinutes = "Enter a positive number of minutes";
    return e;
  }

  function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    saveObservation(starterId, feedId, {
      timestamp:         fromDateTimeLocal(form.timestamp),
      risePercent:       form.risePercent !== "" ? Number(form.risePercent) : 0,
      smell:             form.smell,
      texture:           form.texture,
      bubbles:           form.bubbles,
      notes:             form.notes.trim(),
      actualPeakMinutes: form.actualPeakMinutes !== "" ? Number(form.actualPeakMinutes) : null,
    });
    navigate("dashboard", { starterId });
  }

  const hasPrediction = feed?.prediction != null;
  const predictedPeak = feed?.prediction?.peakMinutes ?? null;

  return (
    <div style={{ padding: "1.5rem", maxWidth: "480px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <button style={{ fontSize: "13px" }} onClick={() => navigate("dashboard", { starterId })}>← Back</button>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 500 }}>{isEdit ? "Edit observation" : "Log observation"}</h1>
      </div>

      {feed && (
        <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px 14px", marginBottom: "1.25rem", fontSize: "13px", color: "var(--color-text-secondary)" }}>
          Feed: {feed.flourG}g {feed.flourType.replace("_", " ")} · {feed.waterG}g water · {feed.temperature}°C
          {hasPrediction && <span style={{ marginLeft: "8px" }}>· Predicted peak: {predictedPeak}m</span>}
        </div>
      )}

      <Field label="Observed at" error={errors.timestamp}>
        <input type="datetime-local" value={form.timestamp} onChange={e => set("timestamp", e.target.value)} style={{ width: "100%" }} />
      </Field>

      <Field label="Rise %" hint="how much has it grown?" error={errors.risePercent}>
        <input type="number" min="0" max="1000" step="5" placeholder="e.g. 75" value={form.risePercent} onChange={e => set("risePercent", e.target.value)} style={{ width: "140px" }} />
      </Field>

      <Field label="Smell" error={errors.smell}>
        <OptionPicker options={SMELL_OPTIONS}   value={form.smell}   onChange={v => set("smell",   v)} />
      </Field>
      <Field label="Texture" error={errors.texture}>
        <OptionPicker options={TEXTURE_OPTIONS} value={form.texture} onChange={v => set("texture", v)} />
      </Field>
      <Field label="Bubbles" error={errors.bubbles}>
        <OptionPicker options={BUBBLE_OPTIONS}  value={form.bubbles} onChange={v => set("bubbles", v)} />
      </Field>

      <Field label="Notes" error={errors.notes}>
        <textarea rows={3} placeholder="Any observations..." value={form.notes} onChange={e => set("notes", e.target.value)} style={{ width: "100%", resize: "vertical", fontFamily: "var(--font-sans)" }} />
      </Field>

      <Field label="Actual peak time" hint="minutes after feeding — updates predictions" error={errors.actualPeakMinutes}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input type="number" min="0" step="5" placeholder="e.g. 420" value={form.actualPeakMinutes} onChange={e => set("actualPeakMinutes", e.target.value)} style={{ width: "140px" }} />
          {hasPrediction && form.actualPeakMinutes !== "" && !isNaN(Number(form.actualPeakMinutes)) && (
            <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
              {Number(form.actualPeakMinutes) < predictedPeak ? "faster" : "slower"} than predicted ({predictedPeak}m)
            </span>
          )}
        </div>
      </Field>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "1.5rem" }}>
        <button style={{ width: "100%", padding: "12px", fontSize: "15px" }} onClick={handleSave}>
          {isEdit ? "Save changes" : "Save observation"}
        </button>
        <button style={{ width: "100%", padding: "10px", fontSize: "13px", color: "var(--color-text-secondary)" }} onClick={() => navigate("dashboard", { starterId })}>
          Cancel
        </button>
      </div>
    </div>
  );
}
