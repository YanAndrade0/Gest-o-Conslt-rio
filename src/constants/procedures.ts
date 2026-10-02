export interface ProcedureDefinition {
  id: string;
  name: string;
  description: string;
  defaultDuration: number; // minutos recomendados
  colorHex: string;
  cardBg: string;
  cardBorder: string;
  cardLeftBorder: string;
  cardText: string;
  badgeBg: string;
  badgeText: string;
  dotBg: string;
  chipActive: string;
  chipInactive: string;
}

export const PREDEFINED_PROCEDURES: ProcedureDefinition[] = [
  {
    id: 'canal',
    name: 'Canal',
    description: 'Tratamento endodôntico / polpa dentária',
    defaultDuration: 60,
    colorHex: '#8B5CF6',
    cardBg: 'bg-purple-50/95 hover:bg-purple-100/90',
    cardBorder: 'border-purple-200',
    cardLeftBorder: 'border-l-purple-500',
    cardText: 'text-purple-950',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    dotBg: 'bg-purple-500',
    chipActive: 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-400',
    chipInactive: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/80',
  },
  {
    id: 'profilaxia',
    name: 'Profilaxia',
    description: 'Limpeza, remoção de tártaro e polimento coronário',
    defaultDuration: 30,
    colorHex: '#0D9488',
    cardBg: 'bg-teal-50/95 hover:bg-teal-100/90',
    cardBorder: 'border-teal-200',
    cardLeftBorder: 'border-l-teal-500',
    cardText: 'text-teal-950',
    badgeBg: 'bg-teal-100',
    badgeText: 'text-teal-800',
    dotBg: 'bg-teal-500',
    chipActive: 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-400',
    chipInactive: 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200/80',
  },
  {
    id: 'restauracao',
    name: 'Restauração',
    description: 'Dentística restauradora em resina ou ionômero',
    defaultDuration: 45,
    colorHex: '#0284C7',
    cardBg: 'bg-sky-50/95 hover:bg-sky-100/90',
    cardBorder: 'border-sky-200',
    cardLeftBorder: 'border-l-sky-500',
    cardText: 'text-sky-950',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-800',
    dotBg: 'bg-sky-500',
    chipActive: 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-400',
    chipInactive: 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200/80',
  },
  {
    id: 'protese',
    name: 'Prótese',
    description: 'Prótese fixa, removível, provisória ou sobre implante',
    defaultDuration: 45,
    colorHex: '#F59E0B',
    cardBg: 'bg-amber-50/95 hover:bg-amber-100/90',
    cardBorder: 'border-amber-200',
    cardLeftBorder: 'border-l-amber-500',
    cardText: 'text-amber-950',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    dotBg: 'bg-amber-500',
    chipActive: 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400',
    chipInactive: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/80',
  },
  {
    id: 'moldagem',
    name: 'Moldagem',
    description: 'Moldagem de estudo, trabalho ou escaneamento intraoral',
    defaultDuration: 30,
    colorHex: '#EC4899',
    cardBg: 'bg-pink-50/95 hover:bg-pink-100/90',
    cardBorder: 'border-pink-200',
    cardLeftBorder: 'border-l-pink-500',
    cardText: 'text-pink-950',
    badgeBg: 'bg-pink-100',
    badgeText: 'text-pink-800',
    dotBg: 'bg-pink-500',
    chipActive: 'bg-pink-600 text-white shadow-sm ring-2 ring-pink-400',
    chipInactive: 'bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200/80',
  },
  {
    id: 'avaliacao',
    name: 'Avaliação',
    description: 'Consulta inicial, diagnóstico e plano de tratamento',
    defaultDuration: 30,
    colorHex: '#10B981',
    cardBg: 'bg-emerald-50/95 hover:bg-emerald-100/90',
    cardBorder: 'border-emerald-200',
    cardLeftBorder: 'border-l-emerald-500',
    cardText: 'text-emerald-950',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    dotBg: 'bg-emerald-500',
    chipActive: 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400',
    chipInactive: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80',
  },
  {
    id: 'exodontia',
    name: 'Exodontia',
    description: 'Cirurgia de extração dentária simples ou complexa',
    defaultDuration: 45,
    colorHex: '#EF4444',
    cardBg: 'bg-rose-50/95 hover:bg-rose-100/90',
    cardBorder: 'border-rose-200',
    cardLeftBorder: 'border-l-rose-500',
    cardText: 'text-rose-950',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800',
    dotBg: 'bg-rose-500',
    chipActive: 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400',
    chipInactive: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80',
  },
  {
    id: 'implante',
    name: 'Implante',
    description: 'Cirurgia ou reabertura de implante odontológico',
    defaultDuration: 60,
    colorHex: '#6366F1',
    cardBg: 'bg-indigo-50/95 hover:bg-indigo-100/90',
    cardBorder: 'border-indigo-200',
    cardLeftBorder: 'border-l-indigo-500',
    cardText: 'text-indigo-950',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800',
    dotBg: 'bg-indigo-500',
    chipActive: 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400',
    chipInactive: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80',
  },
];

const DEFAULT_PROCEDURE_FALLBACK: ProcedureDefinition = {
  id: 'outro',
  name: 'Outro',
  description: 'Outro procedimento clínico',
  defaultDuration: 30,
  colorHex: '#64748B',
  cardBg: 'bg-slate-50/95 hover:bg-slate-100/90',
  cardBorder: 'border-slate-200',
  cardLeftBorder: 'border-l-slate-400',
  cardText: 'text-slate-900',
  badgeBg: 'bg-slate-100',
  badgeText: 'text-slate-700',
  dotBg: 'bg-slate-400',
  chipActive: 'bg-slate-600 text-white shadow-sm ring-2 ring-slate-400',
  chipInactive: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200',
};

/**
 * Normaliza e busca a configuração de cores e estilo do procedimento
 */
export function getProcedureConfig(procedureName?: string): ProcedureDefinition {
  if (!procedureName) return DEFAULT_PROCEDURE_FALLBACK;

  const normalized = procedureName.trim().toLowerCase();

  // Match exato
  const exact = PREDEFINED_PROCEDURES.find(
    (p) => p.name.toLowerCase() === normalized || p.id === normalized
  );
  if (exact) return exact;

  // Match por inclusão (ex: "Canal Molar", "Restauração Estética", "Avaliação Inicial")
  const partial = PREDEFINED_PROCEDURES.find((p) =>
    normalized.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(normalized)
  );
  if (partial) return partial;

  // Se não encontrar, retorna fallback mantendo o nome fornecido
  return {
    ...DEFAULT_PROCEDURE_FALLBACK,
    name: procedureName,
  };
}
