import fs from 'fs';

// ============================================================================
// Injeta metatags Open Graph/Twitter dinâmicas quando alguém abre um link de
// indicação (?ref=CODIGO). Sem isso, compartilhar o link no WhatsApp/Telegram
// mostra só o preview genérico do app — com isso, mostra uma mensagem
// convidativa e específica, o que historicamente melhora bastante a taxa de
// clique de programas de indicação.
//
// Técnica: como o app é uma SPA (sem SSR), fazemos uma substituição simples
// de string no HTML estático antes de servi-lo — não é SSR de verdade, só
// reescrita das tags <meta> que os crawlers de preview (WhatsApp, etc.) leem
// antes mesmo de rodar JavaScript.
// ============================================================================

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Aceita apenas os caracteres esperados de um código de indicação (ver deriveReferralCode). */
function sanitizeReferralCode(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase();
  if (!/^[A-Z0-9]{1,16}$/.test(trimmed)) return null;
  return trimmed;
}

export function injectReferralMeta(html: string, rawCode: string): string {
  const code = sanitizeReferralCode(rawCode);
  if (!code) return html;

  const title = 'Você foi convidado para o MemoriaFlash! 🧠';
  const description = `Um amigo te convidou para estudar com flashcards + IA gratuitamente e já reservou créditos de bônus para vocês dois (código ${code}).`;

  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);

  return html
    .replace(/<title>.*?<\/title>/, `<title>${safeTitle}</title>`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${safeTitle}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${safeDescription}$2`)
    .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/, `$1${safeTitle}$2`)
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${safeDescription}$2`);
}

/** Lê o index.html de produção do disco, aplicando cache simples em memória (evita ler o arquivo a cada request). */
let cachedTemplate: string | null = null;
export function readIndexHtmlTemplate(distIndexPath: string): string {
  if (cachedTemplate) return cachedTemplate;
  cachedTemplate = fs.readFileSync(distIndexPath, 'utf-8');
  return cachedTemplate;
}
