import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';

export default function PremiumPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="screen screen-center">
      <Logo size={40} />
      <h1 className="app-title">Planes</h1>
      <p className="app-subtitle">Elige cuántos temas quieres poder crear cada mes.</p>

      <div className="plans-grid">
        <div className={`plan-card ${user?.plan === 'free' ? 'plan-card-current' : ''}`}>
          <h2>Gratis</h2>
          <p className="plan-price">0€</p>
          <ul>
            <li>5 temas al mes</li>
            <li>Roscos, crucigramas y tests ilimitados por tema</li>
            <li>Examen oral con IA</li>
            <li>Modo estudio en grupo</li>
          </ul>
          {user?.plan === 'free' && <span className="plan-current-badge">Tu plan actual</span>}
        </div>
        <div className={`plan-card plan-card-premium ${user?.plan === 'premium' ? 'plan-card-current' : ''}`}>
          <h2>Premium</h2>
          <p className="plan-price">20€/mes</p>
          <ul>
            <li>100 temas al mes</li>
            <li>Todo lo del plan gratis</li>
            <li>Prioridad en la generación</li>
          </ul>
          {user?.plan === 'premium' ? (
            <span className="plan-current-badge">Tu plan actual</span>
          ) : (
            <p className="study-form-hint">
              El cobro automático llega pronto. Mientras tanto, escríbenos y te activamos el plan premium
              a mano.
            </p>
          )}
        </div>
      </div>

      <button className="link auth-back-link" onClick={() => navigate(user ? '/perfil' : '/')}>
        ← Volver
      </button>
    </div>
  );
}
