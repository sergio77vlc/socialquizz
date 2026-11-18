import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ExamTurn } from '@rosco/shared';
import { getStudyTopic, postExamTurn } from '../../api/study';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';

type ExamStage = 'loading' | 'intro' | 'running' | 'final' | 'error';

export default function ExamPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [stage, setStage] = useState<ExamStage>('loading');
  const [title, setTitle] = useState('');
  const [history, setHistory] = useState<ExamTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const tts = useSpeechSynthesis();
  const stt = useSpeechRecognition((text) => setDraft(text));

  useEffect(() => {
    if (!id) return;
    getStudyTopic(id)
      .then(({ topic }) => {
        if (topic.status !== 'listo') {
          setError('Este tema todavía no tiene un plan de estudio listo.');
          setStage('error');
          return;
        }
        setTitle(topic.title);
        setStage('intro');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el tema.');
        setStage('error');
      });
  }, [id]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  async function askStep(nextHistory: ExamTurn[]) {
    if (!id) return;
    setThinking(true);
    setError(null);
    try {
      const { turn, final, score } = await postExamTurn(id, nextHistory);
      const updated = [...nextHistory, turn];
      setHistory(updated);
      if (tts.supported) tts.speak(turn.text);
      if (final && score != null) {
        setFinalScore(score);
        setStage('final');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La profesora no ha podido responder.');
    } finally {
      setThinking(false);
    }
  }

  function startExam() {
    tts.prime();
    setStage('running');
    askStep([]);
  }

  function sendAnswer() {
    const text = draft.trim();
    if (!text) return;
    stt.stop();
    setDraft('');
    askStep([...history, { role: 'alumno', text }]);
  }

  if (stage === 'loading') {
    return (
      <div className="screen screen-center">
        <p className="app-subtitle">Cargando...</p>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="screen screen-center">
        <p className="error-text">{error}</p>
        <button className="btn btn-secondary" onClick={() => navigate(id ? `/tema/${id}` : '/')}>
          ← Volver
        </button>
      </div>
    );
  }

  if (stage === 'intro') {
    return (
      <div className="screen screen-center">
        <h1 className="screen-title">🎓 Examen oral</h1>
        <p className="app-subtitle">
          {title} — una profesora de IA te irá preguntando en voz alta sobre todo el temario. Responde
          hablando (o escribiendo si prefieres), y al final te dará feedback y una nota del 1 al 10.
        </p>
        {!stt.supported && (
          <p className="study-form-hint">
            Tu navegador no admite reconocimiento de voz: podrás escribir tus respuestas igualmente.
          </p>
        )}
        <button className="btn btn-primary btn-big" onClick={startExam}>
          🎬 Empezar examen
        </button>
        <button className="link auth-back-link" onClick={() => navigate(`/tema/${id}`)}>
          ← Volver al tema
        </button>
      </div>
    );
  }

  if (stage === 'final') {
    return (
      <div className="screen screen-center">
        <h1 className="screen-title">📋 Resultado del examen</h1>
        <p className="quiz-solo-score">{finalScore}/10</p>
        <div className="study-summary-card exam-feedback-card">
          <p className="study-summary-text">{history[history.length - 1]?.text}</p>
        </div>
        <button className="btn btn-primary btn-big" onClick={() => navigate(`/tema/${id}`)}>
          ← Volver al tema
        </button>
      </div>
    );
  }

  return (
    <div className="screen exam-screen">
      <h1 className="screen-title">🎓 Examen: {title}</h1>

      <div className="exam-transcript">
        {history.map((turn, i) => (
          <div key={i} className={`exam-turn exam-turn-${turn.role}`}>
            <span className="exam-turn-label">{turn.role === 'profesora' ? '👩‍🏫 Profesora' : '🙋 Tú'}</span>
            <p>{turn.text}</p>
          </div>
        ))}
        {thinking && (
          <div className="exam-turn exam-turn-profesora exam-turn-thinking">
            <span className="exam-turn-label">👩‍🏫 Profesora</span>
            <p>...</p>
          </div>
        )}
        <div ref={transcriptEndRef} />
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="exam-answer-bar">
        <input
          type="text"
          className="study-form-input"
          placeholder={stt.listening ? 'Escuchando...' : 'Escribe o dicta tu respuesta'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendAnswer()}
          disabled={thinking}
        />
        {stt.supported && (
          <button
            type="button"
            className={`exam-mic-btn ${stt.listening ? 'exam-mic-btn-active' : ''}`}
            onClick={() => (stt.listening ? stt.stop() : stt.start())}
            disabled={thinking}
            aria-label={stt.listening ? 'Detener dictado' : 'Dictar respuesta'}
          >
            🎤
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={sendAnswer} disabled={thinking || !draft.trim()}>
          Enviar
        </button>
      </div>
    </div>
  );
}
