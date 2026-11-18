import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { StudyTopic } from '@rosco/shared';
import { getStudyTopic } from '../../api/study';

export default function StudyGroupPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<StudyTopic | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getStudyTopic(id)
      .then(({ topic: t }) => setTopic(t))
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el tema.'));
  }, [id]);

  if (error) {
    return (
      <div className="screen screen-center">
        <p className="error-text">{error}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          ← Volver
        </button>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="screen screen-center">
        <p className="app-subtitle">Cargando...</p>
      </div>
    );
  }

  const hasRosco = Boolean(topic.activities.roscoPackId);
  const hasQuiz = Boolean(topic.activities.quizPackId);
  const hasCrossword = topic.activities.crosswordPuzzleIds.length > 0;

  return (
    <div className="screen screen-center">
      <button className="back-to-hub-link" onClick={() => navigate(`/tema/${id}`)}>
        ← {topic.title}
      </button>
      <h1 className="app-title">👯 Estudiar en grupo</h1>
      <p className="app-subtitle">
        Hospeda una sala con el contenido de este tema y compártela con un código QR. Jugáis todos a la
        vez, sin examen.
      </p>

      <div className="mode-grid">
        {hasRosco && (
          <button
            type="button"
            className="mode-tile mode-tile-host"
            onClick={() => navigate(`/host?pack=${topic.activities.roscoPackId}`)}
          >
            <span className="mode-tile-icon">🎯</span>
            <span className="mode-tile-title">Rosco en grupo</span>
            <span className="mode-tile-hint">Pasapalabra con el rosco de este tema</span>
          </button>
        )}
        {hasQuiz && (
          <button
            type="button"
            className="mode-tile mode-tile-host"
            onClick={() => navigate(`/quiz/host?pack=${topic.activities.quizPackId}`)}
          >
            <span className="mode-tile-icon">📝</span>
            <span className="mode-tile-title">Test en grupo</span>
            <span className="mode-tile-hint">Quiz a contrarreloj con las preguntas del tema</span>
          </button>
        )}
        {hasCrossword && (
          <button
            type="button"
            className="mode-tile mode-tile-host"
            onClick={() => navigate(`/crossword/host?puzzle=${topic.activities.crosswordPuzzleIds[0]}`)}
          >
            <span className="mode-tile-icon">🧩</span>
            <span className="mode-tile-title">Crucigrama en grupo</span>
            <span className="mode-tile-hint">Mismo tablero para todo el grupo, sin turnos</span>
          </button>
        )}
      </div>

      {!hasRosco && !hasQuiz && !hasCrossword && (
        <p className="hub-empty">Este tema todavía no tiene contenido generado para jugar en grupo.</p>
      )}
    </div>
  );
}
