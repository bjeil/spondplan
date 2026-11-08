import { describe, expect, it } from 'vitest';
import type { Drill, Player } from '../src/lib/types';

describe('datamodell-typer', () => {
  it('Player.level er 1–5', () => {
    const p: Player = {
      id: 'p1',
      name: 'Ola',
      spondMemberId: 'm1',
      spondGroupId: 'g1',
      level: 3,
      active: true,
      updatedAt: new Date().toISOString()
    };
    expect(p.level).toBeGreaterThanOrEqual(1);
    expect(p.level).toBeLessThanOrEqual(5);
  });

  it('Drill støtter balansert/differensiert gruppering', () => {
    const d: Drill = {
      id: 'd1',
      planId: 'pl1',
      title: 'Pasninger',
      durationMin: 15,
      description: null,
      topicId: null,
      groupCount: 2,
      groupingMode: 'balanced',
      sortOrder: 0,
      coachingPointIds: [],
      updatedAt: new Date().toISOString()
    };
    expect(['balanced', 'differentiated']).toContain(d.groupingMode);
  });
});
