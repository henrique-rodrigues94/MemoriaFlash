// 📁 flashmind-ai/src/lib/curriculumTopics.ts
//
// ATENÇÃO: O currículo fixo foi removido.
// Toda grade curricular agora é gerada pela IA e armazenada no Firestore.
// Use `fetchCurriculum()` de `src/services/curriculumService.ts` em vez de
// `getCuratedCurriculum()`.
//
// Este arquivo existe apenas para compatibilidade com imports antigos que
// ainda referenciam `CurriculumCategory`.

export interface CurriculumCategory {
  category: string;
  topics: string[];
}

/**
 * @deprecated Use `fetchCurriculum` de `src/services/curriculumService.ts`.
 * Retorna sempre null para forçar o uso do sistema dinâmico via IA + Firestore.
 */
export function getCuratedCurriculum(): null {
  return null;
}
