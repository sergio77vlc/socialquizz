import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EducationLevel } from '@rosco/shared';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';

const LEVELS: { value: EducationLevel; label: string; icon: string }[] = [
  { value: 'primaria', label: 'Primaria', icon: '🧒' },
  { value: 'eso', label: 'ESO', icon: '📘' },
  { value: 'bachillerato', label: 'Bachillerato', icon: '📗' },
  { value: 'fp', label: 'Formación Profesional', icon: '🔧' },
  { value: 'universidad', label: 'Universidad', icon: '🎓' },
  { value: 'otro', label: 'Otro / oposiciones', icon: '📚' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { setLevel } = useAuth();
  const [saving, setSaving] = useState<EducationLevel | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(level: EducationLevel) {
    setSaving(level);
    setError(null);
    try {
      await setLevel(level);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
      setSaving(null);
    }
  }

  return (
    <div className="screen screen-center auth-screen">
      <Logo size={48} />
      <div className="auth-card onboarding-card">
        <h1 className="auth-card-title">¿En qué nivel estás?</h1>
        <p className="auth-card-subtitle">Así adaptamos la dificultad de lo que generamos para ti.</p>
        <div className="onboarding-grid">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              className="onboarding-tile"
              onClick={() => choose(l.value)}
              disabled={saving !== null}
            >
              <span className="onboarding-tile-icon">{l.icon}</span>
              <span>{saving === l.value ? 'Guardando...' : l.label}</span>
            </button>
          ))}
        </div>
        {error && <p className="error-text">{error}</p>}
        <button type="button" className="link auth-back-link" onClick={() => navigate('/')}>
          Prefiero no decirlo
        </button>
      </div>
    </div>
  );
}
