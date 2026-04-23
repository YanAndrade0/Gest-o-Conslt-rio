import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import { WhatsAppSettings } from './components/settings/WhatsAppSettings';
import { PatientManagement } from './components/patients/PatientManagement';
import { AppointmentAgenda } from './components/appointments/AppointmentAgenda';
import { ClinicOnboarding } from './components/auth/ClinicOnboarding';
import { medicalRecordService, PatientPayment } from './services/medicalRecordService';
import { appointmentService, Appointment as AppointmentType } from './services/appointmentService';
import { patientService } from './services/patientService';
import { toast } from 'sonner';
import { Mail, Lock, User as UserIcon, ArrowRight, History, Clock, CreditCard, PlusCircle, Menu, X as CloseIcon } from 'lucide-react';
import { format, isToday, startOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import { cn } from './lib/utils';

// Components
const Login = () => {
  const { login, loginWithEmail, registerWithEmail, user } = useAuth();
  const [isRegister, setIsRegister] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  
  if (user) return <Navigate to="/" />;

  const handleGoogleLogin = async () => {
    try {
      await login();
      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao realizar login. Tente novamente em uma nova aba.');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        await registerWithEmail(email, password);
        toast.success('Conta profissional criada!');
      } else {
        await loginWithEmail(email, password);
        toast.success('Acesso autorizado!');
      }
    } catch (error: any) {
      console.error(error);
      let message = 'Erro na autenticação. Verifique os dados.';
      if (error.code === 'auth/invalid-credential') message = 'E-mail ou senha inválidos.';
      if (error.code === 'auth/email-already-in-use') message = 'E-mail já cadastrado.';
      if (error.code === 'auth/weak-password') message = 'A senha deve ter pelo menos 6 caracteres.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-bg-main font-sans px-4">
      <div className="card-custom p-8 md:p-12 w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500 rounded-[2.5rem] border-none shadow-2xl">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-brand-primary rounded-3xl flex items-center justify-center text-white mx-auto shadow-2xl shadow-brand-primary/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2a.3.3 0 0 0-.2.3Z"/><path d="M10 22v-6.5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1V22"/><path d="M7 10.8V4.5A2.5 2.5 0 1 1 12 4.5V10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z"/><path d="M17 10.8V4.5A2.5 2.5 0 0 0 12 4.5V10a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2Z"/><path d="M12 12v10"/></svg>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">OdontoPro</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest leading-relaxed">
              {isRegister ? 'Inicie seu cadastro gratuito' : 'Sistema de Gestão Odontológica'}
            </p>
          </div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
              <Input 
                type="email" 
                placeholder="E-mail profissional" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12 h-14 bg-slate-50 border-none rounded-2xl font-bold focus-visible:ring-2 focus-visible:ring-brand-primary/20"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
              <Input 
                type="password" 
                placeholder="Senha de acesso" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-12 h-14 bg-slate-50 border-none rounded-2xl font-bold focus-visible:ring-2 focus-visible:ring-brand-primary/20"
              />
            </div>
          </div>
          
          <Button 
            disabled={loading}
            className="w-full h-14 bg-brand-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-brand-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            {loading ? 'Processando...' : (isRegister ? 'Criar minha conta' : 'Entrar no sistema')}
          </Button>

          <p className="text-center">
            <button 
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-brand-primary transition-colors py-2"
            >
              {isRegister ? 'Já tenho acesso profissional' : 'Não tem conta? Cadastre sua clínica'}
            </button>
          </p>
        </form>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-4 text-[10px] font-black text-slate-300 uppercase tracking-wider">ou</span>
          </div>
        </div>

        <button 
          type="button"
          onClick={handleGoogleLogin}
          className="w-full h-14 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center gap-4 hover:bg-slate-50 hover:border-brand-primary/20 transition-all font-bold text-slate-700 shadow-sm active:scale-[0.98]"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
          Acessar com Google
        </button>
        
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

  React.useEffect(() => {
    if (!user?.clinicId) return;

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

const Dashboard = () => {
  const { user } = useAuth();
  const [todayAppointments, setTodayAppointments] = React.useState<AppointmentType[]>([]);

  React.useEffect(() => {
    if (!user?.clinicId) return;

    // Appointments Sub
    const unsubAppts = appointmentService.subscribeToAppointments(user.clinicId, (appts) => {
      const filtered = appts.filter(a => isToday(parseISO(a.date)));
      setTodayAppointments(filtered);
    });

    return () => {
      unsubAppts();
    };
  }, [user?.clinicId]);

  return (
    <div className="p-4 md:p-8 space-y-8 h-full overflow-y-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/50 backdrop-blur-sm p-4 md:p-6 rounded-2xl border border-white gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Olá, {user?.displayName ? `Dr(a). ${user.displayName.split(' ')[0]}` : 'Bem-vindo'}</h2>
          <p className="text-slate-500">Seu consultório está com {todayAppointments.length} consultas agendadas para hoje.</p>
        </div>
        <Link to="/agenda">
          <Button className="bg-brand-primary text-white px-6 py-2 rounded-xl font-medium hover:bg-brand-accent transition-colors shadow-lg shadow-brand-primary/20">
            + Nova Consulta
          </Button>
        </Link>
      </header>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="card-custom p-6 border-l-4 border-brand-primary flex flex-col justify-between h-32">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Consultas Hoje</span>
        <span className="text-4xl font-extrabold text-slate-800">{todayAppointments.length.toString().padStart(2, '0')}</span>
        <span className="text-xs text-brand-primary font-medium">Agenda em tempo real</span>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <section className="lg:col-span-8 card-custom overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <h3 className="font-bold text-slate-700">Agenda de Hoje</h3>
          <Link to="/agenda" className="text-sm text-brand-primary font-bold hover:underline">Ver agenda completa</Link>
        </div>
        <div className="p-6 space-y-4">
          {todayAppointments.length === 0 ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                <Clock size={32} />
              </div>
              <p className="text-slate-400 font-bold italic text-sm">Nenhuma consulta para hoje.</p>
            </div>
          ) : (
            todayAppointments.map((item, i) => (
              <div key={i} className="flex items-center gap-3 md:gap-6 p-3 md:p-4 border border-slate-100 rounded-2xl hover:bg-slate-50/50 transition-all cursor-pointer">
                <div className="text-center w-16 md:w-20">
                  <p className="text-sm font-bold text-slate-400">{format(parseISO(item.date), 'HH:mm')}</p>
                  <p className="text-[10px] text-slate-300 font-medium">{item.duration} min</p>
                </div>
                <div className={`w-1.5 h-12 rounded-full flex-shrink-0 ${
                  item.status === 'marcado' ? 'bg-blue-400' : 
                  item.status === 'confirmado' ? 'bg-green-400' : 
                  item.status === 'aguardando' ? 'bg-orange-400' : 
                  item.status === 'desmarcado' ? 'bg-red-400' : 'bg-slate-200'
                }`}></div>
                <div className="flex-1">
                  <p className="text-base font-bold text-slate-800">{item.patientName}</p>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-slate-500 font-medium">{item.procedure}</p>
                    {item.doctorName && (
                      <span className="text-[10px] font-black text-brand-primary/50 uppercase tracking-widest bg-brand-light/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <UserIcon size={8} /> {item.doctorName}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                  ${item.status === 'marcado' ? 'bg-blue-50 text-blue-600' : 
                    item.status === 'confirmado' ? 'bg-green-50 text-green-600' : 
                    item.status === 'aguardando' ? 'bg-orange-50 text-orange-600' : 
                    item.status === 'desmarcado' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                  {item.status}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="lg:col-span-4 space-y-8">
        <section className="card-custom p-6 space-y-6">
          <h3 className="font-bold text-slate-700">Prontuário Rápido</h3>
          <div className="bg-bg-main p-5 rounded-2xl border border-dashed border-brand-muted/50">
            <div className="flex justify-between items-center mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Odontograma</p>
              <button className="text-[9px] bg-white border border-slate-200 px-3 py-1 rounded-lg font-bold shadow-sm">Editar</button>
            </div>
            <div className="flex gap-1.5 justify-center flex-wrap">
              {[18, 17, 16, 15, 14, 13, 12, 11].map(num => (
                <div key={num} className={`w-8 h-10 border border-slate-200 rounded-lg flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors
                  ${[16, 14].includes(num) ? 'bg-brand-secondary text-white border-brand-accent' : 'bg-white hover:bg-slate-50'}`}>
                  {num}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alertas Críticos</p>
             <div className="flex items-start gap-3 p-4 bg-red-50/50 rounded-2xl border border-red-100">
               <div className="w-2 h-2 mt-1.5 rounded-full bg-red-500 flex-shrink-0"></div>
               <p className="text-xs text-red-800 leading-relaxed font-medium"><b>Material em falta:</b> Resina Composta A2 (estoque crítico).</p>
             </div>
          </div>
        </section>
      </div>
    </div>
    </div>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  
  const navItems = [
    { name: 'Painel Geral', path: '/', id: 'nav-dashboard' },
    { name: 'Agenda', path: '/agenda', id: 'nav-agenda' },
    { name: 'Pacientes', path: '/pacientes', id: 'nav-pacientes' },
    { name: 'Financeiro', path: '/financeiro', id: 'nav-financeiro' },
    { name: 'Configurações', path: '/configuracoes', id: 'nav-config' },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-bg-main overflow-hidden text-slate-700 font-sans">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2a.3.3 0 0 0-.2.3Z"/><path d="M10 22v-6.5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1V22"/><path d="M7 10.8V4.5A2.5 2.5 0 1 1 12 4.5V10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z"/><path d="M17 10.8V4.5A2.5 2.5 0 0 0 12 4.5V10a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2Z"/><path d="M12 12v10"/></svg>
          </div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">OdontoPro</h1>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 transition-all active:scale-95"
        >
          {isSidebarOpen ? <CloseIcon size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[45]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "w-72 bg-white border-r border-slate-200 flex flex-col items-stretch z-50 shadow-xl shadow-slate-200/20 transition-all duration-300 lg:static fixed inset-y-0 left-0 h-full",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-8 pb-12 hidden lg:flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2a.3.3 0 0 0-.2.3Z"/><path d="M10 22v-6.5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1V22"/><path d="M7 10.8V4.5A2.5 2.5 0 1 1 12 4.5V10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z"/><path d="M17 10.8V4.5A2.5 2.5 0 0 0 12 4.5V10a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2Z"/><path d="M12 12v10"/></svg>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">OdontoPro</h1>
        </div>
        
        <nav className="flex-1 px-6 space-y-2 mt-8 lg:mt-0">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                id={item.id}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl cursor-pointer transition-all text-sm font-bold ${
                  isActive 
                    ? 'bg-brand-light text-brand-primary border-l-4 border-brand-primary shadow-sm' 
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-50">
          <div className="flex items-center gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group relative">
            <div className="w-10 h-10 rounded-full bg-brand-muted flex items-center justify-center overflow-hidden border-2 border-white shadow-sm shrink-0">
               {user?.photoURL ? <img src={user.photoURL} alt={user.displayName || ''} /> : <span className="text-sm font-black text-brand-primary">{(user?.displayName || 'D').charAt(0)}</span>}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-bold text-slate-800 truncate">{user?.displayName || 'Usuário'}</p>
              <button 
                onClick={() => logout()}
                className="text-[10px] text-red-400 font-bold uppercase tracking-widest hover:text-red-600 transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto w-full">{children}</main>
    </div>
  );
};

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-bg-main animate-pulse">
      <div className="w-16 h-16 bg-brand-primary/20 rounded-2xl"></div>
    </div>
  );
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!user.clinicId) {
    return <ClinicOnboarding />;
  }
  
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/agenda" element={<PrivateRoute><Agenda /></PrivateRoute>} />
          <Route path="/pacientes" element={<PrivateRoute><Patients /></PrivateRoute>} />
          <Route path="/financeiro" element={<PrivateRoute><Finance /></PrivateRoute>} />
          <Route path="/configuracoes" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}
