import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { createStudyTopic } from '../api/study';
import type { Difficulty } from '@rosco/shared';

const DRAFT_KEY = 'sq:pending-topic-draft';

interface Draft {
  notes: string;
  title: string;
  subject: string;
  difficulty: Difficulty;
}

function loadDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function saveDraft(draft: Draft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // almacenamiento no disponible (privado/bloqueado): se pierde el borrador, sin romper nada
  }
}

function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignorar */
  }
}

const LEVEL_EXAMPLES = ['Primaria', 'ESO', 'Bachillerato', 'FP', 'Universidad', 'Oposiciones'];

export default function StudyLanding() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notes, setNotes] = useState('');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medio');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoCreating, setAutoCreating] = useState(false);

  // Si el usuario escribió algo y se fue a registrarse, al volver (ya logueado) recuperamos
  // el borrador y creamos el tema automáticamente, para no hacerle escribir dos veces.
  useEffect(() => {
    if (loading || !user) return;
    const draft = loadDraft();
    if (!draft || !draft.notes.trim()) return;
    clearDraft();
    setAutoCreating(true);
    createStudyTopic({ ...draft, files: [] })
      .then(({ topic }) => navigate(`/tema/${topic.id}`))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'No se pudo crear el tema.');
        setAutoCreating(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!notes.trim() && files.length === 0) {
      setError('Cuéntanos qué quieres estudiar, o adjunta tu temario.');
      return;
    }
    if (!user) {
      saveDraft({ notes, title, subject, difficulty });
      navigate('/registro');
      return;
    }
    setSubmitting(true);
    try {
      const { topic } = await createStudyTopic({ notes, title, subject, difficulty, files });
      navigate(`/tema/${topic.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el tema.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="study-landing">
      <header className="hub-header">
        <Logo size={34} />
        <nav className="hub-nav">
          {!loading && user ? (
            <>
              {user.isAdmin && (
                <button type="button" className="btn btn-ghost" onClick={() => navigate('/admin')}>
                  🛠️ Admin
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={() => navigate('/perfil')}>
                📚 Mis temas
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => navigate('/fiesta')}>
                🎉 Modo fiesta
              </button>
            </>
          ) : !loading ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => navigate('/fiesta')}>
                🎉 Modo fiesta
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => navigate('/login')}>
                Iniciar sesión
              </button>
              <button type="button" className="btn btn-primary" onClick={() => navigate('/registro')}>
                Crear cuenta
              </button>
            </>
          ) : null}
        </nav>
      </header>

      <section className="study-hero">
        <span className="hub-hero-eyebrow">🎓 Estudia jugando</span>
        <h1 className="study-hero-title">Sube tu temario. La IA lo convierte en un juego.</h1>
        <p className="study-hero-subtitle">
          Pega tus apuntes, sube un PDF o haz una foto a tu libro. En segundos tendrás roscos,
          crucigramas y tests hechos a medida de lo que tienes que estudiar — y un examen oral
          que te pone nota cuando te sientas preparado. Para cualquier nivel, de primaria a la
          universidad.
        </p>
        <div className="study-hero-levels">
          {LEVEL_EXAMPLES.map((l) => (
            <span key={l} className="study-hero-level-pill">
              {l}
            </span>
          ))}
        </div>
      </section>

      <section className="study-form-section">
        <form className="study-form" onSubmit={handleSubmit}>
          <label className="study-form-label" htmlFor="study-notes">
            ¿Qué estás estudiando?
          </label>
          <textarea
            id="study-notes"
            className="study-form-textarea"
            placeholder="Ej: El tema 3 de Historia, la Revolución Francesa: causas, fases y consecuencias..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            maxLength={4000}
          />

          <div className="study-form-row">
            <input
              type="text"
              className="study-form-input"
              placeholder="Título (opcional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
            />
            <input
              type="text"
              className="study-form-input"
              placeholder="Asignatura (opcional)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={40}
            />
          </div>

          <div className="study-form-row study-form-row-align">
            <button
              type="button"
              className="study-attach-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              📎 Adjuntar temario (PDF o fotos)
            </button>
            <div className="pill-row">
              <button
                type="button"
                className={`pill ${difficulty === 'medio' ? 'pill-active' : ''}`}
                onClick={() => setDifficulty('medio')}
              >
                Normal
              </button>
              <button
                type="button"
                className={`pill ${difficulty === 'dificil' ? 'pill-active' : ''}`}
                onClick={() => setDifficulty('dificil')}
              >
                Avanzado
              </button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          {files.length > 0 && (
            <p className="study-attach-list">
              {files.map((f) => f.name).join(', ')}{' '}
              <button type="button" className="link" onClick={() => setFiles([])}>
                quitar
              </button>
            </p>
          )}
          {!user && files.length > 0 && (
            <p className="study-form-hint">
              Como aún no tienes cuenta, al registrarte tendrás que volver a adjuntar el archivo
              (lo que escribas arriba sí se guarda).
            </p>
          )}

          {error && <p className="error-text">{error}</p>}

          <button className="btn btn-primary btn-big study-submit" type="submit" disabled={submitting || autoCreating}>
            {submitting || autoCreating ? 'Creando tu plan...' : '🚀 Crear mi plan de estudio'}
          </button>
          {!user && <p className="study-form-hint">Gratis, sin tarjeta. Solo pedimos email para guardar tu progreso.</p>}
        </form>
      </section>

      <section className="study-how">
        <h2 className="hub-section-title">Cómo funciona</h2>
        <div className="study-how-grid">
          <div className="study-how-card">
            <span className="study-how-icon">📎</span>
            <h3>1. Sube tu temario</h3>
            <p>Texto, PDF o fotos de tus apuntes o libro. Cuanto más completo, mejor sale el plan.</p>
          </div>
          <div className="study-how-card">
            <span className="study-how-icon">🎮</span>
            <h3>2. Juega para repasar</h3>
            <p>Roscos, crucigramas y tests generados solo con tu temario, con resumen e infografía.</p>
          </div>
          <div className="study-how-card">
            <span className="study-how-icon">🎓</span>
            <h3>3. Examínate cuando quieras</h3>
            <p>Una profesora de IA te pregunta en voz alta, te da feedback y te pone nota del 1 al 10.</p>
          </div>
          <div className="study-how-card">
            <span className="study-how-icon">👯</span>
            <h3>4. O estudia en grupo</h3>
            <p>Juega los mismos roscos, crucigramas y tests en sala multijugador con tu clase o amigos.</p>
          </div>
        </div>
      </section>

      <footer className="hub-footer">
        <Logo variant="icon" size={22} />
        <p>SocialQuizz · aprende jugando</p>
      </footer>
    </div>
  );
}
