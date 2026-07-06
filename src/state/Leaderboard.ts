export interface LeaderboardEntry {
  name: string;
  score: number;
  character: string;
  stage: string;
  level: number;
  created_at?: string;
}

/**
 * Talks to our own /api/leaderboard serverless function (see api/leaderboard.ts),
 * which proxies a Turso database. Never call a database token directly from
 * the browser — the API route is what keeps write access safe.
 */
export async function submitScore(entry: LeaderboardEntry): Promise<boolean> {
  try {
    const res = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: entry.name.slice(0, 16),
        score: Math.round(entry.score),
        character: entry.character,
        stage: entry.stage,
        level: entry.level,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Returns null when the leaderboard backend isn't configured/reachable
 * yet (so the UI can show "coming soon" instead of "no scores"). */
export async function fetchTopScores(limit = 50): Promise<LeaderboardEntry[] | null> {
  try {
    const res = await fetch(`/api/leaderboard?limit=${limit}`);
    if (!res.ok) return null;
    return (await res.json()) as LeaderboardEntry[];
  } catch {
    return null;
  }
}
