import { createClient } from '@supabase/supabase-js';
import type { Card, Release } from './types';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function fetchReleases(): Promise<Release[]> {
  const { data, error } = await supabase
    .from('releases')
    .select('*')
    .order('number');
  if (error) throw error;
  return data;
}

export async function fetchCardsByRelease(releaseId: number): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*, release:releases(*)')
    .eq('release_id', releaseId)
    .order('type')
    .order('name');
  if (error) throw error;
  return data;
}

export async function fetchCardsByReleaseIds(ids: number[]): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*, release:releases(*)')
    .in('release_id', ids)
    .order('release_id')
    .order('type')
    .order('name');
  if (error) throw error;
  return data;
}

export async function fetchAllCards(): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*, release:releases(*)')
    .order('release_id')
    .order('type')
    .order('name');
  if (error) throw error;
  return data;
}
