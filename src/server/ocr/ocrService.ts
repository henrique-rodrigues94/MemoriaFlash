// 📁 flashmind-ai/src/server/ocr/ocrService.ts
//
// Serviço de OCR para o MemoriaFlash Scanner.
//
// CADEIA DE FALLBACK:
//   1. Gemini Vision (gemini-2.5-flash)
//      → Processa TODAS as imagens em 1 chamada (lote)
//      → Melhor qualidade para textos educacionais, fórmulas, tabelas
//      → Gratuito com GEMINI_API_KEY (Google AI Studio)
//
//   2. OCR.space
//      → Fallback quando Gemini não está disponível ou falha
//      → 25.000 req/mês grátis com OCRSPACE_API_KEY
//      → Processa imagem por imagem (API não aceita lote)
//      → Engine 2 = maior precisão para texto impresso
//
// VARIÁVEIS DE AMBIENTE:
//   GEMINI_API_KEY     → habilita Gemini Vision (principal)
//   OCRSPACE_API_KEY   → habilita OCR.space (fallback)
//   GEMINI_MODEL       → modelo para OCR (padrão: gemini-2.5-flash)
//   OCR_TIMEOUT_MS     → timeout por chamada em ms (padrão: 45000)

import { GoogleGenAI } from '@google/genai';

// ─── Configuração ─────────────────────────────────────────────────────────────

const OCR_TIMEOUT_MS  = parseInt(process.env.OCR_TIMEOUT_MS || '45000');
const GEMINI_MODEL    = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const OCRSPACE_URL    = 'https://api.ocr.space/parse/image';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface OCRResult {
  text: string;
  pages: PageResult[];
  provider: 'gemini' | 'ocrspace' | 'none';
  totalChars: number;
  warnings: string[];
}

interface PageResult {
  index: number;       // 1-based
  text: string;
  confidence?: number; // 0-100, fornecido pelo OCR.space
  warning?: string;
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

/** Extrai mimeType e dados puros de um data URL base64. */
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const [meta, data] = dataUrl.split(',');
  const match = meta?.match(/data:([^;]+)/);
  return {
    mimeType: match?.[1] ?? 'image/jpeg',
    data: data ?? dataUrl, // se não tiver prefixo, assume que é só o base64
  };
}

/** Normaliza e limpa o texto extraído pelo OCR. */
function cleanOCRText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')   // remove espaços antes de quebra de linha
    .replace(/\n{4,}/g, '\n\n\n') // max 3 linhas em branco consecutivas
    .trim();
}

// ─── Provider 1: Gemini Vision ────────────────────────────────────────────────

let _geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!_geminiClient) {
    _geminiClient = new GoogleGenAI({ apiKey: key });
  }
  return _geminiClient;
}

/**
 * OCR via Gemini Vision — processa TODAS as imagens em UMA chamada.
 * Vantagens: sem limite de imagens por chamada, excelente para fórmulas,
 * tabelas, texto manuscrito e layouts complexos.
 */
async function ocrWithGemini(images: string[]): Promise<PageResult[]> {
  const client = getGeminiClient();
  if (!client) throw new Error('GEMINI_API_KEY não configurada');

  const parts: any[] = [
    {
      text: [
        'Você é um sistema de OCR especializado em materiais educacionais brasileiros.',
        'Analise TODAS as imagens enviadas e extraia EXATAMENTE o texto visível em cada uma.',
        '',
        'REGRAS OBRIGATÓRIAS:',
        '- Preserve a estrutura original: títulos, subtítulos, listas, parágrafos.',
        '- Preserve fórmulas matemáticas e químicas como texto (ex: H²O, x² + y² = z²).',
        '- Preserve tabelas usando espaços ou pipes para alinhar colunas.',
        '- Se houver múltiplas imagens, separe cada uma com: === IMAGEM N ===',
        '- NÃO adicione comentários, explicações ou conteúdo que não esteja na imagem.',
        '- Se uma imagem estiver ilegível, escreva: [IMAGEM N: ilegível]',
        '',
        `Total de imagens: ${images.length}`,
      ].join('\n'),
    },
  ];

  for (const img of images) {
    const { mimeType, data } = parseDataUrl(img);
    parts.push({ inlineData: { data, mimeType } });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts }],
      config: {
        maxOutputTokens: 16384, // textos longos precisam de mais tokens
        temperature: 0,         // OCR deve ser determinístico
      },
    });

    const fullText = cleanOCRText(response.text || '');
    if (!fullText) throw new Error('Gemini retornou texto vazio');

    // Divide por separadores de página se existirem
    const pageSections = fullText.split(/===\s*IMAGEM\s*\d+\s*===/i).map(s => s.trim()).filter(Boolean);

    if (pageSections.length === images.length) {
      return pageSections.map((text, i) => ({ index: i + 1, text }));
    }

    // Retorna como página única se não conseguiu separar
    return [{ index: 1, text: fullText }];
  } finally {
    clearTimeout(timer);
  }
}

// ─── Provider 2: OCR.space ────────────────────────────────────────────────────

/**
 * OCR.space — processa UMA imagem por chamada.
 * Usa Engine 2 (melhor precisão para texto impresso/tipografado).
 * Suporta Português nativamente.
 */
async function ocrWithOCRSpaceOne(img: string, pageIndex: number): Promise<PageResult> {
  const apiKey = process.env.OCRSPACE_API_KEY;
  if (!apiKey) throw new Error('OCRSPACE_API_KEY não configurada');

  const { mimeType, data } = parseDataUrl(img);

  const formData = new FormData();
  formData.append('base64Image', `data:${mimeType};base64,${data}`);
  formData.append('language',            'por');    // Português
  formData.append('isOverlayRequired',   'false');
  formData.append('detectOrientation',   'true');   // corrige imagem rodada
  formData.append('scale',               'true');   // melhora resolução baixa
  formData.append('OCREngine',           '2');      // Engine 2 = maior precisão
  formData.append('isTable',             'false');  // melhor para texto corrido
  formData.append('filetype',            'jpg');

  const res = await fetch(OCRSPACE_URL, {
    method:  'POST',
    headers: { apikey: apiKey },
    body:    formData,
    signal:  AbortSignal.timeout(OCR_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`OCR.space HTTP ${res.status}: ${await res.text().catch(() => '')}`);
  }

  const json = await res.json();

  if (json.IsErroredOnProcessing) {
    const msg = Array.isArray(json.ErrorMessage) ? json.ErrorMessage.join('; ') : (json.ErrorMessage || 'erro desconhecido');
    throw new Error(`OCR.space: ${msg}`);
  }

  const parsed = json.ParsedResults as Array<{ ParsedText: string; TextOverlay?: { HasOverlay: boolean }; LineCount?: number }>;
  if (!parsed?.length) {
    return { index: pageIndex, text: '', warning: 'OCR.space: sem resultado' };
  }

  const text = cleanOCRText(parsed.map(r => r.ParsedText || '').join('\n'));
  const confidence = json.ParsedResults?.[0]?.TextOrientation
    ? undefined
    : undefined; // OCR.space não retorna confidence na API free

  return {
    index: pageIndex,
    text,
    confidence,
    warning: !text ? 'OCR.space: texto vazio para esta imagem' : undefined,
  };
}

/** Processa múltiplas imagens com OCR.space em paralelo (max 5 simultâneas). */
async function ocrWithOCRSpace(images: string[]): Promise<PageResult[]> {
  const results: PageResult[] = new Array(images.length);
  const CONCURRENCY = 5; // OCR.space free aceita paralelo limitado

  for (let i = 0; i < images.length; i += CONCURRENCY) {
    const batch = images.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((img, j) =>
        ocrWithOCRSpaceOne(img, i + j + 1).catch(err => ({
          index: i + j + 1,
          text: '',
          warning: `OCR.space falhou: ${(err as Error).message}`,
        } as PageResult))
      )
    );
    batchResults.forEach((r, j) => { results[i + j] = r; });
  }

  return results;
}

// ─── Interface pública ────────────────────────────────────────────────────────

/**
 * Extrai texto de uma ou mais imagens usando a cadeia de fallback:
 * Gemini Vision → OCR.space
 *
 * @param images  Array de data URLs base64 (image/jpeg, image/png, image/webp, application/pdf)
 * @returns OCRResult com texto completo, páginas individuais e metadados
 */
export async function extractTextFromImages(images: string[]): Promise<OCRResult> {
  if (images.length === 0) {
    return { text: '', pages: [], provider: 'none', totalChars: 0, warnings: [] };
  }

  const warnings: string[] = [];

  // ── Tentativa 1: Gemini Vision ────────────────────────────────────────────
  if (process.env.GEMINI_API_KEY) {
    try {
      console.info(`[OCR] Gemini Vision — ${images.length} imagem(ns)…`);
      const pages = await ocrWithGemini(images);
      const text  = pages.map((p, i) =>
        pages.length > 1 ? `=== Página ${i + 1} ===\n${p.text}` : p.text
      ).join('\n\n');

      if (text.trim()) {
        console.info(`[OCR] ✓ Gemini Vision — ${text.length} caracteres extraídos`);
        return { text, pages, provider: 'gemini', totalChars: text.length, warnings };
      }
      warnings.push('Gemini Vision: texto vazio, tentando OCR.space…');
    } catch (err: any) {
      warnings.push(`Gemini Vision falhou: ${err.message}`);
      console.warn('[OCR] Gemini Vision falhou:', err.message);
    }
  } else {
    warnings.push('GEMINI_API_KEY não configurada — pulando Gemini Vision');
  }

  // ── Tentativa 2: OCR.space ────────────────────────────────────────────────
  if (process.env.OCRSPACE_API_KEY) {
    try {
      console.info(`[OCR] OCR.space — ${images.length} imagem(ns) em paralelo…`);
      const pages = await ocrWithOCRSpace(images);

      // Coleta avisos das páginas individuais
      pages.forEach(p => { if (p.warning) warnings.push(p.warning); });

      const text = pages.map((p, i) =>
        pages.length > 1 ? `=== Página ${i + 1} ===\n${p.text}` : p.text
      ).join('\n\n');

      if (text.trim()) {
        console.info(`[OCR] ✓ OCR.space — ${text.length} caracteres extraídos`);
        return { text, pages, provider: 'ocrspace', totalChars: text.length, warnings };
      }
      warnings.push('OCR.space: texto vazio para todas as imagens');
    } catch (err: any) {
      warnings.push(`OCR.space falhou: ${err.message}`);
      console.warn('[OCR] OCR.space falhou:', err.message);
    }
  } else {
    warnings.push('OCRSPACE_API_KEY não configurada — configure para habilitar fallback OCR');
  }

  // ── Sem provider disponível ────────────────────────────────────────────────
  console.error('[OCR] Nenhum provider disponível. Configure GEMINI_API_KEY ou OCRSPACE_API_KEY.');
  return {
    text: `[${images.length} imagem(ns) enviada(s) — nenhum provider de OCR disponível. Configure GEMINI_API_KEY ou OCRSPACE_API_KEY no .env]`,
    pages: images.map((_, i) => ({ index: i + 1, text: '', warning: 'Nenhum provider configurado' })),
    provider: 'none',
    totalChars: 0,
    warnings,
  };
}

/** Retorna o status dos providers de OCR configurados. */
export function getOCRStatus(): {
  gemini: boolean;
  ocrspace: boolean;
  hasAnyProvider: boolean;
} {
  const gemini   = !!process.env.GEMINI_API_KEY;
  const ocrspace = !!process.env.OCRSPACE_API_KEY;
  return { gemini, ocrspace, hasAnyProvider: gemini || ocrspace };
}
