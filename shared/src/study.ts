import type { Difficulty } from './types.js';

// ==========================================================================
// Modo estudio: el usuario sube el temario de una asignatura (texto, PDF o
// fotos) y la IA genera un plan de estudio gamificado a partir de él —
// roscos, crucigramas y preguntas tipo test personalizados, un resumen, una
// infografía, y un examen oral bajo demanda. Todo vive dentro de un "Tema".
// ==========================================================================

export type StudyTopicStatus = 'generando' | 'listo' | 'error';

/** Identificador fijo de cada actividad generada, usado para marcar progreso. */
export type StudyActivityKind = 'rosco' | 'crossword' | 'quiz' | 'summary' | 'infografia';

export const STUDY_ACTIVITY_KINDS: StudyActivityKind[] = ['rosco', 'crossword', 'quiz', 'summary', 'infografia'];

export interface InfografiaBlock {
  heading: string;
  bullets: string[];
}

export interface StudyActivities {
  roscoPackId: string | null;
  quizPackId: string | null;
  crosswordPuzzleIds: string[];
  summary: string | null;
  infografia: InfografiaBlock[] | null;
}

export interface ExamTurn {
  role: 'profesora' | 'alumno';
  text: string;
}

export interface ExamResult {
  id: string;
  at: number;
  score: number;
  feedback: string;
}

/** Versión ligera para listar los temas de un usuario, sin el outline completo. */
export interface StudyTopicSummary {
  id: string;
  title: string;
  subject: string;
  difficulty: Difficulty;
  status: StudyTopicStatus;
  completedActivities: StudyActivityKind[];
  createdAt: number;
  bestExamScore: number | null;
}

export interface StudyTopic extends StudyTopicSummary {
  userId: string;
  notes: string;
  outline: string | null;
  activities: StudyActivities;
  examHistory: ExamResult[];
  error: string | null;
}

export interface CreateStudyTopicResponse {
  topic: StudyTopicSummary;
}

export interface StudyTopicDetailResponse {
  topic: StudyTopic;
}

export interface StudyTopicListResponse {
  topics: StudyTopicSummary[];
  monthlyUsed: number;
  monthlyLimit: number;
}

export interface MarkActivityPayload {
  kind: StudyActivityKind;
}

export interface ExamTurnRequest {
  history: ExamTurn[];
}

export interface ExamTurnResponse {
  turn: ExamTurn;
  final: boolean;
  score?: number;
}
