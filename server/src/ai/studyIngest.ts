import Anthropic from '@anthropic-ai/sdk';

// Usamos el modelo más barato (Haiku) para todo el modo estudio: es más que suficiente para
// leer el temario y generar contenido, y mantiene el coste por tema en céntimos.
const MODEL = process.env.STUDY_AI_MODEL || 'claude-haiku-5-5';

export class StudyAiError extends Error {}

export interface StudyAttachment {
  /** application/pdf o una imagen (foto de apuntes, página de libro, diapositiva...). */
  mediaType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';
  /** Contenido del archivo en base64, sin el prefijo "data:...;base64,". */
  base64: string;
}

export interface OutlineResult {
  title: string;
  subject: string;
  outline: string;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new StudyAiError('El modo estudio no está configurado: falta ANTHROPIC_API_KEY en el servidor.');
  }
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new StudyAiError('La IA no devolvió un JSON válido al leer el temario.');
  }
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    throw new StudyAiError('No se pudo interpretar la respuesta de la IA al leer el temario.');
  }
}

function buildInstruction(notes: string, hasAttachments: boolean): string {
  return `Eres una profesora particular preparando el material de estudio de un alumno.

${hasAttachments ? 'El alumno ha adjuntado el temario (documento o fotos de sus apuntes/libro).' : 'El alumno no ha adjuntado ningún archivo, solo esta descripción de lo que quiere estudiar:'}
"""
${notes.trim() || '(sin descripción adicional)'}
"""

Tu tarea: ${hasAttachments ? 'lee el material adjunto y' : ''} produce un esquema (outline) de estudio completo y bien organizado, en español, que servirá de única fuente de verdad para generar después juegos educativos (roscos, crucigramas, preguntas tipo test) y un examen oral sobre este contenido. Por eso el outline debe:

- Cubrir TODO el contenido relevante del material (o de la descripción, si no hay archivos), organizado en temas y subtemas con viñetas.
- Incluir términos clave, definiciones, fechas, nombres propios, fórmulas o datos concretos tal y como aparecen en el material — nada de contenido inventado si hay un archivo adjunto.
- Tener una extensión generosa (puede ser largo, mejor que falte brevedad y no contenido).
- Si no hay archivo adjunto, usa tu propio conocimiento para generar un temario razonable sobre lo que describe el alumno.

Responde ÚNICAMENTE con un JSON válido (sin texto adicional, sin markdown, sin bloques de código) con esta forma exacta:
{"title": "título corto del tema (máx 60 caracteres)", "subject": "asignatura o área (máx 40 caracteres)", "outline": "el esquema completo en texto plano, con saltos de línea"}`;
}

function toContentBlocks(attachments: StudyAttachment[], notes: string): any[] {
  const blocks: any[] = attachments.map((att) =>
    att.mediaType === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: att.mediaType, data: att.base64 } }
      : { type: 'image', source: { type: 'base64', media_type: att.mediaType, data: att.base64 } },
  );
  blocks.push({ type: 'text', text: buildInstruction(notes, attachments.length > 0) });
  return blocks;
}

function toOutlineResult(raw: unknown): OutlineResult {
  if (typeof raw !== 'object' || raw === null) {
    throw new StudyAiError('Formato de respuesta inesperado al leer el temario.');
  }
  const { title, subject, outline } = raw as Record<string, unknown>;
  if (typeof title !== 'string' || typeof subject !== 'string' || typeof outline !== 'string' || !outline.trim()) {
    throw new StudyAiError('La IA no devolvió un esquema de estudio válido.');
  }
  return {
    title: title.trim().slice(0, 60) || 'Mi tema de estudio',
    subject: subject.trim().slice(0, 40) || 'General',
    outline: outline.trim(),
  };
}

async function requestOutline(attachments: StudyAttachment[], notes: string): Promise<OutlineResult> {
  const anthropic = getClient();
  const message = await anthropic.beta.messages.create({
    model: MODEL,
    max_tokens: 8192,
    betas: ['pdfs-2024-09-25'],
    messages: [{ role: 'user', content: toContentBlocks(attachments, notes) }],
  });
  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new StudyAiError('La IA no devolvió texto al leer el temario.');
  }
  return toOutlineResult(extractJson(textBlock.text));
}

/** Lee el temario (PDF/fotos) y/o la descripción del alumno y produce un outline de texto
 * reutilizable: se paga el coste "de visión" una sola vez, y todo el contenido posterior
 * (roscos, crucigramas, tests, resumen, examen) se genera a partir de este texto barato. */
export async function extractStudyOutline(attachments: StudyAttachment[], notes: string): Promise<OutlineResult> {
  if (attachments.length === 0 && !notes.trim()) {
    throw new StudyAiError('Describe lo que quieres estudiar o adjunta tu temario.');
  }
  try {
    return await requestOutline(attachments, notes);
  } catch (err) {
    if (err instanceof StudyAiError) {
      return await requestOutline(attachments, notes);
    }
    throw err;
  }
}
