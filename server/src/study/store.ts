import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StudyTopic } from '@rosco/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const FILE_PATH = path.join(DATA_DIR, 'study-topics.json');

export function loadTopics(): StudyTopic[] {
  try {
    const raw = fs.readFileSync(FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTopics(topics: StudyTopic[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(topics, null, 2), 'utf-8');
}
