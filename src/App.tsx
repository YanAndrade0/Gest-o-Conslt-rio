import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { db } from './lib/firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import { Logo } from './components/ui/Logo';
import { Toaster } from './components/ui/sonner';
import { WhatsAppSettings } from './components/settings/WhatsAppSettings';
import { PatientManagement } from './components/patients/PatientManagement';
import { AppointmentAgenda } from './components/appointments/AppointmentAgenda';
import { ClinicOnboarding } from './components/auth/ClinicOnboarding';
import { OnboardingManual } from './components/OnboardingManual';
import { TrialBanner } from './components/TrialBanner';
import { Legal } from './components/Legal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { medicalRecordService } from './services/medicalRecordService';
import { patientService } from './services/patientService';
import { toast } from 'sonner';
import { Mail, Lock, User as UserIcon, CreditCard, PlusCircle, Menu, X as CloseIcon, Eye, EyeOff, Calendar, Settings as SettingsIcon, Shield, LogOut } from 'lucide-react';
import { isToday, startOfMonth, parseISO } from 'date-fns';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import { cn } from './lib/utils';

// Components
const EmailVerificationScreen = () => {
  const { user, logout, refreshProfile, resendEmailVerification } = useAuth();
  const [checking, setChecking] = React.useState(false);
  const [resending, setResending] = React.useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    try {
      await refreshProfile(user?.uid || '');
    } catch (error) {
      toast.error('Erro ao verificar status.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendEmailVerification();
      toast.success('E-mail de verificação reenviado!');
    } catch (error) {
      toast.error('Erro ao reenviar e-mail.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-bg-main font-sans px-4 text-center">
      <div className="card-custom p-8 md:p-12 w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500 rounded-[2.5rem] border-none shadow-2xl">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-brand-light rounded-3xl flex items-center justify-center text-brand-primary">
            <Mail size={40} className="animate-bounce" />
          </div>
        </div>
        
        <div className="space-y-3">
          <h2 className="text-3xl font-black tracking-tight">Verifique seu e-mail</h2>
          <p className="text-slate-400 font-medium leading-relaxed">
            Enviamos um link de confirmação para <strong className="text-slate-600">{user?.email}</strong>. 
            Por favor, verifique sua caixa de entrada (e a pasta de spam) para ativar sua conta.
          </p>
        </div>

        <div className="flex flex-col gap-4 pt-4">
          <Button 
            onClick={handleRefresh}
            disabled={checking}
            className="w-full h-14 bg-brand-primary font-black rounded-2xl shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {checking ? 'Verificando...' : 'Já verifiquei meu e-mail'}
          </Button>
          
          <button 
            onClick={handleResend}
            disabled={resending}
            className="text-xs font-bold text-brand-primary uppercase tracking-widest hover:text-brand-dark transition-colors disabled:opacity-50"
          >
            {resending ? 'Reenviando...' : 'Não recebeu? Reenviar e-mail'}
          </button>
          
          <button 
            onClick={() => logout()}
            className="text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-slate-700 transition-colors"
          >
            Sair e entrar com outra conta
          </button>
        </div>
        
        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
          OralCloud Segurança & Privacidade
        </p>
      </div>
    </div>
  );
};

const Login = () => {
  const { login, loginWithEmail, registerWithEmail, sendPasswordReset, user } = useAuth();
  const [isRegister, setIsRegister] = React.useState(false);
  const [isForgotPassword, setIsForgotPassword] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [displayName, setDisplayName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [resetSent, setResetSent] = React.useState(false);
  
  if (user) return <Navigate to="/agenda" />;

  const handleGoogleLogin = async () => {
    try {
      await login();
      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao realizar login. Tente novamente em uma nova aba.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Informe seu e-mail para receber as instruções.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setResetSent(true);
      toast.success('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao enviar e-mail. Verifique se o e-mail está correto.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        if (password.length < 6) {
          toast.error('A senha deve ter pelo menos 6 caracteres.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          toast.error('As senhas não coincidem!');
          setLoading(false);
          return;
        }
      }

      const finalName = displayName || (email.toLowerCase().includes('yan') ? 'Dr. Yan Andrade' : '');
      if (isRegister) {
        await registerWithEmail(email, password, finalName);
        toast.success('Conta criada com sucesso! Acesso liberado.');
      } else {
        try {
          await loginWithEmail(email, password);
          toast.success('Bem-vindo de volta!');
        } catch (loginErr: any) {
          const code = loginErr.code || (loginErr.message && loginErr.message.match(/\((auth\/[^)]+)\)/)?.[1]);
          // If account doesn't exist yet, automatically create account with password provided
          if (code === 'auth/user-not-found') {
            try {
              await registerWithEmail(email, password, finalName || 'Dr. Yan Andrade');
              toast.success('Conta criada e vinculada com sucesso!');
              return;
            } catch (regErr: any) {
              throw loginErr;
            }
          }
          throw loginErr;
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      let message = 'Erro na autenticação. Verifique os dados.';
      
      const errorCode = error.code || (error.message && error.message.match(/\((auth\/[^)]+)\)/)?.[1]);
      
      if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password') {
        message = 'Senha incorreta para este e-mail. Se a conta já existia ou foi criada via Google, clique em "Esqueceu sua senha?" para cadastrar a nova senha.';
      } else if (errorCode === 'auth/user-not-found') {
        message = 'E-mail não cadastrado. Mude para a aba "Criar Conta".';
      } else if (errorCode === 'auth/email-already-in-use') {
        message = 'Este e-mail já possui cadastro. Faça login ou clique em "Esqueceu sua senha?".';
      } else if (errorCode === 'auth/weak-password') {
        message = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
      } else if (errorCode === 'auth/invalid-email') {
        message = 'O e-mail digitado é inválido.';
      } else if (errorCode === 'auth/too-many-requests') {
        message = 'Muitas tentativas sem sucesso. Aguarde alguns instantes ou redefina sua senha.';
      }
      
      toast.error(message, { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-main font-sans px-4 py-8">
      <div className="card-custom p-6 md:p-10 w-full max-w-md space-y-6 animate-in fade-in zoom-in duration-500 rounded-[2.5rem] border-none shadow-2xl">
        <div className="text-center">
          <Logo 
            className="flex-col gap-4" 
            subtitle={
              isForgotPassword 
                ? 'Recuperação de Acesso' 
                : isRegister 
                  ? 'Cadastre sua clínica gratuitamente' 
                  : 'Acesse seu consultório'
            } 
          />
        </div>

        {!isForgotPassword && (
          <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => setIsRegister(false)}
              className={cn(
                "flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all",
                !isRegister 
                  ? "bg-white text-brand-primary shadow-md shadow-slate-200/50" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setIsRegister(true)}
              className={cn(
                "flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all",
                isRegister 
                  ? "bg-white text-brand-primary shadow-md shadow-slate-200/50" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              Criar Conta
            </button>
          </div>
        )}

        {isForgotPassword ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Digite seu e-mail cadastrado e enviaremos um link seguro para você redefinir sua senha.
              </p>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                <Input 
                  type="email" 
                  placeholder="Seu e-mail cadastrado" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-14 bg-slate-50 border-none rounded-2xl font-bold focus-visible:ring-2 focus-visible:ring-brand-primary/20"
                />
              </div>
            </div>

            {resetSent && (
              <p className="text-xs font-bold text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                ✓ Instruções enviadas! Verifique sua caixa de e-mail ou spam.
              </p>
            )}

            <Button 
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-brand-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-brand-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </Button>

            <button 
              type="button"
              onClick={() => { setIsForgotPassword(false); setResetSent(false); }}
              className="w-full text-center text-xs font-black text-slate-400 uppercase tracking-widest hover:text-brand-primary transition-colors py-2"
            >
              ← Voltar para o login
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-3">
              {isRegister && (
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                  <Input 
                    type="text" 
                    placeholder="Seu nome completo" 
                    required 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-12 h-14 bg-slate-50 border-none rounded-2xl font-bold focus-visible:ring-2 focus-visible:ring-brand-primary/20 text-slate-700"
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                <Input 
                  type="email" 
                  placeholder="E-mail profissional" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-14 bg-slate-50 border-none rounded-2xl font-bold focus-visible:ring-2 focus-visible:ring-brand-primary/20 text-slate-700"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                <Input 
                  type={showPassword ? "text" : "password"} 
                  placeholder={isRegister ? "Senha de acesso (mín. 6 chars)" : "Senha de acesso"} 
                  required 
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 pr-12 h-14 bg-slate-50 border-none rounded-2xl font-bold focus-visible:ring-2 focus-visible:ring-brand-primary/20 text-slate-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                  title={showPassword ? "Esconder senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {isRegister && (
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                  <Input 
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="Confirmar senha" 
                    required 
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-12 pr-12 h-14 bg-slate-50 border-none rounded-2xl font-bold focus-visible:ring-2 focus-visible:ring-brand-primary/20 text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                    title={showConfirmPassword ? "Esconder senha" : "Mostrar senha"}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              )}

              {!isRegister && (
                <div className="flex justify-end pr-1">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-[11px] font-extrabold text-slate-400 hover:text-brand-primary transition-colors"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
              )}
            </div>
            
            <Button 
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-brand-primary text-white rounded-2xl font-black text-base shadow-xl shadow-brand-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              {loading ? 'Processando...' : (isRegister ? 'Criar minha conta' : 'Entrar no sistema')}
            </Button>
          </form>
        )}

        {!isForgotPassword && (
          <>
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-[10px] font-black text-slate-300 uppercase tracking-wider">ou entre com</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              className="w-full h-12 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-brand-primary/20 transition-all font-bold text-xs text-slate-700 shadow-sm active:scale-[0.98]"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              Continuar com Google
            </button>
          </>
        )}
        
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] text-center opacity-60">Segurança de alto nível • Criptografia ponta a ponta</p>
      </div>
    </div>
  );
};

const Settings = () => <WhatsAppSettings />;
const Agenda = () => <AppointmentAgenda />;
const Patients = () => <PatientManagement />;
const Finance = () => {
  const { user } = useAuth();
  const [monthRevenue, setMonthRevenue] = React.useState(0);
  const [todayRevenue, setTodayRevenue] = React.useState(0);
  const [totalPatients, setTotalPatients] = React.useState(0);
  const [clinicName, setClinicName] = React.useState('');

  React.useEffect(() => {
    if (!user?.clinicId) return;

    // Fetch Clinic Name
    const fetchClinic = async () => {
      const docRef = doc(db, 'clinics', user.clinicId!);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setClinicName(docSnap.data().name);
      }
    };
    fetchClinic();

    // Revenue Sub
    const unsubRevenue = medicalRecordService.subscribeToClinicRevenue(user.clinicId, (payments) => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      
      let mTotal = 0;
      let tTotal = 0;

      payments.forEach(p => {
        const pDate = parseISO(p.date);
        if (pDate >= monthStart) mTotal += p.amount;
        if (isToday(pDate)) tTotal += p.amount;
      });

      setMonthRevenue(mTotal);
      setTodayRevenue(tTotal);
    });

    // Patients Count
    const unsubPatients = patientService.subscribeToPatients(user.clinicId, (patients) => {
      setTotalPatients(patients.length);
    });

    return () => {
      unsubRevenue();
      unsubPatients();
    };
  }, [user?.clinicId]);

  return (
    <div className="p-4 md:p-8 space-y-8 h-full overflow-y-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/50 backdrop-blur-sm p-4 md:p-6 rounded-2xl border border-white gap-4">
        <div>
          <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] bg-brand-light/50 px-3 py-1 rounded-lg mb-2 inline-block">
            {clinicName || 'Carregando...'}
          </span>
          <h2 className="text-3xl font-bold text-slate-800">Gestão Clínica</h2>
          <p className="text-slate-500">Dados financeiros e base de dados consolidada da clínica.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-custom p-8 border-l-4 border-brand-secondary flex flex-col justify-center gap-4 min-h-[160px]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-secondary/10 rounded-2xl flex items-center justify-center text-brand-secondary">
              <UserIcon size={24} />
            </div>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Base de Pacientes</span>
          </div>
          <div className="flex flex-col">
            <span className="text-5xl font-extrabold text-slate-800">{totalPatients}</span>
            <span className="text-xs text-slate-500 font-medium">Pacientes cadastrados no sistema</span>
          </div>
        </div>

        <div className="card-custom p-8 border-l-4 border-brand-accent flex flex-col justify-center gap-4 min-h-[160px]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-accent/10 rounded-2xl flex items-center justify-center text-brand-accent">
              <CreditCard size={24} />
            </div>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Faturamento Mensal</span>
          </div>
          <div className="flex flex-col">
            <span className="text-5xl font-extrabold text-slate-800">
              R$ {monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <PlusCircle size={12} /> R$ {todayRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} gerados hoje
            </span>
          </div>
        </div>
      </div>

      <Card className="card-custom border-none bg-white p-8">
        <CardHeader className="p-0 mb-6">
          <CardTitle className="text-xl font-bold text-slate-800">Módulo Financeiro</CardTitle>
          <CardDescription>O módulo completo de fluxo de caixa e relatórios detalhados está sendo preparado para o próximo lançamento.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const isAgenda = location.pathname === '/agenda';
  
  const navItems = [
    { name: 'Agenda', shortName: 'Agenda', path: '/agenda', id: 'nav-agenda', icon: Calendar },
    { name: 'Pacientes', shortName: 'Pacientes', path: '/pacientes', id: 'nav-pacientes', icon: UserIcon },
    { name: 'Financeiro', shortName: 'Financeiro', path: '/financeiro', id: 'nav-financeiro', icon: CreditCard },
    { name: 'Configurações', shortName: 'Config.', path: '/configuracoes', id: 'nav-config', icon: SettingsIcon },
  ];

  if (user?.isMasterAdmin) {
    navItems.push({ name: 'Admin Master', shortName: 'Admin', path: '/admin', id: 'nav-admin', icon: Shield });
  }

  return (
    <div className="flex flex-col h-screen bg-bg-main overflow-hidden text-slate-700 font-sans">
      <TrialBanner />
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden pb-16 lg:pb-0">
        {/* Mobile Header */}
      <header className={cn(
        "lg:hidden bg-white border-b border-slate-200 flex items-center justify-between z-40 shrink-0 transition-all",
        isAgenda ? "h-11 px-3" : "h-16 px-6"
      )}>
        <Logo className={isAgenda ? "w-8 h-8" : "w-10 h-10"} />
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={cn(
            "rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 transition-all active:scale-95",
            isAgenda ? "w-8 h-8" : "w-10 h-10"
          )}
        >
          {isSidebarOpen ? <CloseIcon size={isAgenda ? 16 : 20} /> : <Menu size={isAgenda ? 16 : 20} />}
        </button>
      </header>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[45]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fica ultra-compacto (w-14 / 56px) na Agenda para a tela ser praticamente 100% livre */}
      <aside className={cn(
        "bg-white border-r border-slate-200 flex flex-col items-stretch z-50 shadow-xl shadow-slate-200/20 transition-all duration-300 lg:static fixed inset-y-0 left-0 h-full",
        isAgenda ? "w-72 lg:w-14" : "w-72",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {isAgenda ? (
          <div className="p-2 hidden lg:flex items-center justify-center border-b border-slate-100 shrink-0">
            <div className="w-8 h-8 bg-brand-primary rounded-xl flex items-center justify-center font-black text-white text-[11px] shadow-sm shadow-brand-primary/30" title="OralCloud">
              OC
            </div>
          </div>
        ) : (
          <Logo className="p-8 pb-12 hidden lg:flex" />
        )}
        
        <nav className={cn(
          "flex-1 space-y-1 mt-3 lg:mt-2 overflow-y-auto no-scrollbar",
          isAgenda ? "px-1 sm:px-1.5" : "px-6"
        )}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                id={item.id}
                title={item.name}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center rounded-xl cursor-pointer transition-all font-bold group",
                  isAgenda 
                    ? "justify-center p-2 mx-auto w-10 h-10" 
                    : "gap-4 px-6 py-4 text-sm",
                  isActive 
                    ? "bg-brand-light text-brand-primary shadow-xs font-black" + (!isAgenda ? " border-l-4 border-brand-primary" : "")
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                )}
              >
                <Icon size={18} className="shrink-0" />
                {!isAgenda && (
                  <span className="text-sm">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className={cn("border-t border-slate-100 shrink-0", isAgenda ? "p-1.5" : "p-6")}>
          {isAgenda ? (
            <div className="flex flex-col items-center gap-1.5 p-1 bg-slate-50/80 rounded-xl border border-slate-100">
              <div 
                className="w-7 h-7 rounded-full bg-brand-muted flex items-center justify-center overflow-hidden border border-white shadow-xs shrink-0"
                title={user?.displayName || 'Usuário'}
              >
                {user?.photoURL ? <img src={user.photoURL} alt={user.displayName || ''} /> : <span className="text-[10px] font-black text-brand-primary">{(user?.displayName || 'D').charAt(0)}</span>}
              </div>
              <button 
                onClick={() => logout()}
                title="Sair da conta"
                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-lg cursor-pointer"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group relative">
              <div className="w-10 h-10 rounded-full bg-brand-muted flex items-center justify-center overflow-hidden border-2 border-white shadow-sm shrink-0">
                 {user?.photoURL ? <img src={user.photoURL} alt={user.displayName || ''} /> : <span className="text-sm font-black text-brand-primary">{(user?.displayName || 'D').charAt(0)}</span>}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-bold text-slate-800 truncate">{user?.displayName || 'Usuário'}</p>
                <button 
                  onClick={() => logout()}
                  className="text-[10px] text-red-400 font-bold uppercase tracking-widest hover:text-red-600 transition-colors cursor-pointer"
                >
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
      <main className={cn(
        "flex-1 w-full",
        location.pathname === '/agenda' ? "h-full overflow-hidden flex flex-col" : "overflow-auto"
      )}>
        <div className={cn(
          "flex flex-col",
          location.pathname === '/agenda' ? "h-full flex-1 overflow-hidden" : "min-h-full"
        )}>
          <div className={cn("flex-1", location.pathname === '/agenda' && "h-full overflow-hidden flex flex-col")}>{children}</div>
          {location.pathname !== '/agenda' && (
            <footer className="p-8 border-t border-slate-100 bg-white/50 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-brand-primary rounded-xl flex items-center justify-center">
                    <span className="text-[10px] font-black text-white">OC</span>
                  </div>
                  <p className="text-xs font-bold text-slate-400">© 2024 OralCloud - Gestão Inteligente</p>
                </div>
                <div className="flex items-center gap-6">
                  <Link to="/termos" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-primary transition-colors">Termos</Link>
                  <Link to="/privacidade" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-primary transition-colors">Privacidade</Link>
                  <button className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-primary transition-colors">Suporte</button>
                </div>
              </div>
            </footer>
          )}
        </div>
      </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-[44] flex justify-around items-center shadow-lg px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full text-slate-400 hover:text-brand-primary transition-all ${
                isActive ? 'text-brand-primary' : ''
              }`}
            >
              <Icon size={18} className={isActive ? 'text-brand-primary' : ''} />
              <span className={`text-[9px] font-black tracking-tight ${isActive ? 'text-brand-primary' : 'text-slate-400'}`}>
                {item.shortName || item.name}
              </span>
            </Link>
          );
        })}
        {/* Toggle Sidebar Button for remaining items / logout */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full text-slate-400 hover:text-brand-primary transition-all`}
        >
          <Menu size={18} />
          <span className="text-[9px] font-black text-slate-400 tracking-tight">Mais</span>
        </button>
      </div>
    </div>
  );
};

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, refreshProfile } = useAuth();
  
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-bg-main animate-pulse">
      <div className="w-16 h-16 bg-brand-primary/20 rounded-2xl"></div>
    </div>
  );
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!user.emailVerified) {
    return <EmailVerificationScreen />;
  }

  if (!user.clinicId) {
    return <ClinicOnboarding />;
  }

  if (user.hasReadManual === false) {
    return <OnboardingManual userId={user.uid} onComplete={() => refreshProfile(user.uid)} />;
  }
  
  return <Layout>{children}</Layout>;
}

function MasterAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-bg-main animate-pulse">
      <div className="w-16 h-16 bg-brand-primary/20 rounded-2xl"></div>
    </div>
  );
  
  if (!user || !user.isMasterAdmin) {
    return <Navigate to="/agenda" />;
  }
  
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/agenda" replace />} />
          <Route path="/agenda" element={<PrivateRoute><Agenda /></PrivateRoute>} />
          <Route path="/pacientes" element={<PrivateRoute><Patients /></PrivateRoute>} />
          <Route path="/financeiro" element={<PrivateRoute><Finance /></PrivateRoute>} />
          <Route path="/configuracoes" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="/admin" element={<MasterAdminRoute><AdminDashboard /></MasterAdminRoute>} />
          <Route path="/termos" element={<Legal type="terms" />} />
          <Route path="/privacidade" element={<Legal type="privacy" />} />
          <Route path="*" element={<Navigate to="/agenda" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}
