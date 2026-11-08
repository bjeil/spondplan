import { useEffect, useState } from 'react';
import { addDrill, createPlan, getPlanWithDrills, listPlans, updateDrill } from '../lib/plans';
import { listTopics, seedDefaultTopics } from '../lib/topics';
import type { Drill, SessionPlan, Topic } from '../lib/types';

export default function Plans() {
  const [plans, setPlans] = useState<SessionPlan[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [openPlan, setOpenPlan] = useState<{ plan: SessionPlan; drills: Drill[] } | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newTopicId, setNewTopicId] = useState('');
  const [newDrillTitle, setNewDrillTitle] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    seedDefaultTopics().then(() => listTopics()).then(setTopics);
    listPlans().then(setPlans);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createPlan(newTitle, newTopicId || null);
      setNewTitle('');
      setPlans(await listPlans());
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleOpen(plan: SessionPlan) {
    setOpenPlan(await getPlanWithDrills(plan.id));
  }

  async function handleAddDrill(e: React.FormEvent) {
    e.preventDefault();
    if (!openPlan) return;
    try {
      await addDrill(openPlan.plan.id, newDrillTitle);
      setNewDrillTitle('');
      setOpenPlan(await getPlanWithDrills(openPlan.plan.id));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDrillChange(drill: Drill, patch: Partial<Drill>) {
    if (!openPlan) return;
    await updateDrill({ ...drill, ...patch });
    setOpenPlan(await getPlanWithDrills(openPlan.plan.id));
  }

  return (
    <section className="flex w-full max-w-md flex-col gap-4 p-4">
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          className="flex-1 rounded bg-app-surface-deep p-2 text-app-text outline-none ring-1 ring-app-border/20 focus:ring-app-gold"
          placeholder="Ny øktplan…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <select
          className="rounded bg-app-surface-deep p-2 text-app-text outline-none"
          value={newTopicId}
          onChange={(e) => setNewTopicId(e.target.value)}
          aria-label="Tema for planen"
        >
          <option value="">Intet tema</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.key} – {t.name}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded bg-app-gold px-3 py-2 font-semibold text-viking-blue-deep">
          Lagre
        </button>
      </form>
      {message && <p className="text-sm text-red-400">{message}</p>}

      <ul className="flex flex-col gap-2">
        {plans.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => handleOpen(p)}
              className="w-full rounded bg-app-surface p-2 text-left text-app-text ring-1 ring-app-border/10"
            >
              {p.title}
            </button>
          </li>
        ))}
        {plans.length === 0 && <li className="text-app-text/50">Ingen øktplaner ennå.</li>}
      </ul>

      {openPlan && (
        <div className="flex flex-col gap-2 rounded bg-app-surface-2/40 p-3 ring-1 ring-app-border/10">
          <h3 className="font-semibold text-app-gold">{openPlan.plan.title}</h3>
          <form onSubmit={handleAddDrill} className="flex gap-2">
            <input
              className="flex-1 rounded bg-app-surface-deep p-2 text-app-text outline-none ring-1 ring-app-border/20"
              placeholder="Ny øvelse…"
              value={newDrillTitle}
              onChange={(e) => setNewDrillTitle(e.target.value)}
            />
            <button type="submit" className="rounded bg-app-gold px-3 py-2 font-semibold text-viking-blue-deep">
              +
            </button>
          </form>
          <ol className="flex flex-col gap-2">
            {openPlan.drills.map((d, i) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 rounded bg-app-surface p-2">
                <span className="w-6 text-app-text/50">{i + 1}.</span>
                <span className="flex-1 text-app-text">{d.title}</span>
                <input
                  type="number"
                  min={1}
                  max={180}
                  placeholder="min"
                  className="w-16 rounded bg-app-surface-deep p-1 text-app-text"
                  value={d.durationMin ?? ''}
                  onChange={(e) => handleDrillChange(d, { durationMin: e.target.value ? Number(e.target.value) : null })}
                  aria-label={`Varighet for ${d.title}`}
                />
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="w-14 rounded bg-app-surface-deep p-1 text-app-text"
                  value={d.groupCount}
                  onChange={(e) => handleDrillChange(d, { groupCount: Number(e.target.value) })}
                  aria-label={`Antall grupper for ${d.title}`}
                />
                <select
                  className="rounded bg-app-surface-deep p-1 text-app-text"
                  value={d.groupingMode}
                  onChange={(e) => handleDrillChange(d, { groupingMode: e.target.value as Drill['groupingMode'] })}
                  aria-label={`Grupperingsmodus for ${d.title}`}
                >
                  <option value="balanced">Balansert</option>
                  <option value="differentiated">Differensiert</option>
                </select>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
