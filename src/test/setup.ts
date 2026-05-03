import "@testing-library/jest-dom/vitest";

// Minimal chrome.storage shim for tests. Each test gets a fresh in-memory store.
type StorageData = Record<string, unknown>;

function makeArea() {
  const data: StorageData = {};
  return {
    _data: data,
    get: vi.fn(async (keys?: string | string[]) => {
      if (keys === undefined) return { ...data };
      const list = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(list.map((k) => [k, data[k]]));
    }),
    set: vi.fn(async (items: StorageData) => {
      Object.assign(data, items);
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      const list = Array.isArray(keys) ? keys : [keys];
      for (const k of list) delete data[k];
    }),
    clear: vi.fn(async () => {
      for (const k of Object.keys(data)) delete data[k];
    }),
  };
}

function makeEvent() {
  const fns: Array<(...args: unknown[]) => unknown> = [];
  return {
    addListener: vi.fn((fn: (...args: unknown[]) => unknown) => fns.push(fn)),
    removeListener: vi.fn(),
    hasListener: vi.fn(),
    _fire: (...args: unknown[]) => fns.forEach((fn) => fn(...args)),
  };
}

const localArea = makeArea();
const syncArea = makeArea();
const sessionArea = makeArea();

const onInstalled = makeEvent();
const onStartup = makeEvent();
const ctxMenuOnClicked = makeEvent();

const ctxMenuCreate = vi.fn();
const ctxMenuRemoveAll = vi.fn((cb?: () => void) => cb && cb());
const actionOpenPopup = vi.fn(async () => {});

(globalThis as unknown as { chrome: typeof chrome }).chrome = {
  storage: {
    local: localArea,
    sync: syncArea,
    session: sessionArea,
  },
  contextMenus: {
    create: ctxMenuCreate,
    removeAll: ctxMenuRemoveAll,
    onClicked: ctxMenuOnClicked,
  },
  runtime: {
    onInstalled,
    onStartup,
    getManifest: vi.fn(() => ({ version: "0.2.0" })),
  },
  action: { openPopup: actionOpenPopup },
} as unknown as typeof chrome;

// Expose for tests:
(globalThis as Record<string, unknown>).__chromeMocks__ = {
  onInstalled,
  onStartup,
  ctxMenuOnClicked,
  ctxMenuCreate,
  ctxMenuRemoveAll,
  actionOpenPopup,
};

beforeEach(() => {
  // Clear all storage data
  for (const k of Object.keys(localArea._data)) delete localArea._data[k];
  for (const k of Object.keys(syncArea._data)) delete syncArea._data[k];
  for (const k of Object.keys(sessionArea._data)) delete sessionArea._data[k];
  // Reset mock call counts
  vi.clearAllMocks();
  // Re-wire removeAll so the callback still fires after clearAllMocks
  ctxMenuRemoveAll.mockImplementation((cb?: () => void) => cb && cb());
  actionOpenPopup.mockResolvedValue(undefined);
});
