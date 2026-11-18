import type { PublicUser, UserPlan } from '@rosco/shared';

async function parseOrThrow(res: Response): Promise<any> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de red.');
  return data;
}

export interface AdminStats {
  totalUsers: number;
  premiumUsers: number;
  verifiedUsers: number;
  totalTopics: number;
}

export async function listAdminUsers(): Promise<{ users: PublicUser[] }> {
  const res = await fetch('/api/admin/users', { credentials: 'same-origin' });
  return parseOrThrow(res);
}

export async function getAdminStats(): Promise<AdminStats> {
  const res = await fetch('/api/admin/stats', { credentials: 'same-origin' });
  return parseOrThrow(res);
}

export async function setUserPlan(userId: string, plan: UserPlan): Promise<{ user: PublicUser }> {
  const res = await fetch(`/api/admin/users/${userId}/plan`, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });
  return parseOrThrow(res);
}
