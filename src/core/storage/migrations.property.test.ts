import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { sampleData } from '../../test/fixtures';
import { fcConfig } from '../../test/fcConfig';
import { createMemoryBackend } from './memory';
import { createStorageService, DATA_KEY } from './StorageService';
import type { Migration } from './types';

function docWith(schemaVersion: number, payload: unknown): string {
  return JSON.stringify({ schemaVersion, savedAt: '2026-11-22T10:00:00.000Z', payload });
}

describe('Property 12: migrations run once each, in ascending order', () => {
  it('runs steps v..current-1 exactly once, ascending, before data is returned', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 1, max: 6 }),
        async (start, extra) => {
          const current = start + extra;
          const calls: number[] = [];
          // Chain covers every step from 0, listed in shuffled-looking order on purpose.
          const chain: Migration[] = Array.from({ length: current }, (_, from) => ({
            from,
            run: (d: unknown) => {
              calls.push(from);
              return d;
            },
          })).reverse();
          const backend = createMemoryBackend();
          await backend.set(DATA_KEY, docWith(start, sampleData()));
          const service = createStorageService({ backend, migrations: chain, currentVersion: current });

          const outcome = await service.load();

          const expected = Array.from({ length: extra }, (_, i) => start + i);
          expect(calls).toEqual(expected);
          expect(outcome.status).toBe('ok');
          if (outcome.status === 'ok') expect(outcome.migrated).toBe(true);
        },
      ),
      fcConfig,
    );
  });

  it('passes each step the output of the previous step', async () => {
    const chain: Migration[] = [
      { from: 0, run: (d) => ({ ...(d as object), trail: ['0'] }) },
      { from: 1, run: (d) => ({ ...(d as { trail: string[] }), trail: [...(d as { trail: string[] }).trail, '1'] }) },
    ];
    const backend = createMemoryBackend();
    await backend.set(DATA_KEY, docWith(0, sampleData()));
    const service = createStorageService({ backend, migrations: chain, currentVersion: 2 });
    const outcome = await service.load();
    expect(outcome.status).toBe('ok');
    if (outcome.status === 'ok') expect((outcome.data as unknown as { trail: string[] }).trail).toEqual(['0', '1']);
  });
});
