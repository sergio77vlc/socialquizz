import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StoredUser } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// server/dist/auth/store.js -> server/data/ (fuera de dist, no se borra al recompilar)
const DATA_DIR = path.join(__dirname, '../../data');
const FILE_PATH = path.join(DATA_DIR, 'users.json');

/** Lee las cuentas guardadas. Si el archivo no existe todavía, empieza vacío. */
export function loadUsers(): StoredUser[] {
  try {
    const raw = fs.readFileSync(FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Escribe la lista completa de cuentas, sobrescribiendo el archivo anterior. */
export function saveUsers(users: StoredUser[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(users, null, 2), 'utf-8');
}
