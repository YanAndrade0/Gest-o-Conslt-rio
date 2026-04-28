import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { differenceInDays, parseISO } from 'date-fns';
import { AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TrialBanner = () => {
  const { user } = useAuth();

  if (!user || !user.trialEndsAt || user.isClinicActive === undefined) return null;

  const trialEnds = parseISO(user.trialEndsAt);
  const daysRemaining = differenceInDays(trialEnds, new Date());
  
  if (user.isClinicActive && daysRemaining < 0) return null; // Already paid or trial active somehow (logic handled by isClinicActive)
  
  // If trial is over and not active, it's already blocked by PrivateRoute or layout,
  // but if we are in Trialing state we show how many days left.
  
  if (daysRemaining < 0) {
    return (
      <div className="bg-red-600 text-white px-6 py-3 flex items-center justify-between gap-4 z-[60] shadow-lg animate-in slide-in-from-top duration-500">
        <div className="flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0" />
          <p className="text-sm font-bold">Seu período de teste expirou. O sistema está em modo **Apenas Visualização**.</p>
        </div>
        <Link to="/configuracoes" className="bg-white text-red-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-slate-100 transition-colors">
          Regularizar Plano <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-brand-primary text-white px-6 py-3 flex items-center justify-between gap-4 z-[60] shadow-lg animate-in slide-in-from-top duration-500">
      <div className="flex items-center gap-3">
        <Clock size={20} className="shrink-0" />
        <p className="text-sm font-bold">
          Você está no período de teste gratuito. {daysRemaining === 0 ? 'Expira hoje!' : `Restam ${daysRemaining} dias.`}
        </p>
      </div>
      <Link to="/configuracoes" className="bg-white text-brand-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-white/90 transition-colors">
        Escolher meu Plano <ArrowRight size={14} />
      </Link>
    </div>
  );
};
