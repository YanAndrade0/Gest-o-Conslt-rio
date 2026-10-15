import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  X, 
  DollarSign, 
  Check, 
  Clock, 
  Layers, 
  ChevronRight,
  Edit3,
  Percent
} from 'lucide-react';
import { BudgetItem, DEFAULT_PROCEDURE_PRICING, PredefinedProcedure } from '../../types/budget';
import { TOOTH_NAMES } from './BudgetOdontogram';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface ProcedureSearchPanelProps {
  selectedTooth: number | null;
  onClose: () => void;
  onAddItem: (item: BudgetItem) => void;
  onRemoveItem: (itemId: string) => void;
  currentToothItems: BudgetItem[];
}

export function ProcedureSearchPanel({
  selectedTooth,
  onClose,
  onAddItem,
  onRemoveItem,
  currentToothItems,
}: ProcedureSearchPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [customPriceModal, setCustomPriceModal] = useState<PredefinedProcedure | null>(null);
  
  // Estados para edição/personalização antes de adicionar
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [discount, setDiscount] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [selectedFaces, setSelectedFaces] = useState<('M' | 'D' | 'V' | 'L' | 'O' | 'I')[]>([]);

  // Procedimento personalizado livre
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customProcName, setCustomProcName] = useState('');
  const [customProcPrice, setCustomProcPrice] = useState('');

  // Controle para exibir catálogo completo apenas sob demanda
  const [showAllCatalog, setShowAllCatalog] = useState(false);

  const isSearching = searchTerm.trim().length > 0;

  // Filtragem dos procedimentos pelo termo de busca
  const filteredProcedures = useMemo(() => {
    if (!searchTerm.trim()) {
      return showAllCatalog ? DEFAULT_PROCEDURE_PRICING : [];
    }

    const term = searchTerm.toLowerCase().trim();
    return DEFAULT_PROCEDURE_PRICING.filter(proc => {
      return (
        proc.name.toLowerCase().includes(term) ||
        proc.description.toLowerCase().includes(term)
      );
    });
  }, [searchTerm, showAllCatalog]);

  const toothLabel = useMemo(() => {
    if (selectedTooth === null || selectedTooth === -1) {
      return 'Procedimento Geral (Boca Toda)';
    }
    return `Dente ${selectedTooth} - ${TOOTH_NAMES[selectedTooth] || ''}`;
  }, [selectedTooth]);

  const handleQuickAdd = (proc: PredefinedProcedure) => {
    const newItem: BudgetItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      toothNumber: selectedTooth === -1 ? null : selectedTooth,
      toothLabel,
      procedureId: proc.id,
      procedureName: proc.name,
      category: proc.category,
      unitPrice: proc.defaultPrice,
      quantity: 1,
      discount: 0,
      total: proc.defaultPrice,
    };

    onAddItem(newItem);
    toast.success(`"${proc.name}" adicionado ao orçamento!`);
  };

  const handleOpenCustomize = (proc: PredefinedProcedure) => {
    setCustomPriceModal(proc);
    setUnitPrice(proc.defaultPrice.toString());
    setQuantity(1);
    setDiscount('0');
    setNotes('');
    setSelectedFaces([]);
  };

  const handleConfirmCustomize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPriceModal) return;

    const price = parseFloat(unitPrice) || customPriceModal.defaultPrice;
    const qty = quantity > 0 ? quantity : 1;
    const disc = parseFloat(discount) || 0;
    const total = Math.max(0, (price * qty) - disc);

    const newItem: BudgetItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      toothNumber: selectedTooth === -1 ? null : selectedTooth,
      toothLabel,
      procedureId: customPriceModal.id,
      procedureName: customPriceModal.name,
      category: customPriceModal.category,
      unitPrice: price,
      quantity: qty,
      discount: disc,
      total,
      notes: notes.trim() || undefined,
      faces: selectedFaces.length > 0 ? selectedFaces : undefined,
    };

    onAddItem(newItem);
    setCustomPriceModal(null);
    toast.success(`"${customPriceModal.name}" adicionado ao orçamento!`);
  };

  const handleAddCustomFreeProcedure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customProcName.trim()) {
      toast.error('Informe o nome do procedimento.');
      return;
    }
    const price = parseFloat(customProcPrice) || 0;
    if (price <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }

    const newItem: BudgetItem = {
      id: `item_custom_${Date.now()}`,
      toothNumber: selectedTooth === -1 ? null : selectedTooth,
      toothLabel,
      procedureId: `custom_${Date.now()}`,
      procedureName: customProcName.trim(),
      category: 'Geral',
      unitPrice: price,
      quantity: 1,
      discount: 0,
      total: price,
    };

    onAddItem(newItem);
    setIsAddingCustom(false);
    setCustomProcName('');
    setCustomProcPrice('');
    toast.success(`Procedimento personalizado adicionado!`);
  };

  const toggleFace = (face: 'M' | 'D' | 'V' | 'L' | 'O' | 'I') => {
    if (selectedFaces.includes(face)) {
      setSelectedFaces(selectedFaces.filter(f => f !== face));
    } else {
      setSelectedFaces([...selectedFaces, face]);
    }
  };

  return (
    <aside className="w-full lg:w-96 bg-white border-l border-slate-200/80 flex flex-col h-full shadow-2xl z-30 animate-in slide-in-from-right duration-300">
      {/* Header do Painel Lateral */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">
              Vincular Procedimento
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-black text-slate-800 truncate mt-0.5" title={toothLabel}>
            {selectedTooth === -1 ? 'Boca Toda / Geral' : `Dente ${selectedTooth}`}
          </h3>
          <p className="text-[11px] text-slate-400 truncate">
            {selectedTooth !== -1 && selectedTooth !== null ? TOOTH_NAMES[selectedTooth] : 'Sem dente específico'}
          </p>
        </div>

        <button 
          onClick={onClose}
          type="button"
          className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          title="Fechar painel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Itens já vinculados a este dente */}
      {currentToothItems.length > 0 && (
        <div className="p-3 bg-emerald-50/80 border-b border-emerald-100 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <Check size={12} className="text-emerald-600" />
              Neste dente ({currentToothItems.length})
            </span>
            <span className="text-xs font-black text-emerald-800">
              R$ {currentToothItems.reduce((acc, c) => acc + c.total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1 no-scrollbar">
            {currentToothItems.map(item => (
              <div 
                key={item.id}
                className="bg-white p-2 rounded-xl border border-emerald-200/80 flex items-center justify-between gap-2 shadow-2xs"
              >
                <div className="overflow-hidden flex-1">
                  <p className="text-xs font-bold text-slate-800 truncate">{item.procedureName}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    {item.quantity > 1 ? `${item.quantity}x ` : ''}R$ {item.total.toFixed(2)}
                    {item.faces && item.faces.length > 0 && ` • Faces: ${item.faces.join('')}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  title="Remover este procedimento do dente"
                  className="text-slate-300 hover:text-red-500 p-1 transition-colors rounded-lg"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barra de Pesquisa de Procedimentos com valores pré-estabelecidos */}
      <div className="p-3 sm:p-4 border-b border-slate-100 shrink-0">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar procedimento (ex: Restauração, Canal...)"
            className="pl-10 pr-9 h-11 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold focus-visible:ring-brand-primary"
            autoFocus
          />
          {searchTerm && (
            <button 
              type="button" 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo: Lista de Procedimentos */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 no-scrollbar">
        {/* Caso padrão: Sem busca ativa */}
        {!isSearching && !showAllCatalog ? (
          <div className="py-12 px-4 text-center space-y-3 animate-in fade-in duration-200">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <Search size={22} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-700">Pesquisar Procedimento</h4>
              <p className="text-[11px] text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                Digite o nome do procedimento na barra de busca acima para vincular a este dente.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAllCatalog(true)}
                className="text-[11px] font-bold text-slate-400 hover:text-brand-primary transition-colors cursor-pointer"
              >
                Ver todos os procedimentos ({DEFAULT_PROCEDURE_PRICING.length})
              </button>
            </div>
          </div>
        ) : (
          /* Quando estiver pesquisando ou expandido: exibe os procedimentos filtrados */
          <div className="space-y-2.5">
            {/* Header de status do filtro */}
            <div className="flex items-center justify-between pb-1 text-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {isSearching ? `Resultados para "${searchTerm}"` : 'Todos os Procedimentos'} ({filteredProcedures.length})
              </span>
              {(isSearching || showAllCatalog) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setShowAllCatalog(false);
                  }}
                  className="text-[10px] font-bold text-brand-primary hover:underline cursor-pointer"
                >
                  Limpar busca
                </button>
              )}
            </div>

            {filteredProcedures.length === 0 ? (
              <div className="py-10 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-400">Nenhum procedimento encontrado.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setIsAddingCustom(true); setCustomProcName(searchTerm); }}
                  className="rounded-xl text-xs font-bold border-brand-primary/30 text-brand-primary"
                >
                  <Plus size={14} className="mr-1" /> Criar procedimento personalizado
                </Button>
              </div>
            ) : (
              filteredProcedures.map(proc => (
                <div 
                  key={proc.id}
                  className="p-3 rounded-2xl border border-slate-200/80 bg-white hover:border-brand-primary/40 hover:bg-brand-light/10 transition-all group flex flex-col justify-between gap-2 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      {proc.defaultDuration && (
                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5 mb-1">
                          <Clock size={10} /> {proc.defaultDuration}m
                        </span>
                      )}
                      <h4 className="text-xs font-bold text-slate-800 leading-snug">
                        {proc.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {proc.description}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs sm:text-sm font-black text-slate-800 block">
                        R$ {proc.defaultPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                        Valor tabelado
                      </span>
                    </div>
                  </div>

                  {/* Botões de Ação para o procedimento */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-50">
                    <button
                      type="button"
                      onClick={() => handleQuickAdd(proc)}
                      className="flex-1 h-8 rounded-xl bg-brand-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-brand-primary/90 shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <Plus size={14} /> Adicionar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenCustomize(proc)}
                      title="Personalizar valor, desconto ou faces"
                      className="h-8 px-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Edit3 size={12} /> Ajustar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Botão para adicionar procedimento fora da tabela */}
        {!isAddingCustom && (
          <button
            type="button"
            onClick={() => setIsAddingCustom(true)}
            className="w-full py-3 rounded-2xl border border-dashed border-slate-300 text-slate-500 hover:border-brand-primary hover:text-brand-primary text-xs font-bold flex items-center justify-center gap-1.5 transition-all mt-4"
          >
            <Plus size={14} /> Outro procedimento personalizado
          </button>
        )}

        {/* Formulário de procedimento personalizado livre */}
        {isAddingCustom && (
          <form onSubmit={handleAddCustomFreeProcedure} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800">Procedimento Customizado</span>
              <button 
                type="button" 
                onClick={() => setIsAddingCustom(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                Cancelar
              </button>
            </div>

            <Input 
              placeholder="Nome do procedimento"
              value={customProcName}
              onChange={(e) => setCustomProcName(e.target.value)}
              className="h-9 bg-white text-xs font-bold"
              required
            />

            <div>
              <Input 
                type="number"
                step="0.01"
                placeholder="Valor (R$)"
                value={customProcPrice}
                onChange={(e) => setCustomProcPrice(e.target.value)}
                className="h-9 bg-white text-xs font-bold"
                required
              />
            </div>

            <Button type="submit" size="sm" className="w-full bg-brand-primary text-white rounded-xl text-xs font-bold h-9">
              Adicionar ao Orçamento
            </Button>
          </form>
        )}
      </div>

      {/* Modal / Painel de Ajuste de Valor do Procedimento */}
      {customPriceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-sm space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">
                  Ajuste de Procedimento
                </span>
                <h4 className="text-sm font-black text-slate-800 mt-0.5">
                  {customPriceModal.name}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {toothLabel}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setCustomPriceModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmCustomize} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Valor Unit. (R$)
                  </label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="h-10 text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Quantidade
                  </label>
                  <Input 
                    type="number"
                    min="1"
                    max="32"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="h-10 text-xs font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                  Desconto neste item (R$)
                </label>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="h-10 text-xs font-bold"
                  placeholder="0.00"
                />
              </div>

              {/* Seleção de Faces (para restaurações / dentes) */}
              {selectedTooth !== null && selectedTooth !== -1 && (
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Faces Dentárias (Opcional)
                  </label>
                  <div className="flex gap-1.5">
                    {(['M', 'D', 'V', 'L', 'O', 'I'] as const).map(face => (
                      <button
                        key={face}
                        type="button"
                        onClick={() => toggleFace(face)}
                        className={cn(
                          "w-8 h-8 rounded-lg text-xs font-black transition-all",
                          selectedFaces.includes(face)
                            ? "bg-brand-primary text-white shadow-2xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                        title={
                          face === 'M' ? 'Mesial' :
                          face === 'D' ? 'Distal' :
                          face === 'V' ? 'Vestibular' :
                          face === 'L' ? 'Lingual/Palatina' :
                          face === 'O' ? 'Oclusal' : 'Incisal'
                        }
                      >
                        {face}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                  Observação Técnica (Opcional)
                </label>
                <Input 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Resina composta cor A2, pinos..."
                  className="h-10 text-xs"
                />
              </div>

              {/* Total prévio */}
              <div className="bg-slate-50 p-2.5 rounded-xl flex items-center justify-between text-xs font-black">
                <span className="text-slate-500">Total do Item:</span>
                <span className="text-brand-primary text-sm">
                  R$ {Math.max(0, ((parseFloat(unitPrice) || 0) * quantity) - (parseFloat(discount) || 0)).toFixed(2)}
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCustomPriceModal(null)}
                  className="flex-1 rounded-xl h-10 text-xs font-bold"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-brand-primary text-white rounded-xl h-10 text-xs font-bold"
                >
                  Confirmar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
