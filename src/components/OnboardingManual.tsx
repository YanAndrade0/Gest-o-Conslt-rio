import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Stethoscope, 
  Calendar, 
  Users, 
  LayoutDashboard, 
  CreditCard, 
  MessageSquare 
} from 'lucide-react';
import { Button } from './ui/button';
import { clinicService } from '../services/clinicService';
import { toast } from 'sonner';

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  items: string[];
}

const steps: Step[] = [
  {
    title: 'Bem-vindo ao OralCloud',
    description: 'Sua clínica odontológica agora é digital, rápida e inteligente. Vamos conhecer as principais ferramentas para facilitar sua rotina.',
    icon: <BookOpen size={40} />,
    color: 'bg-brand-primary',
    items: [
      'Controle total da sua agenda',
      'Prontuário eletrônico completo',
      'Financeiro integrado',
      'Comunicação automática via WhatsApp'
    ]
  },
  {
    title: 'Painel Geral (Dashboard)',
    description: 'Acompanhe o coração da sua clínica em uma única tela.',
    icon: <LayoutDashboard size={40} />,
    color: 'bg-blue-500',
    items: [
      'Visualização das consultas de hoje',
      'Métricas de faturamento mensal',
      'Quantidade de pacientes ativos',
      'Alertas de estoque e pendências'
    ]
  },
  {
    title: 'Agenda Inteligente',
    description: 'Organize seus horários de forma simples e produtiva.',
    icon: <Calendar size={40} />,
    color: 'bg-green-500',
    items: [
      'Agendamento rápido por arraste ou clique',
      'Status de presença (Confirmado, Aguardando, Em Cadeira)',
      'Filtros por dentista ou unidade',
      'Lembretes automáticos integrados'
    ]
  },
  {
    title: 'Pacientes e Prontuários',
    description: 'A base de dados mais completa para o seu atendimento.',
    icon: <Stethoscope size={40} />,
    color: 'bg-purple-500',
    items: [
      'Cadastro detalhado com foto e anamnese',
      'Odontograma digital interativo',
      'Evolução clínica histórica',
      'Upload de exames e radiografias'
    ]
  },
  {
    title: 'Automatização WhatsApp',
    description: 'Reduza faltas em até 40% com o módulo de lembretes.',
    icon: <MessageSquare size={40} />,
    color: 'bg-emerald-500',
    items: [
      'Envio de lembretes X horas antes da consulta',
      'Mensagens de boas-vindas para novos pacientes',
      'Personalização total dos textos',
      'Relatório de entregas e respostas'
    ]
  },
  {
    title: 'Gestão de Pagamentos',
    description: 'Controle sua receita com transparência absoluta.',
    icon: <CreditCard size={40} />,
    color: 'bg-orange-500',
    items: [
      'Lançamento de receitas por paciente',
      'Controle de formas de pagamento (PIX, Cartão, Dinheiro)',
      'Gestão da sua assinatura OralCloud',
      'Fluxo de caixa simplificado'
    ]
  }
];

export const OnboardingManual = ({ userId, onComplete }: { userId: string, onComplete: () => void }) => {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isFinishing, setIsFinishing] = React.useState(false);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    }
  };

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      await clinicService.updateUserProfile(userId, { hasReadManual: true });
      onComplete();
      toast.success('Manual concluído! Bom trabalho.');
    } catch (error) {
      toast.error('Erro ao salvar progresso.');
    } finally {
      setIsFinishing(false);
    }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[450px]"
      >
        {/* Left Side (Visual) */}
        <div className={`md:w-1/3 ${step.color} p-8 flex flex-col items-center justify-center text-white text-center transition-colors duration-500`}>
          <motion.div
            key={currentStep}
            initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            className="mb-6 p-6 bg-white/20 rounded-full backdrop-blur-sm"
          >
            {step.icon}
          </motion.div>
          <h3 className="text-xl font-black uppercase tracking-tight leading-tight">
            Etapa {currentStep + 1} de {steps.length}
          </h3>
          <div className="flex gap-1 mt-4">
            {steps.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === currentStep ? 'w-6 bg-white' : 'w-2 bg-white/30'}`} />
            ))}
          </div>
        </div>

        {/* Right Side (Content) */}
        <div className="md:w-2/3 p-8 md:p-12 flex flex-col justify-between">
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">{step.title}</h2>
                <p className="text-slate-500 font-medium leading-relaxed">{step.description}</p>
                
                <ul className="grid grid-cols-1 gap-3 pt-4">
                  {step.items.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-slate-700 font-bold bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <CheckCircle2 size={18} className="text-brand-primary shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between mt-12 gap-4">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="font-bold text-slate-400 disabled:opacity-0"
            >
              <ChevronLeft size={18} className="mr-2" /> Voltar
            </Button>

            {currentStep === steps.length - 1 ? (
              <Button
                onClick={handleFinish}
                disabled={isFinishing}
                className="bg-brand-primary text-white px-8 h-14 rounded-2xl font-black text-lg shadow-xl shadow-brand-primary/20 hover:scale-[1.05] transition-all"
              >
                {isFinishing ? 'Salvando...' : 'Confirmar Leitura'}
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                className="bg-slate-900 text-white px-8 h-14 rounded-2xl font-black text-lg shadow-xl shadow-slate-900/10 hover:scale-[1.05] transition-all group"
              >
                Próximo <ChevronRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
