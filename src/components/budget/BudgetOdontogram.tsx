import React, { useState } from 'react';
import { BudgetItem } from '../../types/budget';
import { cn } from '../../lib/utils';
import { Layers, Sparkles, Smile, Check, Info } from 'lucide-react';
import { Button } from '../ui/button';

export const TOOTH_NAMES: Record<number, string> = {
  18: '3º Molar Sup. Dir. (Siso)',
  17: '2º Molar Sup. Dir.',
  16: '1º Molar Sup. Dir.',
  15: '2º Pré-Molar Sup. Dir.',
  14: '1º Pré-Molar Sup. Dir.',
  13: 'Canino Sup. Dir.',
  12: 'Inc. Lateral Sup. Dir.',
  11: 'Inc. Central Sup. Dir.',
  21: 'Inc. Central Sup. Esq.',
  22: 'Inc. Lateral Sup. Esq.',
  23: 'Canino Sup. Esq.',
  24: '1º Pré-Molar Sup. Esq.',
  25: '2º Pré-Molar Sup. Esq.',
  26: '1º Molar Sup. Esq.',
  27: '2º Molar Sup. Esq.',
  28: '3º Molar Sup. Esq. (Siso)',
  
  48: '3º Molar Inf. Dir. (Siso)',
  47: '2º Molar Inf. Dir.',
  46: '1º Molar Inf. Dir.',
  45: '2º Pré-Molar Inf. Dir.',
  44: '1º Pré-Molar Inf. Dir.',
  43: 'Canino Inf. Dir.',
  42: 'Inc. Lateral Inf. Dir.',
  41: 'Inc. Central Inf. Dir.',
  31: 'Inc. Central Inf. Esq.',
  32: 'Inc. Lateral Inf. Esq.',
  33: 'Canino Inf. Esq.',
  34: '1º Pré-Molar Inf. Esq.',
  35: '2º Pré-Molar Inf. Esq.',
  36: '1º Molar Inf. Esq.',
  37: '2º Molar Inf. Esq.',
  38: '3º Molar Inf. Esq. (Siso)',

  // Dentes Decíduos (Infantis)
  55: '2º Molar Decíduo Sup. Dir.',
  54: '1º Molar Decíduo Sup. Dir.',
  53: 'Canino Decíduo Sup. Dir.',
  52: 'Inc. Lat. Decíduo Sup. Dir.',
  51: 'Inc. Cen. Decíduo Sup. Dir.',
  61: 'Inc. Cen. Decíduo Sup. Esq.',
  62: 'Inc. Lat. Decíduo Sup. Esq.',
  63: 'Canino Decíduo Sup. Esq.',
  64: '1º Molar Decíduo Sup. Esq.',
  65: '2º Molar Decíduo Sup. Esq.',
  85: '2º Molar Decíduo Inf. Dir.',
  84: '1º Molar Decíduo Inf. Dir.',
  83: 'Canino Decíduo Inf. Dir.',
  82: 'Inc. Lat. Decíduo Inf. Dir.',
  81: 'Inc. Cen. Decíduo Inf. Dir.',
  71: 'Inc. Cen. Decíduo Inf. Esq.',
  72: 'Inc. Lat. Decíduo Inf. Esq.',
  73: 'Canino Decíduo Inf. Esq.',
  74: '1º Molar Decíduo Inf. Esq.',
  75: '2º Molar Decíduo Inf. Esq.',
};

const ADULT_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const ADULT_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const ADULT_LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
const ADULT_LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];

const DECIDUOUS_UPPER_RIGHT = [55, 54, 53, 52, 51];
const DECIDUOUS_UPPER_LEFT = [61, 62, 63, 64, 65];
const DECIDUOUS_LOWER_RIGHT = [85, 84, 83, 82, 81];
const DECIDUOUS_LOWER_LEFT = [71, 72, 73, 74, 75];

interface BudgetOdontogramProps {
  selectedTooth: number | null;
  onSelectTooth: (toothNumber: number | null) => void;
  items: BudgetItem[];
}

export function BudgetOdontogram({
  selectedTooth,
  onSelectTooth,
  items,
}: BudgetOdontogramProps) {
  const [showDeciduous, setShowDeciduous] = useState(false);

  // Mapeia itens por dente
  const itemsByTooth = React.useMemo(() => {
    const map = new Map<number | null, BudgetItem[]>();
    items.forEach((item) => {
      const current = map.get(item.toothNumber) || [];
      current.push(item);
      map.set(item.toothNumber, current);
    });
    return map;
  }, [items]);

  const generalItems = itemsByTooth.get(null) || [];

  const renderToothButton = (num: number) => {
    const toothItems = itemsByTooth.get(num) || [];
    const hasItems = toothItems.length > 0;
    const isSelected = selectedTooth === num;
    const totalTooth = toothItems.reduce((acc, curr) => acc + curr.total, 0);

    return (
      <button
        key={num}
        type="button"
        onClick={() => onSelectTooth(isSelected ? null : num)}
        title={`${num} - ${TOOTH_NAMES[num] || 'Dente'}${hasItems ? ` (${toothItems.length} procedimento(s) - R$ ${totalTooth.toFixed(2)})` : ''}`}
        className={cn(
          "relative flex flex-col items-center justify-between transition-all select-none rounded-xl cursor-pointer group active:scale-95",
          // Tamanho responsivo:
          "w-9 h-14 sm:w-11 sm:h-16 md:w-12 md:h-18 p-1 sm:p-1.5",
          isSelected 
            ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/30 ring-4 ring-brand-primary/20 scale-105 z-20 border-2 border-brand-primary" 
            : hasItems
              ? "bg-emerald-50/90 border-2 border-emerald-400 text-emerald-950 hover:bg-emerald-100/80 shadow-xs"
              : "bg-white border border-slate-200/90 text-slate-700 hover:border-brand-primary/40 hover:bg-slate-50 shadow-2xs"
        )}
      >
        {/* Número do dente */}
        <span className={cn(
          "text-[10px] sm:text-xs font-black tracking-tight",
          isSelected ? "text-white" : hasItems ? "text-emerald-700" : "text-slate-600"
        )}>
          {num}
        </span>

        {/* Ícone estilizado do dente */}
        <div className="flex-1 flex items-center justify-center my-0.5">
          <div className={cn(
            "w-5 h-6 sm:w-6 sm:h-7 rounded-t-md rounded-b-lg border flex items-center justify-center transition-colors relative",
            isSelected 
              ? "border-white/40 bg-white/20 text-white" 
              : hasItems
                ? "border-emerald-300 bg-emerald-100/70 text-emerald-700"
                : "border-slate-200 bg-slate-50/80 text-slate-400 group-hover:border-slate-300"
          )}>
            {/* Sulco / representação de cúspides */}
            <div className={cn(
              "w-2.5 h-1 rounded-full",
              isSelected ? "bg-white/60" : hasItems ? "bg-emerald-400/80" : "bg-slate-300"
            )} />

            {/* Badge indicador de procedimentos adicionados */}
            {hasItems && (
              <span className={cn(
                "absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full text-[8px] font-black flex items-center justify-center shadow-xs border",
                isSelected
                  ? "bg-white text-brand-primary border-white"
                  : "bg-emerald-500 text-white border-white"
              )}>
                {toothItems.length}
              </span>
            )}
          </div>
        </div>

        {/* Informação do valor do dente */}
        {hasItems ? (
          <span className={cn(
            "text-[7px] sm:text-[8px] font-black truncate max-w-full leading-tight",
            isSelected ? "text-white/90" : "text-emerald-700"
          )}>
            R${Math.round(totalTooth)}
          </span>
        ) : (
          <span className={cn(
            "text-[7px] font-semibold uppercase tracking-wider opacity-40",
            isSelected ? "text-white" : "text-slate-400"
          )}>
            {num <= 28 ? 'Sup' : 'Inf'}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-6">
      {/* Top Controls: Trocar entre Adulto / Decíduo + Botão de Boca Toda */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-brand-primary" />
            <h4 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">
              Odontograma Interativo
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            Clique no dente desejado para abrir a busca de procedimentos e valores
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Botão para procedimentos gerais / boca toda */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSelectTooth(selectedTooth === null ? -1 : null)}
            className={cn(
              "h-9 px-3 rounded-xl font-bold text-xs gap-1.5 border transition-all flex-1 sm:flex-none",
              selectedTooth === null && generalItems.length > 0
                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                : selectedTooth === null
                  ? "bg-brand-light border-brand-primary/30 text-brand-primary"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            <Layers size={14} />
            <span>Geral / Boca Toda</span>
            {generalItems.length > 0 && (
              <span className="bg-emerald-500 text-white text-[9px] font-black rounded-full px-1.5 py-0.2">
                {generalItems.length}
              </span>
            )}
          </Button>

          {/* Toggle Dentição Adulta vs Decídua */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowDeciduous(!showDeciduous)}
            className="h-9 px-3 rounded-xl font-bold text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          >
            <Smile size={14} className="mr-1 text-slate-400" />
            {showDeciduous ? 'Dentição Adulta' : 'Dentição Infantil'}
          </Button>
        </div>
      </div>

      {/* Banner / Dente selecionado atualmente */}
      {selectedTooth !== null ? (
        <div className="bg-brand-light/60 border border-brand-primary/20 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center font-black text-sm shadow-sm shadow-brand-primary/30">
              {selectedTooth === -1 ? 'ALL' : selectedTooth}
            </div>
            <div>
              <p className="text-xs font-black text-slate-800">
                {selectedTooth === -1 
                  ? 'Procedimento Geral (Boca toda / Clínico)' 
                  : `Dente ${selectedTooth}: ${TOOTH_NAMES[selectedTooth] || ''}`}
              </p>
              <p className="text-[11px] text-brand-primary font-bold">
                Painel lateral aberto: pesquise e clique no procedimento para adicionar ao orçamento
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSelectTooth(null)}
            className="text-[11px] font-bold text-slate-400 hover:text-slate-600 h-8 rounded-lg"
          >
            Desmarcar
          </Button>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl p-3 flex items-center gap-2.5 text-slate-500 text-xs">
          <Info size={16} className="text-brand-primary shrink-0" />
          <span>Nenhum dente selecionado no momento. Clique sobre qualquer dente abaixo para vincular procedimentos.</span>
        </div>
      )}

      {/* Arcada Superior */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Arcada Superior (Maxila)
          </span>
          <span className="text-[10px] font-bold text-slate-400">
            {showDeciduous ? 'Dentes Decíduos (55 a 65)' : 'Dentes Permanentes (18 a 28)'}
          </span>
        </div>

        <div className="bg-slate-50/70 p-3 sm:p-4 rounded-2xl border border-slate-100 flex flex-col items-center overflow-x-auto no-scrollbar">
          <div className="flex items-center justify-center gap-1 sm:gap-2 min-w-max">
            {/* Lado Direito do Paciente */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {(showDeciduous ? DECIDUOUS_UPPER_RIGHT : ADULT_UPPER_RIGHT).map(renderToothButton)}
            </div>

            {/* Divisor Central / Linha Média */}
            <div className="h-12 sm:h-14 w-0.5 bg-slate-300 mx-1 sm:mx-2 rounded-full" title="Linha Média Facial" />

            {/* Lado Esquerdo do Paciente */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {(showDeciduous ? DECIDUOUS_UPPER_LEFT : ADULT_UPPER_LEFT).map(renderToothButton)}
            </div>
          </div>
        </div>
      </div>

      {/* Arcada Inferior */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Arcada Inferior (Mandíbula)
          </span>
          <span className="text-[10px] font-bold text-slate-400">
            {showDeciduous ? 'Dentes Decíduos (85 a 75)' : 'Dentes Permanentes (48 a 38)'}
          </span>
        </div>

        <div className="bg-slate-50/70 p-3 sm:p-4 rounded-2xl border border-slate-100 flex flex-col items-center overflow-x-auto no-scrollbar">
          <div className="flex items-center justify-center gap-1 sm:gap-2 min-w-max">
            {/* Lado Direito do Paciente */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {(showDeciduous ? DECIDUOUS_LOWER_RIGHT : ADULT_LOWER_RIGHT).map(renderToothButton)}
            </div>

            {/* Divisor Central / Linha Média */}
            <div className="h-12 sm:h-14 w-0.5 bg-slate-300 mx-1 sm:mx-2 rounded-full" title="Linha Média Facial" />

            {/* Lado Esquerdo do Paciente */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {(showDeciduous ? DECIDUOUS_LOWER_LEFT : ADULT_LOWER_LEFT).map(renderToothButton)}
            </div>
          </div>
        </div>
      </div>

      {/* Legenda rápida */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-[11px] font-bold text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-md bg-white border border-slate-200" />
          <span>Sem procedimento</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-md bg-emerald-50 border-2 border-emerald-400" />
          <span className="text-emerald-700">Com procedimento no orçamento</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-md bg-brand-primary" />
          <span className="text-brand-primary">Dente selecionado</span>
        </div>
      </div>
    </div>
  );
}
