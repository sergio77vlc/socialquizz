import type { Express, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { nanoid } from 'nanoid';
import type { AuthResponse, EducationLevel, LoginPayload, OnboardingPayload, RegisterPayload, UserPlan } from '@rosco/shared';
import {
  addUser,
  findUserByEmail,
  findUserById,
  findUserByVerificationTokenHash,
  listUsers,
  toPublicUser,
  updateUser,
} from './auth/userRepository.js';
import { hashPassword, verifyPassword } from './auth/password.js';
import { createVerificationToken, hashToken, isVerificationTokenValid } from './auth/verificationToken.js';
import { SESSION_COOKIE_NAME, sessionCookieOptions, signSessionToken } from './auth/session.js';
import { sendVerificationEmail } from './email/resend.js';
import type { StoredUser } from './auth/types.js';
import { type AuthedRequest, getUserFromRequest, requireAuth, requireAdmin } from './auth/middleware.js';
import { countAllTopics } from './study/repository.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_FAVORITES = 50;

function publicOrigin(req: Request): string {
  return process.env.PUBLIC_ORIGIN || `${req.protocol}://${req.get('host')}`;
}

function setSessionCookie(res: Response, userId: string): void {
  res.cookie(SESSION_COOKIE_NAME, signSessionToken(userId), sessionCookieOptions());
}

const EDUCATION_LEVELS: EducationLevel[] = ['primaria', 'eso', 'bachillerato', 'fp', 'universidad', 'otro'];
const USER_PLANS: UserPlan[] = ['free', 'premium'];

async function sendVerificationLink(req: Request, user: StoredUser, rawToken: string): Promise<void> {
  const verifyUrl = `${publicOrigin(req)}/api/auth/verify?token=${rawToken}`;
  try {
    await sendVerificationEmail(user.email, user.name, verifyUrl);
  } catch (err) {
    console.error('Error enviando email de verificación:', err);
  }
}

export function registerAuthRoutes(app: Express): void {
  app.use(cookieParser());

  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = (req.body ?? {}) as Partial<RegisterPayload>;
    const cleanName = (name ?? '').trim().slice(0, 40);
    const cleanEmail = (email ?? '').trim().toLowerCase();

    if (!cleanName) {
      res.status(400).json({ error: 'Indica tu nombre.' });
      return;
    }
    if (!EMAIL_RE.test(cleanEmail)) {
      res.status(400).json({ error: 'Indica un email válido.' });
      return;
    }
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` });
      return;
    }
    if (findUserByEmail(cleanEmail)) {
      res.status(409).json({ error: 'Ya existe una cuenta con ese email.' });
      return;
    }

    const { rawToken, pending } = createVerificationToken();
    const user: StoredUser = {
      id: nanoid(12),
      name: cleanName,
      email: cleanEmail,
      passwordHash: hashPassword(password),
      verified: false,
      createdAt: Date.now(),
      favorites: [],
      pendingVerification: pending,
      level: null,
      plan: 'free',
      isAdmin: false,
    };
    addUser(user);
    await sendVerificationLink(req, user, rawToken);

    const response: AuthResponse = { user: toPublicUser(user) };
    res.json(response);
  });

  app.post('/api/auth/resend-verification', async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const user = findUserByEmail(email);
    // Respuesta genérica tanto si existe la cuenta como si no, para no filtrar qué emails están registrados.
    if (!user || user.verified) {
      res.json({ ok: true });
      return;
    }
    const { rawToken, pending } = createVerificationToken();
    updateUser(user.id, { pendingVerification: pending });
    await sendVerificationLink(req, user, rawToken);
    res.json({ ok: true });
  });

  app.get('/api/auth/verify', (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const origin = publicOrigin(req);
    if (!token) {
      res.redirect(`${origin}/verificar?status=invalid`);
      return;
    }
    const user = findUserByVerificationTokenHash(hashToken(token));
    if (!user) {
      res.redirect(`${origin}/verificar?status=invalid`);
      return;
    }
    if (!isVerificationTokenValid(user.pendingVerification, token)) {
      res.redirect(`${origin}/verificar?status=expired`);
      return;
    }
    updateUser(user.id, { verified: true, pendingVerification: null });
    setSessionCookie(res, user.id);
    res.redirect(`${origin}/verificar?status=ok`);
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = (req.body ?? {}) as Partial<LoginPayload>;
    const cleanEmail = (email ?? '').trim().toLowerCase();
    const user = findUserByEmail(cleanEmail);
    if (!user || !password || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Email o contraseña incorrectos.' });
      return;
    }
    if (!user.verified) {
      res.status(403).json({ error: 'Verifica tu email antes de iniciar sesión.', needsVerification: true });
      return;
    }
    setSessionCookie(res, user.id);
    const response: AuthResponse = { user: toPublicUser(user) };
    res.json(response);
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: 'No has iniciado sesión.' });
      return;
    }
    const response: AuthResponse = { user: toPublicUser(user) };
    res.json(response);
  });

  app.put('/api/auth/favorites', requireAuth, (req: AuthedRequest, res) => {
    const favorites = req.body?.favorites;
    if (!Array.isArray(favorites) || !favorites.every((f) => typeof f === 'string')) {
      res.status(400).json({ error: 'Lista de favoritos no válida.' });
      return;
    }
    const clean = Array.from(new Set(favorites)).slice(0, MAX_FAVORITES);
    const updated = updateUser(req.authUser!.id, { favorites: clean });
    const response: AuthResponse = { user: toPublicUser(updated!) };
    res.json(response);
  });

  app.put('/api/auth/level', requireAuth, (req: AuthedRequest, res) => {
    const { level } = (req.body ?? {}) as Partial<OnboardingPayload>;
    if (!level || !EDUCATION_LEVELS.includes(level)) {
      res.status(400).json({ error: 'Nivel educativo no válido.' });
      return;
    }
    const updated = updateUser(req.authUser!.id, { level });
    const response: AuthResponse = { user: toPublicUser(updated!) };
    res.json(response);
  });

  app.get('/api/admin/users', requireAdmin, (_req, res) => {
    res.json({ users: listUsers().map(toPublicUser) });
  });

  app.get('/api/admin/stats', requireAdmin, (_req, res) => {
    const users = listUsers();
    res.json({
      totalUsers: users.length,
      premiumUsers: users.filter((u) => u.plan === 'premium').length,
      verifiedUsers: users.filter((u) => u.verified).length,
      totalTopics: countAllTopics(),
    });
  });

  app.put('/api/admin/users/:id/plan', requireAdmin, (req: AuthedRequest, res) => {
    const { plan } = (req.body ?? {}) as { plan?: UserPlan };
    if (!plan || !USER_PLANS.includes(plan)) {
      res.status(400).json({ error: 'Plan no válido.' });
      return;
    }
    const target = findUserById(req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }
    const updated = updateUser(target.id, { plan });
    res.json({ user: toPublicUser(updated!) });
  });
}
