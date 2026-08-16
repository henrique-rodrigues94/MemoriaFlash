// 📁 memoriaflash/src/lib/spellCheck.ts
// Utilitários de correção ortográfica / "Você quis dizer?" usados nos
// campos de Matéria/Assunto e Nome do Baralho. Se o usuário digitar errado
// (ex: "geogafia"), o app sugere o candidato existente mais próximo
// (ex: "geografia").

/** Distância de Levenshtein entre duas strings (case-insensitive). */
export function levenshtein(a: string, b: string): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  const m = s.length;
  const n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = new Array<number>(n + 1);
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[n];
}

/**
 * Encontra o candidato existente mais próximo do texto digitado.
 * Valores não textuais são ignorados para manter o autocomplete seguro
 * mesmo quando a origem dos dados vem de estruturas parcialmente tipadas.
 */
export function findClosestMatch(input: string, candidates: readonly unknown[], maxDistance = 2): string | null {
  const q = input.trim().toLowerCase();
  if (!q || q.length < 3) return null;
  let best: { value: string; dist: number } | null = null;
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const c = candidate.trim();
    const cLower = c.toLowerCase();
    if (!cLower || cLower === q) continue;
    const dist = levenshtein(q, cLower);
    if (dist > 0 && dist <= maxDistance && dist <= Math.max(2, Math.floor(q.length / 3))) {
      if (!best || dist < best.dist) best = { value: c, dist };
    }
  }
  return best?.value ?? null;
}
