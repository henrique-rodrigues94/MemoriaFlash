// ============================================================================
// Import / Export de flashcards em formatos populares.
//
// EXPORTA para:
//  - JSON nativo do MemoriaFlash (preserva progresso SM-2: reps/interval/efactor/dueDate)
//  - CSV (front,back,topic,subject,explanation — compatível com Excel/Sheets)
//  - Anki (.txt separado por TAB, com cabeçalho `#separator:tab` / `#html:false`,
//    formato que o próprio Anki lê em Arquivo > Importar sem conversão)
//  - Quizlet / genérico (.txt "termo<TAB>definição", um card por linha — o
//    mesmo formato aceito pela colagem "Importar" do Quizlet e de apps como
//    StudyBlue/Cram)
//
// IMPORTA de todos os formatos acima, com auto-detecção de:
//  - JSON (nosso formato de export, ou um array solto de objetos com
//    front/back, question/answer, term/definition, ou pergunta/resposta)
//  - CSV com cabeçalho (aceita várias variações de nome de coluna, PT/EN)
//  - TXT delimitado por TAB, ponto-e-vírgula ou vírgula (Anki/Quizlet/Mnemosyne)
//
// Observação sobre .apkg (formato binário nativo do Anki): ele é, na
// prática, um arquivo SQLite zipado com um schema específico do Anki. Gerar
// esse binário exigiria embutir um motor SQLite completo (ex.: sql.js) só
// para isso. Optamos pelo formato de texto TAB-separado que o próprio Anki
// documenta e aceita diretamente em "Importar arquivo" — o resultado prático
// é o mesmo (os cards entram no Anki), sem essa dependência pesada.
// ============================================================================

import { Deck, Flashcard } from '../types';

export type ExportFormat = 'json' | 'csv' | 'anki' | 'quizlet';

export interface ImportedCard {
  front: string;
  back: string;
  topic?: string;
  subject?: string;
  explanation?: string;
  /** Progresso SM-2 preservado (só presente ao reimportar um export nativo do MemoriaFlash). */
  srs?: {
    reps: number;
    interval: number;
    efactor: number;
    dueDate: string;
    lastReviewed?: string;
  };
}

export interface ImportResult {
  /** Título sugerido para o deck (vem do JSON nativo, ou do nome do arquivo). */
  suggestedDeckName: string;
  /** Categoria sugerida (só disponível no JSON nativo). */
  suggestedCategory?: string;
  cards: ImportedCard[];
  /** Formato detectado, para feedback ao usuário. */
  detectedFormat: 'memoriaflash-json' | 'json' | 'csv' | 'anki-txt' | 'delimited-txt';
  /** Linhas que não puderam ser interpretadas (mostradas como aviso, não bloqueiam a importação). */
  skippedLines: number;
}

// ----------------------------------------------------------------------------
// Utilitários de download
// ----------------------------------------------------------------------------

export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return (name || 'deck').trim().replace(/[^\p{L}\p{N}\-_ ]/gu, '').replace(/\s+/g, '_').slice(0, 80) || 'deck';
}

// ----------------------------------------------------------------------------
// CSV — encoding/parsing RFC4180 simplificado (aspas duplas, vírgula, quebras
// de linha dentro de campo entre aspas).
// ----------------------------------------------------------------------------

function csvEscapeField(value: string): string {
  const v = value ?? '';
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (ch === '\r') {
      i++;
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  // última linha sem quebra final
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim().length > 0));
}

// ----------------------------------------------------------------------------
// EXPORT
// ----------------------------------------------------------------------------

export function exportDeckAsJSON(deck: Deck): string {
  // Formato nativo: preserva progresso SM-2 para reimportar sem perder nada.
  const payload = {
    memoriaflashExport: 1,
    exportedAt: new Date().toISOString(),
    deck: {
      title: deck.title,
      category: deck.category,
      description: deck.description,
      cards: deck.cards.map((c) => ({
        front: c.front,
        back: c.back,
        topic: c.topic,
        subject: c.subject,
        explanation: c.explanation,
        curiosity: c.curiosity,
        difficulty: c.difficulty,
        reps: c.reps,
        interval: c.interval,
        efactor: c.efactor,
        dueDate: c.dueDate,
        lastReviewed: c.lastReviewed,
      })),
    },
  };
  return JSON.stringify(payload, null, 2);
}

export function exportDeckAsCSV(deck: Deck): string {
  const header = ['front', 'back', 'topic', 'subject', 'explanation'];
  const lines = [header.join(',')];
  for (const c of deck.cards) {
    lines.push(
      [c.front, c.back, c.topic || '', c.subject || '', c.explanation || '']
        .map(csvEscapeField)
        .join(',')
    );
  }
  return lines.join('\r\n');
}

export function exportDeckAsAnkiTXT(deck: Deck): string {
  // Cabeçalho de metadados que o próprio Anki lê ao importar um .txt:
  // define o separador e desliga a interpretação de HTML nos campos.
  const lines = ['#separator:tab', '#html:false', '#notetype:Basic', '#deck:' + deck.title];
  for (const c of deck.cards) {
    const front = (c.front || '').replace(/\t/g, ' ').replace(/\n/g, '<br>');
    const back = (c.back || '').replace(/\t/g, ' ').replace(/\n/g, '<br>');
    lines.push(`${front}\t${back}`);
  }
  return lines.join('\n');
}

export function exportDeckAsQuizletTXT(deck: Deck): string {
  // Quizlet/StudyBlue/Cram aceitam colar "termo[TAB]definição", um por linha,
  // sem cabeçalho — é o que a caixa "Import" desses apps espera.
  const lines: string[] = [];
  for (const c of deck.cards) {
    const front = (c.front || '').replace(/\t/g, ' ').replace(/\n/g, ' ');
    const back = (c.back || '').replace(/\t/g, ' ').replace(/\n/g, ' ');
    lines.push(`${front}\t${back}`);
  }
  return lines.join('\n');
}

export function exportDeck(deck: Deck, format: ExportFormat): { content: string; filename: string; mime: string } {
  const base = sanitizeFilename(deck.title);
  switch (format) {
    case 'json':
      return { content: exportDeckAsJSON(deck), filename: `${base}.json`, mime: 'application/json' };
    case 'csv':
      return { content: exportDeckAsCSV(deck), filename: `${base}.csv`, mime: 'text/csv' };
    case 'anki':
      return { content: exportDeckAsAnkiTXT(deck), filename: `${base}_anki.txt`, mime: 'text/plain' };
    case 'quizlet':
      return { content: exportDeckAsQuizletTXT(deck), filename: `${base}_quizlet.txt`, mime: 'text/plain' };
  }
}

/** Exporta vários decks de uma vez no formato JSON nativo (um array). */
export function exportAllDecksAsJSON(decks: Deck[]): { content: string; filename: string; mime: string } {
  const payload = {
    memoriaflashExport: 1,
    exportedAt: new Date().toISOString(),
    decks: decks.map((deck) => JSON.parse(exportDeckAsJSON(deck)).deck),
  };
  return {
    content: JSON.stringify(payload, null, 2),
    filename: `memoriaflash_backup_${new Date().toISOString().slice(0, 10)}.json`,
    mime: 'application/json',
  };
}

// ----------------------------------------------------------------------------
// IMPORT — auto-detecção de formato
// ----------------------------------------------------------------------------

const FRONT_KEYS = ['front', 'question', 'pergunta', 'term', 'termo', 'q'];
const BACK_KEYS = ['back', 'answer', 'resposta', 'definition', 'definicao', 'definição', 'a'];

function pickField(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const found = Object.keys(obj).find((key) => key.toLowerCase().trim() === k);
    if (found && obj[found] != null && String(obj[found]).trim() !== '') {
      return String(obj[found]);
    }
  }
  return undefined;
}

function normalizeJSONCards(raw: any[]): { cards: ImportedCard[]; skipped: number } {
  const cards: ImportedCard[] = [];
  let skipped = 0;
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      skipped++;
      continue;
    }
    const front = pickField(item, FRONT_KEYS);
    const back = pickField(item, BACK_KEYS);
    if (!front || !back) {
      skipped++;
      continue;
    }
    cards.push({
      front,
      back,
      topic: item.topic || item.tópico || undefined,
      subject: item.subject || item.matéria || item.materia || undefined,
      explanation: item.explanation || item.explicação || item.explicacao || undefined,
    });
  }
  return { cards, skipped };
}

/** Detecta o delimitador mais provável de um arquivo TXT (tab, ; ou ,). */
function detectDelimiter(sampleLines: string[]): string {
  const counts = { '\t': 0, ';': 0, ',': 0 };
  for (const line of sampleLines) {
    if (line.includes('\t')) counts['\t']++;
    else if (line.includes(';')) counts[';']++;
    else if (line.includes(',')) counts[',']++;
  }
  if (counts['\t'] >= counts[';'] && counts['\t'] >= counts[',']) return '\t';
  if (counts[';'] >= counts[',']) return ';';
  return ',';
}

export function parseImportFile(rawText: string, filename: string): ImportResult {
  const text = rawText.replace(/^\uFEFF/, ''); // remove BOM (comum em exports do Excel)
  const trimmed = text.trim();
  const lowerName = filename.toLowerCase();

  // ── 1) JSON (nosso formato nativo, ou um array/objeto genérico) ──────────
  if (lowerName.endsWith('.json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);

      // Formato nativo com 1 deck: { deck: { title, category, cards: [...] } }
      if (parsed && parsed.deck && Array.isArray(parsed.deck.cards)) {
        const { cards, skipped } = normalizeJSONCardsPreservingProgress(parsed.deck.cards);
        return {
          suggestedDeckName: parsed.deck.title || filename.replace(/\.[^.]+$/, ''),
          suggestedCategory: parsed.deck.category,
          cards,
          detectedFormat: 'memoriaflash-json',
          skippedLines: skipped,
        };
      }

      // Formato nativo com múltiplos decks: { decks: [{...}, {...}] } — importa
      // só o primeiro; a UI orienta o usuário a repetir por deck se precisar.
      if (parsed && Array.isArray(parsed.decks) && parsed.decks.length > 0) {
        const first = parsed.decks[0];
        const { cards, skipped } = normalizeJSONCardsPreservingProgress(first.cards || []);
        return {
          suggestedDeckName: first.title || filename.replace(/\.[^.]+$/, ''),
          suggestedCategory: first.category,
          cards,
          detectedFormat: 'memoriaflash-json',
          skippedLines: skipped,
        };
      }

      // Array solto de cards genéricos
      if (Array.isArray(parsed)) {
        const { cards, skipped } = normalizeJSONCards(parsed);
        return {
          suggestedDeckName: filename.replace(/\.[^.]+$/, ''),
          cards,
          detectedFormat: 'json',
          skippedLines: skipped,
        };
      }
    } catch {
      // não era JSON válido apesar da extensão/heurística — cai para os parsers de texto abaixo
    }
  }

  // ── 2) CSV com cabeçalho ──────────────────────────────────────────────────
  if (lowerName.endsWith('.csv')) {
    const rows = parseCSV(text);
    if (rows.length > 0) {
      const header = rows[0].map((h) => h.toLowerCase().trim());
      const frontIdx = header.findIndex((h) => FRONT_KEYS.includes(h));
      const backIdx = header.findIndex((h) => BACK_KEYS.includes(h));
      const topicIdx = header.findIndex((h) => ['topic', 'tópico', 'topico'].includes(h));
      const subjectIdx = header.findIndex((h) => ['subject', 'matéria', 'materia'].includes(h));

      const dataRows = frontIdx !== -1 && backIdx !== -1 ? rows.slice(1) : rows;
      const [fIdx, bIdx] = frontIdx !== -1 && backIdx !== -1 ? [frontIdx, backIdx] : [0, 1];

      const cards: ImportedCard[] = [];
      let skipped = 0;
      for (const r of dataRows) {
        const front = r[fIdx]?.trim();
        const back = r[bIdx]?.trim();
        if (!front || !back) {
          skipped++;
          continue;
        }
        cards.push({
          front,
          back,
          topic: topicIdx !== -1 ? r[topicIdx]?.trim() || undefined : undefined,
          subject: subjectIdx !== -1 ? r[subjectIdx]?.trim() || undefined : undefined,
        });
      }
      return {
        suggestedDeckName: filename.replace(/\.[^.]+$/, ''),
        cards,
        detectedFormat: 'csv',
        skippedLines: skipped,
      };
    }
  }

  // ── 3) TXT delimitado (Anki export, Quizlet paste, Mnemosyne, etc.) ──────
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const contentLinesRaw = lines.filter((l) => !l.startsWith('#')); // ignora cabeçalho #separator:tab etc. do Anki
  const isAnkiHeader = lines.some((l) => l.startsWith('#separator') || l.startsWith('#html'));
  const delimiter = detectDelimiter(contentLinesRaw.slice(0, 20));

  const splitLine = (line: string): string[] =>
    delimiter === '\t' ? line.split('\t') : line.split(delimiter);

  // Se a primeira linha for claramente um cabeçalho (ex.: "front\tback" ou
  // "term,definition" de um TSV/CSV renomeado para .txt), ignora-a — do
  // contrário ela seria importada como se fosse um card de verdade.
  let contentLines = contentLinesRaw;
  if (contentLines.length > 0) {
    const firstCols = splitLine(contentLines[0]).map((c) => c.trim().toLowerCase());
    const looksLikeHeader =
      firstCols.length >= 2 && FRONT_KEYS.includes(firstCols[0]) && BACK_KEYS.includes(firstCols[1]);
    if (looksLikeHeader) {
      contentLines = contentLines.slice(1);
    }
  }

  const cards: ImportedCard[] = [];
  let skipped = 0;
  for (const line of contentLines) {
    const parts = splitLine(line);
    const front = parts[0]?.trim();
    const back = parts[1]?.trim();
    if (!front || !back) {
      skipped++;
      continue;
    }
    cards.push({
      front: front.replace(/<br\s*\/?>/gi, '\n'),
      back: back.replace(/<br\s*\/?>/gi, '\n'),
    });
  }

  return {
    suggestedDeckName: filename.replace(/\.[^.]+$/, ''),
    cards,
    detectedFormat: isAnkiHeader ? 'anki-txt' : 'delimited-txt',
    skippedLines: skipped,
  };
}

function normalizeJSONCardsPreservingProgress(raw: any[]): { cards: ImportedCard[]; skipped: number } {
  const cards: ImportedCard[] = [];
  let skipped = 0;
  for (const item of raw) {
    if (!item || typeof item !== 'object' || !item.front || !item.back) {
      skipped++;
      continue;
    }
    const hasValidSRS =
      typeof item.reps === 'number' && typeof item.interval === 'number' &&
      typeof item.efactor === 'number' && typeof item.dueDate === 'string';
    cards.push({
      front: String(item.front),
      back: String(item.back),
      topic: item.topic || undefined,
      subject: item.subject || undefined,
      explanation: item.explanation || undefined,
      srs: hasValidSRS
        ? {
            reps: item.reps,
            interval: item.interval,
            efactor: item.efactor,
            dueDate: item.dueDate,
            lastReviewed: item.lastReviewed || undefined,
          }
        : undefined,
    });
  }
  return { cards, skipped };
}

/** Converte cards importados (formato leve) em Flashcards prontos para um novo deck.
 *  Reaproveita o progresso SM-2 quando disponível (reimport de um backup nativo);
 *  caso contrário, o card entra como novo (SRS zerado). */
export function toNewFlashcards(cards: ImportedCard[], fallbackSubject: string): Flashcard[] {
  const now = new Date().toISOString();
  return cards.map((c, idx) => ({
    id: `import-${Date.now()}-${idx}`,
    front: c.front,
    back: c.back,
    topic: c.topic || undefined,
    subject: c.subject || fallbackSubject,
    explanation: c.explanation || undefined,
    // Cards importados de arquivos externos (Anki/CSV/Quizlet/backup) não
    // passaram pelo pipeline de IA do MemoriaFlash, então não podem ser
    // relatados para curadoria nem compartilhados no banco entre usuários.
    source: 'manual',
    reps: c.srs?.reps ?? 0,
    interval: c.srs?.interval ?? 0,
    efactor: c.srs?.efactor ?? 2.5,
    dueDate: c.srs?.dueDate ?? now,
    lastReviewed: c.srs?.lastReviewed,
  }));
}
