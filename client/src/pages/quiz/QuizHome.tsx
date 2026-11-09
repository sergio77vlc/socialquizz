import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePackContentCount } from '../../hooks/usePackContentCount';
import PlayModePicker from '../../components/PlayModePicker';

export default function QuizHome() {
  const navigate = useNavigate();
  const { itemCount, packCount } = usePackContentCount('quiz');
  return (
    <div className="screen screen-center">
      <button className="back-to-hub-link" onClick={() => navigate('/')}>
        ← Todos los juegos
      </button>
      <h1 className="app-title">🧠 Quiz de Cultura General</h1>
      <p className="app-subtitle">Responde más rápido que nadie, estilo Kahoot. Multijugador con tus amigos y sus móviles.</p>

      <PlayModePicker
        modes={[
          {
            key: 'host',
            tone: 'host',
            icon: '🎬',
            title: 'Hospedar partida',
            hint: 'Crea una sala y compártela con un código QR',
            onClick: () => navigate('/quiz/host'),
          },
          {
            key: 'join',
            tone: 'join',
            icon: '📲',
            title: 'Unirse a una partida',
            hint: 'Escanea el QR o introduce el código de la sala',
            onClick: () => navigate('/quiz/join'),
          },
        ]}
      />

      {packCount > 0 && (
        <p className="home-content-count">
          📦 {itemCount} preguntas guardadas en {packCount} {packCount === 1 ? 'paquete' : 'paquetes'} creados con IA
        </p>
      )}
    </div>
  );
}
