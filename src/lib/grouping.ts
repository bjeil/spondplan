export interface GroupablePlayer {
  id: string;
  name: string;
  level: number;
}

export type GroupingMode = 'balanced' | 'differentiated';

/**
 * Foreslå gruppeinndeling.
 * - balanced: "snake draft" etter nivå (høyest først) → mest mulig like snitt per gruppe.
 * - differentiated: kontinuerlige blokker etter nivå → bevisste forskjeller mellom grupper.
 * Returnerer grupper som lister av playerId, størrelse varierer med maks 1.
 */
export function suggestGroups(players: GroupablePlayer[], groupCount: number, mode: GroupingMode): string[][] {
  if (groupCount < 1) throw new Error('Minst én gruppe kreves');
  const sorted = [...players].sort((a, b) => b.level - a.level || a.name.localeCompare(b.name, 'nb'));
  const groups: string[][] = Array.from({ length: groupCount }, () => []);
  if (mode === 'balanced') {
    sorted.forEach((p, i) => {
      const round = Math.floor(i / groupCount);
      const idx = round % 2 === 0 ? i % groupCount : groupCount - 1 - (i % groupCount);
      groups[idx].push(p.id);
    });
  } else {
    const base = Math.floor(sorted.length / groupCount);
    const remainder = sorted.length % groupCount;
    let start = 0;
    for (let g = 0; g < groupCount; g++) {
      const size = base + (g < remainder ? 1 : 0);
      groups[g] = sorted.slice(start, start + size).map((p) => p.id);
      start += size;
    }
  }
  return groups;
}

/** Snitt av nivåer per gruppe — nyttig for tester og ev. visning. */
export function groupAverages(players: GroupablePlayer[], groups: string[][]): number[] {
  const levelById = new Map(players.map((p) => [p.id, p.level]));
  return groups.map((g) => (g.length ? g.reduce((s, id) => s + (levelById.get(id) ?? 3), 0) / g.length : 0));
}
