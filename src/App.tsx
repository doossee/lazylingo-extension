import { useEffect, useState } from "react";
import { initialState, lookup, type Flashcard, type LookupResult } from "@lazylingo/core";
import { useAuth } from "./shared/stores/auth.store";
import { useVault } from "./shared/stores/vault.store";
import { useSettings } from "./shared/stores/settings.store";

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

  // hydrate settings on mount
  useEffect(() => {
    void useSettings.getState().hydrate();
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
    <div className="min-h-[420px] w-[380px] bg-background p-4 text-foreground">
      {authStatus !== "signed_in" ? (
        <SignInPanel status={authStatus} deviceCode={deviceCode} error={error} signIn={signIn} />
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
        <p className="text-center text-xs text-muted-foreground">Enter this code:</p>
        <code className="rounded-md border border-border bg-card px-3 py-2 font-mono text-2xl tracking-widest text-foreground">
          {deviceCode.userCode}
        </code>
        <a
          href={deviceCode.verificationUri}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
        >
          Open GitHub
        </a>
        <p className="text-xs text-muted-foreground">Waiting…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col gap-3 p-2">
        <h1 className="text-lg font-semibold text-destructive">Sign-in failed</h1>
        <p className="text-xs text-muted-foreground">{error}</p>
        <button
          onClick={() => signIn()}
          className="inline-flex h-9 items-center justify-center rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-colors hover:opacity-90"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 p-2 text-center">
      <h1 className="font-serif text-2xl text-foreground">LazyLingo</h1>
      <p className="text-xs text-muted-foreground">Sign in to save words to your vault.</p>
      <button
        onClick={() => signIn()}
        className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
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
  const sourceLang = useSettings((s) => s.sourceLang);
  const targetLang = useSettings((s) => s.targetLang);
  const setTargetLang = useSettings((s) => s.setTargetLang);

  const [word, setWord] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [phase, setPhase] = useState<"idle" | "looking_up" | "previewing" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function runLookup(w: string) {
    if (!w.trim()) return;
    setPhase("looking_up");
    setError(null);
    try {
      const r = await lookup(w.trim(), sourceLang, targetLang, new Date().toISOString());
      setResult(r);
      setPhase("previewing");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  // Check for a pending word set by the context-menu background script.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await chrome.storage.local.get("lazylingo:pending-word");
      const pending = stored["lazylingo:pending-word"];
      if (cancelled || !pending || typeof pending !== "string") return;
      await chrome.storage.local.remove("lazylingo:pending-word");
      setWord(pending);
      await runLookup(pending);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount to pick up a context-menu word
  }, []);

  if (vaultStatus === "bootstrapping") {
    return <p className="text-sm text-muted-foreground">Setting up your vault…</p>;
  }
  if (vaultStatus === "error") {
    return <p className="text-sm text-destructive">Vault setup failed.</p>;
  }
  if (!vault) {
    return <p className="text-sm text-muted-foreground">Loading vault…</p>;
  }

  async function onLookup(e: React.FormEvent) {
    e.preventDefault();
    await runLookup(word);
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
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-serif text-base text-foreground">LazyLingo</h1>
        <select
          aria-label="Target language"
          value={targetLang}
          onChange={(e) => void setTargetLang(e.target.value)}
          className="rounded-md border border-border bg-input px-1 py-0.5 text-xs text-foreground"
        >
          <option value="ru">RU</option>
          <option value="es">ES</option>
          <option value="uz">UZ</option>
          <option value="fr">FR</option>
          <option value="de">DE</option>
          <option value="ja">JA</option>
        </select>
        <button
          onClick={signOut}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
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
          className="h-8 flex-1 rounded-md border border-border bg-input px-2 text-sm text-foreground placeholder:text-muted-foreground"
          autoFocus
        />
        <button
          type="submit"
          disabled={phase === "looking_up"}
          className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {phase === "looking_up" ? "…" : "Look up"}
        </button>
      </form>

      {phase === "saved" && <p className="text-xs text-success">Saved.</p>}

      {error && phase === "error" && <p className="text-xs text-destructive">{error}</p>}

      {result && phase === "previewing" && (
        <div className="max-h-[280px] space-y-2 overflow-y-auto rounded-md border border-border p-2 text-sm">
          <header className="flex items-center gap-2">
            <h2 className="font-serif text-lg text-foreground">{result.word}</h2>
            {result.phonetic && <span className="text-xs text-muted-foreground">{result.phonetic}</span>}
            {result.audioUrl && (
              <button
                type="button"
                aria-label="Play pronunciation"
                onClick={() => void new Audio(result.audioUrl).play().catch(() => {})}
                className="text-base text-muted-foreground transition-colors hover:text-primary"
              >
                🔉
              </button>
            )}
          </header>
          {result.posSections.map((section) => (
            <section key={section.pos}>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground">{section.pos}</h3>
              <ul className="space-y-1">
                {section.senses.map((sense, i) => (
                  <li key={i}>
                    <span className="text-foreground">{sense.definition}</span>
                    {sense.translation && <div className="ml-3 text-primary">→ {sense.translation}</div>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <button
            onClick={onSave}
            className="mt-2 inline-flex h-8 w-full items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
