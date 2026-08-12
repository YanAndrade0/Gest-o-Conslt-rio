import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { db } from '../../lib/firebase-config';
import { collection, query, where, getDocs, doc, updateDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { 
  Users, 
  Building2, 
  CreditCard, 
  TrendingUp, 
  Search, 
  ShieldCheck,
  Activity,
  AlertCircle,
  RefreshCw,
  ArrowUpDown
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface ClinicData {
  id: string;
  name: string;
  email: string;
  phone: string;
  ownerId?: string;
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
  const [patientCounts, setPatientCounts] = useState<{ [key: string]: number }>({});
  const [totalPatients, setTotalPatients] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'patients' | 'name'>('patients');
  const [stats, setStats] = useState({
    totalClinics: 0,
    activeSubscriptions: 0,
    monthlyGrowth: 15,
  });

  const getClinicPatientCount = (clinic: ClinicData): number => {
    const countById = patientCounts[clinic.id] || 0;
    const countByOwner = clinic.ownerId && clinic.ownerId !== clinic.id ? (patientCounts[clinic.ownerId] || 0) : 0;
    return countById + countByOwner;
  };

  const fetchPatientsByClinics = async (currentClinics: ClinicData[]) => {
    try {
      const counts: { [key: string]: number } = {};
      const uniquePatientIds = new Set<string>();

      await Promise.all(
        currentClinics.map(async (c) => {
          const idsToQuery = Array.from(new Set([c.id, c.ownerId].filter(Boolean)));
          for (const cid of idsToQuery) {
            try {
              const q = query(collection(db, 'patients'), where('clinicId', '==', cid));
              const snap = await getDocs(q);
              snap.docs.forEach(d => {
                uniquePatientIds.add(d.id);
                const pData = d.data();
                const clinicKey = pData.clinicId || cid;
                counts[clinicKey] = (counts[clinicKey] || 0) + 1;
              });
            } catch (err) {
              console.warn(`Error querying patients for clinic ${cid}:`, err);
            }
          }
        })
      );

      if (uniquePatientIds.size > 0) {
        setPatientCounts(prev => ({ ...prev, ...counts }));
        setTotalPatients(uniquePatientIds.size);
      }
    } catch (err) {
      console.error('Error fetching patients by clinics fallback:', err);
    }
  };

  const loadData = () => {
    setRefreshing(true);
    let latestClinics: ClinicData[] = [];
    
    // Subscribe to clinics in real-time
    const qClinics = query(collection(db, 'clinics'), orderBy('createdAt', 'desc'));
    const unsubClinics = onSnapshot(qClinics, (snapshot) => {
      const clinicList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ClinicData[];

      latestClinics = clinicList;
      setClinics(clinicList);
      const active = clinicList.filter(c => c.subscription?.status === 'active').length;
      setStats(prev => ({
        ...prev,
        totalClinics: clinicList.length,
        activeSubscriptions: active,
      }));
      setLoading(false);
      setRefreshing(false);

      // If patient counts are 0, attempt fallback per-clinic query
      if (clinicList.length > 0) {
        fetchPatientsByClinics(clinicList);
      }
    }, (error) => {
      console.error('Error listening to clinics:', error);
      setLoading(false);
      setRefreshing(false);
    });

    // Subscribe to patients in real-time
    const unsubPatients = onSnapshot(collection(db, 'patients'), (snapshot) => {
      const counts: { [key: string]: number } = {};
      let total = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        total++;
        if (data.clinicId) {
          counts[data.clinicId] = (counts[data.clinicId] || 0) + 1;
        }
      });

      setPatientCounts(counts);
      setTotalPatients(total);

      if (total === 0 && latestClinics.length > 0) {
        fetchPatientsByClinics(latestClinics);
      }
    }, (error) => {
      console.error('Error listening to patients globally:', error);
      if (latestClinics.length > 0) {
        fetchPatientsByClinics(latestClinics);
      }
    });

    return () => {
      unsubClinics();
      unsubPatients();
    };
  };

  useEffect(() => {
    const cleanup = loadData();
    return () => cleanup();
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const patientsSnap = await getDocs(collection(db, 'patients'));
      const counts: { [key: string]: number } = {};
      let total = 0;

      patientsSnap.docs.forEach(doc => {
        const data = doc.data();
        total++;
        if (data.clinicId) {
          counts[data.clinicId] = (counts[data.clinicId] || 0) + 1;
        }
      });

      if (total === 0 && clinics.length > 0) {
        await fetchPatientsByClinics(clinics);
      } else {
        setPatientCounts(counts);
        setTotalPatients(total);
      }
      
      toast.success('Contagem de pacientes atualizada com sucesso!');
    } catch (err) {
      console.error('Erro ao atualizar contagem global, tentando por clínica:', err);
      if (clinics.length > 0) {
        await fetchPatientsByClinics(clinics);
        toast.success('Contagem por clínica atualizada com sucesso!');
      } else {
        toast.error('Erro ao atualizar dados.');
      }
    } finally {
      setRefreshing(false);
    }
  };

  const toggleSubscription = async (clinicId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'canceled' : 'active';
      const clinicRef = doc(db, 'clinics', clinicId);
      await updateDoc(clinicRef, {
        'subscription.status': newStatus
      });
      toast.success(`Status da clínica alterado para ${newStatus === 'active' ? 'Ativo' : 'Inativo'}.`);
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Erro ao atualizar status da clínica.');
    }
  };

  const toggleUnlimited = async (clinicId: string, currentVal: boolean) => {
    try {
      const clinicRef = doc(db, 'clinics', clinicId);
      await updateDoc(clinicRef, {
        unlimitedUsers: !currentVal
      });
      toast.success(`Limite de usuários ${!currentVal ? 'Removido (Sem Limite)' : 'Alterado para Limitado (5)'}.`);
    } catch (error) {
      console.error('Error updating unlimited status:', error);
      toast.error('Erro ao atualizar limite de usuários.');
    }
  };

  const filteredClinics = clinics
    .filter(c => 
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'patients') {
        return getClinicPatientCount(b) - getClinicPatientCount(a);
      }
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0; // Default created order
    });

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#F8FAFC] min-h-screen font-sans">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="text-brand-primary" size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Console Master Admin</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Visão Geral do OralCloud</h1>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="h-12 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs gap-2 shadow-sm"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin text-brand-primary' : ''} />
            {refreshing ? 'Atualizando...' : 'Atualizar Dados'}
          </Button>

          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar clínica..."
              className="w-full pl-12 pr-4 h-12 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-custom border-none bg-white p-6 shadow-sm">
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

        <Card className="card-custom border-none bg-white p-6 shadow-sm">
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

        <Card className="card-custom border-none bg-white p-6 shadow-sm border-l-4 border-l-purple-500">
          <CardContent className="p-0 flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
              <Users size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Pacientes</p>
              <h3 className="text-2xl font-black text-purple-700">{totalPatients}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="card-custom border-none bg-white p-6 shadow-sm">
          <CardContent className="p-0 flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
              <Activity size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Média p/ Clínica</p>
              <h3 className="text-2xl font-black text-slate-800">
                {stats.totalClinics > 0 ? (totalPatients / stats.totalClinics).toFixed(1) : 0}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content List */}
      <Card className="card-custom border-none overflow-hidden shadow-sm">
        <CardHeader className="bg-white border-b border-slate-100 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800">Gestão de Clínicas e Pacientes</CardTitle>
            <p className="text-xs text-slate-400 font-medium">Contagem atualizada em tempo real dos pacientes cadastrados por consultório</p>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200/60">
            <span className="text-[10px] font-black uppercase text-slate-400 px-2 flex items-center gap-1">
              <ArrowUpDown size={12} /> Ordenar:
            </span>
            <button
              onClick={() => setSortBy('patients')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                sortBy === 'patients' ? 'bg-white text-brand-primary shadow-sm font-black' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              + Pacientes
            </button>
            <button
              onClick={() => setSortBy('recent')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                sortBy === 'recent' ? 'bg-white text-brand-primary shadow-sm font-black' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Mais Recentes
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                sortBy === 'name' ? 'bg-white text-brand-primary shadow-sm font-black' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Nome
            </button>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Clínica / Contato</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Plano</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-purple-600">Pacientes Cadastrados</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Usuários</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Expira em</th>
                <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-20 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Carregando Clínicas e Contagem...</p>
                  </td>
                </tr>
              ) : filteredClinics.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-20 text-center">
                    <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-lg font-bold text-slate-400">Nenhuma clínica encontrada.</p>
                  </td>
                </tr>
              ) : (
                filteredClinics.map((clinic) => {
                  const patientCount = getClinicPatientCount(clinic);
                  const percentage = totalPatients > 0 ? ((patientCount / totalPatients) * 100).toFixed(0) : '0';

                  return (
                    <tr key={clinic.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-brand-light rounded-xl flex items-center justify-center text-brand-primary font-black text-xs shrink-0">
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
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                            <Users size={14} className="text-purple-600" />
                            {patientCount} {patientCount === 1 ? 'paciente' : 'pacientes'}
                          </span>
                          {totalPatients > 0 && patientCount > 0 && (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                              {percentage}% do total
                            </span>
                          )}
                        </div>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

