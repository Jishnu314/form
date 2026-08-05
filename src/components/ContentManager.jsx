import { useEffect, useRef, useState } from "react";
import { Megaphone, Trophy, Trash2, Plus, ImagePlus, X } from "lucide-react";

const MAX_IMAGE_BYTES = 1.4 * 1024 * 1024; // keep under the server's data-URL cap

// ---- Ad announcement editor -------------------------------------------
export function AdEditor({ ad, onSave, onMsg }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!ad) return;
    setTitle(ad.title || "");
    setText(ad.text || "");
    setImage(ad.image || "");
  }, [ad]);

  function pickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) return onMsg("That file isn't an image");
    if (file.size > MAX_IMAGE_BYTES) return onMsg("Image too large — keep it under ~1.4 MB");
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!title.trim() && !text.trim() && !image) return onMsg("Add a title, text or image first");
    setBusy(true);
    try {
      await onSave({ title, text, image });
      onMsg("Ad published — users will see it on their next visit");
    } catch (e) {
      onMsg(e.message || "Could not save the ad");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rdfd-settings-block">
      <div className="rdfd-toggle-label">
        <Megaphone size={13} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
        Ad / announcement content
      </div>
      <div className="rdfd-toggle-hint">
        Shown as a popup once per visit when the toggle above is on. Saving publishes a new
        version, so everyone sees it again.
      </div>

      <div className="rdfd-content-form">
        <input
          placeholder="Title"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Message text…"
          value={text}
          maxLength={2000}
          rows={3}
          onChange={(e) => setText(e.target.value)}
        />

        {image ? (
          <div className="rdfd-content-imgwrap">
            <img src={image} alt="Ad preview" />
            <button type="button" onClick={() => setImage("")} aria-label="Remove image">
              <X size={14} />
            </button>
          </div>
        ) : (
          <button type="button" className="rdfd-content-imgbtn" onClick={() => fileRef.current?.click()}>
            <ImagePlus size={14} /> Add image
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickImage} />

        <button type="button" className="rdfd-settings-export" onClick={save} disabled={busy}>
          {busy ? "Publishing…" : "Publish ad"}
        </button>
      </div>
    </div>
  );
}

// ---- Leaderboard manager ------------------------------------------------
export function LeaderboardManager({ leaderboard, onSave, onMsg }) {
  const [title, setTitle] = useState("Top Performers");
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!leaderboard) return;
    setTitle(leaderboard.title || "Top Performers");
    setRows((leaderboard.players || []).map((p) => ({ ...p, score: String(p.score) })));
  }, [leaderboard]);

  function setRow(i, patch) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, { name: "", playerId: "", score: "" }]);
  }
  function removeRow(i) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    const players = [];
    for (const r of rows) {
      if (!r.name.trim() && !r.score.trim()) continue; // skip fully empty rows
      if (!r.name.trim()) return onMsg("Every player needs a name");
      const score = Number(r.score);
      if (!Number.isFinite(score)) return onMsg(`"${r.name}" needs a valid score`);
      players.push({ name: r.name.trim(), playerId: r.playerId.trim(), score });
    }
    setBusy(true);
    try {
      await onSave({ title, players });
      onMsg("Leaderboard saved — ranks auto-arranged by score");
    } catch (e) {
      onMsg(e.message || "Could not save the leaderboard");
    } finally {
      setBusy(false);
    }
  }

  // live preview of the resulting order
  const ranked = rows
    .filter((r) => r.name.trim())
    .map((r) => ({ ...r, n: Number(r.score) || 0 }))
    .sort((a, b) => b.n - a.n);

  return (
    <div className="rdfd-settings-block">
      <div className="rdfd-toggle-label">
        <Trophy size={13} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
        Game banner — leaderboard
      </div>
      <div className="rdfd-toggle-hint">
        Enter names and scores in any order — ranks (1st, 2nd, 3rd, 4th…) are arranged
        automatically by score, highest first. Add or remove as many as you like.
      </div>

      <div className="rdfd-content-form">
        <input
          placeholder="Banner title"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
        />

        {rows.map((r, i) => (
          <div key={i} className="rdfd-lb-row">
            <input
              placeholder="Name"
              value={r.name}
              maxLength={60}
              onChange={(e) => setRow(i, { name: e.target.value })}
            />
            <input
              placeholder="ID"
              value={r.playerId}
              maxLength={60}
              onChange={(e) => setRow(i, { playerId: e.target.value })}
            />
            <input
              placeholder="Score"
              inputMode="numeric"
              value={r.score}
              onChange={(e) => setRow(i, { score: e.target.value })}
            />
            <button type="button" className="rdfd-lb-del" onClick={() => removeRow(i)} aria-label="Remove player">
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        <button type="button" className="rdfd-content-imgbtn" onClick={addRow}>
          <Plus size={14} /> Add player
        </button>

        {ranked.length > 0 && (
          <div className="rdfd-toggle-hint">
            Order preview:{" "}
            {ranked.map((r, i) => `${i + 1}. ${r.name.trim()}`).join("  ·  ")}
          </div>
        )}

        <button type="button" className="rdfd-settings-export" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save leaderboard"}
        </button>
      </div>
    </div>
  );
}
