import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PublicUser } from '@rosco/shared';
import { useAuth } from '../context/AuthContext';
import { getAdminStats, listAdminUsers, setUserPlan, type AdminStats } from '../api/admin';
import Logo from '../components/Logo';

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || !user.isAdmin) return;
    Promise.all([listAdminUsers(), getAdminStats()])
      .then(([u, s]) => {
        setUsers(u.users);
        setStats(s);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el panel.'));
  }, [loading, user]);

  if (loading) {
    return (
      <div className="screen screen-center">
        <p className="app-subtitle">Cargando...</p>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return (
      <div className="screen screen-center">
        <p className="error-text">No tienes acceso a esta página.</p>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          ← Volver al inicio
        </button>
      </div>
    );
  }

  async function togglePlan(target: PublicUser) {
    setBusyId(target.id);
    try {
      const nextPlan = target.plan === 'premium' ? 'free' : 'premium';
      const { user: updated } = await setUserPlan(target.id, nextPlan);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el plan.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="screen study-topic-screen">
      <button className="back-to-hub-link" onClick={() => navigate('/')}>
        ← Inicio
      </button>
      <div className="profile-header">
        <Logo variant="icon" size={40} />
        <div>
          <h1 className="app-title profile-title">Panel de administración</h1>
          <p className="app-subtitle">Usuarios, planes y uso de SocialQuizz</p>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {stats && (
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.totalUsers}</span>
            <span className="admin-stat-label">Usuarios</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.verifiedUsers}</span>
            <span className="admin-stat-label">Verificados</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.premiumUsers}</span>
            <span className="admin-stat-label">Premium</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.totalTopics}</span>
            <span className="admin-stat-label">Temas creados</span>
          </div>
        </div>
      )}

      <div className="admin-users-table">
        <div className="admin-users-row admin-users-head">
          <span>Nombre</span>
          <span>Email</span>
          <span>Nivel</span>
          <span>Plan</span>
          <span></span>
        </div>
        {users.map((u) => (
          <div key={u.id} className="admin-users-row">
            <span>
              {u.name} {u.isAdmin && <span className="admin-badge">ADMIN</span>}
            </span>
            <span className="admin-users-email">{u.email}</span>
            <span>{u.level || '—'}</span>
            <span className={u.plan === 'premium' ? 'admin-plan-premium' : ''}>{u.plan}</span>
            <button
              type="button"
              className="btn btn-secondary admin-plan-btn"
              onClick={() => togglePlan(u)}
              disabled={busyId === u.id}
            >
              {busyId === u.id ? '...' : u.plan === 'premium' ? 'Quitar premium' : 'Dar premium'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
