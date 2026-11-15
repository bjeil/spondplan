-- ============================================================================
-- Spondplan – Supabase database schema
-- Kjør dette i Supabase Dashboard → SQL Editor (én gang per miljø)
-- Samme mønster som Belast: hver bruker ser kun egne rader via RLS.
--
-- ENESTE MILJØ (se issue #11): Supabase-prosjekt "sandbox", skjema "spondplan".
-- Det gamle prosjektet "spondplan" (skjema public) er slettet.
-- ============================================================================
create schema if not exists spondplan;
set search_path = spondplan;

-- PostgREST (anon/authenticated) må ha USAGE på skjemaet og rettigheter på tabellene,
-- ellers får man "permission denied for schema spondplan". RLS begrenser fortsatt til egne rader.
grant usage on schema spondplan to anon, authenticated;
grant select, insert, update, delete on all tables in schema spondplan to anon, authenticated;
alter default privileges in schema spondplan grant select, insert, update, delete on tables to anon, authenticated;

-- 1. Spiller-database (varig, brukerstyrt). Nivå 1–5 eies av appen,
--    navn/Spond-id synkroniseres mot Spond-gruppens medlemmer.
create table if not exists  players (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  spond_member_id text,
  spond_group_id  text,                     -- laget spilleren er synkronisert fra
  level           int not null check (level between 1 and 5),
  active          boolean not null default true,
  updated_at      timestamptz not null default now()
);
create index if not exists players_user_idx on  players (user_id);
-- For eksisterende installasjoner (POC kjørte schema før kolonnen fantes):
alter table  players add column if not exists spond_group_id text;

-- 2. Tema/læringsmål fra Landslagsskolen (A1–A3, F1–F3 osv.)
create table if not exists  topics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  key         text not null,            -- f.eks. "A1"
  name        text not null,
  description text,
  updated_at  timestamptz not null default now(),
  unique (user_id, key)
);

-- 3. Frittstående coaching points (mange-til-mange mot tema/øvelser/planer)
create table if not exists  coaching_points (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  text       text not null,
  updated_at timestamptz not null default now()
);
create index if not exists coaching_points_user_idx on  coaching_points (user_id);

-- 4. Øktplaner (maler)
create table if not exists  session_plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  topic_id   uuid references  topics(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists session_plans_user_idx on  session_plans (user_id);

-- 5. Øvelser innen en plan
create table if not exists  drills (
  id             uuid primary key default gen_random_uuid(),
  plan_id        uuid not null references  session_plans(id) on delete cascade,
  title          text not null,
  duration_min   int,
  description    text,
  topic_id       uuid references  topics(id) on delete set null,
  group_count    int not null default 1 check (group_count between 1 and 20),
  grouping_mode  text not null default 'balanced' check (grouping_mode in ('balanced', 'differentiated')),
  sort_order     int not null default 0,
  updated_at     timestamptz not null default now()
);
create index if not exists drills_plan_idx on  drills (plan_id);

-- 6. Koblingstabeller plan/drill ↔ coaching points
create table if not exists  plan_coaching_points (
  plan_id           uuid not null references  session_plans(id) on delete cascade,
  coaching_point_id uuid not null references  coaching_points(id) on delete cascade,
  primary key (plan_id, coaching_point_id)
);
create table if not exists  drill_coaching_points (
  drill_id          uuid not null references  drills(id) on delete cascade,
  coaching_point_id uuid not null references  coaching_points(id) on delete cascade,
  primary key (drill_id, coaching_point_id)
);

-- 7. En konkret økt, knyttet til en Spond-event
create table if not exists  sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  plan_id        uuid references  session_plans(id) on delete set null,
  spond_event_id text not null,
  event_heading  text,
  event_start    timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists sessions_user_idx on  sessions (user_id);

-- 8. Spillere i en økt (snapshot av oppmøtet ved import-tidspunkt)
create table if not exists  session_players (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references  sessions(id) on delete cascade,
  player_id           uuid references  players(id) on delete set null,
  spond_member_id     text not null,
  name                text not null,
  response_status     text not null check (response_status in ('accepted', 'declined', 'unanswered')),
  manually_added      boolean not null default false,
  removed_from_groups boolean not null default false,  -- trukket seg etter import ("ikke med"-liste)
  updated_at          timestamptz not null default now()
);
create index if not exists session_players_session_idx on  session_players (session_id);

-- 9. Gruppeinndeling per øvelse (bevares ved oppmøteendringer)
create table if not exists  player_groups (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references  sessions(id) on delete cascade,
  drill_id   uuid not null references  drills(id) on delete cascade,
  player_id  uuid not null references  players(id) on delete cascade,
  group_index int not null check (group_index >= 1),
  locked     boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (session_id, drill_id, player_id)
);
create index if not exists player_groups_session_idx on  player_groups (session_id);

-- 10. Historikk over oppmøteoppdateringer per økt
create table if not exists  attendance_history (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references  sessions(id) on delete cascade,
  fetched_at   timestamptz not null default now(),
  added_ids    text[] not null default '{}',
  removed_ids  text[] not null default '{}'
);
create index if not exists attendance_history_session_idx on  attendance_history (session_id);

-- ============================================================================
-- RLS: hver trener ser kun egne rader (samme mønster som Belast)
-- ============================================================================
-- Genererer policies via DO-blokk for alle tabeller med user_id
-- (unngår å skrive 9×4 policies manuelt; samme effekt som Belast).
do $$
declare
  t text;
  tables_with_user_id text[] := array[
    'players', 'topics', 'coaching_points', 'session_plans',
    'sessions'
  ];
begin
  foreach t in array tables_with_user_id loop
    execute format('alter table  %I enable row level security', t);
    execute format('drop policy if exists "Brukere ser egne rader" on  %I', t);
    execute format('create policy "Brukere ser egne rader" on  %I for select using (auth.uid() = user_id)', t);
    execute format('drop policy if exists "Brukere skriver egne rader" on  %I', t);
    execute format('create policy "Brukere skriver egne rader" on  %I for insert with check (auth.uid() = user_id)', t);
    execute format('drop policy if exists "Brukere oppdaterer egne rader" on  %I', t);
    execute format('create policy "Brukere oppdaterer egne rader" on  %I for update using (auth.uid() = user_id)', t);
    execute format('drop policy if exists "Brukere sletter egne rader" on  %I', t);
    execute format('create policy "Brukere sletter egne rader" on  %I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- Tabeller uten user_id arver eierskap via parent (plan/session).
-- RLS på disse: samme eier som parent-tabellen.
alter table  drills enable row level security;
drop policy if exists "Eier via plan" on  drills;
create policy "Eier via plan" on  drills for all
  using (exists (select 1 from  session_plans p where p.id = drills.plan_id and p.user_id = auth.uid()))
  with check (exists (select 1 from  session_plans p where p.id = drills.plan_id and p.user_id = auth.uid()));

alter table  plan_coaching_points enable row level security;
drop policy if exists "Eier via plan" on  plan_coaching_points;
create policy "Eier via plan" on  plan_coaching_points for all
  using (exists (select 1 from  session_plans p where p.id = plan_coaching_points.plan_id and p.user_id = auth.uid()))
  with check (exists (select 1 from  session_plans p where p.id = plan_coaching_points.plan_id and p.user_id = auth.uid()));

alter table  drill_coaching_points enable row level security;
drop policy if exists "Eier via drill" on  drill_coaching_points;
create policy "Eier via drill" on  drill_coaching_points for all
  using (exists (select 1 from  drills d join  session_plans p on p.id = d.plan_id where d.id = drill_coaching_points.drill_id and p.user_id = auth.uid()))
  with check (exists (select 1 from  drills d join  session_plans p on p.id = d.plan_id where d.id = drill_coaching_points.drill_id and p.user_id = auth.uid()));

alter table  session_players enable row level security;
drop policy if exists "Eier via session" on  session_players;
create policy "Eier via session" on  session_players for all
  using (exists (select 1 from  sessions s where s.id = session_players.session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from  sessions s where s.id = session_players.session_id and s.user_id = auth.uid()));

alter table  player_groups enable row level security;
drop policy if exists "Eier via session" on  player_groups;
create policy "Eier via session" on  player_groups for all
  using (exists (select 1 from  sessions s where s.id = player_groups.session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from  sessions s where s.id = player_groups.session_id and s.user_id = auth.uid()));

alter table  attendance_history enable row level security;
drop policy if exists "Eier via session" on  attendance_history;
create policy "Eier via session" on  attendance_history for all
  using (exists (select 1 from  sessions s where s.id = attendance_history.session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from  sessions s where s.id = attendance_history.session_id and s.user_id = auth.uid()));
