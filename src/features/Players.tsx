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
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listPlayers().then(setPlayers);
  }, []);

  async function handleSync() {
    setBusy(true);
    setMessage('');
    try {
      const gs = await edgeSpondAdapter.listGroups();
      setGroups(gs);
      const group = gs.find((g) => g.id === selectedGroupId) ?? gs[0];
      if (!group) {
        setMessage('Ingen Spond-grupper funnet.');
        return;
      }
      setSelectedGroupId(group.id);
      const result = await syncPlayersFromGroup(group);
      setMessage(
        `Synkronisert «${group.name}»: ${result.added.length} nye, ${result.updatedNames.length} navn oppdatert.`
      );
      setPlayers(await listPlayers());
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

  return (
    <section className="flex w-full max-w-md flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <select
          className="flex-1 rounded bg-app-surface-deep p-2 text-app-text outline-none ring-1 ring-app-border/20"
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
        >
          {groups.length === 0 && <option value="">Velg gruppe ved synk…</option>}
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.members.length})
            </option>
          ))}
        </select>
        <button
          onClick={handleSync}
          disabled={busy}
          className="rounded bg-app-gold px-3 py-2 font-semibold text-viking-blue-deep disabled:opacity-50"
        >
          {busy ? 'Synkroniserer…' : 'Synk fra Spond'}
        </button>
      </div>
      {message && <p className="text-sm text-app-text/70">{message}</p>}

      <ul className="flex flex-col gap-2">
        {players.map((p) => (
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
        {players.length === 0 && (
          <li className="text-center text-app-text/50">Ingen spillere ennå — synkroniser fra Spond.</li>
        )}
      </ul>
    </section>
  );
}
