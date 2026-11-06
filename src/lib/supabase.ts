import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase-klient. Anon-nøkkelen er offentlig BY DESIGN — sikkerheten ligger i
 * Row Level Security (RLS), som kun slipper inn autentiserte brukere med egne rader.
 * (POC: verdiene er hardkodet som i Belast.)
 */

const SUPABASE_URL = 'https://trfenxumizhgtrgwnill.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Y3iyAkeX3HHea8M0VAyRrw_AaP5x5qi';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});

/** Intern e-post som brukes bak brukernavnet "spl" (må aldri vises i UI). */
export const INTERNAL_EMAIL = 'spl@spondplan.app';
export const AUTH_USERNAME = 'spl';

export function usernameToEmail(username: string): string {
  return username.trim().toLowerCase() === AUTH_USERNAME
    ? INTERNAL_EMAIL
    : `${username.trim().toLowerCase()}@spondplan.app`;
}
