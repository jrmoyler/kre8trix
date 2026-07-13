/*
 * E2 — persistence backends for the real server.
 *
 * The file store keeps one JSON document per account namespace under
 * the data directory (writes go through a temp file + rename so a
 * crash mid-write can't corrupt existing state). The memory store
 * backs ephemeral runs (tests, demos) where nothing should outlive
 * the process.
 */

import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { StateStore } from '../src/backend/state';

/** Namespaces are user ids (usr_*) — keep filenames strictly boring anyway. */
function sanitizeNamespace(namespace: string): string {
  const safe = namespace.replace(/[^a-zA-Z0-9_-]/g, '_');
  return safe || 'default';
}

export function createFileStore(dataDir: string): StateStore {
  mkdirSync(dataDir, { recursive: true });
  const fileFor = (namespace: string) => join(dataDir, `state-${sanitizeNamespace(namespace)}.json`);

  return {
    load(namespace) {
      try {
        return readFileSync(fileFor(namespace), 'utf8');
      } catch {
        return null;
      }
    },
    save(namespace, serialized) {
      const target = fileFor(namespace);
      const tmp = `${target}.tmp`;
      writeFileSync(tmp, serialized, 'utf8');
      renameSync(tmp, target);
    },
    clear(namespace) {
      rmSync(fileFor(namespace), { force: true });
    },
  };
}

export function createMemoryStore(): StateStore {
  const data = new Map<string, string>();
  return {
    load: (namespace) => data.get(namespace) ?? null,
    save: (namespace, serialized) => {
      data.set(namespace, serialized);
    },
    clear: (namespace) => {
      data.delete(namespace);
    },
  };
}
