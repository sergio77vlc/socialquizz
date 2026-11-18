import type { StudyTopic, StudyTopicSummary } from '@rosco/shared';
import { loadTopics, saveTopics } from './store.js';

// Caché en memoria respaldada en disco, igual que paquetes y usuarios.
let topics: StudyTopic[] = loadTopics();

export function listTopicsForUser(userId: string): StudyTopic[] {
  return topics.filter((t) => t.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
}

export function countAllTopics(): number {
  return topics.length;
}

export function countTopicsCreatedSince(userId: string, sinceMs: number): number {
  return topics.filter((t) => t.userId === userId && t.createdAt >= sinceMs).length;
}

export function findTopicById(id: string): StudyTopic | undefined {
  return topics.find((t) => t.id === id);
}

export function addTopic(topic: StudyTopic): void {
  topics = [...topics, topic];
  saveTopics(topics);
}

export function updateTopic(id: string, patch: Partial<StudyTopic>): StudyTopic | undefined {
  let updated: StudyTopic | undefined;
  topics = topics.map((t) => {
    if (t.id !== id) return t;
    updated = { ...t, ...patch };
    return updated;
  });
  if (updated) saveTopics(topics);
  return updated;
}

export function toSummary(topic: StudyTopic): StudyTopicSummary {
  return {
    id: topic.id,
    title: topic.title,
    subject: topic.subject,
    difficulty: topic.difficulty,
    status: topic.status,
    completedActivities: topic.completedActivities,
    createdAt: topic.createdAt,
    bestExamScore: topic.bestExamScore,
  };
}
