/*
 * E2 — account registry with real credential checking.
 *
 * Passwords are scrypt-hashed with a per-user random salt; records live
 * in users.json under the data directory (or in memory for ephemeral
 * runs). This is the piece the shared handlers deliberately don't have:
 * the mock accepts any credentials, the server does not.
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  handle: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

interface UsersFile {
  counter: number;
  users: UserRecord[];
}

export interface UserStore {
  findByEmail(email: string): UserRecord | undefined;
  findById(id: string): UserRecord | undefined;
  create(input: { name: string; email: string; password: string }): UserRecord;
  verifyPassword(user: UserRecord, password: string): boolean;
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString('hex');
}

export function deriveHandle(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  return `@${slug || 'creator'}`;
}

export function createUserStore(dataDir: string | null): UserStore {
  const file = dataDir ? join(dataDir, 'users.json') : null;

  let data: UsersFile = { counter: 1, users: [] };
  if (file) {
    mkdirSync(dataDir!, { recursive: true });
    try {
      data = JSON.parse(readFileSync(file, 'utf8')) as UsersFile;
    } catch {
      /* first boot or unreadable file — start fresh */
    }
  }

  function persist() {
    if (!file) return;
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    renameSync(tmp, file);
  }

  return {
    findByEmail(email) {
      const normalized = email.trim().toLowerCase();
      return data.users.find((u) => u.email.toLowerCase() === normalized);
    },
    findById(id) {
      return data.users.find((u) => u.id === id);
    },
    create({ name, email, password }) {
      const salt = randomBytes(16).toString('hex');
      const user: UserRecord = {
        id: `usr_${String(data.counter++).padStart(4, '0')}`,
        name: name.trim(),
        email: email.trim(),
        handle: deriveHandle(name),
        passwordHash: hashPassword(password, salt),
        salt,
        createdAt: new Date().toISOString(),
      };
      data.users.push(user);
      persist();
      return user;
    },
    verifyPassword(user, password) {
      const expected = Buffer.from(user.passwordHash, 'hex');
      const provided = Buffer.from(hashPassword(password, user.salt), 'hex');
      return expected.length === provided.length && timingSafeEqual(expected, provided);
    },
  };
}
