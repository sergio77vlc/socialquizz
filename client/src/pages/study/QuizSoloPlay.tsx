import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { QuizQuestion } from '@rosco/shared';
import { markActivityComplete } from '../../api/study';

interface Pack {
  id: string;
  name: string;
  questions: QuizQuestion[];
}

/** Test individual de repaso: sin cronómetro ni rivales, a tu ritmo. Se usa tanto para los
 * tests generados por el modo estudio como, en general, para cualquier paquete de quiz. */
export default function QuizSoloPlay() {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();

  const [pack, setPack] = useState<Pack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const topicId = new URLSearchParams(window.location.search).get('tema');

  useEffect(() => {
    if (!packId) return;
    fetch(`/api/packs/quiz/${packId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.pack) throw new Error(data.error || 'No se pudo cargar el test.');
        setPack(data.pack);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el test.'))
      .finally(() => setLoading(false));
  }, [packId]);

  if (loading) {
    return (
      <div className="screen screen-center">
        <p className="app-subtitle">Cargando test...</p>
      </div>
    );
  }
  if (error || !pack) {
    return (
      <div className="screen screen-center">
        <p className="error-text">{error || 'Test no encontrado.'}</p>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          ← Volver
        </button>
      </div>
    );
  }

  const question = pack.questions[index];
  const finished = index >= pack.questions.length;

  function choose(optionIndex: number) {
    if (picked !== null) return;
    setPicked(optionIndex);
    if (optionIndex === question.correctIndex) setScore((s) => s + 1);
  }

  function next() {
    setPicked(null);
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (nextIndex >= pack!.questions.length && topicId) {
      markActivityComplete(topicId, 'quiz').catch(() => {});
    }
  }

  if (finished) {
    const pct = Math.round((score / pack.questions.length) * 100);
    return (
      <div className="screen screen-center">
        <h1 className="screen-title">✅ Test completado</h1>
        <p className="quiz-solo-score">
          {score} / {pack.questions.length}
        </p>
        <p className="app-subtitle">Has acertado el {pct}% de las preguntas.</p>
        <button
          className="btn btn-primary btn-big"
          onClick={() => {
            setIndex(0);
            setScore(0);
            setPicked(null);
          }}
        >
          🔁 Repetir test
        </button>
        <button className="link auth-back-link" onClick={() => navigate(topicId ? `/tema/${topicId}` : '/')}>
          ← Volver al tema
        </button>
      </div>
    );
  }

  return (
    <div className="screen screen-center">
      <p className="home-content-count">
        Pregunta {index + 1} / {pack.questions.length}
      </p>
      <h1 className="quiz-solo-question">{question.question}</h1>
      <div className="quiz-solo-options">
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correctIndex;
          const isPicked = i === picked;
          const showResult = picked !== null;
          const cls = !showResult
            ? 'quiz-solo-option'
            : isCorrect
              ? 'quiz-solo-option quiz-solo-option-correct'
              : isPicked
                ? 'quiz-solo-option quiz-solo-option-wrong'
                : 'quiz-solo-option';
          return (
            <button key={i} type="button" className={cls} onClick={() => choose(i)} disabled={showResult}>
              {opt}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <button className="btn btn-primary btn-big" onClick={next}>
          {index + 1 < pack.questions.length ? 'Siguiente →' : 'Ver resultado'}
        </button>
      )}
    </div>
  );
}
