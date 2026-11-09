import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, resendVerification, user } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(name, email, password);
      setRegisteredEmail(email.trim().toLowerCase());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!registeredEmail) return;
    try {
      await resendVerification(registeredEmail);
      setResent(true);
    } catch {
      // el backend responde ok incluso si falla el envío real; no hay mucho más que mostrar aquí
    }
  }

  if (registeredEmail || (user && !user.verified)) {
    return (
      <div className="screen screen-center auth-screen">
        <Logo size={48} />
        <div className="auth-card auth-card-pending">
          <span className="auth-pending-icon">📬</span>
          <h1 className="auth-card-title">Revisa tu email</h1>
          <p className="auth-card-subtitle">
            Te hemos enviado un enlace de verificación a <strong>{registeredEmail ?? user?.email}</strong>. Ábrelo
            para activar tu cuenta.
          </p>
          <button type="button" className="btn btn-secondary" onClick={handleResend} disabled={resent}>
            {resent ? '✅ Enlace reenviado' : 'Reenviar email'}
          </button>
          <button type="button" className="link auth-back-link" onClick={() => navigate('/')}>
            ← Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen screen-center auth-screen">
      <Logo size={48} />
      <div className="auth-card">
        <h1 className="auth-card-title">Crear cuenta</h1>
        <p className="auth-card-subtitle">Guarda tus juegos favoritos y accede desde cualquier dispositivo.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Nombre
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required autoFocus />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <span className="auth-field-hint">Mínimo 8 caracteres</span>
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary btn-big" type="submit" disabled={submitting}>
            {submitting ? 'Creando cuenta...' : '✨ Crear cuenta'}
          </button>
        </form>
        <p className="auth-switch">
          ¿Ya tienes cuenta?{' '}
          <button type="button" className="link" onClick={() => navigate('/login')}>
            Inicia sesión
          </button>
        </p>
        <button type="button" className="link auth-back-link" onClick={() => navigate('/')}>
          ← Volver al inicio
        </button>
      </div>
    </div>
  );
}
