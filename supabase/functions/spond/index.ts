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
    throw new Error(`Spond API ${path} svarte ${res.status}`);
  }
  return (await res.json()) as T;
}

async function spondLogin(username: string, password: string): Promise<string> {
  const body = await spondFetch<SpondLoginResponse>('/auth2/login', '', {
    method: 'POST',
    body: JSON.stringify({ email: username, password })
  });
  const token = body.accessToken?.token;
  if (!token) throw new Error('Innlogging ga ikke accessToken.token');
  return token;
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
