import React from 'react';
import { useNavigate } from 'react-router-dom';
import PlayModePicker from '../../components/PlayModePicker';

export default function CrosswordHome() {
  const navigate = useNavigate();
  return (
    <div className="screen screen-center">
      <button className="back-to-hub-link" onClick={() => navigate('/')}>
        ← Todos los juegos
      </button>
      <h1 className="app-title">🧩 Crucigramas</h1>
      <p className="app-subtitle">
        Un mismo crucigrama para todos, en tiempo real. Sin turnos: cualquiera puede resolver
        cualquier palabra y sumar puntos. Sin límite de tiempo.
      </p>

      <PlayModePicker
        modes={[
          {
            key: 'host',
            tone: 'host',
            icon: '🎬',
            title: 'Hospedar partida',
            hint: 'Crea una sala y compártela con un código QR',
            onClick: () => navigate('/crossword/host'),
          },
          {
            key: 'join',
            tone: 'join',
            icon: '📲',
            title: 'Unirse a una partida',
            hint: 'Escanea el QR o introduce el código de la sala',
            onClick: () => navigate('/crossword/join'),
          },
          {
            key: 'local',
            tone: 'local',
            icon: '🎮',
            title: 'Jugar en este dispositivo',
            hint: 'Tú solo, sin necesidad de red',
            onClick: () => navigate('/crossword/local'),
          },
        ]}
      />
    </div>
  );
}
