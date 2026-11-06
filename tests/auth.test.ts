import { describe, expect, it } from 'vitest';
import { usernameToEmail, AUTH_USERNAME, INTERNAL_EMAIL } from '../src/lib/supabase';

describe('usernameToEmail', () => {
  it('oversetter det interne brukernavnet til intern e-post', () => {
    expect(usernameToEmail(AUTH_USERNAME)).toBe(INTERNAL_EMAIL);
    expect(usernameToEmail('  SPL ')).toBe(INTERNAL_EMAIL);
  });

  it('oversetter vilkårlige brukernavn til @spondplan.app, trimmet og små bokstaver', () => {
    expect(usernameToEmail('Bjorn')).toBe('bjorn@spondplan.app');
    expect(usernameToEmail('  Coach Ole  ')).toBe('coach ole@spondplan.app');
  });
});
