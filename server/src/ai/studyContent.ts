import Anthropic from '@anthropic-ai/sdk';
import { nanoid } from 'nanoid';
import {
  ROSCO_ALPHABET,
  answerMatchesLetterRule,
  defaultMatchTypeForLetter,
} from '@rosco/shared';
import type { Difficulty, InfografiaBlock, LetterClue, QuizQuestion, Rosco } from '@rosco/shared';

const MODEL = process.env.STUDY_AI_MODEL || 'claude-haiku-5-5';
const OUTLINE_LIMIT = 6000;

export class StudyContentError extends Error {}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new StudyContentError('El modo estudio no está configurado: falta ANTHROPIC_API_KEY en el servidor.');
  }
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new StudyContentError('La IA no devolvió un JSON válido.');
  }
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    throw new StudyContentError('No se pudo interpretar la respuesta de la IA.');
  }
}

async function askForJson(prompt: string, maxTokens: number): Promise<unknown> {
  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new StudyContentError('La IA no devolvió texto.');
  }
  return extractJson(textBlock.text);
}

// ---------------------------------------------------------------------------
// Rosco personalizado
// ---------------------------------------------------------------------------

function buildRoscoPrompt(outline: string, difficulty: Difficulty): string {
  const letters = ROSCO_ALPHABET.join(', ');
  const difficultyHint = difficulty === 'medio' ? 'dificultad intermedia' : 'dificultad difícil, para repasar a fondo';
  return `Eres una profesora creando un "rosco" de repaso (como en Pasapalabra) a partir del temario de un alumno:
"""
${outline.slice(0, OUTLINE_LIMIT)}
"""

Dificultad: ${difficulty} (${difficultyHint}).

Genera EXACTAMENTE una pista y una respuesta para cada una de estas ${ROSCO_ALPHABET.length} letras, en este orden: ${letters}.

Reglas estrictas:
- Basa TODAS las pistas y respuestas en el contenido del temario de arriba (términos, nombres, fechas, conceptos que aparecen en él). Solo si de verdad no hay forma de encajar una letra en el temario, usa una palabra general en español que cumpla la regla de esa letra.
- Para cada letra, la pista debe empezar con "Con la [LETRA]: " y describir de forma clara e inequívoca una única respuesta.
- La respuesta debe ser una palabra o expresión corta (máximo 4 palabras), en español.
- Para todas las letras EXCEPTO "Ñ" y "X", la respuesta debe EMPEZAR por esa letra.
- Para "Ñ", la respuesta debe CONTENER la letra "ñ"; para "X", debe CONTENER la letra "x".
- No repitas la misma respuesta en dos letras distintas.

Responde ÚNICAMENTE con un JSON válido (sin texto adicional, sin markdown) con esta forma exacta:
{"letters": [{"letter": "A", "clue": "Con la A: ...", "answer": "..."}, ...]}

El array debe tener exactamente ${ROSCO_ALPHABET.length} elementos, en el mismo orden que la lista de letras.`;
}

function toLetterClues(raw: unknown): LetterClue[] {
  if (typeof raw !== 'object' || raw === null || !('letters' in raw)) {
    throw new StudyContentError('Formato de rosco inesperado.');
  }
  const letters = (raw as { letters: unknown }).letters;
  if (!Array.isArray(letters) || letters.length !== ROSCO_ALPHABET.length) {
    throw new StudyContentError(`El rosco debe tener exactamente ${ROSCO_ALPHABET.length} letras.`);
  }
  return ROSCO_ALPHABET.map((expectedLetter, i) => {
    const entry = letters[i] as { letter?: string; clue?: string; answer?: string } | undefined;
    if (!entry || typeof entry.clue !== 'string' || typeof entry.answer !== 'string') {
      throw new StudyContentError(`Falta la pista o respuesta para la letra ${expectedLetter}.`);
    }
    const matchType = defaultMatchTypeForLetter(expectedLetter);
    const answer = entry.answer.trim();
    if (!answerMatchesLetterRule(answer, expectedLetter, matchType)) {
      throw new StudyContentError(`La respuesta "${answer}" no cumple la regla de la letra ${expectedLetter}.`);
    }
    return { letter: expectedLetter, clue: entry.clue.trim(), answer, matchType };
  });
}

async function requestOneRosco(outline: string, title: string, difficulty: Difficulty): Promise<Rosco> {
  const letters = toLetterClues(await askForJson(buildRoscoPrompt(outline, difficulty), 4096));
  return { id: `study-${nanoid(8)}`, title: `Rosco: ${title}`, difficulty, theme: title, letters, source: 'ai' };
}

/** Genera varios roscos distintos sobre el mismo temario (uno por cada ronda de repaso). */
export async function generateStudyRoscoPack(
  outline: string,
  title: string,
  difficulty: Difficulty,
  count: number,
): Promise<Rosco[]> {
  const attempts = Array.from({ length: count }, async () => {
    try {
      return await requestOneRosco(outline, title, difficulty);
    } catch (err) {
      if (err instanceof StudyContentError) return requestOneRosco(outline, title, difficulty);
      throw err;
    }
  });
  const results = await Promise.allSettled(attempts);
  const roscos = results.filter((r): r is PromiseFulfilledResult<Rosco> => r.status === 'fulfilled').map((r) => r.value);
  if (roscos.length === 0) {
    const firstError = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    throw new StudyContentError(
      firstError?.reason instanceof Error ? firstError.reason.message : 'No se pudo generar el rosco de repaso.',
    );
  }
  return roscos;
}

// ---------------------------------------------------------------------------
// Test personalizado
// ---------------------------------------------------------------------------

function buildQuizPrompt(outline: string, difficulty: Difficulty, count: number): string {
  const difficultyHint = difficulty === 'medio' ? 'dificultad intermedia' : 'dificultad difícil, para repasar a fondo';
  return `Eres una profesora creando un test de ${count} preguntas de repaso a partir del temario de un alumno:
"""
${outline.slice(0, OUTLINE_LIMIT)}
"""

Dificultad: ${difficulty} (${difficultyHint}).

Reglas estrictas:
- TODAS las preguntas deben estar basadas directamente en el contenido del temario de arriba, no en cultura general ajena a él.
- Cada pregunta debe tener EXACTAMENTE 4 opciones y solo una correcta.
- Las 3 opciones incorrectas deben ser plausibles pero claramente erróneas para quien se ha estudiado el temario.
- Cubre distintas partes del temario, no te repitas en la misma idea.

Responde ÚNICAMENTE con un JSON válido (sin texto adicional, sin markdown) con esta forma exacta:
{"questions": [{"question": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0}, ...]}

El array debe tener exactamente ${count} elementos. "correctIndex" es la posición (0-3) de la respuesta correcta.`;
}

function toQuizQuestions(raw: unknown, difficulty: Difficulty, count: number): QuizQuestion[] {
  if (typeof raw !== 'object' || raw === null || !('questions' in raw)) {
    throw new StudyContentError('Formato de test inesperado.');
  }
  const questions = (raw as { questions: unknown }).questions;
  if (!Array.isArray(questions)) {
    throw new StudyContentError('El test no tiene preguntas.');
  }
  const result: QuizQuestion[] = [];
  const seen = new Set<string>();
  for (const q of questions) {
    const entry = q as { question?: string; options?: unknown; correctIndex?: unknown };
    const question = entry.question?.trim();
    const options = entry.options;
    const correctIndex = entry.correctIndex;
    if (
      !question ||
      !Array.isArray(options) ||
      options.length !== 4 ||
      !options.every((o) => typeof o === 'string' && o.trim()) ||
      typeof correctIndex !== 'number' ||
      correctIndex < 0 ||
      correctIndex > 3
    ) {
      continue;
    }
    const key = question.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      id: `study-${nanoid(6)}`,
      question,
      options: options.map((o) => (o as string).trim()) as [string, string, string, string],
      correctIndex: correctIndex as 0 | 1 | 2 | 3,
      difficulty,
    });
  }
  if (result.length < Math.min(5, count)) {
    throw new StudyContentError('La IA no devolvió suficientes preguntas válidas.');
  }
  return result;
}

async function requestQuiz(outline: string, difficulty: Difficulty, count: number): Promise<QuizQuestion[]> {
  return toQuizQuestions(await askForJson(buildQuizPrompt(outline, difficulty, count), 4096), difficulty, count);
}

export async function generateStudyQuiz(outline: string, difficulty: Difficulty, count: number): Promise<QuizQuestion[]> {
  try {
    return await requestQuiz(outline, difficulty, count);
  } catch (err) {
    if (err instanceof StudyContentError) return requestQuiz(outline, difficulty, count);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Resumen + infografía
// ---------------------------------------------------------------------------

function buildSummaryPrompt(outline: string): string {
  return `A partir de este temario de estudio:
"""
${outline.slice(0, OUTLINE_LIMIT)}
"""

Genera dos cosas para ayudar a un alumno a repasar:
1. Un resumen/esquema de estudio en español, claro y bien organizado por apartados (puede usar saltos de línea y guiones), de longitud media (no demasiado largo, pensado para repasar rápido).
2. Una infografía: entre 4 y 7 bloques, cada uno con un título corto y entre 2 y 5 viñetas muy breves (frases cortas, estilo "dato clave"), pensada para memorizar de un vistazo.

Responde ÚNICAMENTE con un JSON válido (sin texto adicional, sin markdown) con esta forma exacta:
{"summary": "...", "infografia": [{"heading": "...", "bullets": ["...", "..."]}, ...]}`;
}

function toSummaryAndInfografia(raw: unknown): { summary: string; infografia: InfografiaBlock[] } {
  if (typeof raw !== 'object' || raw === null) {
    throw new StudyContentError('Formato de resumen inesperado.');
  }
  const { summary, infografia } = raw as Record<string, unknown>;
  if (typeof summary !== 'string' || !summary.trim()) {
    throw new StudyContentError('No se pudo generar el resumen.');
  }
  if (!Array.isArray(infografia) || infografia.length === 0) {
    throw new StudyContentError('No se pudo generar la infografía.');
  }
  const blocks: InfografiaBlock[] = infografia
    .map((b) => {
      const entry = b as { heading?: string; bullets?: unknown };
      if (typeof entry.heading !== 'string' || !Array.isArray(entry.bullets)) return null;
      const bullets = entry.bullets.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
      if (bullets.length === 0) return null;
      return { heading: entry.heading.trim(), bullets };
    })
    .filter((b): b is InfografiaBlock => b !== null);
  if (blocks.length === 0) {
    throw new StudyContentError('No se pudo generar la infografía.');
  }
  return { summary: summary.trim(), infografia: blocks };
}

async function requestSummary(outline: string): Promise<{ summary: string; infografia: InfografiaBlock[] }> {
  return toSummaryAndInfografia(await askForJson(buildSummaryPrompt(outline), 4096));
}

export async function generateStudySummaryAndInfografia(
  outline: string,
): Promise<{ summary: string; infografia: InfografiaBlock[] }> {
  try {
    return await requestSummary(outline);
  } catch (err) {
    if (err instanceof StudyContentError) return requestSummary(outline);
    throw err;
  }
}
