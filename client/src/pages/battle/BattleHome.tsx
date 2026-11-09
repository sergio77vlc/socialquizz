import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePackContentCount } from '../../hooks/usePackContentCount';
import PlayModePicker from '../../components/PlayModePicker';

export default function BattleHome() {
  const navigate = useNavigate();
  const { itemCount, packCount } = usePackContentCount('battle');
  return (
    <div className="screen screen-center">
      <button className="back-to-hub-link" onClick={() => navigate('/')}>
        ← Todos los juegos
      </button>
      <h1 className="app-title">⚔️ Batalla</h1>
      <p className="app-subtitle">
        Crea tu personaje y responde preguntas de cultura general para atacar a tus rivales. ¡El
        último en pie gana!
      </p>

      <PlayModePicker
        modes={[
          {
            key: 'host',
            tone: 'host',
            icon: '🎬',
            title: 'Hospedar partida',
            hint: 'Crea una sala y compártela con un código QR',
            onClick: () => navigate('/battle/host'),
          },
          {
            key: 'join',
            tone: 'join',
            icon: '📲',
            title: 'Unirse a una partida',
            hint: 'Escanea el QR o introduce el código de la sala',
            onClick: () => navigate('/battle/join'),
          },
          {
            key: 'local',
            tone: 'local',
            icon: '🎮',
            title: 'Jugar en este dispositivo',
            hint: 'Os turnáis en el mismo móvil, sin necesidad de red',
            onClick: () => navigate('/battle/local'),
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
