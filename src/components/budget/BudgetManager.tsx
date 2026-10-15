import React, { useState, useEffect } from 'react';
import { Budget } from '../../types/budget';
import { budgetService } from '../../services/budgetService';
import { Patient, patientService } from '../../services/patientService';
import { useAuth } from '../../contexts/AuthContext';
import { BudgetList } from './BudgetList';
import { BudgetEditor } from './BudgetEditor';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { 
  FileText, 
  Plus, 
  RotateCcw, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  User,
  Search,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface BudgetManagerProps {
  patient?: Patient;
}

export function BudgetManager({ patient: initialPatient }: BudgetManagerProps) {
  const { user } = useAuth();
  const clinicId = user?.clinicId || initialPatient?.clinicId || '';

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Se estiver na visão geral (sem paciente fixado), permite selecionar o paciente
  const [activePatient, setActivePatient] = useState<Patient | undefined>(initialPatient);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectingPatientModal, setSelectingPatientModal] = useState(false);

  useEffect(() => {
    setActivePatient(initialPatient);
  }, [initialPatient]);

  // Carrega pacientes se estiver na visão geral da clínica
  useEffect(() => {
    if (!initialPatient && clinicId) {
      const unsub = patientService.subscribeToPatients(clinicId, (patients) => {
        setAllPatients(patients);
      });
      return () => unsub();
    }
  }, [clinicId, initialPatient]);

  // Escuta os orçamentos em tempo real
  useEffect(() => {
    if (!clinicId) return;
    setLoading(true);

    let unsub: () => void;
    if (initialPatient?.id) {
      // Orçamentos específicos deste paciente
      unsub = budgetService.subscribeToPatientBudgets(
        initialPatient.id,
        clinicId,
        (data) => {
          setBudgets(data);
          setLoading(false);
        },
        () => setLoading(false)
      );
    } else {
      // Todos os orçamentos da clínica
      unsub = budgetService.subscribeToClinicBudgets(
        clinicId,
        (data) => {
          setBudgets(data);
          setLoading(false);
        },
        () => setLoading(false)
      );
    }

    return () => {
      if (unsub) unsub();
    };
  }, [clinicId, initialPatient]);

  // Métricas para a tela geral de orçamentos
  const metrics = React.useMemo(() => {
    const totalAmount = budgets.reduce((acc, b) => acc + (b.total || 0), 0);
    const approvedAmount = budgets.filter(b => b.status === 'aprovado').reduce((acc, b) => acc + (b.total || 0), 0);
    const pendingCount = budgets.filter(b => b.status === 'pendente').length;
    const approvedCount = budgets.filter(b => b.status === 'aprovado').length;
    return { totalAmount, approvedAmount, pendingCount, approvedCount };
  }, [budgets]);

  const handleStartNewBudget = () => {
    if (activePatient) {
      setSelectedBudget(null);
      setIsCreating(true);
    } else {
      // Abre modal para escolher o paciente
      setSelectingPatientModal(true);
    }
  };

  const handlePatientSelected = (p: Patient) => {
    setActivePatient(p);
    setSelectingPatientModal(false);
    setSelectedBudget(null);
    setIsCreating(true);
  };

  const handleSaveSuccess = (budgetId: string) => {
    setIsCreating(false);
    setSelectedBudget(null);
    if (!initialPatient) {
      setActivePatient(undefined);
    }
  };

  const handleCancelEditor = () => {
    setIsCreating(false);
    setSelectedBudget(null);
    if (!initialPatient) {
      setActivePatient(undefined);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="animate-spin w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Carregando Orçamentos...
        </p>
      </div>
    );
  }

  // Se estiver editando ou criando, exibe o BudgetEditor completo com odontograma interativo
  if (isCreating || selectedBudget) {
    const targetPatient = activePatient || allPatients.find(p => p.id === selectedBudget?.patientId);
    if (!targetPatient) {
      return (
        <div className="p-8 text-center space-y-4">
          <p className="text-sm font-bold text-red-500">Paciente do orçamento não localizado.</p>
          <Button onClick={handleCancelEditor} variant="outline" className="rounded-xl">
            Voltar
          </Button>
        </div>
      );
    }

    return (
      <BudgetEditor
        patient={targetPatient}
        initialBudget={selectedBudget}
        onSaveSuccess={handleSaveSuccess}
        onCancel={handleCancelEditor}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Se estiver na visão geral da clínica (sem paciente específico), exibe Métricas de Orçamento */}
      {!initialPatient && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Total Orçado</span>
              <DollarSign size={18} className="text-brand-primary" />
            </div>
            <p className="text-2xl font-black text-slate-800">
              R$ {metrics.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] font-bold text-slate-400">{budgets.length} orçamentos gerados</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Aprovados</span>
              <CheckCircle2 size={18} className="text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-600">
              R$ {metrics.approvedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] font-bold text-emerald-600/80">{metrics.approvedCount} orçamentos aprovados</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Em Negociação</span>
              <Clock size={18} className="text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-600">
              {metrics.pendingCount}
            </p>
            <p className="text-[10px] font-bold text-amber-600/80">Aguardando resposta do paciente</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Taxa de Conversão</span>
              <TrendingUp size={18} className="text-blue-500" />
            </div>
            <p className="text-2xl font-black text-slate-800">
              {budgets.length > 0 ? `${Math.round((metrics.approvedCount / budgets.length) * 100)}%` : '0%'}
            </p>
            <p className="text-[10px] font-bold text-slate-400">Conversão de propostas clínicas</p>
          </div>
        </div>
      )}

      {/* Lista de Orçamentos */}
      <BudgetList
        budgets={budgets}
        patient={initialPatient}
        onSelectBudget={(b) => {
          setSelectedBudget(b);
          if (!initialPatient) {
            const p = allPatients.find(item => item.id === b.patientId);
            setActivePatient(p);
          }
        }}
        onNewBudget={handleStartNewBudget}
        clinicId={clinicId}
      />

      {/* Modal para Selecionar Paciente ao criar Orçamento pelo Menu Geral */}
      {selectingPatientModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Novo Orçamento</span>
                <h4 className="text-base font-black text-slate-800">Selecione o Paciente</h4>
              </div>
              <button 
                onClick={() => setSelectingPatientModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar paciente por nome ou CPF..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="pl-9 h-10 text-xs font-bold"
                autoFocus
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 no-scrollbar pr-1">
              {allPatients
                .filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase()) || (p.cpf && p.cpf.includes(patientSearch)))
                .map(p => (
                  <div
                    key={p.id}
                    onClick={() => handlePatientSelected(p)}
                    className="p-3 rounded-2xl border border-slate-100 hover:border-brand-primary/40 hover:bg-brand-light/10 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">{p.name}</p>
                      <p className="text-[10px] text-slate-400">{p.cpf || 'Sem CPF'} • {p.phone || 'Sem tel.'}</p>
                    </div>
                    <span className="text-[10px] font-black text-brand-primary uppercase tracking-wider">
                      Selecionar
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
