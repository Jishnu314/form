import { useMemo } from "react";

// Hand-drawn "closed for maintenance" notice.
// The default illustration is an inline SVG drawn in a loose pencil-sketch style —
// wobbly strokes, rough hatching — so it feels friendly rather than alarming.
// The admin can upload one or more images in Admin controls → Maintenance page;
// each visit shows one of them at random. Empty fields fall back to the defaults.
export default function MaintenanceNotice({ custom }) {
  const title = custom?.title?.trim() || "Back in a moment";
  const text =
    custom?.text?.trim() ||
    "The register is temporarily closed for maintenance.\nPlease check back soon.";

  // Back-compat: older saves stored a single `image` string.
  const images = custom?.images?.length ? custom.images : custom?.image ? [custom.image] : [];

  // Picked once per mount, so it doesn't flicker on re-renders but each
  // page load / device can land on a different one.
  const image = useMemo(
    () => (images.length ? images[Math.floor(Math.random() * images.length)] : ""),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [images.length]
  );

  return (
    <div className="rdfd-maintenance">
      {image ? (
        <img className="rdfd-maintenance-art rdfd-maintenance-img" src={image} alt="Closed for maintenance" />
      ) : (
        <svg
        className="rdfd-maintenance-art"
        viewBox="0 0 200 170"
        role="img"
        aria-label="Hand-drawn traffic cone"
      >
        {/* ground shadow — loose scribble ellipse */}
        <ellipse cx="100" cy="148" rx="52" ry="9" fill="#142240" opacity="0.08" />

        {/* base slab, slightly tilted like a quick sketch */}
        <path
          d="M46 141 Q47 136.5 52 136 L148 135 Q154 135.5 154.5 140 Q154 145 149 145.5 L52 146.5 Q46.5 146 46 141 Z"
          fill="#f7f3e8"
          stroke="#142240"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />

        {/* cone body — wobbly outline */}
        <path
          d="M93 34 Q96 26 100 26 Q104 26 107 34
             L114 62 L121 90 L129 118 L133 133
             Q120 138 100 138 Q80 138 67 133
             L71 118 L79 90 L86 62 Z"
          fill="#e2662f"
          stroke="#142240"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />

        {/* white stripes with hand-drawn wiggle */}
        <path
          d="M84.5 68 Q100 72 115.5 68 L119.5 84 Q100 88.5 80.5 84 Z"
          fill="#fdfaf2"
          stroke="#142240"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M77 98 Q100 103 123 98 L127 113 Q100 118.5 73 113 Z"
          fill="#fdfaf2"
          stroke="#142240"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* pencil hatching on the cone tip */}
        <g stroke="#142240" strokeWidth="1.1" opacity="0.35" strokeLinecap="round">
          <path d="M95 38 L102 45" />
          <path d="M93 46 L103 55" />
          <path d="M91 54 L106 62" />
        </g>

        {/* little sketch sparks — "we're working on it" energy */}
        <g stroke="#b8873a" strokeWidth="2.2" strokeLinecap="round" fill="none">
          <path d="M64 40 Q66 38 68 40" />
          <path d="M139 52 L146 47" />
          <path d="M143 60 L151 59" />
          <path d="M55 55 L48 51" />
          <path d="M58 64 L50 65" />
        </g>

        {/* tiny scribble face on the cone (friendly, like the moodboard) */}
        <g stroke="#142240" strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M94 74 Q94.5 76 94 78" />
          <path d="M106 74 Q106.5 76 106 78" />
          <path d="M96 91 Q100 94 104 91" />
        </g>
      </svg>
      )}

      <div className="rdfd-maintenance-title">{title}</div>
      <div className="rdfd-maintenance-text">
        {text.split("\n").map((line, i, arr) => (
          <span key={i}>
            {line}
            {i < arr.length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  );
}
