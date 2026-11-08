import { describe, expect, it } from 'vitest';
import { mergeSpondMembers, validateLevel } from '../src/lib/players';
import type { Player } from '../src/lib/types';
import type { SpondGroup } from '../src/lib/spond/types';

const now = '2026-10-29T12:00:00.000Z';

function player(id: string, memberId: string | null, name: string, level: Player['level'] = 3): Player {
  return { id, name, spondMemberId: memberId, level, active: true, updatedAt: now };
}

describe('validateLevel', () => {
  it('godtar 1–5', () => {
    for (const l of [1, 2, 3, 4, 5]) expect(validateLevel(l)).toBe(true);
  });
  it('avviser utenfor 1–5 og ikke-heltall', () => {
    for (const l of [0, 6, -1, 2.5, NaN]) expect(validateLevel(l)).toBe(false);
  });
});

describe('mergeSpondMembers', () => {
  const group: SpondGroup = {
    id: 'g1',
    name: 'Gutt 2013',
    members: [
      { id: 'm1', name: 'Ola Nordmann' },
      { id: 'm2', name: 'Kari Hansen' },
      { id: 'm3', name: 'Per Ny' } // nytt navn for eksisterende m3
    ]
  };

  it('legger til nye medlemmer med nivå 3, oppdaterer navn, beholder nivå', () => {
    const existing = [player('p1', 'm1', 'Ola Nordmann', 5), player('p3', 'm3', 'Per Gammel', 2)];
    const result = mergeSpondMembers(existing, group, now);

    expect(result.added).toHaveLength(1);
    expect(result.added[0]).toMatchObject({ spondMemberId: 'm2', name: 'Kari Hansen', level: 3 });
    expect(result.updatedNames).toHaveLength(1);
    expect(result.updatedNames[0]).toMatchObject({ id: 'p3', name: 'Per Ny', level: 2 });
  });

  it('endrer ikke nivå på eksisterende spillere selv om navn er likt', () => {
    const existing = [player('p1', 'm1', 'Ola Nordmann', 1)];
    const result = mergeSpondMembers(existing, { id: 'g1', name: 'G', members: [{ id: 'm1', name: 'Ola Nordmann' }] }, now);
    expect(result.added).toHaveLength(0);
    expect(result.updatedNames).toHaveLength(0);
  });

  it('ignorerer lokale spillere uten spondMemberId ved matching', () => {
    const existing = [player('p9', null, 'Kari Hansen', 4)];
    const result = mergeSpondMembers(existing, group, now);
    // Kari fra Spond (m2) skal ikke matches mot lokal p9 uten member-id
    expect(result.added.some((p) => p.spondMemberId === 'm2')).toBe(true);
  });
});
