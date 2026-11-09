import { sb } from './supabase';

export interface FeedbackRow {
  id: number;
  user_id: string;
  username: string;
  rating: number;
  content: string;
  created_at: string;
}

const COLUMNS = 'id, user_id, rating, content, created_at, profiles(username)';

interface RawRow {
  id: number;
  user_id: string;
  rating: number;
  content: string;
  created_at: string;
  profiles: { username: string } | { username: string }[] | null;
}

function toRow(raw: RawRow): FeedbackRow {
  const profile = Array.isArray(raw.profiles) ? raw.profiles[0] : raw.profiles;
  return {
    id: raw.id,
    user_id: raw.user_id,
    rating: raw.rating,
    content: raw.content,
    created_at: raw.created_at,
    username: profile?.username ?? '알 수 없음',
  };
}

export async function fetchFeedback(limit = 20): Promise<FeedbackRow[]> {
  const { data, error } = await sb()
    .from('feedback')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as RawRow[]).map(toRow);
}

/** user_id는 DB 기본값(auth.uid())으로 채워진다 */
export async function createFeedback(rating: number, content: string): Promise<FeedbackRow> {
  const { data, error } = await sb().from('feedback').insert({ rating, content }).select(COLUMNS).single();
  if (error) throw error;
  return toRow(data as unknown as RawRow);
}

export async function deleteFeedback(id: number): Promise<void> {
  const { error } = await sb().from('feedback').delete().eq('id', id);
  if (error) throw error;
}
