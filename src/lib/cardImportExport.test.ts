import { describe, it, expect } from 'vitest';
import {
  exportDeckAsJSON,
  exportDeckAsCSV,
  exportDeckAsAnkiTXT,
  exportDeckAsQuizletTXT,
  parseImportFile,
  toNewFlashcards,
} from './cardImportExport';
import { Deck, Flashcard } from '../types';

function card(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'c1',
    front: 'Qual a capital da França?',
    back: 'Paris',
    topic: 'Geografia',
    subject: 'Geografia Mundial',
    reps: 3,
    interval: 6,
    efactor: 2.6,
    dueDate: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function deck(cards: Flashcard[]): Deck {
  return {
    id: 'd1',
    title: 'Capitais',
    category: 'Geografia',
    description: '',
    cards,
    color: '#000',
    accentBorder: '#000',
  };
}

describe('exportDeckAsJSON / import round-trip preserva progresso SM-2', () => {
  it('exporta e reimporta o mesmo deck preservando reps/interval/efactor/dueDate', () => {
    const original = deck([card()]);
    const json = exportDeckAsJSON(original);
    const result = parseImportFile(json, 'capitais.json');

    expect(result.detectedFormat).toBe('memoriaflash-json');
    expect(result.suggestedDeckName).toBe('Capitais');
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].srs).toMatchObject({ reps: 3, interval: 6, efactor: 2.6 });

    const flashcards = toNewFlashcards(result.cards, 'Geografia');
    expect(flashcards[0].reps).toBe(3);
    expect(flashcards[0].interval).toBe(6);
    expect(flashcards[0].efactor).toBe(2.6);
  });

  it('cards sem front/back são pulados e contados em skippedLines', () => {
    const json = JSON.stringify({ deck: { title: 'X', cards: [{ front: 'A' }, { front: 'B', back: 'C' }] } });
    const result = parseImportFile(json, 'x.json');
    expect(result.cards).toHaveLength(1);
    expect(result.skippedLines).toBe(1);
  });
});

describe('exportDeckAsCSV / import CSV', () => {
  it('exporta CSV com cabeçalho e reimporta corretamente, inclusive campos com vírgula', () => {
    const original = deck([
      card({ id: 'c1', front: 'O que é, na prática, SRS?', back: 'Repetição, espaçada' }),
    ]);
    const csv = exportDeckAsCSV(original);
    expect(csv).toContain('front,back,topic,subject,explanation');

    const result = parseImportFile(csv, 'deck.csv');
    expect(result.detectedFormat).toBe('csv');
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].front).toBe('O que é, na prática, SRS?');
    expect(result.cards[0].back).toBe('Repetição, espaçada');
  });

  it('detecta colunas em variações de nome (question/answer)', () => {
    const csv = 'question,answer\n"2+2?","4"\n"3+3?","6"';
    const result = parseImportFile(csv, 'quiz.csv');
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0]).toMatchObject({ front: '2+2?', back: '4' });
  });

  it('CSV sem cabeçalho reconhecível trata a primeira coluna como front e a segunda como back', () => {
    const csv = 'Pergunta,Resposta\nO que é?,Isso';
    const result = parseImportFile(csv, 'semcabecalho.csv');
    expect(result.cards.length).toBeGreaterThanOrEqual(1);
  });
});

describe('exportDeckAsAnkiTXT / import Anki TXT', () => {
  it('gera o cabeçalho de metadados que o Anki espera', () => {
    const txt = exportDeckAsAnkiTXT(deck([card()]));
    expect(txt).toContain('#separator:tab');
    expect(txt).toContain('#html:false');
    expect(txt).toContain('Qual a capital da França?\tParis');
  });

  it('reimporta um TXT tab-separado exportado do Anki, ignorando linhas de cabeçalho (#)', () => {
    const ankiExport = ['#separator:tab', '#html:true', 'O que é mitocôndria?\tOrganela celular', 'Capital do Japão?\tTóquio'].join('\n');
    const result = parseImportFile(ankiExport, 'export_anki.txt');
    expect(result.detectedFormat).toBe('anki-txt');
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0]).toMatchObject({ front: 'O que é mitocôndria?', back: 'Organela celular' });
  });

  it('converte <br> de volta para quebra de linha ao importar', () => {
    const ankiExport = '#separator:tab\nPergunta longa<br>com quebra\tResposta<br>também com quebra';
    const result = parseImportFile(ankiExport, 'x.txt');
    expect(result.cards[0].front).toContain('\n');
    expect(result.cards[0].back).toContain('\n');
  });
});

describe('exportDeckAsQuizletTXT / import delimitado genérico', () => {
  it('gera termo<TAB>definição sem cabeçalho', () => {
    const txt = exportDeckAsQuizletTXT(deck([card()]));
    expect(txt.split('\n')[0]).toBe('Qual a capital da França?\tParis');
  });

  it('importa TXT separado por ponto-e-vírgula (comum em outros apps)', () => {
    const txt = 'Termo A;Definição A\nTermo B;Definição B';
    const result = parseImportFile(txt, 'quizlet_export.txt');
    expect(result.detectedFormat).toBe('delimited-txt');
    expect(result.cards).toHaveLength(2);
    expect(result.cards[1]).toMatchObject({ front: 'Termo B', back: 'Definição B' });
  });

  it('importa TXT separado por vírgula simples quando não há tab nem ;', () => {
    const txt = 'Pergunta 1,Resposta 1\nPergunta 2,Resposta 2';
    const result = parseImportFile(txt, 'lista.txt');
    expect(result.cards).toHaveLength(2);
  });
});

describe('parseImportFile — casos de borda', () => {
  it('arquivo com BOM (comum em exports do Excel) não quebra o parsing', () => {
    const withBom = '\uFEFFfront,back\nA,B';
    const result = parseImportFile(withBom, 'excel.csv');
    expect(result.cards).toHaveLength(1);
  });

  it('array JSON solto de objetos com term/definition é reconhecido', () => {
    const json = JSON.stringify([{ term: 'H2O', definition: 'Água' }, { term: 'CO2', definition: 'Gás carbônico' }]);
    const result = parseImportFile(json, 'quizlet_flashcards.json');
    expect(result.detectedFormat).toBe('json');
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0]).toMatchObject({ front: 'H2O', back: 'Água' });
  });

  it('arquivo vazio ou sem cards válidos retorna lista vazia sem lançar erro', () => {
    const result = parseImportFile('', 'vazio.txt');
    expect(result.cards).toEqual([]);
  });

  it('JSON malformado com extensão .json cai graciosamente para o parser de texto', () => {
    const result = parseImportFile('front\tback\nA\tB', 'nao_e_json.json');
    expect(result.cards).toHaveLength(1);
  });
});

describe('toNewFlashcards', () => {
  it('cards sem progresso SM-2 entram zerados (novos)', () => {
    const flashcards = toNewFlashcards([{ front: 'A', back: 'B' }], 'Geral');
    expect(flashcards[0].reps).toBe(0);
    expect(flashcards[0].interval).toBe(0);
    expect(flashcards[0].efactor).toBe(2.5);
  });

  it('usa fallbackSubject quando o card importado não tem subject', () => {
    const flashcards = toNewFlashcards([{ front: 'A', back: 'B' }], 'Biologia');
    expect(flashcards[0].subject).toBe('Biologia');
  });

  it('gera IDs únicos para cada card', () => {
    const flashcards = toNewFlashcards(
      [{ front: 'A', back: 'B' }, { front: 'C', back: 'D' }],
      'Geral'
    );
    expect(flashcards[0].id).not.toBe(flashcards[1].id);
  });
});
