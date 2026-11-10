import { useEffect, useState } from 'react';
import { edgeSpondAdapter } from '../lib/spond/edgeAdapter';
import {
  applySuggestion,
  availablePlayers,
  createSession,
  getGroups,
  importAttendance,
  listSessions,
  listUpcomingEvents,
  movePlayer
} from '../lib/sessions';
import { getPlanWithDrills, listPlans } from '../lib/plans';
import type { Drill, Session, SessionPlan } from '../lib/types';
import type { SpondEvent, SpondGroup } from '../lib/spond/types';

export default function Sessions() {
  const [groups, setGroups] = useState<SpondGroup[]>([]);
  const [groupId, setGroupId] = useState('');
  const [events, setEvents] = useState<SpondEvent[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [plans, setPlans] = useState<SessionPlan[]>([]);
  const [open, setOpen] = useState<{
    session: Session;
    available: Awaited<ReturnType<typeof availablePlayers>>;
    drills: Drill[];
    groupsByDrill: Record<string, string[][]>;
  } | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    edgeSpondAdapter.listGroups().then((gs) => {
      setGroups(gs);
      setGroupId(gs[0]?.id ?? '');
    });
    listSessions().then(setSessions);
    listPlans().then(setPlans);
  }, []);

  useEffect(() => {
    if (!groupId) return;
    listUpcomingEvents(groupId).then(setEvents).catch((e) => setMessage(String(e)));
  }, [groupId]);

  async function handleCreateSession(event: SpondEvent) {
    setBusy(true);
    try {
      const session = await createSession(null, event);
      const diff = await importAttendance(session.id);
      setMessage(`Økt opprettet. Oppmøte: ${diff.addedIds.length} nye, ${diff.removedIds.length} fjernet.`);
      setSessions(await listSessions());
      await handleOpen(session);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleOpen(session: Session) {
    const planData = session.planId ? await getPlanWithDrills(session.planId) : null;
    const available = await availablePlayers(session.id);
    const drills = planData?.drills ?? [];
    const groupsByDrill: Record<string, string[][]> = {};
    for (const d of drills) {
      const rows = await getGroups(session.id, d.id);
      const max = Math.max(0, ...rows.map((r) => r.groupIndex));
      groupsByDrill[d.id] = Array.from({ length: max }, (_, i) =>
        rows.filter((r) => r.groupIndex === i + 1).map((r) => r.playerId)
      );
    }
    setOpen({ session, available, drills, groupsByDrill });
  }

  async function handleSuggest(drill: Drill) {
    if (!open) return;
    const groups = await applySuggestion(open.session.id, drill.id, drill.groupCount, drill.groupingMode);
    setOpen({ ...open, groupsByDrill: { ...open.groupsByDrill, [drill.id]: groups } });
  }

  async function handleMove(drill: Drill, playerId: string, groupIndex: number) {
    if (!open) return;
    await movePlayer(open.session.id, drill.id, playerId, groupIndex);
    await handleOpen(open.session);
  }

  const nameByPlayerId = new Map(open?.available.map((p) => [p.playerId!, p.name]) ?? []);

  return (
    <section className="flex w-full max-w-md flex-col gap-4 p-4">
      <select
        className="rounded bg-app-surface-deep p-2 text-app-text outline-none ring-1 ring-app-border/20"
        value={groupId}
        onChange={(e) => setGroupId(e.target.value)}
        aria-label="Velg lag"
      >
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-app-gold">Kommende events</h3>
        <ul className="flex flex-col gap-1">
          {events.map((ev) => (
            <li key={ev.id}>
              <button
                onClick={() => handleCreateSession(ev)}
                disabled={busy}
                className="w-full rounded bg-app-surface p-2 text-left text-app-text ring-1 ring-app-border/10 disabled:opacity-50"
              >
                {ev.startTime.slice(0, 16).replace('T', ' ')} — {ev.heading}
              </button>
            </li>
          ))}
          {events.length === 0 && <li className="text-app-text/50">Ingen kommende events.</li>}
        </ul>
      </div>

      {message && <p className="text-sm text-app-text/70">{message}</p>}

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-app-gold">Økter</h3>
        <ul className="flex flex-col gap-1">
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => handleOpen(s)}
                className="w-full rounded bg-app-surface p-2 text-left text-app-text ring-1 ring-app-border/10"
              >
                {s.eventStart?.slice(0, 16).replace('T', ' ')} — {s.eventHeading}
              </button>
            </li>
          ))}
          {sessions.length === 0 && <li className="text-app-text/50">Ingen økter ennå.</li>}
        </ul>
      </div>

      {open && (
        <div className="flex flex-col gap-3 rounded bg-app-surface-2/40 p-3 ring-1 ring-app-border/10">
          <h3 className="font-semibold text-app-gold">{open.session.eventHeading}</h3>
          <p className="text-sm text-app-text/70">
            {open.available.length} tilgjengelige spillere (av {open.available.length + 0} svarte ja/kanskje)
          </p>
          {open.drills.length === 0 && (
            <p className="text-sm text-app-text/50">Økten har ingen plan med øvelser ennå.</p>
          )}
          {open.drills.map((d, i) => (
            <div key={d.id} className="flex flex-col gap-2 rounded bg-app-surface p-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-app-text">
                  {i + 1}. {d.title}
                </span>
                <button
                  onClick={() => handleSuggest(d)}
                  className="rounded bg-app-gold px-2 py-1 text-xs font-semibold text-viking-blue-deep"
                >
                  Foreslå grupper ({d.groupCount} × {d.groupingMode === 'balanced' ? 'balansert' : 'differensiert'})
                </button>
              </div>
              {(open.groupsByDrill[d.id] ?? []).map((memberIds, gi) => (
                <div key={gi} className="flex flex-wrap items-center gap-1">
                  <span className="w-16 text-xs font-semibold text-app-gold">Gruppe {gi + 1}</span>
                  {memberIds.map((pid) => (
                    <span key={pid} className="flex items-center gap-1 rounded bg-app-surface-deep px-2 py-1 text-xs text-app-text">
                      {nameByPlayerId.get(pid) ?? pid.slice(0, 6)}
                      <select
                        value={gi + 1}
                        onChange={(e) => handleMove(d, pid, Number(e.target.value))}
                        aria-label={`Flytt ${nameByPlayerId.get(pid) ?? pid} i ${d.title}`}
                        className="bg-transparent text-app-gold outline-none"
                      >
                        {Array.from({ length: d.groupCount }, (_, k) => (
                          <option key={k} value={k + 1}>
                            → {k + 1}
                          </option>
                        ))}
                      </select>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
