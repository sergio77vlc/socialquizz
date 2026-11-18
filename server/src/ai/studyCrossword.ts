import Anthropic from '@anthropic-ai/sdk';
import { nanoid } from 'nanoid';
import type { CrosswordClueDef, CrosswordPuzzle, Difficulty } from '@rosco/shared';
import { validatePuzzle } from '../crossword/grid.js';

const MODEL = process.env.STUDY_AI_MODEL || 'claude-haiku-5-5';
const WORD_RE = /^[A-Z]+$/;

export class StudyCrosswordError extends Error {}

interface RawCrosswordEntry {
  horizontal: { word: string; clue: string };
  vertical: { word: string; clue: string }[];
}

/**
 * Igual que los crucigramas de cultura general (ver server/src/crossword/presets.ts): un
 * "peine" con una única palabra horizontal en la fila 0 y, colgando de cada una de sus letras,
 * una palabra vertical distinta. Esto garantiza por construcción que las letras de los cruces
 * coinciden, sin necesidad de un algoritmo de encaje de rejilla.
 */
function buildPrompt(outline: string, difficulty: Difficulty): string {
  const lengthHint = difficulty === 'medio' ? 'entre 6 y 9 letras' : 'entre 7 y 11 letras';
  return `Crea un crucigrama en español en formato "peine" a partir de este temario de estudio:
"""
${outline.slice(0, 6000)}
"""

Formato "peine" (muy importante, léelo con atención):
1. Elige UNA palabra horizontal clave del temario, de ${lengthHint}, en MAYÚSCULAS, SOLO letras de la A a la Z (sin Ñ, sin tildes, sin espacios ni guiones).
2. Para CADA UNA de las letras de esa palabra horizontal, en orden, inventa una palabra vertical DISTINTA relacionada con el temario que EMPIECE exactamente por esa letra. También en mayúsculas, solo A-Z, de 3 a 10 letras, sin repetir ninguna palabra.
3. Escribe una pista clara y autocontenida (en español, sin usar la propia palabra) para la palabra horizontal y para cada palabra vertical.

Responde ÚNICAMENTE con un JSON válido (sin texto adicional, sin markdown) con esta forma exacta:
{"horizontal": {"word": "...", "clue": "..."}, "vertical": [{"word": "...", "clue": "..."}, ...]}

El array "vertical" debe tener EXACTAMENTE la misma longitud que el número de letras de "horizontal.word", en el mismo orden (la palabra vertical i-ésima debe empezar por la letra i-ésima de la palabra horizontal).`;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new StudyCrosswordError('La IA no devolvió un JSON válido para el crucigrama.');
  }
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    throw new StudyCrosswordError('No se pudo interpretar la respuesta de la IA para el crucigrama.');
  }
}

function toPuzzle(raw: unknown, title: string, difficulty: Difficulty): CrosswordPuzzle {
  if (typeof raw !== 'object' || raw === null || !('horizontal' in raw) || !('vertical' in raw)) {
    throw new StudyCrosswordError('Formato de crucigrama inesperado.');
  }
  const { horizontal, vertical } = raw as RawCrosswordEntry;
  const hWord = horizontal?.word?.trim().toUpperCase();
  const hClue = horizontal?.clue?.trim();
  if (!hWord || !WORD_RE.test(hWord) || hWord.length < 4 || !hClue) {
    throw new StudyCrosswordError('La palabra horizontal del crucigrama no es válida.');
  }
  if (!Array.isArray(vertical) || vertical.length !== hWord.length) {
    throw new StudyCrosswordError('El crucigrama no tiene una palabra vertical por cada letra.');
  }

  const clues: CrosswordClueDef[] = [
    {
      id: `cw-${nanoid(6)}-0a`,
      number: 1,
      direction: 'across',
      row: 0,
      col: 0,
      length: hWord.length,
      clue: hClue,
      answer: hWord,
    },
  ];

  const seen = new Set<string>([hWord]);
  let maxRows = 1;
  for (let i = 0; i < hWord.length; i++) {
    const entry = vertical[i];
    const vWord = entry?.word?.trim().toUpperCase();
    const vClue = entry?.clue?.trim();
    if (!vWord || !WORD_RE.test(vWord) || vWord.length < 3 || !vClue) {
      throw new StudyCrosswordError(`La palabra vertical ${i + 1} del crucigrama no es válida.`);
    }
    if (vWord[0] !== hWord[i]) {
      throw new StudyCrosswordError(`La palabra vertical ${i + 1} no empieza por la letra "${hWord[i]}".`);
    }
    if (seen.has(vWord)) {
      throw new StudyCrosswordError('El crucigrama repite una palabra.');
    }
    seen.add(vWord);
    maxRows = Math.max(maxRows, vWord.length);
    clues.push({
      id: `cw-${nanoid(6)}-${i}d`,
      number: i + 1,
      direction: 'down',
      row: 0,
      col: i,
      length: vWord.length,
      clue: vClue,
      answer: vWord,
    });
  }

  const puzzle: CrosswordPuzzle = {
    id: `study-${nanoid(8)}`,
    title,
    difficulty,
    rows: maxRows,
    cols: hWord.length,
    clues,
  };
  // Red de seguridad adicional: si por algún motivo dos palabras no coincidieran en un
  // cruce, se detecta aquí (al generar) en vez de en mitad de una partida real.
  validatePuzzle(puzzle);
  return puzzle;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new StudyCrosswordError('El modo estudio no está configurado: falta ANTHROPIC_API_KEY en el servidor.');
  }
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

async function requestCrossword(outline: string, title: string, difficulty: Difficulty): Promise<CrosswordPuzzle> {
  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: buildPrompt(outline, difficulty) }],
  });
  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new StudyCrosswordError('La IA no devolvió texto para el crucigrama.');
  }
  return toPuzzle(extractJson(textBlock.text), title, difficulty);
}

export async function generateStudyCrossword(
  outline: string,
  title: string,
  difficulty: Difficulty,
): Promise<CrosswordPuzzle> {
  try {
    return await requestCrossword(outline, title, difficulty);
  } catch (err) {
    if (err instanceof StudyCrosswordError) {
      return await requestCrossword(outline, title, difficulty);
    }
    throw err;
  }
}
