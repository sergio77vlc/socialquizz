import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, resendVerification } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo iniciar sesión.';
      setError(message);
      if (message.toLowerCase().includes('verifica')) setNeedsVerification(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    try {
      await resendVerification(email.trim().toLowerCase());
      setResent(true);
    } catch {
      // respuesta genérica del backend; no hay más feedback posible aquí
    }
  }

  return (
    <div className="screen screen-center auth-screen">
      <Logo size={48} />
      <div className="auth-card">
        <h1 className="auth-card-title">Iniciar sesión</h1>
        <p className="auth-card-subtitle">Accede para ver tus juegos favoritos.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </label>
          <label>
            Contraseña
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="error-text">{error}</p>}
          {needsVerification && (
            <button type="button" className="btn btn-secondary" onClick={handleResend} disabled={resent}>
              {resent ? '✅ Enlace reenviado' : 'Reenviar email de verificación'}
            </button>
          )}
          <button className="btn btn-primary btn-big" type="submit" disabled={submitting}>
            {submitting ? 'Entrando...' : '🔓 Entrar'}
          </button>
        </form>
        <p className="auth-switch">
          ¿No tienes cuenta?{' '}
          <button type="button" className="link" onClick={() => navigate('/registro')}>
            Regístrate
          </button>
        </p>
        <button type="button" className="link auth-back-link" onClick={() => navigate('/')}>
          ← Volver al inicio
        </button>
      </div>
    </div>
  );
}
