import React, { useState } from 'react';
import { 
  Plus, 
  Calendar, 
  Search, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  Clock, 
  Send, 
  FileText, 
  ChevronRight,
  User,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { Budget, BudgetStatus } from '../../types/budget';
import { budgetService } from '../../services/budgetService';
import { Patient } from '../../services/patientService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BudgetListProps {
  budgets: Budget[];
  patient?: Patient;
  onSelectBudget: (budget: Budget) => void;
  onNewBudget: () => void;
  clinicId: string;
}

export function BudgetList({
  budgets,
  patient,
  onSelectBudget,
  onNewBudget,
  clinicId,
}: BudgetListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtros
  const filteredBudgets = budgets.filter((b) => {
    const matchesSearch = 
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.items?.some(i => i.procedureName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = 
      selectedStatus === 'todos' || b.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const handleDeleteBudget = async () => {
    if (!budgetToDelete?.id) return;
    setIsDeleting(true);
    try {
      await budgetService.deleteBudget(budgetToDelete.id, clinicId, budgetToDelete.patientId);
      toast.success('Orçamento excluído.');
      setBudgetToDelete(null);
    } catch (error) {
      toast.error('Erro ao excluir orçamento.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickStatusChange = async (budget: Budget, newStatus: BudgetStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!budget.id) return;
    try {
      await budgetService.updateBudgetStatus(budget.id, newStatus, clinicId);
      toast.success(`Status alterado para "${newStatus}"!`);
    } catch (error) {
      toast.error('Erro ao atualizar status.');
    }
  };

  const formatDateSafely = (dateStr?: string) => {
    if (!dateStr) return '--';
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header com Busca e Botão de Novo Orçamento */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por título, paciente ou procedimento..."
            className="pl-10 h-11 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold"
          />
        </div>

        {/* Filtros de Status */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'pendente', label: 'Pendentes' },
            { id: 'aprovado', label: 'Aprovados' },
            { id: 'em_andamento', label: 'Em Andamento' },
            { id: 'concluido', label: 'Concluídos' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer",
                selectedStatus === tab.id
                  ? "bg-brand-primary text-white shadow-2xs"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Botão Novo Orçamento */}
        <Button
          onClick={onNewBudget}
          className="h-11 bg-brand-primary text-white rounded-xl font-black text-xs px-5 shadow-lg shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-2 shrink-0"
        >
          <Plus size={18} /> NOVO ORÇAMENTO
        </Button>
      </div>

      {/* Lista de Orçamentos */}
      {filteredBudgets.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center space-y-4 border border-dashed border-slate-200">
          <div className="w-16 h-16 bg-brand-light text-brand-primary rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <FileText size={32} />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-black text-slate-800">Nenhum orçamento encontrado</h3>
            <p className="text-xs text-slate-400">
              {patient 
                ? `Crie um plano de tratamento personalizado para ${patient.name} usando o odontograma interativo.`
                : 'Crie um novo orçamento vinculando dentes e procedimentos tabelados.'}
            </p>
          </div>
          <Button
            onClick={onNewBudget}
            className="bg-brand-primary text-white rounded-2xl h-11 px-6 font-black text-xs shadow-md shadow-brand-primary/20"
          >
            <Plus size={16} className="mr-1.5" /> CRIAR PRIMEIRO ORÇAMENTO
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBudgets.map((b) => {
            const teethSet = Array.from(new Set(b.items?.map(i => i.toothNumber).filter(Boolean)));
            const isApproved = b.status === 'aprovado';

            return (
              <div
                key={b.id}
                onClick={() => onSelectBudget(b)}
                className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:border-brand-primary/40 hover:shadow-md transition-all flex flex-col justify-between gap-4 cursor-pointer group"
              >
                {/* Header do Card */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                      b.status === 'aprovado' ? 'bg-emerald-100 text-emerald-800' :
                      b.status === 'pendente' ? 'bg-amber-100 text-amber-800' :
                      b.status === 'em_andamento' ? 'bg-blue-100 text-blue-800' :
                      b.status === 'concluido' ? 'bg-purple-100 text-purple-800' :
                      'bg-rose-100 text-rose-800'
                    )}>
                      ● {b.status}
                    </span>

                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Clock size={11} /> {formatDateSafely(b.createdAt)}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-slate-800 group-hover:text-brand-primary transition-colors leading-snug">
                      {b.title}
                    </h4>
                    {!patient && (
                      <p className="text-xs font-bold text-slate-500 mt-0.5 flex items-center gap-1">
                        <User size={12} className="text-brand-primary" /> {b.patientName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Dentes e Procedimentos Resumo */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  {/* Procedimentos contagem */}
                  <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
                    <span>Procedimentos:</span>
                    <span className="text-slate-800 font-black">{b.items?.length || 0} item(ns)</span>
                  </div>

                  {/* Dentes envolvidos */}
                  {teethSet.length > 0 && (
                    <div className="flex items-center gap-1 overflow-hidden">
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">Dentes:</span>
                      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                        {teethSet.slice(0, 6).map(t => (
                          <span key={t} className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 text-[9px] font-black flex items-center justify-center shrink-0">
                            {t}
                          </span>
                        ))}
                        {teethSet.length > 6 && (
                          <span className="text-[9px] font-bold text-slate-400">+{teethSet.length - 6}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Condições de pagamento breves */}
                  {b.paymentConditions && (
                    <p className="text-[10px] text-slate-400 line-clamp-1 italic">
                      {b.paymentConditions}
                    </p>
                  )}
                </div>

                {/* Valor Total e Ações Rápidas */}
                <div className="pt-3 border-t border-slate-100 flex items-end justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                      Valor Total
                    </span>
                    <span className="text-lg font-black text-emerald-600">
                      R$ {b.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {/* Botão rápido para aprovar se estiver pendente */}
                    {b.status === 'pendente' && (
                      <button
                        type="button"
                        onClick={(e) => handleQuickStatusChange(b, 'aprovado', e)}
                        title="Aprovar orçamento"
                        className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        <CheckCircle size={15} />
                      </button>
                    )}

                    {/* Excluir */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setBudgetToDelete(b); }}
                      title="Excluir orçamento"
                      className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>

                    {/* Abrir / Editar */}
                    <button
                      type="button"
                      onClick={() => onSelectBudget(b)}
                      title="Abrir no Odontograma e editar"
                      className="p-2 rounded-xl bg-brand-light text-brand-primary hover:bg-brand-primary hover:text-white transition-all font-bold flex items-center gap-1 text-xs"
                    >
                      <Edit3 size={14} />
                      <span className="text-[10px] hidden sm:inline">Editar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {budgetToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-black text-slate-800">Excluir Orçamento?</h4>
              <p className="text-xs text-slate-400">
                Tem certeza que deseja excluir "{budgetToDelete.title}"? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setBudgetToDelete(null)}
                className="flex-1 rounded-xl h-11 text-xs font-bold"
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDeleteBudget}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 text-xs font-bold"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
