import type { SpondAdapter, SpondAttendanceEntry, SpondEvent, SpondEventAttendance } from './types';

const SPOND_API_BASE = 'https://api.spond.com/core/v1';

interface SpondLoginResponse {
  accessToken?: { token: string; expiration?: string };
}

interface SpondEventRaw {
  id: string;
  heading?: string;
  startTime?: string;
  endTime?: string;
  groupId?: string;
}

interface SpondMemberRaw {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

interface SpondEventDetailRaw extends SpondEventRaw {
  responses?: {
    acceptedIds?: string[];
    declinedIds?: string[];
    unansweredIds?: string[];
  };
  members?: SpondMemberRaw[];
}

function fullName(m: SpondMemberRaw): string {
  if (m.name && m.name.trim()) return m.name.trim();
  return [m.firstName, m.lastName].filter(Boolean).join(' ').trim() || m.id;
}

export class SpondApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'SpondApiError';
    this.status = status;
  }
}

async function spondFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SPOND_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });
  if (!res.ok) {
    throw new SpondApiError(`Spond API ${path} svarte ${res.status}`, res.status);
  }
  return (await res.json()) as T;
}

/**
 * Direkte klient mot det uoffisielle Spond API-et. Brukes KUN fra Fase 0
 * (verifisering) og fra Supabase Edge Function – aldri fra PWA-klienten,
 * fordi api.spond.com ikke sender CORS-headere.
 */
export class DirectSpondAdapter implements SpondAdapter {
  private token: string | null = null;

  constructor(
    private readonly username: string,
    private readonly password: string
  ) {}

  private async login(): Promise<string> {
    if (this.token) return this.token;
    const body = await spondFetch<SpondLoginResponse>('/auth2/login', '', {
      method: 'POST',
      body: JSON.stringify({ email: this.username, password: this.password })
    });
    const token = body.accessToken?.token;
    if (!token) throw new SpondApiError('Innlogging ga ikke accessToken.token', 401);
    this.token = token;
    return this.token;
  }

  async listEvents(groupId: string, from: Date, to: Date): Promise<SpondEvent[]> {
    const token = await this.login();
    const fmt = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, '.000Z');
    const params = new URLSearchParams({
      groupId,
      minStartTimestamp: fmt(from),
      maxStartTimestamp: fmt(to),
      max: '100',
      scheduled: 'true'
    });
    const raw = await spondFetch<SpondEventRaw[]>(`/sponds/?${params.toString()}`, token);
    return raw.map((e) => ({
      id: e.id,
      heading: e.heading ?? '',
      startTime: e.startTime ?? '',
      endTime: e.endTime,
      groupId: e.groupId ?? groupId
    }));
  }

  async getAttendance(eventId: string): Promise<SpondEventAttendance> {
    const token = await this.login();
    const detail = await spondFetch<SpondEventDetailRaw>(
      `/sponds/${encodeURIComponent(eventId)}?includeComments=true`,
      token
    );
    const members = new Map((detail.members ?? []).map((m) => [m.id, fullName(m)]));
    const responses = detail.responses ?? {};
    const entries: SpondAttendanceEntry[] = [
      ...(responses.acceptedIds ?? []).map((id) => ({ memberId: id, name: members.get(id) ?? id, status: 'accepted' as const })),
      ...(responses.declinedIds ?? []).map((id) => ({ memberId: id, name: members.get(id) ?? id, status: 'declined' as const })),
      ...(responses.unansweredIds ?? []).map((id) => ({ memberId: id, name: members.get(id) ?? id, status: 'unanswered' as const }))
    ];
    return { eventId: detail.id, fetchedAt: new Date().toISOString(), entries };
  }
}
