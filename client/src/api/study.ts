import type {
  CreateStudyTopicResponse,
  Difficulty,
  ExamTurn,
  ExamTurnResponse,
  MarkActivityPayload,
  StudyActivityKind,
  StudyTopicDetailResponse,
  StudyTopicListResponse,
} from '@rosco/shared';

async function parseOrThrow(res: Response): Promise<any> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de red.');
  return data;
}

export interface NewTopicDraft {
  notes: string;
  title: string;
  subject: string;
  difficulty: Difficulty;
  files: File[];
}

export async function createStudyTopic(draft: NewTopicDraft): Promise<CreateStudyTopicResponse> {
  const form = new FormData();
  form.set('notes', draft.notes);
  form.set('title', draft.title);
  form.set('subject', draft.subject);
  form.set('difficulty', draft.difficulty);
  for (const file of draft.files) form.append('files', file);
  const res = await fetch('/api/study/topics', { method: 'POST', credentials: 'same-origin', body: form });
  return parseOrThrow(res);
}

export async function listStudyTopics(): Promise<StudyTopicListResponse> {
  const res = await fetch('/api/study/topics', { credentials: 'same-origin' });
  return parseOrThrow(res);
}

export async function getStudyTopic(id: string): Promise<StudyTopicDetailResponse> {
  const res = await fetch(`/api/study/topics/${id}`, { credentials: 'same-origin' });
  return parseOrThrow(res);
}

export async function postExamTurn(topicId: string, history: ExamTurn[]): Promise<ExamTurnResponse> {
  const res = await fetch(`/api/study/topics/${topicId}/exam/turn`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history }),
  });
  return parseOrThrow(res);
}

export async function markActivityComplete(id: string, kind: StudyActivityKind): Promise<void> {
  const payload: MarkActivityPayload = { kind };
  const res = await fetch(`/api/study/topics/${id}/activities`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  await parseOrThrow(res);
}
