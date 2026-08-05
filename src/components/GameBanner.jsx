import { Trophy } from "lucide-react";

const MEDALS = ["🥇", "🥈", "🥉"];

// Leaderboard card shown just below the topbar. Players arrive pre-sorted
// by score from the server; we sort again defensively anyway.
export default function GameBanner({ leaderboard }) {
  const players = [...(leaderboard?.players || [])].sort((a, b) => b.score - a.score);
  if (players.length === 0) return null;

  return (
    <div className="rdfd-game-banner">
      <div className="rdfd-game-banner-head">
        <Trophy size={15} />
        <span>{leaderboard.title || "Top Performers"}</span>
      </div>

      <div className="rdfd-game-rows">
        {players.map((p, i) => (
          <div key={`${p.name}-${i}`} className={`rdfd-game-row rank-${i + 1}`}>
            <span className="rdfd-game-medal">{MEDALS[i] || `#${i + 1}`}</span>
            <span className="rdfd-game-name">
              {p.name}
              {p.playerId && <span className="rdfd-game-id">{p.playerId}</span>}
            </span>
            <span className="rdfd-game-score">{p.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
