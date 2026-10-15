export type BudgetStatus = 'pendente' | 'aprovado' | 'em_andamento' | 'concluido' | 'recusado';

export interface PredefinedProcedure {
  id: string;
  name: string;
  category: 'Dentística' | 'Endodontia' | 'Cirurgia' | 'Prótese' | 'Implante' | 'Periodontia' | 'Ortodontia' | 'Prevenção' | 'Estética' | 'Geral';
  defaultPrice: number; // Em reais (R$)
  description: string;
  defaultDuration?: number; // Em minutos
}

export interface BudgetItem {
  id: string;
  toothNumber: number | null; // null significa "Boca toda / Procedimento Geral"
  toothLabel?: string; // ex: "Dente 16 (Primeiro Molar Superior Direito)" ou "Boca toda"
  procedureId: string;
  procedureName: string;
  category: string;
  unitPrice: number;
  quantity: number;
  discount: number; // Desconto em R$
  total: number;
  notes?: string;
  faces?: ('M' | 'D' | 'V' | 'L' | 'O' | 'I')[]; // Mesial, Distal, Vestibular, Lingual/Palatina, Oclusal/Incisal
}

export interface Budget {
  id?: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  dentistId?: string;
  dentistName?: string;
  title: string;
  status: BudgetStatus;
  items: BudgetItem[];
  subtotal: number;
  discountAmount: number; // Desconto global
  discountPercent: number; // Desconto em %
  total: number;
  paymentConditions?: string; // ex: "À vista com 5% de desconto ou até 6x de R$ 350 no cartão"
  validUntil?: string; // Data de validade da proposta
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Catálogo padrão de procedimentos odontológicos com valores pré-estabelecidos
 */
export const DEFAULT_PROCEDURE_PRICING: PredefinedProcedure[] = [
  // Prevenção e Diagnóstico
  {
    id: 'proc_avaliacao',
    name: 'Avaliação Clínica Inicial / Diagnóstico',
    category: 'Prevenção',
    defaultPrice: 120.00,
    description: 'Exame clínico minucioso, anamnese e planejamento',
    defaultDuration: 30,
  },
  {
    id: 'proc_profilaxia',
    name: 'Profilaxia Completa com Ultrassom e Jato',
    category: 'Prevenção',
    defaultPrice: 180.00,
    description: 'Remoção de cálculo supra-gengival, polimento e aplicação tópica de flúor',
    defaultDuration: 45,
  },
  {
    id: 'proc_fluor',
    name: 'Aplicação Tópica de Flúor Gel / Verniz',
    category: 'Prevenção',
    defaultPrice: 90.00,
    description: 'Dessensibilização e remineralização dental preventiva',
    defaultDuration: 20,
  },
  {
    id: 'proc_selante',
    name: 'Selante de Fóssulas e Fissuras',
    category: 'Prevenção',
    defaultPrice: 110.00,
    description: 'Proteção preventiva contra cáries oclusais por dente',
    defaultDuration: 30,
  },

  // Dentística / Restaurações
  {
    id: 'proc_rest_1face',
    name: 'Restauração em Resina Composta (1 Face)',
    category: 'Dentística',
    defaultPrice: 170.00,
    description: 'Restauração estética direta em resina nanoparticulada (Oclusal ou Vestibular)',
    defaultDuration: 45,
  },
  {
    id: 'proc_rest_2faces',
    name: 'Restauração em Resina Composta (2 Faces)',
    category: 'Dentística',
    defaultPrice: 220.00,
    description: 'Restauração de cavidade interproximal (ex: MO ou DO)',
    defaultDuration: 60,
  },
  {
    id: 'proc_rest_3faces',
    name: 'Restauração em Resina Composta (3 Faces / Complexa)',
    category: 'Dentística',
    defaultPrice: 280.00,
    description: 'Restauração profunda ou MOD com reconstrução de cúspide',
    defaultDuration: 60,
  },
  {
    id: 'proc_rest_ionomero',
    name: 'Restauração com Ionômero de Vidro',
    category: 'Dentística',
    defaultPrice: 140.00,
    description: 'Material bioativo liberador de flúor para dentes decíduos ou cervicais',
    defaultDuration: 40,
  },

  // Endodontia / Canal
  {
    id: 'proc_canal_uni',
    name: 'Tratamento Endodôntico Unirradicular',
    category: 'Endodontia',
    defaultPrice: 580.00,
    description: 'Canal em dentes anteriores (incisivos e caninos)',
    defaultDuration: 60,
  },
  {
    id: 'proc_canal_bi',
    name: 'Tratamento Endodôntico Birradicular',
    category: 'Endodontia',
    defaultPrice: 750.00,
    description: 'Tratamento de pré-molares com duas raízes/condutos',
    defaultDuration: 90,
  },
  {
    id: 'proc_canal_molar',
    name: 'Tratamento Endodôntico Molar (Multirradicular)',
    category: 'Endodontia',
    defaultPrice: 980.00,
    description: 'Tratamento de molares com 3 ou 4 condutos com instrumentação rotatória',
    defaultDuration: 90,
  },
  {
    id: 'proc_retrat_canal',
    name: 'Retratamento de Canal',
    category: 'Endodontia',
    defaultPrice: 1150.00,
    description: 'Desobturação, desinfecção e nova obturação de canal já tratado',
    defaultDuration: 90,
  },
  {
    id: 'proc_curativo_demerg',
    name: 'Curativo de Demora / Urgência Endodôntica',
    category: 'Endodontia',
    defaultPrice: 190.00,
    description: 'Abertura coronária, alívio da dor e medicação intracanal',
    defaultDuration: 45,
  },

  // Cirurgia / Exodontia
  {
    id: 'proc_exo_simples',
    name: 'Exodontia Simples',
    category: 'Cirurgia',
    defaultPrice: 210.00,
    description: 'Extração de dente permanente erupcionado ou raiz residual',
    defaultDuration: 45,
  },
  {
    id: 'proc_exo_siso',
    name: 'Exodontia de Terceiro Molar (Siso Incluso/Semi-incluso)',
    category: 'Cirurgia',
    defaultPrice: 480.00,
    description: 'Extração cirúrgica de dente do siso com ostectomia e odontosecção',
    defaultDuration: 60,
  },
  {
    id: 'proc_frenectomia',
    name: 'Frenectomia Labial ou Lingual',
    category: 'Cirurgia',
    defaultPrice: 380.00,
    description: 'Remoção ou reposicionamento cirúrgico do freio labial ou lingual',
    defaultDuration: 45,
  },
  {
    id: 'proc_apicectomia',
    name: 'Cirurgia Parendodôntica / Apicectomia',
    category: 'Cirurgia',
    defaultPrice: 650.00,
    description: 'Curetagem e ressecção do ápice radicular com retro-obturação',
    defaultDuration: 60,
  },

  // Prótese e Reabilitação
  {
    id: 'proc_coroa_ceromero',
    name: 'Coroa Provisória em Resina Acrílica',
    category: 'Prótese',
    defaultPrice: 220.00,
    description: 'Coroa provisória adaptada para proteção biológica e estética',
    defaultDuration: 45,
  },
  {
    id: 'proc_coroa_zirconia',
    name: 'Coroa Cerâmica Pura (E-max ou Zircônia)',
    category: 'Prótese',
    defaultPrice: 1650.00,
    description: 'Coroa definitiva de alta estética livre de metal (metal-free)',
    defaultDuration: 60,
  },
  {
    id: 'proc_pino_fibra',
    name: 'Pino de Fibra de Vidro e Núcleo',
    category: 'Prótese',
    defaultPrice: 380.00,
    description: 'Retentor intrarradicular estético para dentes tratados endodonticamente',
    defaultDuration: 45,
  },
  {
    id: 'proc_protese_total',
    name: 'Prótese Total Convencional (Dentadura)',
    category: 'Prótese',
    defaultPrice: 2200.00,
    description: 'Reabilitação total mucossuportada superior ou inferior com dentes de resina premium',
    defaultDuration: 60,
  },
  {
    id: 'proc_ppr',
    name: 'Prótese Parcial Removível (Roach / PPR)',
    category: 'Prótese',
    defaultPrice: 1850.00,
    description: 'Prótese metálica com grampos e apoios oclusais',
    defaultDuration: 60,
  },

  // Implantodontia
  {
    id: 'proc_implante_unitario',
    name: 'Implante Dentário em Titânio (Cirurgia)',
    category: 'Implante',
    defaultPrice: 2400.00,
    description: 'Instalação cirúrgica de implante osseointegrável cone morse',
    defaultDuration: 60,
  },
  {
    id: 'proc_enxerto_osseo',
    name: 'Enxerto Ósseo em Bloco / Particulado',
    category: 'Implante',
    defaultPrice: 1400.00,
    description: 'Reconstrução de rebordo alveolar com biomaterial e membrana',
    defaultDuration: 60,
  },
  {
    id: 'proc_coroa_implante',
    name: 'Coroa Definitiva Sobre Implante (Zircônia)',
    category: 'Implante',
    defaultPrice: 1900.00,
    description: 'Coroa parafusada sobre componente protético (intermediário)',
    defaultDuration: 60,
  },

  // Periodontia
  {
    id: 'proc_raspagem_sextante',
    name: 'Raspagem e Aplainamento Radicular (por Sextante)',
    category: 'Periodontia',
    defaultPrice: 160.00,
    description: 'Tratamento periodontal subgengival com curetas de Gracey e ultrassom',
    defaultDuration: 40,
  },
  {
    id: 'proc_gengivoplastia',
    name: 'Gengivoplastia / Aumento de Coroa Clínica (por dente)',
    category: 'Periodontia',
    defaultPrice: 320.00,
    description: 'Remodelação gengival cirúrgica para harmonia do sorriso',
    defaultDuration: 45,
  },

  // Estética
  {
    id: 'proc_clareamento_laser',
    name: 'Clareamento Dental em Consultório (Sessão)',
    category: 'Estética',
    defaultPrice: 480.00,
    description: 'Clareamento fotoativado com gel de peróxido de hidrogênio 35%',
    defaultDuration: 60,
  },
  {
    id: 'proc_clareamento_caseiro',
    name: 'Clareamento Dental Supervisionado Caseiro (Kit)',
    category: 'Estética',
    defaultPrice: 650.00,
    description: 'Par de moldeiras de silicone personalizadas + 4 bisnagas de peróxido de carbamida',
    defaultDuration: 30,
  },
  {
    id: 'proc_faceta_resina',
    name: 'Faceta Direta em Resina Estratificada',
    category: 'Estética',
    defaultPrice: 550.00,
    description: 'Facetamento estético em dente anterior com resinas de esmalte e dentina',
    defaultDuration: 75,
  },
  {
    id: 'proc_lente_contato',
    name: 'Lente de Contato Dental / Faceta em Porcelana',
    category: 'Estética',
    defaultPrice: 1750.00,
    description: 'Lâmina cerâmica ultrafina de dissilicato de lítio (E-max)',
    defaultDuration: 60,
  },

  // Ortodontia e Placas
  {
    id: 'proc_placa_bruxismo',
    name: 'Placa Miorrelaxante de Bruxismo (Acrílico)',
    category: 'Geral',
    defaultPrice: 680.00,
    description: 'Placa rígida ajustada em articulador para alívio de DTM e proteção dos dentes',
    defaultDuration: 45,
  },
  {
    id: 'proc_manutencao_orto',
    name: 'Manutenção Ortodôntica Mensal',
    category: 'Ortodontia',
    defaultPrice: 180.00,
    description: 'Troca de arcos, elásticos e ativação do aparelho ortodôntico',
    defaultDuration: 30,
  },
  {
    id: 'proc_aparelho_instalacao',
    name: 'Instalação de Aparelho Fixo Metálico',
    category: 'Ortodontia',
    defaultPrice: 500.00,
    description: 'Colagem de bráquetes, tubos molares e inserção do arco inicial',
    defaultDuration: 60,
  },
];
