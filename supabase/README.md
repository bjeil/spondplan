# Supabase-oppsett for Spondplan

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
