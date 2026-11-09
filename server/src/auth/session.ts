import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { CookieOptions } from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const SECRET_FILE = path.join(DATA_DIR, 'jwt-secret.txt');

const SESSION_COOKIE_NAME = 'sq_session';
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 días

/** Si no se configura AUTH_JWT_SECRET, genera uno aleatorio la primera vez y lo reutiliza en
 * los siguientes arranques (guardado junto a los demás datos del servidor), para no invalidar
 * todas las sesiones en cada reinicio. En producción es mejor definirlo explícitamente. */
function loadOrCreateSecret(): string {
  if (process.env.AUTH_JWT_SECRET) return process.env.AUTH_JWT_SECRET;
  try {
    return fs.readFileSync(SECRET_FILE, 'utf-8').trim();
  } catch {
    const secret = randomBytes(48).toString('hex');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SECRET_FILE, secret, 'utf-8');
    console.warn(
      'Aviso: AUTH_JWT_SECRET no está configurado. Se ha generado uno y se ha guardado en ' +
        'server/data/jwt-secret.txt. Para producción, defínelo tú mismo como variable de entorno.',
    );
    return secret;
  }
}

const SECRET = loadOrCreateSecret();

export { SESSION_COOKIE_NAME };

export function signSessionToken(userId: string): string {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: TOKEN_TTL_SECONDS });
}

export function verifySessionToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, SECRET) as { sub: string };
    return payload.sub;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: TOKEN_TTL_SECONDS * 1000,
    path: '/',
  };
}
