import React, { Suspense, lazy, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../hooks/useFavorites';
import pasapalabraShot from '../assets/screenshots/pasapalabra.jpg';
import quizShot from '../assets/screenshots/quiz.jpg';
import battleShot from '../assets/screenshots/battle.jpg';
import crosswordShot from '../assets/screenshots/crossword.jpg';

const ThreeHero = lazy(() => import('../components/ThreeHero'));

interface GameEntry {
  id: string;
  name: string;
  tagline: string;
  description: string;
  path: string;
  screenshot: string;
  accent: string;
  players: string;
}

const GAMES: GameEntry[] = [
  {
    id: 'pasapalabra',
    name: 'Pasapalabra',
    tagline: 'El clásico rosco',
    description: 'Responde antes de que se acabe el tiempo, pasa palabra si no lo sabes y completa el rosco entero.',
    path: '/pasapalabra',
    screenshot: pasapalabraShot,
    accent: '#8b5cf6',
    players: '1-6 jugadores',
  },
  {
    id: 'quiz',
    name: 'Quiz',
    tagline: 'Preguntas a contrarreloj',
    description: 'Cultura general estilo concurso: quien responde más rápido y acierta, más puntos se lleva.',
    path: '/quiz',
    screenshot: quizShot,
    accent: '#facc15',
    players: '2-12 jugadores',
  },
  {
    id: 'battle',
    name: 'Batalla',
    tagline: 'Combate por turnos',
    description: 'Crea tu personaje, acierta preguntas para desbloquear armas y sé el último en pie.',
    path: '/battle',
    screenshot: battleShot,
    accent: '#ef4444',
    players: '2-8 jugadores',
  },
  {
    id: 'crossword',
    name: 'Crucigramas',
    tagline: 'Un tablero, todos a la vez',
    description: 'Mismo crucigrama para todo el grupo, sin turnos: cada palabra resuelta suma puntos al equipo.',
    path: '/crossword',
    screenshot: crosswordShot,
    accent: '#22c55e',
    players: '1-8 jugadores',
  },
];

export default function GamesHub() {
  const navigate = useNavigate();
  const { user, logout, loading } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleGames = onlyFavorites ? GAMES.filter((g) => isFavorite(g.id)) : GAMES;

  return (
    <div className="hub">
      <header className="hub-header">
        <Logo size={34} />
        <nav className="hub-nav">
          {!loading && user ? (
            <div className="hub-account">
              <button type="button" className="hub-account-btn" onClick={() => setMenuOpen((o) => !o)}>
                <span className="hub-account-avatar">{user.name.trim().charAt(0).toUpperCase() || '?'}</span>
                <span className="hub-account-name">{user.name}</span>
              </button>
              {menuOpen && (
                <div className="hub-account-menu" onMouseLeave={() => setMenuOpen(false)}>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : !loading ? (
            <>
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

      <section className="hub-hero">
        <Suspense fallback={null}>
          <ThreeHero className="hub-hero-canvas" />
        </Suspense>
        <div className="hub-hero-fade" />
        <div className="hub-hero-content">
          <span className="hub-hero-eyebrow">🎮 Centro de juegos</span>
          <h1 className="hub-hero-title">Juegos para jugar con tu gente, desde el móvil</h1>
          <p className="hub-hero-subtitle">
            Sin apps que instalar: elige un juego, crea una sala y compártela con un código QR. O
            jugad por turnos en la misma pantalla.
          </p>
        </div>
      </section>

      <main className="hub-main">
        <div className="hub-filter-row">
          <h2 className="hub-section-title">Elige un juego</h2>
          <button
            type="button"
            className={`pill ${onlyFavorites ? 'pill-active' : ''}`}
            onClick={() => setOnlyFavorites((o) => !o)}
          >
            ⭐ Solo favoritos
          </button>
        </div>

        {visibleGames.length === 0 ? (
          <p className="hub-empty">
            Aún no tienes juegos favoritos. Pulsa la estrella de una tarjeta para guardarla aquí.
          </p>
        ) : (
          <div className="hub-grid">
            {visibleGames.map((game) => (
              <article
                key={game.id}
                className="hub-card"
                style={{ ['--card-accent' as string]: game.accent }}
              >
                <button
                  type="button"
                  className={`hub-card-fav ${isFavorite(game.id) ? 'hub-card-fav-active' : ''}`}
                  onClick={() => toggle(game.id)}
                  aria-label={isFavorite(game.id) ? `Quitar ${game.name} de favoritos` : `Añadir ${game.name} a favoritos`}
                  aria-pressed={isFavorite(game.id)}
                >
                  {isFavorite(game.id) ? '★' : '☆'}
                </button>
                <button
                  type="button"
                  className="hub-card-shot"
                  onClick={() => navigate(game.path)}
                  aria-label={`Jugar a ${game.name}`}
                >
                  <img src={game.screenshot} alt={`Captura de pantalla de ${game.name}`} loading="lazy" />
                </button>
                <div className="hub-card-body">
                  <div className="hub-card-heading">
                    <h3 className="hub-card-name">{game.name}</h3>
                    <span className="hub-card-players">{game.players}</span>
                  </div>
                  <p className="hub-card-tagline">{game.tagline}</p>
                  <p className="hub-card-description">{game.description}</p>
                  <button type="button" className="btn btn-primary hub-card-play" onClick={() => navigate(game.path)}>
                    Jugar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="hub-footer">
        <Logo variant="icon" size={22} />
        <p>
          SocialQuizz ·{' '}
          <a href="https://github.com/sergio77vlc/socialquizz" target="_blank" rel="noopener noreferrer">
            Código en GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
