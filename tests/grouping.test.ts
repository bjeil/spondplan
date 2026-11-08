import { describe, expect, it } from 'vitest';
import { groupAverages, suggestGroups, type GroupablePlayer } from '../src/lib/grouping';
import { diffAttendance } from '../src/lib/sessions';

function pl(id: string, level: number): GroupablePlayer {
  return { id, name: `P${id}`, level };
}

describe('suggestGroups balanced', () => {
  it('deler 8 spillere på 2 grupper med like summer (snake draft)', () => {
    const players = [5, 4, 4, 3, 3, 2, 2, 1].map((l, i) => pl(String(i), l));
    const groups = suggestGroups(players, 2, 'balanced');
    expect(groups.flat()).toHaveLength(8);
    const avgs = groupAverages(players, groups);
    expect(Math.abs(avgs[0] - avgs[1])).toBeLessThanOrEqual(0.6);
  });

  it('håndterer flere grupper enn spillere', () => {
    const groups = suggestGroups([pl('a', 5), pl('b', 1)], 4, 'balanced');
    expect(groups).toHaveLength(4);
    expect(groups.flat().sort()).toEqual(['a', 'b']);
  });
});

describe('suggestGroups differentiated', () => {
  it('gir bevisste forskjeller i snitt mellom grupper', () => {
    const players = [5, 5, 4, 4, 2, 2, 1, 1].map((l, i) => pl(String(i), l));
    const groups = suggestGroups(players, 2, 'differentiated');
    const avgs = groupAverages(players, groups);
    expect(avgs[0]).toBeGreaterThan(avgs[1]);
    expect(avgs[0] - avgs[1]).toBeGreaterThanOrEqual(2);
  });
});

describe('diffAttendance', () => {
  it('finner nye og fjernede spillere', () => {
    const diff = diffAttendance(
      [{ spondMemberId: 'a' }, { spondMemberId: 'b' }],
      [{ memberId: 'b' }, { memberId: 'c' }]
    );
    expect(diff.addedIds).toEqual(['c']);
    expect(diff.removedIds).toEqual(['a']);
  });
});
