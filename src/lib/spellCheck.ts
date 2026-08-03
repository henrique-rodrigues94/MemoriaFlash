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

  // Vetor rolling de distâncias — O(n) de memória.
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
 * Retorna `null` quando não há nenhum candidato "suficientemente parecido".
 *
 * @param input        O que o usuário digitou.
 * @param candidates   Lista de valores conhecidos (matérias/decks existentes).
 * @param maxDistance  Distância máxima aceita. O padrão (2) corrige erros
 *                     comuns de digitação (troca de letras, letra faltando,
 *                     letra sobrando) sem sugerir coisas absurdas.
 */
export function findClosestMatch(input: string, candidates: string[], maxDistance = 2): string | null {
  const q = input.trim().toLowerCase();
  if (!q || q.length < 3) return null;

  let best: { value: string; dist: number } | null = null;
  for (const c of candidates) {
    const cLower = c.trim().toLowerCase();
    if (!cLower || cLower === q) continue; // idêntico → não é "erro"
    const dist = levenshtein(q, cLower);
    // Aceita apenas se a distância for pequena e proporcional ao tamanho
    // (evita sugerir "geografia" quando o usuário digitou "programação").
    if (dist > 0 && dist <= maxDistance && dist <= Math.max(2, Math.floor(q.length / 3))) {
      if (!best || dist < best.dist) {
        best = { value: c, dist };
      }
    }
  }
  return best?.value ?? null;
}
