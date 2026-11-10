import { useEffect, useState } from 'react';
import { isLoggedIn, login, logout, onAuthChange } from './lib/auth';
import Players from './features/Players';
import Plans from './features/Plans';
import Sessions from './features/Sessions';

type View = 'players' | 'plans' | 'sessions';

export default function App() {
  const [view, setView] = useState<View>('players');
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    isLoggedIn().then(setLoggedIn);
    return onAuthChange(setLoggedIn);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const ok = await login(username, password);
    setBusy(false);
    if (!ok) setError('Feil brukernavn eller passord.');
  }

  if (loggedIn === null) {
    return <main className="flex min-h-screen items-center justify-center p-6 text-app-text/70">Laster…</main>;
  }

  if (!loggedIn) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <h1 className="font-display text-4xl text-app-gold">Spondplan</h1>
        <form onSubmit={handleLogin} className="flex w-full max-w-xs flex-col gap-2">
          <input
            className="rounded bg-app-surface-deep p-2 text-app-text outline-none ring-1 ring-app-border/20 focus:ring-app-gold"
            placeholder="Brukernavn"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
          <input
            className="rounded bg-app-surface-deep p-2 text-app-text outline-none ring-1 ring-app-border/20 focus:ring-app-gold"
            type="password"
            placeholder="Passord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-app-gold p-2 font-semibold text-viking-blue-deep disabled:opacity-50"
          >
            {busy ? 'Logger inn…' : 'Logg inn'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 p-6">
      <header className="flex w-full max-w-md items-center justify-between">
        <h1 className="font-display text-2xl text-app-gold">Spondplan</h1>
        <button
          onClick={() => logout()}
          className="rounded bg-app-surface-2 px-3 py-1 text-sm text-app-text"
        >
          Logg ut
        </button>
      </header>
      <nav className="flex w-full max-w-md gap-2">
        {(
          [
            ['players', 'Spillere'],
            ['plans', 'Øktplaner'],
            ['sessions', 'Økter']
          ] as Array<[View, string]>
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 rounded px-3 py-2 text-sm font-semibold ${
              view === v ? 'bg-app-gold text-viking-blue-deep' : 'bg-app-surface-2 text-app-text'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      {view === 'players' ? <Players /> : view === 'plans' ? <Plans /> : <Sessions />}
    </main>
  );
}
