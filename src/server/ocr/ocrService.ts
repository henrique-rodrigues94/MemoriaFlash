// 📁 flashmind-ai/src/server/ocr/ocrService.ts
//
// Serviço de OCR para o MemoriaFlash Scanner.
//
// CADEIA DE FALLBACK:
//   1. OCR.space
//      → Provider principal do Scanner
//      → 25.000 req/mês grátis com OCRSPACE_API_KEY
//      → Processa imagem por imagem
//      → Engine 2 = maior precisão para texto impresso
//      → Português nativo
//
//   2. Gemini Vision (gemini-2.5-flash)
//      → Fallback quando OCR.space não está disponível ou falha
//      → Processa todas as imagens em 1 chamada (lote)
//      → Útil para fórmulas, tabelas, texto manuscrito e layouts complexos
//
// VARIÁVEIS DE AMBIENTE:
//   OCRSPACE_API_KEY   → habilita OCR.space (principal)
//   GEMINI_API_KEY     → habilita Gemini Vision (fallback)
//   GEMINI_MODEL       → modelo para OCR fallback (padrão: gemini-2.5-flash)
//   OCR_TIMEOUT_MS     → timeout por chamada em ms (padrão: 45000)

import { GoogleGenAI } from '@google/genai';

// ─── Configuração ─────────────────────────────────────────────────────────────

const OCR_TIMEOUT_MS = parseInt(process.env.OCR_TIMEOUT_MS || '45000');
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const OCRSPACE_URL = 'https://api.ocr.space/parse/image';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface OCRResult {
  text: string;
  pages: PageResult[];
  provider: 'gemini' | 'ocrspace' | 'none';
  totalChars: number;
  warnings: string[];
}

interface PageResult {
  index: number;
  text: string;
  confidence?: number;
  warning?: string;
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const [meta, data] = dataUrl.split(',');
  const match = meta?.match(/data:([^;]+)/);
  return {
    mimeType: match?.[1] ?? 'image/jpeg',
    data: data ?? dataUrl,
  };
}

function cleanOCRText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

// ─── Provider principal: OCR.space ───────────────────────────────────────────

async function ocrWithOCRSpaceOne(img: string, pageIndex: number): Promise<PageResult> {
  const apiKey = process.env.OCRSPACE_API_KEY;
  if (!apiKey) throw new Error('OCRSPACE_API_KEY não configurada');

  const { mimeType, data } = parseDataUrl(img);
  const formData = new FormData();

  formData.append('base64Image', `data:${mimeType};base64,${data}`);
  formData.append('language', 'por');
  formData.append('isOverlayRequired', 'false');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2');
  formData.append('isTable', 'false');
  formData.append('filetype', mimeType.includes('png') ? 'png' : 'jpg');

  const res = await fetch(OCRSPACE_URL, {
    method: 'POST',
    headers: { apikey: apiKey },
    body: formData,
    signal: AbortSignal.timeout(OCR_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`OCR.space HTTP ${res.status}: ${await res.text().catch(() => '')}`);
  }

  const json = await res.json();

  if (json.IsErroredOnProcessing) {
    const msg = Array.isArray(json.ErrorMessage)
      ? json.ErrorMessage.join('; ')
      : (json.ErrorMessage || 'erro desconhecido');
    throw new Error(`OCR.space: ${msg}`);
  }

  const parsed = json.ParsedResults as Array<{
    ParsedText: string;
    TextOverlay?: { HasOverlay: boolean };
    LineCount?: number;
  }>;

  if (!parsed?.length) {
    return { index: pageIndex, text: '', warning: 'OCR.space: sem resultado' };
  }

  const text = cleanOCRText(parsed.map(r => r.ParsedText || '').join('\n'));

  return {
    index: pageIndex,
    text,
    warning: !text ? 'OCR.space: texto vazio para esta imagem' : undefined,
  };
}

async function ocrWithOCRSpace(images: string[]): Promise<PageResult[]> {
  const results: PageResult[] = new Array(images.length);
  const CONCURRENCY = 5;

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

// ─── Provider fallback: Gemini Vision ─────────────────────────────────────────

let _geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!_geminiClient) _geminiClient = new GoogleGenAI({ apiKey: key });
  return _geminiClient;
}

async function ocrWithGemini(images: string[]): Promise<PageResult[]> {
  const client = getGeminiClient();
  if (!client) throw new Error('GEMINI_API_KEY não configurada');

  const parts: any[] = [{
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
  }];

  for (const img of images) {
    const { mimeType, data } = parseDataUrl(img);
    parts.push({ inlineData: { data, mimeType } });
  }

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts }],
      config: { maxOutputTokens: 16384, temperature: 0 },
    });

    const fullText = cleanOCRText(response.text || '');
    if (!fullText) throw new Error('Gemini retornou texto vazio');

    const pageSections = fullText
      .split(/===\s*IMAGEM\s*\d+\s*===/i)
      .map(s => s.trim())
      .filter(Boolean);

    if (pageSections.length === images.length) {
      return pageSections.map((text, i) => ({ index: i + 1, text }));
    }

    return [{ index: 1, text: fullText }];
  } catch (error: any) {
    throw new Error(error?.message || 'Falha no Gemini Vision');
  }
}

// ─── Interface pública ────────────────────────────────────────────────────────

/**
 * Extrai texto usando OCR.space como provider PRINCIPAL.
 * Gemini Vision só é utilizado como fallback quando OCR.space falha,
 * não está configurado ou retorna texto vazio.
 */
export async function extractTextFromImages(images: string[]): Promise<OCRResult> {
  if (images.length === 0) {
    return { text: '', pages: [], provider: 'none', totalChars: 0, warnings: [] };
  }

  const warnings: string[] = [];

  // ── Tentativa 1: OCR.space (PRINCIPAL) ────────────────────────────────────
  if (process.env.OCRSPACE_API_KEY) {
    try {
      console.info(`[OCR] OCR.space PRINCIPAL — ${images.length} imagem(ns) em paralelo…`);
      const pages = await ocrWithOCRSpace(images);
      pages.forEach(p => { if (p.warning) warnings.push(p.warning); });

      const text = pages.map((p, i) =>
        pages.length > 1 ? `=== Página ${i + 1} ===\n${p.text}` : p.text
      ).join('\n\n');

      if (text.trim()) {
        console.info(`[OCR] ✓ OCR.space PRINCIPAL — ${text.length} caracteres extraídos`);
        return { text, pages, provider: 'ocrspace', totalChars: text.length, warnings };
      }

      warnings.push('OCR.space: texto vazio, tentando Gemini Vision como fallback…');
    } catch (err: any) {
      warnings.push(`OCR.space falhou: ${err.message}`);
      console.warn('[OCR] OCR.space PRINCIPAL falhou:', err.message);
    }
  } else {
    warnings.push('OCRSPACE_API_KEY não configurada — usando Gemini Vision como fallback');
  }

  // ── Tentativa 2: Gemini Vision (FALLBACK) ─────────────────────────────────
  if (process.env.GEMINI_API_KEY) {
    try {
      console.info(`[OCR] Gemini Vision FALLBACK — ${images.length} imagem(ns)…`);
      const pages = await ocrWithGemini(images);
      const text = pages.map((p, i) =>
        pages.length > 1 ? `=== Página ${i + 1} ===\n${p.text}` : p.text
      ).join('\n\n');

      if (text.trim()) {
        console.info(`[OCR] ✓ Gemini Vision FALLBACK — ${text.length} caracteres extraídos`);
        return { text, pages, provider: 'gemini', totalChars: text.length, warnings };
      }
      warnings.push('Gemini Vision também retornou texto vazio.');
    } catch (err: any) {
      warnings.push(`Gemini Vision falhou: ${err.message}`);
      console.warn('[OCR] Gemini Vision FALLBACK falhou:', err.message);
    }
  } else {
    warnings.push('GEMINI_API_KEY não configurada — nenhum fallback disponível');
  }

  console.error('[OCR] Nenhum provider disponível ou ambos falharam.');
  return {
    text: `[${images.length} imagem(ns) enviada(s) — nenhum provider de OCR disponível. Configure OCRSPACE_API_KEY ou GEMINI_API_KEY no .env]`,
    pages: images.map((_, i) => ({ index: i + 1, text: '', warning: 'Nenhum provider configurado ou ambos falharam' })),
    provider: 'none',
    totalChars: 0,
    warnings,
  };
}

export function getOCRStatus(): {
  gemini: boolean;
  ocrspace: boolean;
  hasAnyProvider: boolean;
} {
  const gemini = !!process.env.GEMINI_API_KEY;
  const ocrspace = !!process.env.OCRSPACE_API_KEY;
  return { gemini, ocrspace, hasAnyProvider: gemini || ocrspace };
}
