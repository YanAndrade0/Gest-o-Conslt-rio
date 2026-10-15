import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, 
  Save, 
  CheckCircle, 
  Clock, 
  Send, 
  Trash2, 
  Printer, 
  Plus, 
  CreditCard, 
  DollarSign, 
  Calendar, 
  User, 
  Stethoscope, 
  FileText, 
  RotateCcw,
  Sparkles,
  HelpCircle,
  Percent,
  Layers
} from 'lucide-react';
import { Budget, BudgetItem, BudgetStatus } from '../../types/budget';
import { budgetService } from '../../services/budgetService';
import { BudgetOdontogram, TOOTH_NAMES } from './BudgetOdontogram';
import { ProcedureSearchPanel } from './ProcedureSearchPanel';
import { Patient } from '../../services/patientService';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BudgetEditorProps {
  patient: Patient;
  initialBudget?: Budget | null;
  onSaveSuccess: (budgetId: string) => void;
  onCancel: () => void;
}

const STATUS_OPTIONS: { id: BudgetStatus; label: string; bg: string; text: string }[] = [
  { id: 'pendente', label: 'Pendente', bg: 'bg-amber-100', text: 'text-amber-800' },
  { id: 'aprovado', label: 'Aprovado', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  { id: 'em_andamento', label: 'Em Andamento', bg: 'bg-blue-100', text: 'text-blue-800' },
  { id: 'concluido', label: 'Concluído', bg: 'bg-purple-100', text: 'text-purple-800' },
  { id: 'recusado', label: 'Recusado', bg: 'bg-rose-100', text: 'text-rose-800' },
];

export function BudgetEditor({
  patient,
  initialBudget,
  onSaveSuccess,
  onCancel,
}: BudgetEditorProps) {
  const { user } = useAuth();
  const clinicId = user?.clinicId || patient.clinicId || '';

  // Estados principais do orçamento
  const [title, setTitle] = useState(
    initialBudget?.title || `Orçamento - ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`
  );
  const [status, setStatus] = useState<BudgetStatus>(initialBudget?.status || 'pendente');
  const [dentistName, setDentistName] = useState(
    initialBudget?.dentistName || user?.displayName || 'Dr(a). Dentista'
  );
  const [items, setItems] = useState<BudgetItem[]>(initialBudget?.items || []);
  const [discountPercent, setDiscountPercent] = useState<number>(initialBudget?.discountPercent || 0);
  const [discountAmount, setDiscountAmount] = useState<number>(initialBudget?.discountAmount || 0);
  const [paymentConditions, setPaymentConditions] = useState(
    initialBudget?.paymentConditions || 'À vista com 5% de desconto ou até 6x no cartão de crédito.'
  );
  const [notes, setNotes] = useState(initialBudget?.notes || '');
  const [validUntil, setValidUntil] = useState(
    initialBudget?.validUntil || format(addDays(new Date(), 30), 'yyyy-MM-dd')
  );

  // Estado do Odontograma: qual dente está selecionado para abrir a busca lateral de procedimentos
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Cálculos financeiros automáticos
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.total, 0);
  }, [items]);

  const calculatedDiscount = useMemo(() => {
    if (discountPercent > 0) {
      return (subtotal * discountPercent) / 100;
    }
    return discountAmount;
  }, [subtotal, discountPercent, discountAmount]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - calculatedDiscount);
  }, [subtotal, calculatedDiscount]);

  // Itens vinculados ao dente atualmente selecionado
  const currentToothItems = useMemo(() => {
    if (selectedTooth === null) return [];
    return items.filter(item => item.toothNumber === (selectedTooth === -1 ? null : selectedTooth));
  }, [items, selectedTooth]);

  const handleAddItem = (newItem: BudgetItem) => {
    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
    toast.info('Item removido do orçamento.');
  };

  const handleApplyDiscountPercent = (percent: number) => {
    setDiscountPercent(percent);
    setDiscountAmount(0);
  };

  const handleApplyDiscountAmount = (amount: number) => {
    setDiscountAmount(amount);
    setDiscountPercent(0);
  };

  const handleSaveBudget = async () => {
    if (!clinicId) {
      toast.error('Erro de identificação da clínica.');
      return;
    }
    if (items.length === 0) {
      toast.error('Adicione ao menos um procedimento ao orçamento pelo odontograma.');
      return;
    }

    setSaving(true);
    try {
      const budgetPayload: Budget = {
        id: initialBudget?.id,
        clinicId,
        patientId: patient.id!,
        patientName: patient.name,
        patientPhone: patient.phone,
        dentistName,
        dentistId: user?.uid,
        title: title.trim() || 'Orçamento Odontológico',
        status,
        items,
        subtotal,
        discountAmount: calculatedDiscount,
        discountPercent,
        total,
        paymentConditions: paymentConditions.trim(),
        validUntil,
        notes: notes.trim(),
        createdAt: initialBudget?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const savedId = await budgetService.saveBudget(budgetPayload, clinicId);
      toast.success(initialBudget?.id ? 'Orçamento atualizado com sucesso!' : 'Orçamento salvo com sucesso!');
      onSaveSuccess(savedId);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar orçamento. Verifique sua conexão.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!patient.phone) {
      toast.error('O paciente não possui telefone cadastrado.');
      return;
    }

    const cleanPhone = patient.phone.replace(/\D/g, '');
    const phoneWithDDI = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

    const itemsSummary = items.map((item, idx) => {
      const toothStr = item.toothNumber ? `Dente ${item.toothNumber}` : 'Geral';
      return `${idx + 1}. *${toothStr}*: ${item.procedureName} - R$ ${item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }).join('\n');

    const msg = `Olá, *${patient.name}*! Segue a proposta de seu plano de tratamento:\n\n` +
      `📋 *${title}*\n` +
      `🦷 *Procedimentos Planejados:*\n${itemsSummary}\n\n` +
      `💰 *Subtotal:* R$ ${subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      (calculatedDiscount > 0 ? `🎁 *Desconto:* R$ ${calculatedDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` : '') +
      `💳 *Valor Total:* R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `🗓️ *Formas de Pagamento:* ${paymentConditions}\n\n` +
      `Ficamos à disposição para agendar o início do seu tratamento! ✨\n` +
      `_${dentistName} - OralCloud_`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?phone=${phoneWithDDI}&text=${encoded}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Barra Superior de Ações */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="rounded-xl h-10 w-10 hover:bg-slate-100"
            title="Voltar"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary bg-brand-light px-2.5 py-0.5 rounded-lg">
                {initialBudget?.id ? 'Editando Orçamento' : 'Novo Orçamento'}
              </span>
              <span className="text-xs font-bold text-slate-400">
                Paciente: <strong className="text-slate-700">{patient.name}</strong>
              </span>
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base sm:text-lg font-black text-slate-800 border-none p-0 h-auto bg-transparent focus-visible:ring-0 mt-0.5"
              placeholder="Título do orçamento..."
            />
          </div>
        </div>

        {/* Ações: Status, WhatsApp, Salvar */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Seletor de Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as BudgetStatus)}
            className={cn(
              "h-10 px-3 rounded-xl text-xs font-black uppercase tracking-wider border cursor-pointer transition-all",
              status === 'aprovado' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
              status === 'pendente' ? 'bg-amber-50 text-amber-800 border-amber-300' :
              status === 'em_andamento' ? 'bg-blue-50 text-blue-800 border-blue-300' :
              status === 'concluido' ? 'bg-purple-50 text-purple-800 border-purple-300' :
              'bg-rose-50 text-rose-800 border-rose-300'
            )}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>
                ● {opt.label}
              </option>
            ))}
          </select>

          {/* Enviar WhatsApp */}
          <Button
            type="button"
            variant="outline"
            onClick={handleSendWhatsApp}
            disabled={items.length === 0}
            className="h-10 rounded-xl text-xs font-bold gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            title="Enviar proposta detalhada pelo WhatsApp"
          >
            <Send size={14} /> WhatsApp
          </Button>

          {/* Imprimir */}
          <Button
            type="button"
            variant="ghost"
            onClick={handlePrint}
            className="h-10 rounded-xl text-xs font-bold gap-1.5 text-slate-500 hover:bg-slate-100 hidden sm:flex"
            title="Imprimir orçamento"
          >
            <Printer size={16} /> Imprimir
          </Button>

          {/* Salvar Orçamento */}
          <Button
            type="button"
            onClick={handleSaveBudget}
            disabled={saving || items.length === 0}
            className="h-10 bg-brand-primary text-white rounded-xl font-black text-xs px-5 shadow-lg shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-1.5"
          >
            {saving ? <RotateCcw size={16} className="animate-spin" /> : <Save size={16} />}
            SALVAR ORÇAMENTO
          </Button>
        </div>
      </div>

      {/* Grid Principal: Odontograma Interativo + Painel Lateral de Procedimentos */}
      <div className="relative flex flex-col lg:flex-row items-stretch gap-6">
        {/* Odontograma Interativo */}
        <div className="flex-1 min-w-0">
          <BudgetOdontogram 
            selectedTooth={selectedTooth}
            onSelectTooth={(tooth) => setSelectedTooth(tooth)}
            items={items}
          />
        </div>

        {/* Painel Lateral / Barra de Busca de Procedimentos com Valores Tabelados */}
        {selectedTooth !== null && (
          <div className="lg:w-96 shrink-0">
            <ProcedureSearchPanel 
              selectedTooth={selectedTooth}
              onClose={() => setSelectedTooth(null)}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
              currentToothItems={currentToothItems}
            />
          </div>
        )}
      </div>

      {/* Lista Detalhada de Procedimentos Orçados */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-brand-primary" />
            <h4 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">
              Procedimentos Inclusos no Orçamento ({items.length})
            </h4>
          </div>

          <span className="text-xs font-bold text-slate-400">
            Clique em qualquer dente no mapa acima para adicionar mais
          </span>
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <div className="w-12 h-12 bg-brand-light text-brand-primary rounded-2xl flex items-center justify-center mx-auto">
              <Sparkles size={24} />
            </div>
            <p className="text-sm font-bold text-slate-600">Nenhum procedimento adicionado ainda.</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Selecione um dente no odontograma interativo acima para abrir a barra de pesquisa com os procedimentos e valores tabelados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pl-2">Dente / Local</th>
                  <th className="pb-3">Procedimento</th>
                  <th className="pb-3">Categoria</th>
                  <th className="pb-3 text-right">Valor Unit.</th>
                  <th className="pb-3 text-center">Qtd</th>
                  <th className="pb-3 text-right">Desc.</th>
                  <th className="pb-3 text-right pr-2">Total</th>
                  <th className="pb-3 text-center w-12">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {items.map((item) => (
                  <tr 
                    key={item.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => setSelectedTooth(item.toothNumber === null ? -1 : item.toothNumber)}
                  >
                    {/* Dente */}
                    <td className="py-3 pl-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center shadow-2xs shrink-0",
                          item.toothNumber 
                            ? "bg-brand-primary text-white" 
                            : "bg-slate-100 text-slate-600"
                        )}>
                          {item.toothNumber || 'GERAL'}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 hidden sm:inline truncate max-w-[150px]">
                          {item.toothNumber ? TOOTH_NAMES[item.toothNumber] : 'Boca Toda'}
                        </span>
                      </div>
                    </td>

                    {/* Procedimento */}
                    <td className="py-3">
                      <div>
                        <p className="font-bold text-slate-800 text-xs">{item.procedureName}</p>
                        {item.faces && item.faces.length > 0 && (
                          <span className="text-[10px] font-bold text-brand-primary bg-brand-light px-1.5 py-0.2 rounded">
                            Faces: {item.faces.join('')}
                          </span>
                        )}
                        {item.notes && (
                          <p className="text-[10px] text-slate-400 italic">{item.notes}</p>
                        )}
                      </div>
                    </td>

                    {/* Categoria */}
                    <td className="py-3">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        {item.category}
                      </span>
                    </td>

                    {/* Valor Unitário */}
                    <td className="py-3 text-right font-bold">
                      R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Quantidade */}
                    <td className="py-3 text-center font-bold">
                      {item.quantity}
                    </td>

                    {/* Desconto */}
                    <td className="py-3 text-right text-rose-500 font-bold">
                      {item.discount > 0 ? `- R$ ${item.discount.toFixed(2)}` : '-'}
                    </td>

                    {/* Total do Item */}
                    <td className="py-3 text-right pr-2 font-black text-slate-900 text-sm">
                      R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Excluir */}
                    <td className="py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors mx-auto"
                        title="Remover do orçamento"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Painel Financeiro e Condições de Pagamento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Observações e Condições de Pagamento */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h4 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
            <CreditCard size={18} className="text-brand-primary" />
            Condições Comerciais e Observações
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Condições de Pagamento Propostas
              </Label>
              <textarea
                value={paymentConditions}
                onChange={(e) => setPaymentConditions(e.target.value)}
                placeholder="Ex: Entrada de 30% + até 6x no cartão de crédito sem juros..."
                rows={3}
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium resize-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              />
            </div>

            <div>
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Observações Clínicas / Recomendações
              </Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Tratamento sujeito à resposta periodontal; radiografias necessárias antes da cirurgia..."
                rows={3}
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium resize-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Dentista Responsável
              </Label>
              <Input
                value={dentistName}
                onChange={(e) => setDentistName(e.target.value)}
                placeholder="Nome do dentista"
                className="h-10 bg-slate-50 text-xs font-bold"
              />
            </div>

            <div>
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Validade da Proposta
              </Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="h-10 bg-slate-50 text-xs font-bold"
              />
            </div>
          </div>
        </div>

        {/* Resumo dos Valores e Total Final */}
        <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary block">
              Resumo Financeiro
            </span>
            <h4 className="text-xl font-black mt-1">Totalização do Tratamento</h4>
          </div>

          <div className="space-y-3 divide-y divide-slate-800 text-xs">
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-400">Subtotal dos Procedimentos:</span>
              <span className="font-bold text-slate-200 text-sm">
                R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Desconto */}
            <div className="space-y-2 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1">
                  <Percent size={12} className="text-rose-400" /> Desconto Comercial:
                </span>
                <span className="font-bold text-rose-400 text-sm">
                  - R$ {calculatedDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Botões rápidos de desconto */}
              <div className="flex gap-1.5 pt-1">
                {[0, 5, 10, 15].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleApplyDiscountPercent(pct)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-black transition-all",
                      discountPercent === pct && calculatedDiscount > 0
                        ? "bg-rose-500 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    )}
                  >
                    {pct === 0 ? 'Sem desc.' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Final */}
            <div className="flex justify-between items-baseline pt-4">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                  Valor Final
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {items.length} procedimento(s)
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                  R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Botão de Salvar no Resumo */}
          <Button
            type="button"
            onClick={handleSaveBudget}
            disabled={saving || items.length === 0}
            className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all gap-2"
          >
            {saving ? <RotateCcw size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            SALVAR ORÇAMENTO
          </Button>
        </div>
      </div>
    </div>
  );
}
