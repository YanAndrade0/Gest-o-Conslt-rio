import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { db } from '../../lib/firebase-config';
import { collection, query, getDocs, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { 
  Users, 
  Building2, 
  CreditCard, 
  TrendingUp, 
  Search, 
  ChevronRight,
  ShieldCheck,
  Activity,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClinicData {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: any;
  unlimitedUsers?: boolean;
  subscription?: {
    status: string;
    planName: string;
    currentPeriodEnd: any;
  };
}

export const AdminDashboard = () => {
  const [clinics, setClinics] = useState<ClinicData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalClinics: 0,
    activeSubscriptions: 0,
    monthlyGrowth: 0,
  });

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const clinicsSnapshot = await getDocs(query(collection(db, 'clinics'), orderBy('createdAt', 'desc')));
        const clinicList = clinicsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ClinicData[];

        setClinics(clinicList);
        
        const active = clinicList.filter(c => c.subscription?.status === 'active').length;
        setStats({
          totalClinics: clinicList.length,
          activeSubscriptions: active,
          monthlyGrowth: 15, // Mock data for now
        });
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const toggleSubscription = async (clinicId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'canceled' : 'active';
      const clinicRef = doc(db, 'clinics', clinicId);
      await updateDoc(clinicRef, {
        'subscription.status': newStatus
      });
      
      setClinics(clinics.map(c => 
        c.id === clinicId 
        ? { ...c, subscription: { ...c.subscription!, status: newStatus } } 
        : c
      ));
    } catch (error) {
      console.error('Error updating subscription:', error);
    }
  };

  const toggleUnlimited = async (clinicId: string, currentVal: boolean) => {
    try {
      const clinicRef = doc(db, 'clinics', clinicId);
      await updateDoc(clinicRef, {
        unlimitedUsers: !currentVal
      });
      
      setClinics(clinics.map(c => 
        c.id === clinicId 
        ? { ...c, unlimitedUsers: !currentVal } 
        : c
      ));
    } catch (error) {
      console.error('Error updating unlimited status:', error);
    }
  };

  const filteredClinics = clinics.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-screen font-sans">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="text-brand-primary" size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Console Master Admin</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Visão Geral do OralCloud</h1>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar clínica ou e-mail..."
            className="w-full pl-12 pr-4 h-12 bg-white border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-custom border-none bg-white p-6">
          <CardContent className="p-0 flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <Building2 size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Clínicas</p>
              <h3 className="text-2xl font-black text-slate-800">{stats.totalClinics}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="card-custom border-none bg-white p-6">
          <CardContent className="p-0 flex items-center gap-4">
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
              <CreditCard size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assinaturas Ativas</p>
              <h3 className="text-2xl font-black text-slate-800">{stats.activeSubscriptions}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="card-custom border-none bg-white p-6">
          <CardContent className="p-0 flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
              <Activity size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Novas este mês</p>
              <h3 className="text-2xl font-black text-slate-800">+{stats.monthlyGrowth}%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content List */}
      <Card className="card-custom border-none overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-50 p-6">
          <CardTitle className="text-lg font-bold text-slate-800">Gestão de Clínicas</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Clínica / Contato</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Plano</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Usuários</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Expira em</th>
                <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Carregando Clínicas...</p>
                  </td>
                </tr>
              ) : filteredClinics.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-lg font-bold text-slate-400">Nenhuma clínica encontrada.</p>
                  </td>
                </tr>
              ) : (
                filteredClinics.map((clinic) => (
                  <tr key={clinic.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-light rounded-xl flex items-center justify-center text-brand-primary font-black text-xs">
                          {clinic.name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{clinic.name || 'Nova Clínica'}</p>
                          <p className="text-xs font-medium text-slate-400">{clinic.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="text-sm font-bold text-slate-600">
                        {clinic.subscription?.planName || 'Sem Plano'}
                      </span>
                    </td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        clinic.subscription?.status === 'active' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {clinic.subscription?.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-6">
                      <button 
                        onClick={() => toggleUnlimited(clinic.id, !!clinic.unlimitedUsers)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ${
                          clinic.unlimitedUsers 
                            ? 'bg-purple-100 text-purple-600' 
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {clinic.unlimitedUsers ? 'Sem Limite' : 'Limitado (5)'}
                      </button>
                    </td>
                    <td className="p-6">
                      <p className="text-sm font-bold text-slate-500">
                        {clinic.subscription?.currentPeriodEnd 
                          ? format(new Date(clinic.subscription.currentPeriodEnd), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'}
                      </p>
                    </td>
                    <td className="p-6 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => toggleSubscription(clinic.id, clinic.subscription?.status || 'none')}
                        className={`text-[10px] font-black uppercase tracking-widest ${
                          clinic.subscription?.status === 'active' 
                            ? 'text-red-500 hover:text-red-600 hover:bg-red-50' 
                            : 'text-green-500 hover:text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {clinic.subscription?.status === 'active' ? 'Suspender' : 'Ativar'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
