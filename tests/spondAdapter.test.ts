import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { DirectSpondAdapter, SpondApiError } from '../src/lib/spond/adapter';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('DirectSpondAdapter (Fase 0)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('logger inn og henter attendance med riktig mapping av svarstatus', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'tok123' }))
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'ev1',
          heading: 'Trening',
          responses: { acceptedIds: ['m1'], declinedIds: ['m2'], unansweredIds: ['m3'] },
          members: [
            { id: 'm1', firstName: 'Ola', lastName: 'Nordmann' },
            { id: 'm2', name: 'Kari' },
            { id: 'm3', firstName: 'Per' }
          ]
        })
      );

    const adapter = new DirectSpondAdapter('bruker', 'pass');
    const attendance = await adapter.getAttendance('ev1');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('/auth/login');
    expect(fetchMock.mock.calls[1][0]).toContain('/sponds/ev1');
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({ Authorization: 'Bearer tok123' });

    expect(attendance.eventId).toBe('ev1');
    expect(attendance.entries).toEqual([
      { memberId: 'm1', name: 'Ola Nordmann', status: 'accepted' },
      { memberId: 'm2', name: 'Kari', status: 'declined' },
      { memberId: 'm3', name: 'Per', status: 'unanswered' }
    ]);
  });

  it('kaster SpondApiError ved 401 fra innlogging', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: 'unauthorized' }, 401));
    const adapter = new DirectSpondAdapter('bruker', 'feil-pass');
    await expect(adapter.getAttendance('ev1')).rejects.toBeInstanceOf(SpondApiError);
    await expect(adapter.getAttendance('ev1')).rejects.toMatchObject({ status: 401 });
  });

  it('gjenbruker token ved flere kall', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'tok123' }))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]));

    const adapter = new DirectSpondAdapter('bruker', 'pass');
    await adapter.listEvents('g1', new Date('2026-11-01'), new Date('2026-11-30'));
    await adapter.listEvents('g1', new Date('2026-12-01'), new Date('2026-12-31'));

    const loginCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/auth/login'));
    expect(loginCalls).toHaveLength(1);
  });
});
