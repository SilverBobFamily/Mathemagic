import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserPreferences {
  activeReleaseIds: number[] | null;  // null = not set in DB yet
  learningMode: boolean;
}

/**
 * Load preferences from the DB for the currently logged-in user.
 * Returns null if not logged in or DB fetch fails.
 */
export async function loadPreferencesFromDb(
  supabase: SupabaseClient
): Promise<UserPreferences | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('players')
    .select('active_release_ids, learning_mode')
    .eq('id', user.id)
    .single();

  if (error || !data) return null;

  return {
    activeReleaseIds: data.active_release_ids ?? null,
    learningMode: data.learning_mode ?? false,
  };
}

/**
 * Save preferences to the DB for the currently logged-in user.
 * No-op if not logged in.
 */
export async function savePreferencesToDb(
  supabase: SupabaseClient,
  prefs: UserPreferences
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('players')
    .update({
      active_release_ids: prefs.activeReleaseIds,
      learning_mode: prefs.learningMode,
    })
    .eq('id', user.id);
}
