import { useEffect, useState } from 'react';
import { listPlayers, setPlayerLevel, syncPlayersFromGroup } from '../lib/players';
import { edgeSpondAdapter } from '../lib/spond/edgeAdapter';
import type { Player } from '../lib/types';
import type { SpondGroup } from '../lib/spond/types';

const LEVELS: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];

export default function Players() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [groups, setGroups] = useState<SpondGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [viewGroupId, setViewGroupId] = useState(''); // '' = alle lag
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // Hent gruppelisten ved mount, slik at brukeren kan velge FØR synk.
  useEffect(() => {
    edgeSpondAdapter
      .listGroups()
      .then((gs) => {
        setGroups(gs);
        setSelectedGroupId((cur) => cur || gs[0]?.id || '');
      })
      .catch((e) => setMessage(e instanceof Error ? e.message : String(e)));
    listPlayers().then(setPlayers);
  }, []);

  async function handleSync() {
    const group = groups.find((g) => g.id === selectedGroupId);
    if (!group) {
      setMessage('Velg en gruppe først.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const result = await syncPlayersFromGroup(group);
      setMessage(
        `Synkronisert «${group.name}»: ${result.added.length} nye, ${result.updatedNames.length} oppdatert.`
      );
      setPlayers(await listPlayers());
      setViewGroupId(group.id);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleLevelChange(player: Player, level: number) {
    await setPlayerLevel(player.id, level);
    setPlayers(await listPlayers());
  }

  const groupName = (id: string | null) => groups.find((g) => g.id === id)?.name ?? 'Uten lag';
  const visible = viewGroupId ? players.filter((p) => p.spondGroupId === viewGroupId) : players;
  const byGroup = new Map<string, Player[]>();
  for (const p of visible) {
    const key = p.spondGroupId ?? '';
    byGroup.set(key, [...(byGroup.get(key) ?? []), p]);
  }

  return (
    <section className="flex w-full max-w-md flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <select
          className="flex-1 rounded bg-app-surface-deep p-2 text-app-text outline-none ring-1 ring-app-border/20"
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          aria-label="Velg Spond-gruppe å synkronisere"
        >
          {groups.length === 0 && <option value="">Henter grupper…</option>}
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.members.length} spillere)
            </option>
          ))}
        </select>
        <button
          onClick={handleSync}
          disabled={busy || !selectedGroupId}
          className="rounded bg-app-gold px-3 py-2 font-semibold text-viking-blue-deep disabled:opacity-50"
        >
          {busy ? 'Synkroniserer…' : 'Synk valgt lag'}
        </button>
      </div>

      <select
        className="rounded bg-app-surface-deep p-2 text-app-text outline-none ring-1 ring-app-border/20"
        value={viewGroupId}
        onChange={(e) => setViewGroupId(e.target.value)}
        aria-label="Vis spillere fra lag"
      >
        <option value="">Alle lag ({players.length})</option>
        {[...byGroup.keys()].map((id) => (
          <option key={id} value={id}>
            {groupName(id || null)} ({byGroup.get(id)?.length ?? 0})
          </option>
        ))}
      </select>

      {message && <p className="text-sm text-app-text/70">{message}</p>}

      {[...byGroup.entries()].map(([groupId, ps]) => (
        <div key={groupId || 'none'} className="flex flex-col gap-2">
          {viewGroupId === '' && (
            <h3 className="mt-2 text-sm font-semibold uppercase tracking-wide text-app-gold">
              {groupName(groupId || null)}
            </h3>
          )}
          <ul className="flex flex-col gap-2">
            {ps.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded bg-app-surface p-2 ring-1 ring-app-border/10"
              >
                <span className="text-app-text">{p.name}</span>
                <select
                  className="rounded bg-app-surface-deep p-1 text-app-text outline-none"
                  value={p.level}
                  onChange={(e) => handleLevelChange(p, Number(e.target.value))}
                  aria-label={`Nivå for ${p.name}`}
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      Nivå {l}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {players.length === 0 && (
        <p className="text-center text-app-text/50">Ingen spillere ennå — synkroniser et lag fra Spond.</p>
      )}
    </section>
  );
}
