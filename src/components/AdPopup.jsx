import { useEffect, useState } from "react";
import { X, Megaphone } from "lucide-react";

// Ad announcement popup:
//  - opens automatically once per browser session (per ad version, so a
//    re-published ad shows again even if the old one was dismissed)
//  - closing it leaves a small floating icon in the corner to reopen it
export default function AdPopup({ ad }) {
  const hasContent = ad && (ad.title || ad.text || ad.image);
  const seenKey = `rdfd-ad-seen-v${ad?.version || 0}`;

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasContent) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem(seenKey) === "1";
    } catch (e) {
      /* storage blocked — just show it */
    }
    if (!seen) setOpen(true);
  }, [seenKey, hasContent]);

  if (!hasContent) return null;

  function close() {
    setOpen(false);
    try {
      sessionStorage.setItem(seenKey, "1");
    } catch (e) {
      /* ignore */
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="rdfd-ad-fab"
        onClick={() => setOpen(true)}
        aria-label="View announcement"
        title="View announcement"
      >
        <Megaphone size={20} />
        <span className="rdfd-ad-fab-ping" />
      </button>
    );
  }

  return (
    <div className="rdfd-ad-overlay" onClick={close} role="dialog" aria-modal="true">
      <div className="rdfd-ad-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="rdfd-ad-close" onClick={close} aria-label="Close">
          <X size={18} />
        </button>

        {ad.image && <img className="rdfd-ad-image" src={ad.image} alt="" />}

        <div className="rdfd-ad-body">
          {ad.title && <div className="rdfd-ad-title">{ad.title}</div>}
          {ad.text && <div className="rdfd-ad-text">{ad.text}</div>}
        </div>

        <button type="button" className="rdfd-ad-dismiss" onClick={close}>
          Close
        </button>
      </div>
    </div>
  );
}
