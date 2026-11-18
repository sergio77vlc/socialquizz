import type { Express, NextFunction, Response } from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import type {
  CreateStudyTopicResponse,
  Difficulty,
  ExamResult,
  ExamTurn,
  ExamTurnRequest,
  ExamTurnResponse,
  MarkActivityPayload,
  QuizPack,
  RoscoPack,
  StudyActivities,
  StudyTopic,
  StudyTopicDetailResponse,
  StudyTopicListResponse,
} from '@rosco/shared';
import { STUDY_ACTIVITY_KINDS } from '@rosco/shared';
import { type AuthedRequest, requireAuth } from './auth/middleware.js';
import {
  addTopic,
  countTopicsCreatedSince,
  findTopicById,
  listTopicsForUser,
  toSummary,
  updateTopic,
} from './study/repository.js';
import { extractStudyOutline, StudyAiError, type StudyAttachment } from './ai/studyIngest.js';
import { generateStudyQuiz, generateStudyRoscoPack, generateStudySummaryAndInfografia } from './ai/studyContent.js';
import { generateStudyCrossword } from './ai/studyCrossword.js';
import { nextExamStep, StudyExamError } from './ai/studyExam.js';
import { roscoPackRepo, quizPackRepo } from './packs/repositories.js';
import { addGeneratedCrossword } from './crossword/generatedStore.js';

const FREE_MONTHLY_LIMIT = 5;
const PREMIUM_MONTHLY_LIMIT = 100;
const MAX_FILES = 6;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const ROSCO_COUNT = 3;
const QUIZ_COUNT = 15;
const CROSSWORD_COUNT = 2;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
  fileFilter: (_req, file, cb) => cb(null, ALLOWED_MIME.has(file.mimetype)),
});

/** Envuelve multer para devolver un error JSON limpio en vez de la página de error por
 * defecto de Express si un archivo supera el límite de tamaño o de cantidad. */
function uploadFiles(req: AuthedRequest, res: Response, next: NextFunction): void {
  upload.array('files', MAX_FILES)(req, res, (err: unknown) => {
    if (err) {
      const message =
        err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
          ? 'Alguno de los archivos supera el tamaño máximo permitido (8 MB).'
          : 'No se pudieron procesar los archivos adjuntos.';
      res.status(400).json({ error: message });
      return;
    }
    next();
  });
}

function monthStartMs(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
}

function monthlyLimitFor(plan: 'free' | 'premium'): number {
  return plan === 'premium' ? PREMIUM_MONTHLY_LIMIT : FREE_MONTHLY_LIMIT;
}

/** Genera el plan de estudio completo (roscos, crucigramas, test, resumen e infografía) a
 * partir del outline ya extraído, y lo enlaza con los repositorios de contenido existentes
 * para poder reutilizar toda la UI de juego ya construida (modo individual y multijugador). */
async function runGenerationPipeline(topicId: string): Promise<void> {
  const topic = findTopicById(topicId);
  if (!topic || !topic.outline) return;

  const [roscos, quiz, crossword1, crossword2, summaryInfo] = await Promise.allSettled([
    generateStudyRoscoPack(topic.outline, topic.title, topic.difficulty, ROSCO_COUNT),
    generateStudyQuiz(topic.outline, topic.difficulty, QUIZ_COUNT),
    generateStudyCrossword(topic.outline, topic.title, topic.difficulty),
    generateStudyCrossword(topic.outline, topic.title, topic.difficulty),
    generateStudySummaryAndInfografia(topic.outline),
  ]);

  const activities: StudyActivities = {
    roscoPackId: null,
    quizPackId: null,
    crosswordPuzzleIds: [],
    summary: null,
    infografia: null,
  };

  if (roscos.status === 'fulfilled') {
    const pack: RoscoPack = {
      id: `study-pack-${nanoid(8)}`,
      domain: 'rosco',
      name: topic.title,
      difficulty: topic.difficulty,
      createdAt: Date.now(),
      roscos: roscos.value,
    };
    roscoPackRepo.add(pack);
    activities.roscoPackId = pack.id;
  } else {
    console.error(`Tema ${topicId}: fallo generando roscos:`, roscos.reason);
  }

  if (quiz.status === 'fulfilled') {
    const pack: QuizPack = {
      id: `study-pack-${nanoid(8)}`,
      domain: 'quiz',
      name: topic.title,
      difficulty: topic.difficulty,
      createdAt: Date.now(),
      questions: quiz.value,
    };
    quizPackRepo.add(pack);
    activities.quizPackId = pack.id;
  } else {
    console.error(`Tema ${topicId}: fallo generando el test:`, quiz.reason);
  }

  for (const result of [crossword1, crossword2]) {
    if (result.status === 'fulfilled') {
      addGeneratedCrossword(result.value);
      activities.crosswordPuzzleIds.push(result.value.id);
    } else {
      console.error(`Tema ${topicId}: fallo generando un crucigrama:`, result.reason);
    }
  }

  if (summaryInfo.status === 'fulfilled') {
    activities.summary = summaryInfo.value.summary;
    activities.infografia = summaryInfo.value.infografia;
  } else {
    console.error(`Tema ${topicId}: fallo generando el resumen:`, summaryInfo.reason);
  }

  const anySuccess =
    activities.roscoPackId || activities.quizPackId || activities.crosswordPuzzleIds.length > 0 || activities.summary;
  updateTopic(topicId, {
    activities,
    status: anySuccess ? 'listo' : 'error',
    error: anySuccess ? null : 'No se pudo generar el plan de estudio. Inténtalo de nuevo.',
  });
}

/** Procesa un tema recién creado en segundo plano: lee el temario y genera el plan completo.
 * La petición HTTP ya ha respondido antes de llamar a esta función, así que cualquier fallo
 * tiene que quedar atrapado aquí dentro — nunca debe escapar como una excepción no controlada
 * (eso tumbaría el proceso entero del servidor). */
async function processNewTopic(topicId: string, attachments: StudyAttachment[], notes: string, titleHint: string, subjectHint: string): Promise<void> {
  try {
    const outlineResult = await extractStudyOutline(attachments, notes);
    updateTopic(topicId, {
      title: titleHint || outlineResult.title,
      subject: subjectHint || outlineResult.subject,
      outline: outlineResult.outline,
    });
    await runGenerationPipeline(topicId);
  } catch (err) {
    const message = err instanceof StudyAiError ? err.message : 'Error inesperado procesando el temario.';
    console.error(`Error procesando el tema ${topicId}:`, err);
    updateTopic(topicId, { status: 'error', error: message });
  }
}

export function registerStudyRoutes(app: Express): void {
  app.post('/api/study/topics', requireAuth, uploadFiles, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const limit = monthlyLimitFor(user.plan);
    const used = countTopicsCreatedSince(user.id, monthStartMs());
    if (used >= limit) {
      res
        .status(403)
        .json({ error: `Has alcanzado el límite de ${limit} temas este mes con tu plan actual.`, limitReached: true });
      return;
    }

    const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 4000) : '';
    const titleHint = typeof req.body?.title === 'string' ? req.body.title.trim().slice(0, 60) : '';
    const subjectHint = typeof req.body?.subject === 'string' ? req.body.subject.trim().slice(0, 40) : '';
    const difficulty: Difficulty = req.body?.difficulty === 'dificil' ? 'dificil' : 'medio';
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];

    if (!notes && files.length === 0) {
      res.status(400).json({ error: 'Describe lo que quieres estudiar o adjunta tu temario.' });
      return;
    }

    const attachments: StudyAttachment[] = files.map((f) => ({
      mediaType: f.mimetype as StudyAttachment['mediaType'],
      base64: f.buffer.toString('base64'),
    }));

    const topic: StudyTopic = {
      id: `tema-${nanoid(10)}`,
      userId: user.id,
      title: titleHint || 'Preparando tu tema...',
      subject: subjectHint || '',
      difficulty,
      status: 'generando',
      completedActivities: [],
      createdAt: Date.now(),
      bestExamScore: null,
      notes,
      outline: null,
      activities: { roscoPackId: null, quizPackId: null, crosswordPuzzleIds: [], summary: null, infografia: null },
      examHistory: [],
      error: null,
    };
    addTopic(topic);

    const response: CreateStudyTopicResponse = { topic: toSummary(topic) };
    res.json(response);

    void processNewTopic(topic.id, attachments, notes, titleHint, subjectHint);
  });

  app.get('/api/study/topics', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const topics = listTopicsForUser(user.id).map(toSummary);
    const response: StudyTopicListResponse = {
      topics,
      monthlyUsed: countTopicsCreatedSince(user.id, monthStartMs()),
      monthlyLimit: monthlyLimitFor(user.plan),
    };
    res.json(response);
  });

  app.get('/api/study/topics/:id', requireAuth, (req: AuthedRequest, res) => {
    const topic = findTopicById(req.params.id);
    if (!topic || topic.userId !== req.authUser!.id) {
      res.status(404).json({ error: 'Tema no encontrado.' });
      return;
    }
    const response: StudyTopicDetailResponse = { topic };
    res.json(response);
  });

  app.post('/api/study/topics/:id/activities', requireAuth, (req: AuthedRequest, res) => {
    const topic = findTopicById(req.params.id);
    if (!topic || topic.userId !== req.authUser!.id) {
      res.status(404).json({ error: 'Tema no encontrado.' });
      return;
    }
    const { kind } = (req.body ?? {}) as Partial<MarkActivityPayload>;
    if (!kind || !STUDY_ACTIVITY_KINDS.includes(kind)) {
      res.status(400).json({ error: 'Actividad no válida.' });
      return;
    }
    const completedActivities = topic.completedActivities.includes(kind)
      ? topic.completedActivities
      : [...topic.completedActivities, kind];
    const updated = updateTopic(topic.id, { completedActivities });
    res.json({ topic: toSummary(updated!) });
  });

  app.post('/api/study/topics/:id/exam/turn', requireAuth, async (req: AuthedRequest, res) => {
    const topic = findTopicById(req.params.id);
    if (!topic || topic.userId !== req.authUser!.id) {
      res.status(404).json({ error: 'Tema no encontrado.' });
      return;
    }
    if (topic.status !== 'listo' || !topic.outline) {
      res.status(409).json({ error: 'Este tema todavía no tiene un plan de estudio listo.' });
      return;
    }
    const { history } = (req.body ?? {}) as Partial<ExamTurnRequest>;
    if (
      !Array.isArray(history) ||
      history.length > 40 ||
      !history.every(
        (t) =>
          t &&
          (t.role === 'profesora' || t.role === 'alumno') &&
          typeof t.text === 'string' &&
          t.text.length <= 2000,
      )
    ) {
      res.status(400).json({ error: 'Historial de examen no válido.' });
      return;
    }

    try {
      const step = await nextExamStep(topic.outline, history as ExamTurn[]);
      const turn: ExamTurn = { role: 'profesora', text: step.text };

      if (step.final && step.score != null) {
        const result: ExamResult = { id: `exam-${nanoid(8)}`, at: Date.now(), score: step.score, feedback: step.text };
        const bestExamScore =
          topic.bestExamScore == null ? step.score : Math.max(topic.bestExamScore, step.score);
        updateTopic(topic.id, { examHistory: [...topic.examHistory, result], bestExamScore });
      }

      const response: ExamTurnResponse = { turn, final: step.final, score: step.score };
      res.json(response);
    } catch (err) {
      const message = err instanceof StudyExamError ? err.message : 'Error inesperado en el examen oral.';
      console.error(`Error en el examen del tema ${topic.id}:`, err);
      res.status(422).json({ error: message });
    }
  });
}
