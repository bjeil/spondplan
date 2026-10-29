# Spondplan

Planleggingsverktøy for trenere – øktplanlegging med data fra [Spond](https://spond.com).
Mobilvennlig PWA (installerbar på telefonen, fungerer offline).

## Hva skal appen gjøre?

- Lage gjenbrukbare **øktplaner** (maler) med tema/læringsmål fra Landslagsskolen
  (A1–A3, F1–F3), øvelser/drills med varighet og rekkefølge, og coaching points.
- Holde en egen **spiller-database** (navn + Spond member-id + nivå 1–5).
- Hente **oppmøte** fra en valgt Spond-event (trening/kamp).
- **Fordele spillere i grupper/lag** per øvelse – manuelt eller med balansert /
  differensiert forslag basert på nivå.
- Enkel **gjennomføringsvisning** på banen.

Full idébeskrivelse ligger i `bjeil/notes` (`docs/ideas/spondplan.md`).

## Hard gate: Spond API (Fase 0)

Spond har ikke et offisielt API. Appen er avhengig av det uoffisielle API-et
(`https://api.spond.com/core/v1/`, jf. [Olen/Spond](https://github.com/Olen/Spond)),
via en Supabase Edge Function. **Fase 0** – verifisering av at dette faktisk
fungerer for trenerens konto – må bestås før videre utvikling. Hvis det feiler,
skrinlegges prosjektet; manuell import er ikke et fallback-alternativ.

All Spond-kode skal derfor holdes isolert bak adapter-laget i `src/lib/spond/`
(se `types.ts` for kontrakten).

## Stack

Samme mønster som [Belast](https://github.com/bjeil/belast):

- React 18 + TypeScript + Vite + Tailwind CSS
- PWA via `vite-plugin-pwa` (manifest, ikoner, offline shell)
- Lokal lagring i IndexedDB (Dexie), lokal-first
- Supabase: Auth, Postgres med RLS, Edge Function for Spond-kallet
- Deploy til GitHub Pages, CI via GitHub Actions (vitest + `tsc` + bygg)

## Lokal utvikling

```bash
npm ci
npm run dev      # utviklingsserver
npm test         # vitest
npm run build    # tsc + vite build
npm run icons    # regenerer PWA-ikoner i public/icons/
```

## Deploy

Push til `main` bygger og deployer til GitHub Pages via
`.github/workflows/deploy-pages.yml` (krever at Pages-kilde er satt til
"GitHub Actions" i repo-innstillingene). Appen ligger på `/spondplan/`.
