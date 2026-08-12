import { useState } from "react";
import { Trophy, ChevronDown } from "lucide-react";

const MEDALS = ["🥇", "🥈", "🥉"];
const TOP_N = 3; // only the top 3 show until a visitor expands the banner

// Leaderboard card shown just below the topbar. Players arrive pre-sorted
// by score from the server; we sort again defensively anyway.
export default function GameBanner({ leaderboard }) {
  const [expanded, setExpanded] = useState(false);
  const players = [...(leaderboard?.players || [])].sort((a, b) => b.score - a.score);
  if (players.length === 0) return null;

  // Competition ranking: players with the same score share a rank (1, 1, 3…)
  // so a tie isn't shown as 1st and 2nd. The next distinct score picks up at
  // its position, as in sports standings.
  let lastScore = null;
  let lastRank = 0;
  const ranked = players.map((p, i) => {
    const rank = lastScore !== null && p.score === lastScore ? lastRank : i + 1;
    lastScore = p.score;
    lastRank = rank;
    return { ...p, rank };
  });

  // How many players share each score, so a tie can be flagged with a "Draw"
  // badge (two people on 10 pts both read as joint-1st, not 1st and 2nd).
  const scoreCounts = ranked.reduce((m, p) => {
    m[p.score] = (m[p.score] || 0) + 1;
    return m;
  }, {});

  const hasMore = ranked.length > TOP_N;
  const shown = expanded ? ranked : ranked.slice(0, TOP_N);

  return (
    <div className={`rdfd-game-banner${hasMore ? " is-expandable" : ""}`}>
      <button
        type="button"
        className="rdfd-game-banner-head"
        onClick={() => hasMore && setExpanded((v) => !v)}
        disabled={!hasMore}
        aria-expanded={hasMore ? expanded : undefined}
      >
        <Trophy size={15} />
        <span className="rdfd-game-title">{leaderboard.title || "Top Performers"}</span>
        {hasMore && (
          <span className="rdfd-game-toggle">
            {expanded ? "Show top 3" : `See all ${ranked.length}`}
            <ChevronDown size={14} className={expanded ? "rot" : ""} />
          </span>
        )}
      </button>

      <div className="rdfd-game-rows">
        {shown.map((p, i) => {
          const isDraw = scoreCounts[p.score] > 1;
          return (
            <div key={`${p.name}-${i}`} className={`rdfd-game-row rank-${p.rank}`}>
              <span className="rdfd-game-medal">{MEDALS[p.rank - 1] || `#${p.rank}`}</span>
              <span className="rdfd-game-name">
                {p.name}
                {p.playerId && <span className="rdfd-game-id">{p.playerId}</span>}
              </span>
              {isDraw && <span className="rdfd-game-draw">Draw</span>}
              <span className="rdfd-game-score">{p.score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
