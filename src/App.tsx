import { useEffect, useState } from "react";
import { initialState, lookup, type Flashcard, type LookupResult } from "@lazylingo/core";
import { useAuth } from "./shared/stores/auth.store";
import { useVault } from "./shared/stores/vault.store";

const SOURCE = "en";
const TARGET = "ru";

export function App() {
  const authStatus = useAuth((s) => s.status);
  const deviceCode = useAuth((s) => s.deviceCode);
  const error = useAuth((s) => s.error);
  const signIn = useAuth((s) => s.signIn);
  const signOut = useAuth((s) => s.signOut);
  const token = useAuth((s) => s.token);

  const vault = useVault((s) => s.vault);
  const vaultStatus = useVault((s) => s.status);

  // hydrate auth on mount
  useEffect(() => {
    void useAuth.getState().hydrate();
  }, []);

  // bootstrap vault when signed in
  useEffect(() => {
    return useAuth.subscribe((s, prev) => {
      if (s.status === "signed_in" && prev.status !== "signed_in" && s.token) {
        void useVault.getState().bootstrap(s.token);
      }
      if (s.status === "idle" && prev.status === "signed_in") {
        useVault.getState().reset();
      }
    });
  }, []);

  // bootstrap on first hydrate-from-storage
  useEffect(() => {
    if (authStatus === "signed_in" && vaultStatus === "idle" && token) {
      void useVault.getState().bootstrap(token);
    }
  }, [authStatus, vaultStatus, token]);

  return (
    <div className="w-[380px] min-h-[420px] bg-slate-950 text-slate-100 p-4">
      {authStatus !== "signed_in" ? (
        <SignInPanel
          status={authStatus}
          deviceCode={deviceCode}
          error={error}
          signIn={signIn}
        />
      ) : (
        <LookupPanel vault={vault} vaultStatus={vaultStatus} signOut={signOut} />
      )}
    </div>
  );
}

function SignInPanel({
  status,
  deviceCode,
  error,
  signIn,
}: {
  status: string;
  deviceCode: { userCode: string; verificationUri: string } | null;
  error: string | null;
  signIn: () => Promise<void>;
}) {
  if (status === "awaiting_user" && deviceCode) {
    return (
      <div className="flex flex-col items-center gap-3 p-2">
        <h1 className="text-lg font-semibold">Authorize on GitHub</h1>
        <p className="text-xs text-slate-400 text-center">Enter this code:</p>
        <code className="text-2xl font-mono tracking-widest bg-slate-900 px-3 py-2 rounded">
          {deviceCode.userCode}
        </code>
        <a
          href={deviceCode.verificationUri}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded bg-emerald-500 px-3 py-1 text-slate-900 text-sm font-medium"
        >
          Open GitHub
        </a>
        <p className="text-xs text-slate-500">Waiting…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col gap-3 p-2">
        <h1 className="text-lg font-semibold text-rose-400">Sign-in failed</h1>
        <p className="text-xs text-slate-400">{error}</p>
        <button onClick={() => signIn()} className="rounded bg-slate-700 px-3 py-1 text-sm">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 p-2">
      <h1 className="text-lg font-semibold">LazyLingo</h1>
      <p className="text-xs text-slate-400 text-center">
        Sign in to save words to your vault.
      </p>
      <button
        onClick={() => signIn()}
        className="rounded bg-emerald-500 px-3 py-1 text-slate-900 text-sm font-medium"
      >
        Sign in with GitHub
      </button>
    </div>
  );
}

function LookupPanel({
  vault,
  vaultStatus,
  signOut,
}: {
  vault: ReturnType<typeof useVault.getState>["vault"];
  vaultStatus: string;
  signOut: () => Promise<void>;
}) {
  const [word, setWord] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [phase, setPhase] = useState<"idle" | "looking_up" | "previewing" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (vaultStatus === "bootstrapping") {
    return <p className="text-sm text-slate-400">Setting up your vault…</p>;
  }
  if (vaultStatus === "error") {
    return <p className="text-sm text-rose-400">Vault setup failed.</p>;
  }
  if (!vault) {
    return <p className="text-sm text-slate-400">Loading vault…</p>;
  }

  async function onLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!word.trim()) return;
    setPhase("looking_up");
    setError(null);
    try {
      const r = await lookup(word.trim(), SOURCE, TARGET, new Date().toISOString());
      setResult(r);
      setPhase("previewing");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  async function onSave() {
    if (!result || !vault) return;
    setPhase("saving");
    const now = new Date().toISOString();
    const card: Flashcard = {
      word: result.word,
      sourceLang: result.sourceLang,
      targetLang: result.targetLang,
      decks: [],
      lookup: result,
      srs: initialState(now),
      createdAt: now,
      updatedAt: now,
    };
    try {
      await vault.saveCard(card);
      setPhase("saved");
      setWord("");
      setResult(null);
      setTimeout(() => setPhase("idle"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <h1 className="text-sm text-slate-400">LazyLingo</h1>
        <button onClick={signOut} className="text-xs text-slate-500 hover:text-slate-300">
          Sign out
        </button>
      </div>

      <form onSubmit={onLookup} className="flex gap-2">
        <input
          aria-label="Word"
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="Type a word…"
          className="flex-1 bg-slate-900 text-slate-100 rounded px-2 py-1 text-sm"
          autoFocus
        />
        <button
          type="submit"
          disabled={phase === "looking_up"}
          className="rounded bg-emerald-500 px-3 text-slate-900 text-sm font-medium disabled:opacity-50"
        >
          {phase === "looking_up" ? "…" : "Look up"}
        </button>
      </form>

      {phase === "saved" && (
        <p className="text-xs text-emerald-400">Saved.</p>
      )}

      {error && phase === "error" && <p className="text-xs text-rose-400">{error}</p>}

      {result && phase === "previewing" && (
        <div className="border border-slate-800 rounded p-2 text-sm space-y-2 max-h-[280px] overflow-y-auto">
          <header>
            <h2 className="font-semibold text-slate-100">{result.word}</h2>
            {result.phonetic && <span className="text-xs text-slate-400">{result.phonetic}</span>}
          </header>
          {result.posSections.map((section) => (
            <section key={section.pos}>
              <h3 className="text-xs uppercase tracking-wider text-slate-500">{section.pos}</h3>
              <ul className="space-y-1">
                {section.senses.map((sense, i) => (
                  <li key={i}>
                    <span className="text-slate-100">{sense.definition}</span>
                    {sense.translation && (
                      <div className="text-emerald-400 ml-3">→ {sense.translation}</div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <button
            onClick={onSave}
            className="w-full rounded bg-emerald-500 px-3 py-1 text-slate-900 text-sm font-medium mt-2"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
