import { createSupabaseBrowserClient } from './supabase-browser';

export interface PlayerProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  coins: number;
  games_won: number;
  games_played: number;
  created_at: string;
}

export async function getProfile(userId: string): Promise<PlayerProfile | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('players')
    .select('id, username, avatar_url, coins, games_won, games_played, created_at')
    .eq('id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return (data as PlayerProfile) ?? null;
}

export async function getProfileByUsername(username: string): Promise<PlayerProfile | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('players')
    .select('id, username, avatar_url, coins, games_won, games_played, created_at')
    .eq('username', username)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return (data as PlayerProfile) ?? null;
}

// Uploads file to Supabase Storage under {userId}/avatar.{ext}
// then writes the public URL to players.avatar_url.
// Returns the new public URL.
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);

  const { error: updateError } = await supabase
    .from('players')
    .update({ avatar_url: data.publicUrl })
    .eq('id', userId);
  if (updateError) throw new Error(updateError.message);

  // Append timestamp so the browser fetches the new image instead of cached version
  return `${data.publicUrl}?v=${Date.now()}`;
}
