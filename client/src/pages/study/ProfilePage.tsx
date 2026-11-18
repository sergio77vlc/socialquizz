import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StudyTopicSummary } from '@rosco/shared';
import { STUDY_ACTIVITY_KINDS } from '@rosco/shared';
import { listStudyTopics } from '../../api/study';
import Logo from '../../components/Logo';
import { useAuth } from '../../context/AuthContext';

const STATUS_LABELS: Record<StudyTopicSummary['status'], string> = {
  generando: '⏳ Generando...',
  listo: '✅ Listo',
  error: '⚠️ Error',
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [topics, setTopics] = useState<StudyTopicSummary[]>([]);
  const [monthlyUsed, setMonthlyUsed] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState(5);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listStudyTopics()
      .then((data) => {
        setTopics(data.topics);
        setMonthlyUsed(data.monthlyUsed);
        setMonthlyLimit(data.monthlyLimit);
      })
      .finally(() => setLoading(false));
  }, []);

  const limitReached = monthlyUsed >= monthlyLimit;

  return (
    <div className="screen study-topic-screen">
      <button className="back-to-hub-link" onClick={() => navigate('/')}>
        ← Inicio
      </button>
      <div className="profile-header">
        <Logo variant="icon" size={40} />
        <div>
          <h1 className="app-title profile-title">{user ? `Hola, ${user.name}` : 'Mis temas'}</h1>
          <p className="app-subtitle">
            Plan {user?.plan === 'premium' ? 'premium (100 temas/mes)' : 'gratis'} · {monthlyUsed}/{monthlyLimit} temas
            creados este mes
          </p>
        </div>
      </div>

      {limitReached && user?.plan !== 'premium' && (
        <div className="study-upgrade-banner">
          <p>Has usado tus {monthlyLimit} temas gratuitos de este mes.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/premium')}>
            ⭐ Hazte premium (20€/mes · 100 temas)
          </button>
        </div>
      )}

      <button type="button" className="btn btn-primary btn-big" onClick={() => navigate('/')} disabled={limitReached}>
        ➕ Nuevo tema
      </button>

      {loading && <p className="app-subtitle">Cargando tus temas...</p>}

      {!loading && topics.length === 0 && (
        <p className="hub-empty">Aún no has creado ningún tema. Sube tu primer temario desde el inicio.</p>
      )}

      <div className="profile-topics-grid">
        {topics.map((t) => {
          const pct = Math.round((t.completedActivities.length / STUDY_ACTIVITY_KINDS.length) * 100);
          return (
            <button key={t.id} type="button" className="profile-topic-card" onClick={() => navigate(`/tema/${t.id}`)}>
              <div className="profile-topic-head">
                <h3>{t.title}</h3>
                <span className={`profile-topic-status profile-topic-status-${t.status}`}>{STATUS_LABELS[t.status]}</span>
              </div>
              <p className="study-form-hint">{t.subject}</p>
              {t.status === 'listo' && (
                <>
                  <div className="study-progress-bar study-progress-bar-sm">
                    <div className="study-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="home-content-count">
                    {pct}% completado{t.bestExamScore != null ? ` · examen: ${t.bestExamScore}/10` : ''}
                  </p>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
