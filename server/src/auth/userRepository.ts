import type { PublicUser } from '@rosco/shared';
import { loadUsers, saveUsers } from './store.js';
import type { StoredUser } from './types.js';

// Caché en memoria respaldada en disco, igual que los repositorios de paquetes: se carga una
// vez al arrancar el servidor y cada cambio se persiste de inmediato.
let users: StoredUser[] = loadUsers();

export function findUserByEmail(email: string): StoredUser | undefined {
  const normalized = email.trim().toLowerCase();
  return users.find((u) => u.email === normalized);
}

export function findUserById(id: string): StoredUser | undefined {
  return users.find((u) => u.id === id);
}

export function addUser(user: StoredUser): void {
  users = [...users, user];
  saveUsers(users);
}

export function updateUser(id: string, patch: Partial<StoredUser>): StoredUser | undefined {
  let updated: StoredUser | undefined;
  users = users.map((u) => {
    if (u.id !== id) return u;
    updated = { ...u, ...patch };
    return updated;
  });
  if (updated) saveUsers(users);
  return updated;
}

export function findUserByVerificationTokenHash(tokenHash: string): StoredUser | undefined {
  return users.find((u) => u.pendingVerification?.tokenHash === tokenHash);
}

export function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    verified: user.verified,
    favorites: user.favorites,
    createdAt: user.createdAt,
  };
}
