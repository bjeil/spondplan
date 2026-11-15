# Supabase-oppsett for Spondplan

## Miljøer (besluttet)
| Miljø | Supabase-prosjekt | Skjema | Bruk |
|-------|-------------------|--------|------|
| Prod | `spondplan` | `public` | Ekte data — kun etter sandbox-testing |
| Sandbox | `sandbox` | `spondplan` | All testing/utvikling (tabellene ligger som `spondplan.players` osv.) |

**Regel:** sandbox-prosjektet bruker alltid skjemaet `spondplan`, aldri `public`.
Edge Function deployes separat i hvert prosjekt.

### Oppskrift for sandbox (issue #11)
1. Opprett nytt Supabase-prosjekt kalt **`sandbox`**.
2. SQL Editor i sandbox: kjør först `create schema if not exists spondplan; set search_path = spondplan;`
   og deretter hele `supabase/schema.sql` (endre første `set search_path`-linje til `spondplan`).
   Tabellene blir da `spondplan.players` osv., med RLS.
3. Auth → Users: opprett `spl@spondplan.app` med passord.
4. Edge Functions: deploy `spond` (samme kode), sett secrets `SPOND_USERNAME`/`SPOND_PASSWORD`,
   JWT verification OFF, CORS-headere i koden (allerede på plass).
5. Project Settings → API: kopier sandbox URL + publishable key til `.env.sandbox`
   (se `.env.sandbox.example`). Bygg lokalt mot sandbox med `npm run build:sandbox` + `npm run dev -- --mode sandbox`,
   eller bytt `VITE_*` i `.env` manuelt. Prod-bygg bruker fallback-verdiene i `src/lib/supabase.ts`.

## Fase 0 – hard gate (må gjøres før videre utvikling)

1. Opprett et Supabase-prosjekt.
2. Sett Edge Function-secrets (Dashboard → Edge Functions → Secrets):
   - `SPOND_USERNAME` – trenerens Spond-brukernavn
   - `SPOND_PASSWORD` – trenerens Spond-passord
   - Merk: kontoer med 2FA (TOTP) støttes ikke av det uoffisielle API-et.
3. Deploy funksjonen:

   ```bash
   supabase functions deploy spond
   ```

4. Verifiser manuelt (erstatt URL/anon key):

   ```bash
   curl -X POST "https://<prosjekt>.supabase.co/functions/v1/spond" \
     -H "Authorization: Bearer <anon-key>" \
     -H "Content-Type: application/json" \
     -d '{"action":"verify"}'
   ```

   Forventet svar: `{"ok":true,"groups":<antall>}`. Hvis dette feiler
   (2FA, API-endringer, blokkerte kall) → prosjektet skrinlegges.
   Manuell import er ikke et fallback-alternativ.

## Fase 1 – datamodell og auth

1. Kjør `schema.sql` i Supabase Dashboard → SQL Editor (tabellene i
   datamodellen: players, topics, coaching_points, session_plans, drills,
   sessions, session_players, player_groups, attendance_history — alle med RLS,
   samme mønster som Belast).
2. Opprett brukeren i Dashboard → Auth (brukernavnet i appen oversettes til
   `<brukernavn>@spondplan.app`; "spl" → `spl@spondplan.app`).
3. App-klienten har Supabase URL/anon-key hardkodet i `src/lib/supabase.ts` (POC).
