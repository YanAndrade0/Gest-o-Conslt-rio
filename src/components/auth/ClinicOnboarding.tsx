import React, { useState } from 'react';
import { 
  Building2, 
  Link as LinkIcon, 
  Plus, 
  ArrowRight, 
  CheckCircle2, 
  Copy,
  LogOut
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { clinicService } from '../../services/clinicService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { db } from '../../lib/firebase-config';
import { collection, doc, getDoc } from 'firebase/firestore';

export function ClinicOnboarding() {
  const { user, refreshProfile, logout } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === 'yanandraderfo@gmail.com' || user?.email?.toLowerCase() === 'yandatafox@gmail.com';
  const [step, setStep] = useState<'choice' | 'create' | 'join' | 'success'>('choice');
  const [clinicName, setClinicName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [licenseCode, setLicenseCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting clinic creation:', { clinicName, licenseCode, isAdmin });
    
    if (!user || !clinicName) {
      toast.error('Preencha o nome da clínica.');
      return;
    }
    
    if (!isAdmin && !licenseCode) {
      toast.error('Insira o código de ativação.');
      return;
    }

    setLoading(true);
    try {
      const clinicId = await clinicService.createClinic(user.uid, clinicName, licenseCode, user.email);
      console.log('Clinic created successfully:', clinicId);
      
      // Fetch profile to update clinicId in context
      await refreshProfile(user.uid);

      // Fetch the clinic details to get the accessCode
      const clinicsRef = collection(db, 'clinics');
      const clinicSnap = await getDoc(doc(clinicsRef, clinicId));
      if (clinicSnap.exists()) {
        const data = clinicSnap.data();
        console.log('Clinic data:', data);
        setGeneratedCode(data.accessCode);
      }

      setStep('success');
      toast.success('Clínica criada com sucesso!');
    } catch (error: any) {
      console.error('Error creating clinic:', error);
      toast.error(error.message || 'Erro ao criar clínica. Verifique o código de ativação.');
    } finally {
      setLoading(false);
    }
  };

  const [role, setRole] = useState<'member' | 'secretary'>('member');

  const handleJoinClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !accessCode) return;
    setLoading(true);
    try {
      await clinicService.joinClinic(user.uid, accessCode, user.displayName || undefined, user.email || undefined, role);
      await refreshProfile(user.uid);
      toast.success('Vinculado à clínica com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao vincular clínica.');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success('Código copiado!');
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl border border-slate-50 overflow-hidden animate-in fade-in zoom-in duration-500">
        <div className="p-8 md:p-12 space-y-8">
          
          <header className="text-center space-y-4">
            <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary mx-auto">
              <Building2 size={32} />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Configuração de Clínica</h1>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                {step === 'choice' && 'Escolha como deseja prosseguir'}
                {step === 'create' && 'Crie sua nova clínica'}
                {step === 'join' && 'Entre em uma clínica existente'}
                {step === 'success' && 'Parabéns! Sua clínica está pronta'}
              </p>
            </div>
          </header>

          {step === 'choice' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button 
                onClick={() => setStep('create')}
                className="p-8 rounded-[2.5rem] border-2 border-slate-50 hover:border-brand-primary/20 hover:bg-brand-light/10 transition-all text-left space-y-4 group active:scale-[0.98]"
              >
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-brand-primary group-hover:scale-110 transition-all shadow-sm">
                  <Plus size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Criar Clínica</h3>
                  <p className="text-sm font-medium text-slate-400">Sou proprietário e quero gerenciar minha própria clínica.</p>
                </div>
              </button>

              <button 
                onClick={() => setStep('join')}
                className="p-8 rounded-[2.5rem] border-2 border-slate-50 hover:border-brand-primary/20 hover:bg-brand-light/10 transition-all text-left space-y-4 group active:scale-[0.98]"
              >
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-brand-primary group-hover:scale-110 transition-all shadow-sm">
                  <LinkIcon size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Vincular-se</h3>
                  <p className="text-sm font-medium text-slate-400">Já tenho um código de acesso de uma clínica existente.</p>
                </div>
              </button>
            </div>
          )}

          {step === 'create' && (
            <form onSubmit={handleCreateClinic} className="space-y-6 max-w-md mx-auto">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Nome da Clínica</Label>
                  <Input 
                    placeholder="Ex: Consultório Dra. Ana" 
                    value={clinicName}
                    onChange={e => setClinicName(e.target.value)}
                    required
                    className="h-14 bg-slate-50 border-none rounded-2xl font-bold focus-visible:ring-2 focus-visible:ring-brand-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">
                    Código de Ativação {isAdmin ? '(Opcional para Admin)' : '(Pago)'}
                  </Label>
                  {isAdmin ? (
                    <div className="h-14 bg-green-50 border-2 border-dashed border-green-100 rounded-2xl flex items-center px-4 gap-3 text-green-600">
                      <CheckCircle2 size={20} />
                      <span className="text-sm font-bold">Ativação automática para administrador</span>
                    </div>
                  ) : (
                    <>
                      <Input 
                        placeholder="Digite o código enviado pelo administrador" 
                        value={licenseCode}
                        onChange={e => setLicenseCode(e.target.value.toUpperCase())}
                        required={!isAdmin}
                        className="h-14 bg-slate-50 border-none rounded-2xl font-bold focus-visible:ring-2 focus-visible:ring-brand-primary/20"
                      />
                      <p className="text-[9px] text-slate-400 font-medium pl-1 italic">
                        Este código é necessário para registrar uma nova clínica no sistema.
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setStep('choice')}
                  className="h-14 rounded-2xl font-bold flex-1"
                >
                  Voltar
                </Button>
                <Button 
                  type="submit"
                  disabled={loading}
                  className="h-14 bg-brand-primary text-white rounded-2xl font-black flex-[2] shadow-xl shadow-brand-primary/20"
                >
                  {loading ? 'Criando...' : 'GERAR CÓDIGO E CRIAR'}
                </Button>
              </div>
            </form>
          )}

          {step === 'join' && (
            <form onSubmit={handleJoinClinic} className="space-y-6 max-w-md mx-auto">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Código de Acesso</Label>
                  <Input 
                    placeholder="Digite o código da clínica" 
                    value={accessCode}
                    onChange={e => setAccessCode(e.target.value.toUpperCase())}
                    required
                    className="h-14 bg-slate-50 border-none rounded-2xl font-bold focus-visible:ring-2 focus-visible:ring-brand-primary/20 text-center tracking-[0.5em] text-lg uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Seu Papel na Clínica</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('member')}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all font-bold text-sm",
                        role === 'member' 
                          ? "bg-brand-primary text-white border-brand-primary" 
                          : "bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100"
                      )}
                    >
                      Doutor(a)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('secretary')}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all font-bold text-sm",
                        role === 'secretary' 
                          ? "bg-brand-primary text-white border-brand-primary" 
                          : "bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100"
                      )}
                    >
                      Secretário(a)
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setStep('choice')}
                  className="h-14 rounded-2xl font-bold flex-1"
                >
                  Voltar
                </Button>
                <Button 
                  type="submit"
                  disabled={loading}
                  className="h-14 bg-brand-primary text-white rounded-2xl font-black flex-[2] shadow-xl shadow-brand-primary/20"
                >
                  {loading ? 'Vinculando...' : 'VINCULAR AGORA'}
                </Button>
              </div>
            </form>
          )}

          {step === 'success' && (
            <div className="space-y-8 animate-in slide-in-from-bottom duration-700">
              <div className="bg-green-50 p-8 rounded-[2.5rem] border border-green-100 space-y-6 text-center">
                <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-500/20">
                  <CheckCircle2 size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Configuração Concluída!</h3>
                  <p className="text-sm font-medium text-slate-500 px-8">
                    Sua clínica foi criada. Compartilhe o código abaixo com seus colaboradores para que eles possam se vincular.
                  </p>
                </div>
                
                <div className="relative group">
                  <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-between group-hover:border-brand-primary transition-all">
                    <span className="text-2xl font-black text-slate-700 tracking-[0.4em] uppercase pl-4">{generatedCode}</span>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={copyCode}
                      className="bg-slate-50 rounded-xl h-12 w-12 hover:bg-brand-primary hover:text-white"
                    >
                      <Copy size={20} />
                    </Button>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => refreshProfile(user!.uid)}
                className="w-full h-16 bg-brand-primary text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-brand-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all gap-2"
              >
                ENTRAR NO PAINEL <ArrowRight size={20} />
              </Button>
            </div>
          )}

          {step !== 'success' && (
            <div className="pt-4 text-center border-t border-slate-50">
              <button 
                onClick={logout}
                className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-red-500 transition-colors flex items-center gap-2 mx-auto"
              >
                <LogOut size={12} /> Sair da conta
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
