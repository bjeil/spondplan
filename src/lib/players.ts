import { db } from './db';
import { supabase } from './supabase';
import { getUserId } from './auth';
import type { Player } from './types';
import type { SpondGroup } from './spond/types';

export function validateLevel(level: number): level is 1 | 2 | 3 | 4 | 5 {
  return Number.isInteger(level) && level >= 1 && level <= 5;
}

export async function listPlayers(): Promise<Player[]> {
  // NB: sorter i minnet — «name» er ikke en Dexie-indeks, orderBy('name') feiler.
  const players = await db.players.toArray();
  return players.filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name, 'nb'));
}

export async function upsertPlayer(player: Player): Promise<void> {
  if (!validateLevel(player.level)) throw new Error('Nivå må være 1–5');
  const updatedAt = new Date().toISOString();
  await db.players.put({ ...player, updatedAt });
  const userId = await getUserId();
  if (userId) {
    await supabase.from('players').upsert({
      id: player.id,
      user_id: userId,
      name: player.name,
      spond_member_id: player.spondMemberId,
      level: player.level,
      active: player.active,
      updated_at: updatedAt
    });
  }
}

export async function setPlayerLevel(id: string, level: number): Promise<void> {
  if (!validateLevel(level)) throw new Error('Nivå må være 1–5');
  const existing = await db.players.get(id);
  if (!existing) throw new Error('Ukjent spiller');
  await upsertPlayer({ ...existing, level });
}

/** Resultat av en Spond-synkronisering. */
export interface SyncResult {
  added: Player[];
  updatedNames: Player[];
  deactivated: Player[];
}

/**
 * Pure: fletter Spond-gruppens medlemmer inn i lokal spiller-database.
 * - Nye medlemmer legges til med standard nivå 3.
 * - Eksisterende (match på spondMemberId) får oppdatert navn, men BEHOLDER nivå.
 * - Lokale spillere som ikke lenger er i Spond-gruppen deaktiveres ikke automatisk
 *   (de kan være i en annen gruppe) — kun retur av de som faktisk ble funnet.
 */
export function mergeSpondMembers(existing: Player[], group: SpondGroup, now = new Date().toISOString()): SyncResult {
  const byMemberId = new Map(existing.filter((p) => p.spondMemberId).map((p) => [p.spondMemberId!, p]));
  const added: Player[] = [];
  const updatedNames: Player[] = [];
  for (const m of group.members) {
    const found = byMemberId.get(m.id);
    if (found) {
      if (found.name !== m.name) {
        updatedNames.push({ ...found, name: m.name, updatedAt: now });
      }
    } else {
      added.push({
        id: crypto.randomUUID(),
        name: m.name,
        spondMemberId: m.id,
        level: 3,
        active: true,
        updatedAt: now
      });
    }
  }
  return { added, updatedNames, deactivated: [] };
}

/** Synkroniser spillere fra valgt Spond-gruppe (lokal Dexie + Supabase). */
export async function syncPlayersFromGroup(group: SpondGroup): Promise<SyncResult> {
  const existing = await db.players.toArray();
  const result = mergeSpondMembers(existing, group);
  for (const p of [...result.added, ...result.updatedNames]) {
    await upsertPlayer(p);
  }
  return result;
}
