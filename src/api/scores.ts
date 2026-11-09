import { sb } from './supabase';

export interface LeaderRow {
  user_id: string;
  username: string;
  score: number;
  level: number;
  lines: number;
  created_at: string;
}

export interface ScoreRow {
  score: number;
  level: number;
  lines: number;
  created_at: string;
}

export interface MyStats {
  best: LeaderRow | null;
  rank: number | null;
  games: number;
  recent: ScoreRow[];
}

/** user_id는 DB 기본값(auth.uid())으로 채워진다 */
export async function saveScore(result: { score: number; level: number; lines: number }): Promise<void> {
  const { error } = await sb().from('scores').insert(result);
  if (error) throw error;
}

export async function fetchLeaderboard(limit = 10): Promise<LeaderRow[]> {
  const { data, error } = await sb()
    .from('leaderboard')
    .select('user_id, username, score, level, lines, created_at')
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as LeaderRow[];
}

export async function fetchMyStats(userId: string): Promise<MyStats> {
  const client = sb();
  const [bestRes, recentRes, gamesRes] = await Promise.all([
    client
      .from('leaderboard')
      .select('user_id, username, score, level, lines, created_at')
      .eq('user_id', userId)
      .maybeSingle(),
    client
      .from('scores')
      .select('score, level, lines, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    client.from('scores').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  if (bestRes.error) throw bestRes.error;
  if (recentRes.error) throw recentRes.error;
  if (gamesRes.error) throw gamesRes.error;

  const best = (bestRes.data as LeaderRow | null) ?? null;
  let rank: number | null = null;
  if (best) {
    const { count, error } = await client
      .from('leaderboard')
      .select('user_id', { count: 'exact', head: true })
      .gt('score', best.score);
    if (error) throw error;
    rank = (count ?? 0) + 1;
  }
  return { best, rank, games: gamesRes.count ?? 0, recent: (recentRes.data ?? []) as ScoreRow[] };
}
