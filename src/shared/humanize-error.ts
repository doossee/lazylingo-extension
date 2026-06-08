/**
 * Turn a raw error (from @lazylingo/core, the GitHub API, or the network) into a
 * short, plain-language message safe to show a user. Never leaks raw codes or
 * stack text; falls back to a generic message for anything unrecognized.
 *
 * Mirrors lazylingo-app's helper so both surfaces speak the same language.
 */
export function humanizeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const msg = raw.toLowerCase();

  const notFound = /^word not found:\s*(.+)$/i.exec(raw);
  if (notFound) {
    return `We couldn't find "${notFound[1].trim()}" in the dictionary. Check the spelling, or try a different word.`;
  }

  if (/failed to fetch|networkerror|load failed|fetch failed|err_network/.test(msg)) {
    return "Couldn't reach the network. Check your connection and try again.";
  }

  if (/access_denied/.test(msg)) {
    return "GitHub sign-in was declined. Try again when you're ready.";
  }

  if (/\b401\b|\b403\b|bad credentials|unauthorized/.test(msg)) {
    return "Your GitHub access isn't working. Sign out and sign back in.";
  }

  if (/\b409\b|sha mismatch|conflict/.test(msg)) {
    return "This card was changed somewhere else. Try again.";
  }

  if (/\b404\b/.test(msg)) {
    return "We couldn't find that in your vault. It may have been deleted.";
  }

  if (/device flow|expired_token|slow_down/.test(msg)) {
    return "The sign-in code expired. Start over to get a new one.";
  }

  if (/mymemory/.test(msg)) {
    return "The translation service is busy right now. Try again in a moment.";
  }

  if (/free-dict|dictionaryapi/.test(msg)) {
    return "The dictionary service is busy right now. Try again in a moment.";
  }

  if (/\b5\d\d\b/.test(msg)) {
    return "Something went wrong on the server. Try again in a moment.";
  }

  return "Something went wrong. Please try again.";
}
