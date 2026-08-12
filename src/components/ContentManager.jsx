import { useEffect, useRef, useState } from "react";
import { Megaphone, Trophy, Trash2, Plus, ImagePlus, X, Wrench } from "lucide-react";

// The server caps each stored image (a base64 data URL) at ~2,000,000 chars.
// Rather than reject big files, we downscale + re-encode them in the browser
// so ordinary phone photos (often several MB) upload reliably. We aim well
// under the cap and step the JPEG quality down until it fits.
const MAX_IMAGE_CHARS = 1_900_000;
const MAX_IMAGE_DIM = 1400;

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.onload = () => {
      const src = String(reader.result);
      // SVGs are vector — don't rasterize; keep as-is if within the cap.
      if (file.type === "image/svg+xml") {
        if (src.length > MAX_IMAGE_CHARS) return reject(new Error("That image is too large"));
        return resolve(src);
      }
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't a valid image"));
      img.onload = () => {
        let { width, height } = img;
        if (!width || !height) return resolve(src);
        const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        // White matte so transparent PNGs don't flatten to black as JPEG.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.85;
        let out = canvas.toDataURL("image/jpeg", quality);
        while (out.length > MAX_IMAGE_CHARS && quality > 0.4) {
          quality -= 0.1;
          out = canvas.toDataURL("image/jpeg", quality);
        }
        if (out.length > MAX_IMAGE_CHARS)
          return reject(new Error("That image is too large — try a smaller one"));
        resolve(out);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

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

  async function pickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) return onMsg("That file isn't an image");
    try {
      setImage(await fileToDataUrl(file));
    } catch (err) {
      onMsg(err.message || "Could not add that image");
    }
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

// ---- Maintenance page editor --------------------------------------------
const MAX_MAINT_IMAGES = 8;

export function MaintenanceEditor({ maintenance, onSave, onMsg }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!maintenance) return;
    setTitle(maintenance.title || "");
    setText(maintenance.text || "");
    // Back-compat: older saves stored a single `image` string.
    setImages(maintenance.images || (maintenance.image ? [maintenance.image] : []));
  }, [maintenance]);

  async function pickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return onMsg("That file isn't an image");
    try {
      const dataUrl = await fileToDataUrl(file);
      setImages((prev) => [...prev, dataUrl]);
    } catch (err) {
      onMsg(err.message || "Could not add that image");
    }
  }

  function removeImage(i) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    setBusy(true);
    try {
      await onSave({ title, text, images });
      onMsg("Maintenance page saved");
    } catch (e) {
      onMsg(e.message || "Could not save the maintenance page");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rdfd-settings-block">
      <div className="rdfd-toggle-label">
        <Wrench size={13} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
        Maintenance page
      </div>
      <div className="rdfd-toggle-hint">
        What visitors see when maintenance mode is on. Add several images and each visitor
        is shown one at random. Leave everything empty to use the default sketched cone.
      </div>

      <div className="rdfd-content-form">
        <input
          placeholder="Title (default: Back in a moment)"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Message (default: The register is temporarily closed for maintenance…)"
          value={text}
          maxLength={1000}
          rows={3}
          onChange={(e) => setText(e.target.value)}
        />

        {images.length > 0 && (
          <div className="rdfd-maint-gallery">
            {images.map((img, i) => (
              <div key={i} className="rdfd-content-imgwrap rdfd-maint-thumb">
                <img src={img} alt={`Maintenance image ${i + 1}`} />
                <button type="button" onClick={() => removeImage(i)} aria-label="Remove image">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {images.length < MAX_MAINT_IMAGES && (
          <button type="button" className="rdfd-content-imgbtn" onClick={() => fileRef.current?.click()}>
            <ImagePlus size={14} />
            {images.length === 0 ? "Add image (replaces the default cone)" : `Add another (${images.length}/${MAX_MAINT_IMAGES})`}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickImage} />

        <button type="button" className="rdfd-settings-export" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save maintenance page"}
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
        automatically by score, highest first. Add as many players as you like: the banner
        shows the top 3, and visitors can tap it to see the full order. Players on the same
        score share a rank and are marked "Draw".
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
