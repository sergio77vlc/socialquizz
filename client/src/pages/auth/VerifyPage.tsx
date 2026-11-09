import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '../../components/Logo';
import { useAuth } from '../../context/AuthContext';

export default function VerifyPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { refreshUser, user } = useAuth();
  const status = params.get('status');

  useEffect(() => {
    if (status === 'ok') refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const content = (() => {
    if (status === 'ok') {
      return {
        icon: '🎉',
        title: '¡Cuenta verificada!',
        text: user ? `Ya has iniciado sesión como ${user.name}.` : 'Tu cuenta está lista para jugar.',
        action: { label: '🎮 Ir a los juegos', to: '/' },
      };
    }
    if (status === 'expired') {
      return {
        icon: '⌛',
        title: 'El enlace ha caducado',
        text: 'Pide uno nuevo desde la pantalla de inicio de sesión.',
        action: { label: 'Iniciar sesión', to: '/login' },
      };
    }
    return {
      icon: '⚠️',
      title: 'Enlace no válido',
      text: 'Puede que ya hayas verificado tu cuenta, o que el enlace esté incompleto.',
      action: { label: 'Iniciar sesión', to: '/login' },
    };
  })();

  return (
    <div className="screen screen-center auth-screen">
      <Logo size={48} />
      <div className="auth-card auth-card-pending">
        <span className="auth-pending-icon">{content.icon}</span>
        <h1 className="auth-card-title">{content.title}</h1>
        <p className="auth-card-subtitle">{content.text}</p>
        <button type="button" className="btn btn-primary btn-big" onClick={() => navigate(content.action.to)}>
          {content.action.label}
        </button>
      </div>
    </div>
  );
}
