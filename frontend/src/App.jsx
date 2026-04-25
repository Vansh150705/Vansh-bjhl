import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function TreeNode({ label, children, depth = 0 }) {
  const [open, setOpen] = useState(true);
  const hasChildren = Object.keys(children).length > 0;
  const colors = ["#7EE8A2", "#80D0C7", "#A78BFA", "#F9A8D4", "#FCD34D", "#6EE7B7"];
  const color = colors[depth % colors.length];

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 20, marginTop: 4 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: hasChildren ? "pointer" : "default",
          userSelect: "none",
        }}
        onClick={() => hasChildren && setOpen((v) => !v)}
      >
        {hasChildren && (
          <span
            style={{
              fontSize: 10,
              color: "#888",
              transform: open ? "rotate(90deg)" : "rotate(0)",
              display: "inline-block",
              transition: "transform 0.15s",
            }}
          >
            ▶
          </span>
        )}
        {!hasChildren && <span style={{ width: 14 }} />}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: color + "22",
            border: `2px solid ${color}`,
            color: color,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {label}
        </span>
        {!hasChildren && (
          <span style={{ fontSize: 10, color: "#666", fontFamily: "monospace" }}>
            leaf
          </span>
        )}
      </div>
      {open && hasChildren && (
        <div
          style={{
            marginLeft: 15,
            borderLeft: `1px dashed ${color}44`,
            paddingLeft: 6,
          }}
        >
          {Object.entries(children).map(([k, v]) => (
            <TreeNode key={k} label={k} children={v} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Hierarchy card ────────────────────────────────────────────────────────────
function HierarchyCard({ h, index }) {
  const isCyclic = !!h.has_cycle;
  return (
    <div
      style={{
        background: isCyclic ? "#1a0f0f" : "#0d1117",
        border: `1px solid ${isCyclic ? "#7f1d1d" : "#1e2a3a"}`,
        borderRadius: 12,
        padding: "18px 22px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle glow */}
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: isCyclic ? "#ef444422" : "#3b82f622",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: "#555",
              background: "#111",
              padding: "2px 8px",
              borderRadius: 4,
            }}
          >
            #{index + 1}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: "#e2e8f0" }}>
            {h.root}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isCyclic ? (
            <span
              style={{
                background: "#7f1d1d",
                color: "#fca5a5",
                padding: "3px 10px",
                borderRadius: 99,
                fontSize: 11,
                fontFamily: "monospace",
                fontWeight: 600,
              }}
            >
              ↺ CYCLE
            </span>
          ) : (
            <span
              style={{
                background: "#052e16",
                color: "#86efac",
                padding: "3px 10px",
                borderRadius: 99,
                fontSize: 11,
                fontFamily: "monospace",
                fontWeight: 600,
              }}
            >
              ✓ TREE · depth {h.depth}
            </span>
          )}
        </div>
      </div>

      {isCyclic ? (
        <p style={{ color: "#666", fontFamily: "monospace", fontSize: 12, margin: 0 }}>
          Cycle detected — no tree structure available
        </p>
      ) : (
        <div style={{ paddingTop: 4 }}>
          {Object.entries(h.tree).map(([k, v]) => (
            <TreeNode key={k} label={k} children={v} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Badge row ─────────────────────────────────────────────────────────────────
function Badge({ label, values, accent }) {
  if (!values || values.length === 0) return null;
  return (
    <div
      style={{
        background: "#0d1117",
        border: `1px solid ${accent}33`,
        borderRadius: 10,
        padding: "12px 16px",
      }}
    >
      <div style={{ fontSize: 10, color: accent, fontFamily: "monospace", fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>
        {label} ({values.length})
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {values.map((v, i) => (
          <span
            key={i}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              background: accent + "18",
              color: accent,
              padding: "3px 10px",
              borderRadius: 6,
              border: `1px solid ${accent}44`,
            }}
          >
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
const PLACEHOLDER = `A->B, A->C, B->D, C->E, E->F,
X->Y, Y->Z, Z->X,
P->Q, Q->R,
G->H, G->H, G->I,
hello, 1->2, A->`;

export default function App() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    setResult(null);
    const raw = input.trim();
    if (!raw) { setError("Please enter at least one node string."); return; }

    // Parse comma/newline separated entries
    const data = raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/bfhl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const json = await res.json();
      setResult(json);
    } catch (e) {
      setError(`API call failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060a0f",
        color: "#e2e8f0",
        fontFamily: "'Inter', sans-serif",
        padding: "0 0 80px",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid #1e2a3a",
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "#080d14",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "linear-gradient(135deg, #3b82f5, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          🌲
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9", letterSpacing: -0.3 }}>
            BFHL · Tree Hierarchy Explorer
          </div>
          <div style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>
            SRM Full Stack Challenge · POST /bfhl
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 0" }}>
        {/* Input */}
        <div
          style={{
            background: "#0d1117",
            border: "1px solid #1e2a3a",
            borderRadius: 14,
            padding: 24,
            marginBottom: 28,
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontFamily: "monospace",
              color: "#3b82f6",
              fontWeight: 700,
              letterSpacing: 1,
              marginBottom: 10,
            }}
          >
            NODE STRINGS
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={5}
            style={{
              width: "100%",
              background: "#060a0f",
              border: "1px solid #1e2a3a",
              borderRadius: 8,
              padding: "12px 14px",
              color: "#94a3b8",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              lineHeight: 1.7,
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "#1e2a3a")}
          />
          <div style={{ marginTop: 6, fontSize: 11, color: "#334155", fontFamily: "monospace" }}>
            Separate entries with commas or newlines. Example: A-&gt;B, A-&gt;C, B-&gt;D
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                background: loading ? "#1e2a3a" : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                color: loading ? "#475569" : "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 28px",
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: 0.3,
                transition: "opacity 0.15s",
              }}
            >
              {loading ? "Processing…" : "→ Submit"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: "#1a0f0f",
              border: "1px solid #7f1d1d",
              borderRadius: 10,
              padding: "14px 18px",
              color: "#fca5a5",
              fontFamily: "monospace",
              fontSize: 13,
              marginBottom: 24,
            }}
          >
            ⚠ {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {/* Identity strip */}
            <div
              style={{
                background: "#0d1117",
                border: "1px solid #1e2a3a",
                borderRadius: 12,
                padding: "14px 20px",
                display: "flex",
                gap: 32,
                flexWrap: "wrap",
              }}
            >
              {[
                ["USER ID", result.user_id],
                ["EMAIL", result.email_id],
                ["ROLL", result.college_roll_number],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 9, color: "#475569", fontFamily: "monospace", letterSpacing: 1, marginBottom: 3 }}>
                    {k}
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#94a3b8" }}>
                    {v}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 14,
              }}
            >
              {[
                ["TREES", result.summary.total_trees, "#86efac"],
                ["CYCLES", result.summary.total_cycles, "#fca5a5"],
                ["LARGEST ROOT", result.summary.largest_tree_root, "#c4b5fd"],
              ].map(([label, val, color]) => (
                <div
                  key={label}
                  style={{
                    background: "#0d1117",
                    border: `1px solid ${color}33`,
                    borderRadius: 12,
                    padding: "16px 20px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 9, color, fontFamily: "monospace", letterSpacing: 1, marginBottom: 8 }}>
                    {label}
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color }}>
                    {val}
                  </div>
                </div>
              ))}
            </div>

            {/* Hierarchies */}
            <div>
              <div style={{ fontSize: 11, color: "#475569", fontFamily: "monospace", letterSpacing: 1, marginBottom: 14 }}>
                HIERARCHIES ({result.hierarchies.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {result.hierarchies.map((h, i) => (
                  <HierarchyCard key={i} h={h} index={i} />
                ))}
              </div>
            </div>

            {/* Invalid + duplicates */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Badge label="INVALID ENTRIES" values={result.invalid_entries} accent="#fb923c" />
              <Badge label="DUPLICATE EDGES" values={result.duplicate_edges} accent="#facc15" />
            </div>

            {/* Raw JSON toggle */}
            <details
              style={{
                background: "#0d1117",
                border: "1px solid #1e2a3a",
                borderRadius: 10,
                padding: "12px 16px",
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  fontSize: 11,
                  color: "#475569",
                  fontFamily: "monospace",
                  letterSpacing: 1,
                  userSelect: "none",
                }}
              >
                RAW JSON RESPONSE
              </summary>
              <pre
                style={{
                  marginTop: 12,
                  fontSize: 11,
                  color: "#64748b",
                  fontFamily: "'JetBrains Mono', monospace",
                  overflowX: "auto",
                  lineHeight: 1.6,
                }}
              >
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}