import Anthropic from '@anthropic-ai/sdk';
import type { ExamTurn } from '@rosco/shared';

const MODEL = process.env.STUDY_AI_MODEL || 'claude-haiku-5-5';
const OUTLINE_LIMIT = 6000;
const MIN_QUESTIONS = 5;
const MAX_QUESTIONS = 8;

export class StudyExamError extends Error {}

export interface ExamStepResult {
  text: string;
  final: boolean;
  score?: number;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new StudyExamError('El examen oral no está configurado: falta ANTHROPIC_API_KEY en el servidor.');
  }
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

function buildPrompt(outline: string, history: ExamTurn[]): string {
  const askedCount = history.filter((t) => t.role === 'profesora').length;
  const transcript = history.map((t) => `${t.role === 'profesora' ? 'Profesora' : 'Alumno'}: ${t.text}`).join('\n');
  const stageHint =
    askedCount >= MAX_QUESTIONS
      ? 'Ya has hecho suficientes preguntas: TERMINA el examen ahora con tu feedback y la nota final.'
      : askedCount < MIN_QUESTIONS
        ? `Llevas ${askedCount} preguntas. Haz al menos ${MIN_QUESTIONS} en total antes de poder terminar.`
        : 'Puedes terminar el examen ya si has cubierto bien el temario, o seguir con otra pregunta si quieres profundizar más.';

  return `Eres una profesora particular, cercana pero exigente, examinando ORALMENTE a un alumno
sobre este temario:
"""
${outline.slice(0, OUTLINE_LIMIT)}
"""

Transcripción del examen hasta ahora (puede estar vacía si es tu primera pregunta):
"""
${transcript || '(todavía no has preguntado nada; esto es el inicio del examen)'}
"""

${stageHint}

Reglas:
- Hazlo sonar como si hablaras en voz alta (frases cortas, naturales, como una profesora real), no como un test escrito.
- Una pregunta a la vez, sobre un aspecto del temario que aún no hayas preguntado.
- Si la última respuesta del alumno está mal o incompleta, coméntalo brevemente (corrige o da una pista) antes de pasar a la siguiente pregunta.
- Para terminar el examen: da un feedback breve y constructivo (qué ha demostrado saber bien, qué le conviene repasar) y pon una nota del 1 al 10, justa según lo que ha respondido.

Responde ÚNICAMENTE con un JSON válido (sin texto adicional, sin markdown), con una de estas dos formas exactas:
- Para seguir preguntando: {"type": "question", "text": "..."}
- Para terminar el examen: {"type": "final", "text": "...", "score": 7}`;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new StudyExamError('La profesora de IA no devolvió un JSON válido.');
  }
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    throw new StudyExamError('No se pudo interpretar la respuesta de la profesora de IA.');
  }
}

function toStepResult(raw: unknown): ExamStepResult {
  if (typeof raw !== 'object' || raw === null) {
    throw new StudyExamError('Formato de examen inesperado.');
  }
  const { type, text, score } = raw as Record<string, unknown>;
  if (typeof text !== 'string' || !text.trim()) {
    throw new StudyExamError('La profesora de IA no dijo nada.');
  }
  if (type === 'final') {
    const numericScore = Math.round(Number(score));
    if (!Number.isFinite(numericScore) || numericScore < 1 || numericScore > 10) {
      throw new StudyExamError('La nota final no es válida.');
    }
    return { text: text.trim(), final: true, score: numericScore };
  }
  if (type === 'question') {
    return { text: text.trim(), final: false };
  }
  throw new StudyExamError('Tipo de turno de examen inesperado.');
}

async function requestStep(outline: string, history: ExamTurn[]): Promise<ExamStepResult> {
  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildPrompt(outline, history) }],
  });
  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new StudyExamError('La profesora de IA no devolvió texto.');
  }
  return toStepResult(extractJson(textBlock.text));
}

export async function nextExamStep(outline: string, history: ExamTurn[]): Promise<ExamStepResult> {
  try {
    return await requestStep(outline, history);
  } catch (err) {
    if (err instanceof StudyExamError) return requestStep(outline, history);
    throw err;
  }
}
