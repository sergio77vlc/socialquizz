import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DEFAULT_AVATAR, DEFAULT_PLAYER_COLOR, type CrosswordRoomPublic } from '@rosco/shared';
import { useLocalCrossword } from '../../context/CrosswordLocalContext';
import CrosswordBoard from '../../components/CrosswordBoard';
import { buildLocalClues, buildLocalGrid } from '../../utils/crosswordGrid';
import { DIFFICULTY_ICONS, DIFFICULTY_LABELS } from '../../constants';
import { markActivityComplete } from '../../api/study';

export default function CrosswordLocalGamePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const temaId = searchParams.get('tema');
  const { puzzle, solvedClueIds, score, wordsSolved, focusedClueId, lastSolved, finished, focus, submit, reset } =
    useLocalCrossword();

  useEffect(() => {
    if (finished && temaId) {
      markActivityComplete(temaId, 'crossword').catch(() => {});
    }
  }, [finished, temaId]);

  if (!puzzle) {
    return (
      <div className="screen screen-center">
        <p className="app-subtitle">
          No hay ningún crucigrama en marcha.{' '}
          <a className="link" href="/crossword/local">
            Configura una partida
          </a>
          .
        </p>
      </div>
    );
  }

  const fakeRoom: CrosswordRoomPublic = {
    code: 'local',
    status: finished ? 'finished' : 'playing',
    maxPlayers: 1,
    puzzleTitle: puzzle.title,
    difficulty: puzzle.difficulty,
    rows: puzzle.rows,
    cols: puzzle.cols,
    grid: buildLocalGrid(puzzle, solvedClueIds),
    clues: buildLocalClues(puzzle, solvedClueIds),
    players: [
      {
        id: 'me',
        name: 'Tú',
        color: DEFAULT_PLAYER_COLOR,
        avatar: DEFAULT_AVATAR,
        connected: true,
        score,
        wordsSolved,
        focusedClueId,
      },
    ],
    hostConnected: true,
    lastSolved: lastSolved
      ? { clueId: lastSolved.clueId, playerName: 'Tú', word: lastSolved.word, points: lastSolved.points, at: lastSolved.at }
      : null,
  };

  async function handleSubmit(clueId: string, answerText: string): Promise<boolean> {
    return submit(clueId, answerText);
  }

  return (
    <div className="screen screen-center crossword-screen">
      <h1 className="screen-title">🧩 {puzzle.title}</h1>
      <p className="app-subtitle">
        {DIFFICULTY_ICONS[puzzle.difficulty]} {DIFFICULTY_LABELS[puzzle.difficulty]} · {solvedClueIds.size}/
        {puzzle.clues.length} palabras resueltas
      </p>

      {finished && (
        <div className="crossword-finished-banner">
          <p>🏁 ¡Crucigrama completado! {score} puntos.</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              reset();
              navigate('/crossword/local');
            }}
          >
            🔁 Nuevo crucigrama
          </button>
          {temaId && (
            <button className="link auth-back-link" onClick={() => navigate(`/tema/${temaId}`)}>
              ← Volver al tema
            </button>
          )}
        </div>
      )}

      <CrosswordBoard room={fakeRoom} myPlayerId="me" onFocus={focus} onSubmit={handleSubmit} />
    </div>
  );
}
