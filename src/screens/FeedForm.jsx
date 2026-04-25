import { useState, useEffect } from "react";
import { useStarters }         from "../context/StarterContext.jsx";

const FLOUR_TYPES = ["ap", "bread", "whole_wheat", "rye", "spelt"];
const FLOUR_LABEL = { ap: "All-purpose", bread: "Bread flour", whole_wheat: "Whole wheat", rye: "Rye", spelt: "Spelt" };

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

function generateId() {
  return `feed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ display: "block", fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "4px" }}>
        {label}
      </label>
      {children}
      {error && <div style={{ fontSize: "12px", color: "var(--color-text-danger)", marginTop: "3px" }}>{error}</div>}
    </div>
  );
}

export default function FeedForm({ starterId, feedId, navigate }) {
  const { starters, saveFeed, removeFeed } = useStarters();
  const [form,   setForm]   = useState({ timestamp: toDateTimeLocal(new Date().toISOString()), starterG: "", flourG: "", waterG: "", flourType: "ap", temperature: "" });
  const [errors, setErrors] = useState({});

  const isEdit  = feedId !== null && feedId !== undefined;
  const starter = starters[starterId] ?? null;

  useEffect(() => {
    if (!isEdit || !starter) {
      setForm({ timestamp: toDateTimeLocal(new Date().toISOString()), starterG: "", flourG: "", waterG: "", flourType: "ap", temperature: "" });
      return;
    }
    const feed = starter.feeds.find(f => f.id === feedId);
    if (!feed) return;
    setForm({
      timestamp:   toDateTimeLocal(feed.timestamp),
      starterG:    String(feed.starterG),
      flourG:      String(feed.flourG),
      waterG:      String(feed.waterG),
      flourType:   feed.flourType,
      temperature: String(feed.temperature),
    });
  }, [starterId, feedId, isEdit]);

  function set(field, value) {
    setForm(prev  => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: null }));
  }

  function validate() {
    const e = {};
    if (!form.timestamp) e.timestamp = "Required";
    if (!form.starterG || isNaN(Number(form.starterG)) || Number(form.starterG) <= 0) e.starterG = "Enter a positive number";
    if (!form.flourG   || isNaN(Number(form.flourG))   || Number(form.flourG)   <= 0) e.flourG   = "Enter a positive number";
    if (!form.waterG   || isNaN(Number(form.waterG))   || Number(form.waterG)   <= 0) e.waterG   = "Enter a positive number";
    if (!form.temperature || isNaN(Number(form.temperature)))                          e.temperature = "Enter a temperature";
    return e;
  }

  function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    saveFeed(starterId, {
      id:          isEdit ? feedId : generateId(),
      starterG:    Number(form.starterG),
      flourG:      Number(form.flourG),
      waterG:      Number(form.waterG),
      flourType:   form.flourType,
      temperature: Number(form.temperature),
      timestamp:   fromDateTimeLocal(form.timestamp),
    });
    navigate("dashboard", { starterId });
  }

  function handleDelete() {
    if (!isEdit) return;
    if (!window.confirm("Delete this feed? This cannot be undone.")) return;
    removeFeed(starterId, feedId);
    navigate("dashboard", { starterId });
  }

  const flourG   = Number(form.flourG);
  const waterG   = Number(form.waterG);
  const starterG = Number(form.starterG);
  const hydration = flourG > 0 && waterG   > 0 ? Math.round((waterG   / flourG) * 100) : null;
  const inoc      = flourG > 0 && starterG > 0 ? Math.round((starterG / flourG) * 100) : null;

  return (
    <div style={{ padding: "1.5rem", maxWidth: "480px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <button style={{ fontSize: "13px" }} onClick={() => navigate("dashboard", { starterId })}>← Back</button>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 500 }}>{isEdit ? "Edit feed" : "Log feed"}</h1>
      </div>

      {starter && (
        <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "1.25rem" }}>
          Starter: {starter.name}
        </div>
      )}

      <Field label="Date and time" error={errors.timestamp}>
        <input type="datetime-local" value={form.timestamp} onChange={e => set("timestamp", e.target.value)} style={{ width: "100%" }} />
      </Field>

      <Field label="Flour type" error={errors.flourType}>
        <select value={form.flourType} onChange={e => set("flourType", e.target.value)} style={{ width: "100%" }}>
          {FLOUR_TYPES.map(f => <option key={f} value={f}>{FLOUR_LABEL[f]}</option>)}
        </select>
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" }}>
        <Field label="Starter (g)" error={errors.starterG}>
          <input type="number" min="0" step="1" placeholder="50"  value={form.starterG} onChange={e => set("starterG", e.target.value)} style={{ width: "100%" }} />
        </Field>
        <Field label="Flour (g)" error={errors.flourG}>
          <input type="number" min="0" step="1" placeholder="100" value={form.flourG}   onChange={e => set("flourG",   e.target.value)} style={{ width: "100%" }} />
        </Field>
        <Field label="Water (g)" error={errors.waterG}>
          <input type="number" min="0" step="1" placeholder="100" value={form.waterG}   onChange={e => set("waterG",   e.target.value)} style={{ width: "100%" }} />
        </Field>
      </div>

      {(hydration !== null || inoc !== null) && (
        <div style={{ display: "flex", gap: "1.5rem", fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
          {hydration !== null && <span>Hydration: {hydration}%</span>}
          {inoc      !== null && <span>Inoculation: {inoc}%</span>}
        </div>
      )}

      <Field label="Temperature (°C)" error={errors.temperature}>
        <input type="number" step="0.5" placeholder="24" value={form.temperature} onChange={e => set("temperature", e.target.value)} style={{ width: "180px" }} />
      </Field>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "1.5rem" }}>
        <button style={{ width: "100%", padding: "12px", fontSize: "15px" }} onClick={handleSave}>
          {isEdit ? "Save changes" : "Log feed"}
        </button>
        <button style={{ width: "100%", padding: "10px", fontSize: "13px", color: "var(--color-text-secondary)" }} onClick={() => navigate("dashboard", { starterId })}>
          Cancel
        </button>
        {isEdit && (
          <button style={{ width: "100%", padding: "10px", fontSize: "13px", color: "var(--color-text-danger)" }} onClick={handleDelete}>
            Delete feed
          </button>
        )}
      </div>
    </div>
  );
}
