import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase-klient. Anon-nøkkelen er offentlig BY DESIGN — sikkerheten ligger i
 * Row Level Security (RLS), som kun slipper inn autentiserte brukere med egne rader.
 *
 * Eneste miljø (issue #11): Supabase-prosjekt "sandbox" (skjema "spondplan").
 * URL/nøkkel kommer fra VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (.env, gitignored);
 * fallback-konstantene under skal settes til sandbox-prosjektets verdier.
 */

// NB: placeholder — erstatt med sandbox-prosjektets faktiske verdier (eller bruk .env).
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://SANDBOX_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_SANDBOX_ANON_KEY';

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
