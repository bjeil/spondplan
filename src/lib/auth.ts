import { supabase, usernameToEmail } from './supabase';

/**
 * Innlogging via Supabase Auth. Brukernavnet oversettes til en intern
 * e-post — brukeren ser aldri e-postadressen. Økten lagres av Supabase
 * (localStorage) og overlever lukking av appen.
 */

export async function login(username: string, password: string): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password
  });
  return !error;
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export async function isLoggedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

/** Hent innlogget bruker-id (nødvendig for synk). */
export async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Abonner på endringer i innloggingsstatus (login/logout/session refresh). */
export function onAuthChange(callback: (loggedIn: boolean) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(!!session);
  });
  return () => data.subscription.unsubscribe();
}
