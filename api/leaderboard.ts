import { createClient } from '@libsql/client';

// Vercel injects standard Node req/res into functions under /api — no
// framework dependency needed for a single lightweight route like this.
interface ApiRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  body: unknown;
}
interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): void;
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  character TEXT,
  stage TEXT,
  level INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
)`;

function getClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) return null;
  return createClient({ url, authToken });
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  const client = getClient();
  if (!client) {
    res.status(503).json({ error: 'Leaderboard is not configured yet.' });
    return;
  }

  try {
    await client.execute(SCHEMA);

    if (req.method === 'GET') {
      const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
      const limit = Math.max(1, Math.min(Number(rawLimit) || 50, 100));
      const result = await client.execute({
        sql: 'SELECT name, score, character, stage, level, created_at FROM scores ORDER BY score DESC LIMIT ?',
        args: [limit],
      });
      res.status(200).json(result.rows);
      return;
    }

    if (req.method === 'POST') {
      const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as Record<string, unknown>;
      const name = String(body?.name ?? 'Player').slice(0, 16) || 'Player';
      const score = Math.max(0, Math.min(Math.round(Number(body?.score)) || 0, 10_000_000));
      const character = String(body?.character ?? '').slice(0, 40);
      const stage = String(body?.stage ?? '').slice(0, 40);
      const level = Math.max(0, Math.min(Math.round(Number(body?.level)) || 0, 1000));

      await client.execute({
        sql: 'INSERT INTO scores (name, score, character, stage, level) VALUES (?, ?, ?, ?, ?)',
        args: [name, score, character, stage, level],
      });
      res.status(201).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch {
    res.status(500).json({ error: 'Leaderboard request failed' });
  }
}
