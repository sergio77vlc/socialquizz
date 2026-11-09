import { createHash, randomBytes } from 'node:crypto';
import type { PendingVerification } from './types.js';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

/** Genera un token de verificación: el crudo se manda por email, solo su hash se guarda. */
export function createVerificationToken(): { rawToken: string; pending: PendingVerification } {
  const rawToken = randomBytes(32).toString('hex');
  return {
    rawToken,
    pending: { tokenHash: hashToken(rawToken), expiresAt: Date.now() + TOKEN_TTL_MS },
  };
}

export function isVerificationTokenValid(pending: PendingVerification | null, rawToken: string): boolean {
  if (!pending) return false;
  if (pending.expiresAt < Date.now()) return false;
  return pending.tokenHash === hashToken(rawToken);
}
