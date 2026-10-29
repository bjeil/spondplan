export type SpondResponseStatus = 'accepted' | 'declined' | 'unanswered';

export interface SpondEvent {
  id: string;
  heading: string;
  startTime: string;
  endTime?: string;
  groupId?: string;
}

export interface SpondAttendanceEntry {
  memberId: string;
  name: string;
  status: SpondResponseStatus;
}

export interface SpondEventAttendance {
  eventId: string;
  fetchedAt: string;
  entries: SpondAttendanceEntry[];
}

export interface SpondAdapter {
  listEvents(groupId: string, from: Date, to: Date): Promise<SpondEvent[]>;
  getAttendance(eventId: string): Promise<SpondEventAttendance>;
}
