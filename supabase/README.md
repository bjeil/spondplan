# Supabase-oppsett for Spondplan

## Miljø (besluttet — issue #11)
Det finnes **ett** miljø: Supabase-prosjektet **`sandbox`** med skjema **`spondplan`**.
Tabellene ligger som `spondplan.players`, `spondplan.topics`, osv. (aldri `public`).
Det gamle prosjektet `spondplan` er slettet.

### Oppsett (én gang)
1. SQL Editor i prosjektet `sandbox`: kjør hele `supabase/schema.sql`
   (den oppretter `create schema if not exists spondplan; set search_path = spondplan;` selv).
   Sjekk: `select * from spondplan.players limit 1;` fungerer; `set role anon; select count(*) from spondplan.players;` gir 0 (RLS).
2. Auth → Users: opprett `spl@spondplan.app` med passord.
3. Edge Functions: deploy `spond`, sett secrets `SPOND_USERNAME`/`SPOND_PASSWORD`, JWT verification OFF.
4. Project Settings → API: sett `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` i `.env` (gitignored,
   se `.env.example`). Fallback-konstantene i `src/lib/supabase.ts` skal også peke på `sandbox`-prosjektet.

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
