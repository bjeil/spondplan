import Dexie, { type Table } from 'dexie';
import type {
  Player,
  Topic,
  CoachingPoint,
  SessionPlan,
  Drill,
  Session,
  SessionPlayer,
  PlayerGroup,
  AttendanceHistoryEntry
} from './types';

/** Metadata for synkronisering per entitet (lokal «vannmerke»). */
export interface SyncMetaRow {
  key: string; // f.eks. "players"
  syncedAt: string; // ISO — sist bekreftet i skyen
}

class SpondplanDB extends Dexie {
  players!: Table<Player, string>;
  topics!: Table<Topic, string>;
  coachingPoints!: Table<CoachingPoint, string>;
  sessionPlans!: Table<SessionPlan, string>;
  drills!: Table<Drill, string>;
  sessions!: Table<Session, string>;
  sessionPlayers!: Table<SessionPlayer, string>;
  playerGroups!: Table<PlayerGroup, string>;
  attendanceHistory!: Table<AttendanceHistoryEntry, string>;
  syncMeta!: Table<SyncMetaRow, string>;

  constructor() {
    super('spondplan');
    this.version(1).stores({
      players: 'id, spondMemberId, active'
    });
    this.version(2).stores({
      players: 'id, spondMemberId, spondGroupId, active',
      topics: 'id, key',
      coachingPoints: 'id',
      sessionPlans: 'id, updatedAt',
      drills: 'id, planId, sortOrder',
      sessions: 'id, spondEventId, createdAt',
      sessionPlayers: 'id, sessionId, spondMemberId',
      playerGroups: 'id, sessionId, drillId, playerId',
      attendanceHistory: 'id, sessionId, fetchedAt',
      syncMeta: 'key'
    });
  }
}

export const db = new SpondplanDB();

db.on('blocked', () => {
  console.error('[spondplan] Dexie-oppgradering blokkert — lukk andre faner og last på nytt.');
});
