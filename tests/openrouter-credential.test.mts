import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

function createStorageArea(values: Map<string, unknown>) {
  return {
    async get(keys: string | string[] | null): Promise<Record<string, unknown>> {
      if (keys === null) return Object.fromEntries(values.entries());
      const requested = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(
        requested.map(key => [key, structuredClone(values.get(key))])
      );
    },
    async set(entries: Record<string, unknown>): Promise<void> {
      for (const [key, value] of Object.entries(entries)) {
        values.set(key, structuredClone(value));
      }
    },
    async remove(keys: string | string[]): Promise<void> {
      for (const key of Array.isArray(keys) ? keys : [keys]) values.delete(key);
    },
    async clear(): Promise<void> {
      values.clear();
    },
  };
}

const localValues = new Map<string, unknown>();
const sessionValues = new Map<string, unknown>();

(globalThis as typeof globalThis & { chrome: unknown }).chrome = {
  storage: {
    local: createStorageArea(localValues),
    session: createStorageArea(sessionValues),
  },
};

const { OpenRouterCredentialStorage } = await import(
  '../lib/storage/openrouter-credential-storage.mts'
);

beforeEach(async () => {
  localValues.clear();
  sessionValues.clear();
  await OpenRouterCredentialStorage.clearCredential();
});

test('session-only is the default credential persistence mode', async () => {
  await OpenRouterCredentialStorage.setCredential('  sk-session-secret  ', false);

  assert.equal(
    sessionValues.get('phantom_trail_openrouter_key'),
    'sk-session-secret'
  );
  assert.equal(localValues.has('phantom_trail_openrouter_key'), false);
  assert.equal(
    await OpenRouterCredentialStorage.getCredential(),
    'sk-session-secret'
  );
  assert.deepEqual(await OpenRouterCredentialStorage.getState(), {
    configured: true,
    persistence: 'session',
  });
});

test('persistent credential storage requires the explicit remember flag', async () => {
  await OpenRouterCredentialStorage.setCredential('sk-local-secret', true);

  assert.equal(
    localValues.get('phantom_trail_openrouter_key'),
    'sk-local-secret'
  );
  assert.equal(sessionValues.has('phantom_trail_openrouter_key'), false);
  assert.deepEqual(await OpenRouterCredentialStorage.getState(), {
    configured: true,
    persistence: 'local',
  });
});

test('changing from persistent to session removes the disk copy', async () => {
  await OpenRouterCredentialStorage.setCredential('sk-local-secret', true);
  await OpenRouterCredentialStorage.setCredential('sk-session-secret', false);

  assert.equal(localValues.has('phantom_trail_openrouter_key'), false);
  assert.equal(
    sessionValues.get('phantom_trail_openrouter_key'),
    'sk-session-secret'
  );
});

test('clear removes session, persistent, and in-memory copies', async () => {
  await OpenRouterCredentialStorage.setCredential('sk-secret', false);
  await OpenRouterCredentialStorage.clearCredential();

  assert.equal(localValues.size, 0);
  assert.equal(sessionValues.size, 0);
  assert.equal(await OpenRouterCredentialStorage.getCredential(), '');
  assert.deepEqual(await OpenRouterCredentialStorage.getState(), {
    configured: false,
    persistence: 'none',
  });
});
