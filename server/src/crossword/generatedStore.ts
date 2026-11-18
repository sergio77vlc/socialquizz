import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CrosswordPuzzle } from '@rosco/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const FILE_PATH = path.join(DATA_DIR, 'generated-crosswords.json');

function load(): CrosswordPuzzle[] {
  try {
    const raw = fs.readFileSync(FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(puzzles: CrosswordPuzzle[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(puzzles, null, 2), 'utf-8');
}

// Crucigramas generados por IA para el modo estudio: privados (ligados al Tema de un usuario,
// no aparecen en el selector general de crucigramas), pero persistidos para sobrevivir a
// reinicios del servidor, igual que el resto del contenido generado.
let puzzles: CrosswordPuzzle[] = load();

export function addGeneratedCrossword(puzzle: CrosswordPuzzle): void {
  puzzles = [...puzzles, puzzle];
  save(puzzles);
}

export function getGeneratedCrossword(id: string): CrosswordPuzzle | undefined {
  return puzzles.find((p) => p.id === id);
}
