// 📁 flashmind-ai/src/lib/curriculumTopics.ts
import { EducationLevel } from './educationLevels';

export interface CurriculumCategory {
  category: string;
  topics: string[];
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Mapa: chave da matéria (normalizada) → nível de ensino → categorias com
 * seus subtópicos. Só matérias com currículo bem definido/padronizado (como
 * as da Educação Básica brasileira) entram aqui — cursos de faculdade têm
 * grades muito diferentes entre instituições, então continuam usando a
 * sugestão dinâmica da IA.
 */
const CURRICULUM: Record<string, Partial<Record<EducationLevel, CurriculumCategory[]>>> = {
  matematica: {
    fundamental: [
      {
        category: 'Números e Operações (Anos Iniciais)',
        topics: [
          'Contagem e sistema de numeração decimal',
          'Adição e subtração',
          'Multiplicação e divisão',
          'Noções iniciais de frações e números decimais',
          'Dobro, triplo, metade e terça parte',
        ],
      },
      {
        category: 'Geometria (Anos Iniciais)',
        topics: [
          'Localização e movimentação no espaço (pontos de referência)',
          'Figuras geométricas espaciais (cubo, bloco retangular, esfera, cilindro)',
          'Figuras geométricas planas (quadrado, retângulo, triângulo, círculo)',
        ],
      },
      {
        category: 'Grandezas e Medidas (Anos Iniciais)',
        topics: [
          'Medidas de comprimento, massa, capacidade e tempo',
          'Sistema monetário brasileiro',
        ],
      },
      {
        category: 'Álgebra Introdutória (Anos Iniciais)',
        topics: ['Identificação de regularidades e sequências numéricas'],
      },
      {
        category: 'Probabilidade e Estatística (Anos Iniciais)',
        topics: [
          'Leitura e interpretação de tabelas simples e gráficos de barras',
          'Noções de eventos prováveis e improváveis',
        ],
      },
      {
        category: 'Aritmética e Conjuntos Numéricos (Anos Finais)',
        topics: [
          'Números inteiros (positivos, negativos e o zero)',
          'Números racionais (frações, decimais, dízimas periódicas)',
          'Números irracionais e reais',
          'Potenciação e radiciação',
          'Mínimo Múltiplo Comum (MMC) e Máximo Divisor Comum (MDC)',
        ],
      },
      {
        category: 'Álgebra (Anos Finais)',
        topics: [
          'Expressões algébricas e propriedades',
          'Equações e inequações do 1º grau',
          'Sistemas de equações do 1º grau',
          'Razão, proporção e Regra de Três (simples e composta)',
          'Porcentagem e juros simples',
          'Equações do 2º grau (Fórmula de Bhaskara)',
          'Monômios e polinômios (fatoração e produtos notáveis)',
        ],
      },
      {
        category: 'Geometria (Anos Finais)',
        topics: [
          'Ângulos (classificação, complementares, suplementares, opostos pelo vértice)',
          'Triângulos e quadriláteros (propriedades e soma dos ângulos internos)',
          'Polígonos regulares e congruência de figuras',
          'Teorema de Tales',
          'Teorema de Pitágoras',
          'Relações métricas no triângulo retângulo',
          'Áreas de figuras planas (quadrado, retângulo, triângulo, trapézio, losango, círculo)',
          'Volumes de prismas e cilindros',
        ],
      },
      {
        category: 'Probabilidade e Estatística (Anos Finais)',
        topics: [
          'Gráficos de linhas, setores e histogramas',
          'Médias aritméticas (simples e ponderada)',
          'Princípio multiplicativo da contagem',
          'Cálculo de probabilidade simples',
        ],
      },
    ],
    medio: [
      {
        category: 'Conjuntos e Funções',
        topics: [
          'Teoria dos conjuntos (união, interseção, pertinência)',
          'Conceito de função (domínio, contradomínio e imagem)',
          'Função do 1º grau (função afim)',
          'Função do 2º grau (função quadrática)',
          'Função exponencial e equações exponenciais',
          'Função logarítmica e propriedades dos logaritmos',
          'Função modular',
        ],
      },
      {
        category: 'Progressões e Sequências',
        topics: ['Progressão Aritmética (PA)', 'Progressão Geométrica (PG)'],
      },
      {
        category: 'Trigonometria',
        topics: [
          'Razões trigonométricas no triângulo retângulo (seno, cosseno, tangente)',
          'Ciclo trigonométrico e arcos orientados',
          'Funções trigonométricas (seno, cosseno e tangente)',
          'Leis dos Senos e dos Cossenos',
        ],
      },
      {
        category: 'Matrizes, Determinantes e Sistemas Lineares',
        topics: [
          'Operações com matrizes',
          'Determinantes (Regra de Sarrus e Teorema de Laplace)',
          'Resolução e discussão de sistemas lineares (Escalonamento)',
        ],
      },
      {
        category: 'Análise Combinatória e Probabilidade',
        topics: [
          'Princípio Fundamental da Contagem',
          'Arranjos, combinações e permutações (simples e com repetição)',
          'Binômio de Newton e Triângulo de Pascal',
          'Probabilidade condicional e eventos independentes',
        ],
      },
      {
        category: 'Geometria Espacial',
        topics: [
          'Posições relativas de retas e planos no espaço',
          'Prismas, pirâmides, cilindros, cones e esferas (áreas e volumes)',
        ],
      },
      {
        category: 'Geometria Analítica',
        topics: [
          'Coordenadas no plano cartesiano (distância entre dois pontos, ponto médio)',
          'Estudo da reta (equações geral, reduzida e posições relativas)',
          'Estudo da circunferência (equação e posições relativas)',
          'Noções de cônicas (elipse, hipérbole e parábola)',
        ],
      },
      {
        category: 'Estatística e Matemática Financeira',
        topics: [
          'Medidas de tendência central (média, moda e mediana)',
          'Medidas de dispersão (variância e desvio padrão)',
          'Juros compostos e taxas de juros',
        ],
      },
      {
        category: 'Polinômios e Equações Algébricas',
        topics: [
          'Operações com polinômios e divisão algébrica (Método de Briot-Ruffini)',
          'Teorema do Resto e raízes de equações polinomiais',
        ],
      },
      {
        category: 'Números Complexos',
        topics: [
          'Forma algébrica e potências da unidade imaginária (i)',
          'Plano de Argand-Gauss e forma trigonométrica dos complexos',
        ],
      },
    ],
  },
};

/**
 * Retorna o currículo curado (categorias + subtópicos) pra matéria+nível
 * digitados, ou null se não houver currículo curado pra essa combinação —
 * quem chamar deve então cair de volta na sugestão dinâmica da IA.
 */
export function getCuratedCurriculum(subject: string, level: EducationLevel): CurriculumCategory[] | null {
  const s = normalize(subject);
  for (const [key, levels] of Object.entries(CURRICULUM)) {
    if (s.includes(key) || key.includes(s)) {
      return levels[level] || null;
    }
  }
  return null;
}
