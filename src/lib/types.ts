export type ResponseStatus = 'accepted' | 'declined' | 'unanswered';

export type GroupingMode = 'balanced' | 'differentiated';

export interface Player {
  id: string;
  name: string;
  spondMemberId: string | null;
  level: 1 | 2 | 3 | 4 | 5;
  active: boolean;
  updatedAt: string;
}

export interface Topic {
  id: string;
  key: string; // f.eks. "A1"
  name: string;
  description: string | null;
  updatedAt: string;
}

export interface CoachingPoint {
  id: string;
  text: string;
  updatedAt: string;
}

export interface SessionPlan {
  id: string;
  title: string;
  topicId: string | null;
  coachingPointIds: string[];
  updatedAt: string;
}

export interface Drill {
  id: string;
  planId: string;
  title: string;
  durationMin: number | null;
  description: string | null;
  topicId: string | null;
  groupCount: number;
  groupingMode: GroupingMode;
  sortOrder: number;
  coachingPointIds: string[];
  updatedAt: string;
}

export interface Session {
  id: string;
  planId: string | null;
  spondEventId: string;
  eventHeading: string | null;
  eventStart: string | null;
  createdAt: string;
}

export interface SessionPlayer {
  id: string;
  sessionId: string;
  playerId: string | null;
  spondMemberId: string;
  name: string;
  responseStatus: ResponseStatus;
  manuallyAdded: boolean;
  removedFromGroups: boolean;
  updatedAt: string;
}

export interface PlayerGroup {
  id: string;
  sessionId: string;
  drillId: string;
  playerId: string;
  groupIndex: number;
  locked: boolean;
  updatedAt: string;
}

export interface AttendanceHistoryEntry {
  id: string;
  sessionId: string;
  fetchedAt: string;
  addedIds: string[];
  removedIds: string[];
}
