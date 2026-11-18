import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { StudyActivityKind, StudyTopic } from '@rosco/shared';
import { STUDY_ACTIVITY_KINDS } from '@rosco/shared';
import { createStudyTopic, getStudyTopic, markActivityComplete } from '../../api/study';
import Logo from '../../components/Logo';

const ACTIVITY_LABELS: Record<StudyActivityKind, string> = {
  rosco: '🎯 Rosco de repaso',
  crossword: '🧩 Crucigramas',
  quiz: '📝 Test de repaso',
  summary: '📄 Resumen',
  infografia: '🖼️ Infografía',
};

export default function StudyTopicPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<StudyTopic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    function load() {
      getStudyTopic(id!)
        .then(({ topic: t }) => {
          if (cancelled) return;
          setTopic(t);
          if (t.status !== 'generando' && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        })
        .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'No se pudo cargar el tema.'));
    }

    load();
    pollRef.current = setInterval(load, 3000);
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id]);

  // Ver el resumen y la infografía en esta misma pantalla ya cuenta como repasarlos.
  useEffect(() => {
    if (!topic || topic.status !== 'listo') return;
    if (topic.activities.summary && !topic.completedActivities.includes('summary')) {
      markActivityComplete(topic.id, 'summary').catch(() => {});
    }
    if (topic.activities.infografia && !topic.completedActivities.includes('infografia')) {
      markActivityComplete(topic.id, 'infografia').catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic?.status]);

  async function retry() {
    if (!topic) return;
    setRetrying(true);
    setError(null);
    try {
      const { topic: created } = await createStudyTopic({
        notes: topic.notes,
        title: topic.title,
        subject: topic.subject,
        difficulty: topic.difficulty,
        files: [],
      });
      navigate(`/tema/${created.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reintentar.');
      setRetrying(false);
    }
  }

  if (error && !topic) {
    return (
      <div className="screen screen-center">
        <p className="error-text">{error}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          ← Volver al inicio
        </button>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="screen screen-center">
        <Logo size={40} />
        <p className="app-subtitle">Cargando tu tema...</p>
      </div>
    );
  }

  if (topic.status === 'generando') {
    return (
      <div className="screen screen-center">
        <Logo size={48} />
        <div className="study-generating">
          <span className="study-generating-spinner" aria-hidden="true" />
          <h1 className="screen-title">Preparando tu plan de estudio</h1>
          <p className="app-subtitle">
            Estamos leyendo tu temario y generando roscos, crucigramas, un test, un resumen y una
            infografía. Puede tardar hasta un minuto.
          </p>
        </div>
      </div>
    );
  }

  if (topic.status === 'error') {
    return (
      <div className="screen screen-center">
        <Logo size={40} />
        <h1 className="screen-title">😕 Algo no ha salido bien</h1>
        <p className="error-text">{topic.error || 'No se pudo generar el plan de estudio.'}</p>
        <button className="btn btn-primary btn-big" onClick={retry} disabled={retrying}>
          {retrying ? 'Reintentando...' : '🔁 Reintentar'}
        </button>
        <button className="link auth-back-link" onClick={() => navigate('/')}>
          ← Volver al inicio
        </button>
      </div>
    );
  }

  const progressPct = Math.round((topic.completedActivities.length / STUDY_ACTIVITY_KINDS.length) * 100);
  const done = (kind: StudyActivityKind) => topic.completedActivities.includes(kind);
  const qs = `tema=${topic.id}`;

  return (
    <div className="screen study-topic-screen">
      <button className="back-to-hub-link" onClick={() => navigate('/perfil')}>
        ← Mis temas
      </button>
      <h1 className="app-title">{topic.title}</h1>
      <p className="app-subtitle">{topic.subject}</p>

      <div className="study-progress-bar" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
        <div className="study-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="home-content-count">{progressPct}% completado</p>

      <div className="study-activity-grid">
        {topic.activities.roscoPackId && (
          <button
            type="button"
            className={`study-activity-card ${done('rosco') ? 'study-activity-done' : ''}`}
            onClick={() => navigate(`/local?pack=${topic.activities.roscoPackId}&${qs}`)}
          >
            <span className="study-activity-icon">🎯</span>
            <span className="study-activity-title">{ACTIVITY_LABELS.rosco}</span>
            {done('rosco') && <span className="study-activity-check">✓</span>}
          </button>
        )}

        {topic.activities.crosswordPuzzleIds.map((puzzleId, i) => (
          <button
            key={puzzleId}
            type="button"
            className={`study-activity-card ${done('crossword') ? 'study-activity-done' : ''}`}
            onClick={() => navigate(`/crossword/local?puzzle=${puzzleId}&${qs}`)}
          >
            <span className="study-activity-icon">🧩</span>
            <span className="study-activity-title">Crucigrama {i + 1}</span>
            {done('crossword') && <span className="study-activity-check">✓</span>}
          </button>
        ))}

        {topic.activities.quizPackId && (
          <button
            type="button"
            className={`study-activity-card ${done('quiz') ? 'study-activity-done' : ''}`}
            onClick={() => navigate(`/estudiar/test/${topic.activities.quizPackId}?${qs}`)}
          >
            <span className="study-activity-icon">📝</span>
            <span className="study-activity-title">{ACTIVITY_LABELS.quiz}</span>
            {done('quiz') && <span className="study-activity-check">✓</span>}
          </button>
        )}

        <button type="button" className="study-activity-card study-activity-card-exam" onClick={() => navigate(`/tema/${topic.id}/examen`)}>
          <span className="study-activity-icon">🎓</span>
          <span className="study-activity-title">Examen oral</span>
          {topic.bestExamScore != null && <span className="study-activity-check">{topic.bestExamScore}/10</span>}
        </button>

      </div>

      {(topic.activities.summary || topic.activities.infografia) && (
        <section className="study-notes-section">
          {topic.activities.summary && (
            <div className="study-summary-card">
              <h2 className="study-activity-title">📄 Resumen</h2>
              <p className="study-summary-text">{topic.activities.summary}</p>
            </div>
          )}
          {topic.activities.infografia && (
            <div className="study-infografia-grid">
              {topic.activities.infografia.map((block, i) => (
                <div key={i} className="study-infografia-block">
                  <h3>{block.heading}</h3>
                  <ul>
                    {block.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="study-group-cta">
        <h2 className="hub-section-title">¿Estudiáis juntos?</h2>
        <p className="app-subtitle">Jugad en grupo con el mismo contenido, en modo sala, sin examen.</p>
        <button type="button" className="btn btn-secondary" onClick={() => navigate(`/tema/${topic.id}/grupo`)}>
          👯 Estudiar en grupo
        </button>
      </section>
    </div>
  );
}
