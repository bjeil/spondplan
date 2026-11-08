import { db } from './db';
import { supabase } from './supabase';
import { getUserId } from './auth';
import { edgeSpondAdapter } from './spond/edgeAdapter';
import { suggestGroups, type GroupablePlayer, type GroupingMode } from './grouping';
import type { AttendanceHistoryEntry, Player, PlayerGroup, Session, SessionPlayer } from './types';
import type { SpondEvent } from './spond/types';

// ---------- Events ----------

export async function listUpcomingEvents(groupId: string, days = 30): Promise<SpondEvent[]> {
  const from = new Date();
  const to = new Date(Date.now() + days * 24 * 3600 * 1000);
  const events = await edgeSpondAdapter.listEvents(groupId, from, to);
  return events.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

// ---------- Sessions ----------

export async function listSessions(): Promise<Session[]> {
  const sessions = await db.sessions.toArray();
  return sessions.sort((a, b) => (b.eventStart ?? '').localeCompare(a.eventStart ?? ''));
}

export async function createSession(planId: string | null, event: SpondEvent): Promise<Session> {
  const session: Session = {
    id: crypto.randomUUID(),
    planId,
    spondEventId: event.id,
    eventHeading: event.heading,
    eventStart: event.startTime,
    createdAt: new Date().toISOString()
  };
  await db.sessions.put(session);
  const userId = await getUserId();
  if (userId) {
    await supabase.from('sessions').insert({
      id: session.id,
      user_id: userId,
      plan_id: planId,
      spond_event_id: event.id,
      event_heading: event.heading,
      event_start: event.startTime,
      created_at: session.createdAt
    });
  }
  return session;
}

// ---------- Oppmøte ----------

export interface AttendanceDiff {
  addedIds: string[];
  removedIds: string[];
}

/** Pure: diff mellom gammelt og nytt oppmøte (på spondMemberId). */
export function diffAttendance(
  oldEntries: Array<{ spondMemberId: string }>,
  newEntries: Array<{ memberId: string }>
): AttendanceDiff {
  const oldIds = new Set(oldEntries.map((e) => e.spondMemberId));
  const newIds = new Set(newEntries.map((e) => e.memberId));
  return {
    addedIds: [...newIds].filter((id) => !oldIds.has(id)),
    removedIds: [...oldIds].filter((id) => !newIds.has(id))
  };
}

/**
 * Importer oppmøte fra en Spond-event. Bevarer eksisterende gruppeinndeling for
 * spillere som fortsatt er med; nye spillere blir «ikke plassert», fjernede havner
 * i «ikke med»-listen. Logges i attendance_history.
 */
export async function importAttendance(sessionId: string): Promise<AttendanceDiff> {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new Error('Ukjent økt');
  const attendance = await edgeSpondAdapter.getAttendance(session.spondEventId);

  const existing = await db.sessionPlayers.where('sessionId').equals(sessionId).toArray();
  const players = await db.players.toArray();
  const playerByMemberId = new Map(players.filter((p) => p.spondMemberId).map((p) => [p.spondMemberId!, p]));

  const diff = diffAttendance(existing, attendance.entries);
  const now = new Date().toISOString();

  // Fjernede spillere: ut av grupper, inn i «ikke med»-listen (ikke slettet).
  for (const id of diff.removedIds) {
    const sp = existing.find((e) => e.spondMemberId === id);
    if (sp) {
      await db.sessionPlayers.put({ ...sp, removedFromGroups: true, updatedAt: now });
      await db.playerGroups.where('playerId').equals(sp.playerId ?? '').delete();
    }
  }

  // Nye/oppdaterte spillere fra Spond (kun accepted + unanswered er «tilgjengelige»;
  // declined lagres også, men filtreres bort i grupperingen).
  for (const entry of attendance.entries) {
    const old = existing.find((e) => e.spondMemberId === entry.memberId);
    const player = playerByMemberId.get(entry.memberId);
    const row: SessionPlayer = {
      id: old?.id ?? crypto.randomUUID(),
      sessionId,
      playerId: player?.id ?? old?.playerId ?? null,
      spondMemberId: entry.memberId,
      name: entry.name,
      responseStatus: entry.status,
      manuallyAdded: old?.manuallyAdded ?? false,
      removedFromGroups: false,
      updatedAt: now
    };
    await db.sessionPlayers.put(row);
    const userId = await getUserId();
    if (userId) {
      await supabase.from('session_players').upsert({
        id: row.id,
        session_id: sessionId,
        player_id: row.playerId,
        spond_member_id: row.spondMemberId,
        name: row.name,
        response_status: row.responseStatus,
        manually_added: row.manuallyAdded,
        removed_from_groups: row.removedFromGroups,
        updated_at: now
      });
    }
  }

  const history: AttendanceHistoryEntry = {
    id: crypto.randomUUID(),
    sessionId,
    fetchedAt: now,
    addedIds: diff.addedIds,
    removedIds: diff.removedIds
  };
  await db.attendanceHistory.put(history);
  const userId = await getUserId();
  if (userId) {
    await supabase.from('attendance_history').insert({
      id: history.id,
      session_id: sessionId,
      fetched_at: now,
      added_ids: diff.addedIds,
      removed_ids: diff.removedIds
    });
  }
  return diff;
}

export async function listSessionPlayers(sessionId: string): Promise<SessionPlayer[]> {
  const sps = await db.sessionPlayers.where('sessionId').equals(sessionId).toArray();
  return sps.sort((a, b) => a.name.localeCompare(b.name, 'nb'));
}

// ---------- Gruppering ----------

/** Tilgjengelige spillere for gruppering: accepted/unanswered og ikke fjernet. */
export async function availablePlayers(sessionId: string): Promise<Array<SessionPlayer & { level: number }>> {
  const sps = await listSessionPlayers(sessionId);
  const players = await db.players.toArray();
  const levelById = new Map(players.map((p) => [p.id, p.level]));
  return sps
    .filter((sp) => !sp.removedFromGroups && sp.responseStatus !== 'declined')
    .map((sp) => ({ ...sp, level: sp.playerId ? (levelById.get(sp.playerId) ?? 3) : 3 }));
}

export async function getGroups(sessionId: string, drillId: string): Promise<PlayerGroup[]> {
  return db.playerGroups.where(['sessionId', 'drillId']).equals([sessionId, drillId]).toArray();
}

/** Skriv gruppeinndeling for en øvelse (overskriver eksisterende for øvelsen). */
export async function setGroups(sessionId: string, drillId: string, groups: string[][]): Promise<void> {
  const now = new Date().toISOString();
  await db.playerGroups.where(['sessionId', 'drillId']).equals([sessionId, drillId]).delete();
  const rows: PlayerGroup[] = [];
  groups.forEach((memberIds, gi) => {
    for (const playerId of memberIds) {
      rows.push({
        id: crypto.randomUUID(),
        sessionId,
        drillId,
        playerId,
        groupIndex: gi + 1,
        locked: false,
        updatedAt: now
      });
    }
  });
  await db.playerGroups.bulkPut(rows);
}

/** Generer forslag fra nivå 1–5 og lagre det (alltid kun etter brukerens godkjenning i UI). */
export async function applySuggestion(
  sessionId: string,
  drillId: string,
  groupCount: number,
  mode: GroupingMode
): Promise<string[][]> {
  const available = await availablePlayers(sessionId);
  const groupable: GroupablePlayer[] = available
    .filter((sp) => sp.playerId)
    .map((sp) => ({ id: sp.playerId!, name: sp.name, level: sp.level }));
  const groups = suggestGroups(groupable, groupCount, mode);
  await setGroups(sessionId, drillId, groups);
  return groups;
}

/** Flytt én spiller til en annen gruppe (manuell overstyring). */
export async function movePlayer(sessionId: string, drillId: string, playerId: string, groupIndex: number): Promise<void> {
  const existing = await db.playerGroups
    .where(['sessionId', 'drillId', 'playerId'])
    .equals([sessionId, drillId, playerId])
    .first();
  if (existing) {
    await db.playerGroups.put({ ...existing, groupIndex, updatedAt: new Date().toISOString() });
  } else {
    await db.playerGroups.put({
      id: crypto.randomUUID(),
      sessionId,
      drillId,
      playerId,
      groupIndex,
      locked: false,
      updatedAt: new Date().toISOString()
    });
  }
}
