import { useState }    from "react";
import { useStarters } from "../context/StarterContext.jsx";

const personalities = ["fast", "normal", "slow"];

const PERSONALITY_DESC = {
  fast:   "Peaks quickly, high activity",
  normal: "Balanced rise and fall",
  slow:   "Long fermentation, mild flavour",
};

function NewStarterForm({ onSave, onCancel }) {
  const [name,        setName]        = useState("");
  const [personality, setPersonality] = useState("normal");
  const [error,       setError]       = useState(null);

  function handleSubmit() {
    if (!name.trim()) { setError("Name is required"); return; }
    onSave({ name: name.trim(), personality });
  }

  return (
    <div style={{
      background:   "var(--color-background-primary)",
      border:       "0.5px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)",
      padding:      "1.25rem",
      marginBottom: "1rem",
    }}>
      <h2 style={{ margin: "0 0 1rem", fontSize: "16px", fontWeight: 500 }}>New starter</h2>

      <div style={{ marginBottom: "0.75rem" }}>
        <label style={{ display: "block", fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "4px" }}>
          Name
        </label>
        <input
          type="text"
          placeholder="e.g. Rye Rita"
          value={name}
          onChange={e => { setName(e.target.value); setError(null); }}
          style={{ width: "100%" }}
          autoFocus
        />
        {error && (
          <div style={{ fontSize: "12px", color: "var(--color-text-danger)", marginTop: "3px" }}>{error}</div>
        )}
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "6px" }}>
          Personality
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {personalities.map(p => (
            <label key={p} style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer" }}>
              <input
                type="radio"
                name="personality"
                value={p}
                checked={personality === p}
                onChange={() => setPersonality(p)}
                style={{ marginTop: "2px" }}
              />
              <div>
                <div style={{ fontSize: "14px", fontWeight: 500 }}>{p}</div>
                <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>{PERSONALITY_DESC[p]}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <button style={{ flex: 1, padding: "10px" }} onClick={handleSubmit}>Create starter</button>
        <button style={{ padding: "10px 16px", fontSize: "13px", color: "var(--color-text-secondary)" }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function StarterList({ navigate }) {
  const { starters, activeStarterId, addStarter, removeStarter, setActiveStarter } = useStarters();
  const [showForm,      setShowForm]      = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const starterList = Object.values(starters).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  function handleSave({ name, personality }) {
    const starter = addStarter({ name, personality });
    setShowForm(false);
    setActiveStarter(starter.id);
    navigate("dashboard", { starterId: starter.id });
  }

  function handleSelect(id) {
    setActiveStarter(id);
    navigate("dashboard", { starterId: id });
  }

  function handleDelete(id) {
    removeStarter(id);
    setConfirmDelete(null);
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: "480px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 500 }}>My starters</h1>
        {!showForm && (
          <button style={{ fontSize: "13px", padding: "6px 12px" }} onClick={() => setShowForm(true)}>+ New</button>
        )}
      </div>

      {showForm && <NewStarterForm onSave={handleSave} onCancel={() => setShowForm(false)} />}

      {starterList.length === 0 && !showForm && (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--color-text-secondary)", fontSize: "14px" }}>
          No starters yet. Create your first one.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {starterList.map(starter => {
          const isActive  = starter.id === activeStarterId;
          const feedCount = starter.feeds?.length ?? 0;
          return (
            <div key={starter.id} style={{
              background:   "var(--color-background-primary)",
              border:       isActive ? "2px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-lg)",
              padding:      "1rem 1.25rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 500, marginBottom: "2px" }}>
                    {starter.name}
                    {isActive && (
                      <span style={{
                        marginLeft: "8px", fontSize: "11px", fontWeight: 400,
                        color: "var(--color-text-info)", background: "var(--color-background-info)",
                        padding: "2px 7px", borderRadius: "var(--border-radius-md)",
                      }}>active</span>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                    {starter.personality} · {feedCount} feed{feedCount !== 1 ? "s" : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button style={{ fontSize: "13px", padding: "6px 12px" }} onClick={() => handleSelect(starter.id)}>
                    {isActive ? "Open" : "Select"}
                  </button>
                  <button style={{ fontSize: "13px", padding: "6px 12px", color: "var(--color-text-danger)" }} onClick={() => setConfirmDelete(starter.id)}>
                    Delete
                  </button>
                </div>
              </div>

              {confirmDelete === starter.id && (
                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "0.5px solid var(--color-border-tertiary)", fontSize: "13px" }}>
                  <span style={{ color: "var(--color-text-secondary)", marginRight: "12px" }}>
                    Delete {starter.name}? This cannot be undone.
                  </span>
                  <button style={{ fontSize: "13px", color: "var(--color-text-danger)", marginRight: "8px" }} onClick={() => handleDelete(starter.id)}>
                    Yes, delete
                  </button>
                  <button style={{ fontSize: "13px" }} onClick={() => setConfirmDelete(null)}>Cancel</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
