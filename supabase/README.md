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

## Videre (Fase 1)

- `schema.sql` + migrasjoner for tabellene i datamodellen (players, topics,
  coaching_points, session_plans, drills, sessions, session_players,
  player_groups, attendance_history) med RLS – samme mønster som Belast.
- Auth med brukernavn/passord (intern e-post-mønster som Belast).
