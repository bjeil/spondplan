// Spondplan – Supabase Edge Function for Spond (Fase 0, hard gate).
//
// Kalles IKKE direkte fra PWA-klienten med Spond-legitimasjon; klienten kaller
// denne funksjonen, som logger inn på Spond med lagret legitimasjon og
// returnerer minimal JSON (kun navn + svarstatus).
//
// Krever Supabase-secrets:
//   SPOND_USERNAME, SPOND_PASSWORD  (trenerens Spond-legitimasjon)
//
// Endepunkt: POST /functions/v1/spond
// Body: { "action": "listEvents", "groupId": "...", "from": "...", "to": "..." }
//   eller { "action": "attendance", "eventId": "..." }
//   eller { "action": "verify" }   (Fase 0: bekreft innlogging + ett kall)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const SPOND_API_BASE = 'https://api.spond.com/core/v1';

interface SpondLoginResponse {
  accessToken?: { token: string; expiration?: string };
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
    // Vis kun trygge diagnosefelter fra Spond sitt svar (ikke 2FA-token/telefonnummer).
    let detail = '';
    try {
      const body = (await res.json()) as Record<string, unknown>;
      const safe = ['error', 'errorKey', 'errorCode', 'message']
        .filter((k) => k in body)
        .map((k) => `${k}=${JSON.stringify(body[k])}`)
        .join(' ');
      detail = safe ? ` – ${safe}` : '';
    } catch {
      detail = ` – ${await res.text().catch(() => '')}`.slice(0, 200);
    }
    throw new Error(`Spond API ${path} svarte ${res.status}${detail}`);
  }
  return (await res.json()) as T;
}

async function spondLogin(username: string, password: string): Promise<string> {
  const res = await fetch(`${SPOND_API_BASE}/auth2/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: username.trim().toLowerCase(), password })
  });
  const body = (await res.json().catch(() => ({}))) as SpondLoginResponse & {
    token?: string;
    phoneNumber?: string;
    error?: string;
    errorKey?: string;
    message?: string;
  };
  const token = body.accessToken?.token;
  if (token) return token;
  // 2FA-utfordring: Spond svarer med { token, phoneNumber } og engangskode på SMS –
  // ikke støttet av dette API-et (TOTP). Ikke lek verdiene.
  if (body.token && body.phoneNumber) {
    throw new Error('2FA er aktivert på kontoen (TOTP støttes ikke av uoffisielt API)');
  }
  const safe = ['error', 'errorKey', 'message'].filter((k) => k in body).map((k) => `${k}=${JSON.stringify(body[k as keyof typeof body])}`).join(' ');
  throw new Error(`Innlogging avvist (HTTP ${res.status})${safe ? ` – ${safe}` : ''}`);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

serve(async (req: Request) => {
  try {
    const username = Deno.env.get('SPOND_USERNAME');
    const password = Deno.env.get('SPOND_PASSWORD');
    if (!username || !password) {
      return json({ error: 'SPOND_USERNAME/SPOND_PASSWORD mangler i Edge Function-secrets' }, 500);
    }

    const { action, groupId, from, to, eventId } = (await req.json()) as {
      action?: string;
      groupId?: string;
      from?: string;
      to?: string;
      eventId?: string;
    };

    const token = await spondLogin(username, password);

    if (action === 'verify') {
      const groups = await spondFetch<unknown[]>('/groups/', token);
      return json({ ok: true, groups: Array.isArray(groups) ? groups.length : 0 });
    }

    if (action === 'members') {
      const groups = await spondFetch<Array<Record<string, unknown>>>('/groups/', token);
      const mapped = (groups ?? []).map((g) => ({
        id: String(g.id),
        name: String(g.name ?? ''),
        members: ((g.members as Array<Record<string, unknown>> | undefined) ?? []).map((m) => ({
          id: String(m.id),
          name: [m.firstName, m.lastName].filter(Boolean).join(' ') || String(m.id)
        }))
      }));
      const filtered = groupId ? mapped.filter((g) => g.id === groupId) : mapped;
      return json({ groups: filtered });
    }

    if (action === 'listEvents') {
      if (!groupId || !from || !to) return json({ error: 'groupId, from og to kreves' }, 400);
      const params = new URLSearchParams({
        groupId,
        minStartTimestamp: from,
        maxStartTimestamp: to,
        max: '100',
        scheduled: 'true'
      });
      const events = await spondFetch<unknown[]>(`/sponds/?${params.toString()}`, token);
      return json({ events });
    }

    if (action === 'attendance') {
      if (!eventId) return json({ error: 'eventId kreves' }, 400);
      const detail = await spondFetch<Record<string, unknown>>(
        `/sponds/${encodeURIComponent(eventId)}?includeComments=true`,
        token
      );
      return json({ event: detail });
    }

    return json({ error: `Ukjent action: ${action ?? '(mangler)'}` }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502);
  }
});
