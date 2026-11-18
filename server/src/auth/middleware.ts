import type { NextFunction, Request, Response } from 'express';
import { findUserById } from './userRepository.js';
import { SESSION_COOKIE_NAME, verifySessionToken } from './session.js';
import type { StoredUser } from './types.js';

export interface AuthedRequest extends Request {
  authUser?: StoredUser;
}

export function getUserFromRequest(req: Request): StoredUser | null {
  const token = (req as any).cookies?.[SESSION_COOKIE_NAME];
  if (!token) return null;
  const userId = verifySessionToken(token);
  if (!userId) return null;
  return findUserById(userId) ?? null;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'No has iniciado sesión.' });
    return;
  }
  req.authUser = user;
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'No has iniciado sesión.' });
    return;
  }
  if (!user.isAdmin) {
    res.status(403).json({ error: 'No tienes permisos de administrador.' });
    return;
  }
  req.authUser = user;
  next();
}
