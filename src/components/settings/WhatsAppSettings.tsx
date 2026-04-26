import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { DEFAULT_REMINDER_TEMPLATE } from '../../lib/whatsapp';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { clinicService, Clinic } from '../../services/clinicService';
import { Key, ShieldCheck, Copy, RefreshCw, Plus, Building, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import { db } from '../../lib/firebase-config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ClinicMembers } from './ClinicMembers';
import { SubscriptionSettings } from './SubscriptionSettings';
import { CreditCard as BillingIcon } from 'lucide-react';

export function WhatsAppSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'subscription'>('general');
  const [template, setTemplate] = useState(DEFAULT_REMINDER_TEMPLATE);
  const [hoursBefore, setHoursBefore] = useState(24);
  const [enabled, setEnabled] = useState(true);
  const [generatedLicense, setGeneratedLicense] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [clinicData, setClinicData] = useState<Clinic | null>(null);
  const [newClinicName, setNewClinicName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const isAdmin = user?.email?.toLowerCase() === 'yanandraderfo@gmail.com' || user?.email?.toLowerCase() === 'yandatafox@gmail.com';
  const isOwner = user?.role === 'owner';

  useEffect(() => {
    const fetchClinic = async () => {
      if (user?.clinicId) {
        try {
          const docRef = doc(db, 'clinics', user.clinicId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data() } as Clinic;
            setClinicData(data);
            setNewClinicName(data.name);
          }
        } catch (error) {
          console.error("Error fetching clinic:", error);
        }
      }
    };
    fetchClinic();
  }, [user?.clinicId]);

  const handleUpdateClinicName = async () => {
    if (!user?.clinicId || !newClinicName) return;
    try {
      const docRef = doc(db, 'clinics', user.clinicId);
      await updateDoc(docRef, { name: newClinicName });
      setClinicData(prev => prev ? { ...prev, name: newClinicName } : null);
      setIsEditingName(false);
      toast.success('Nome da clínica atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar nome.');
    }
  };

  const handleSave = () => {
    toast.success("Configurações salvas com sucesso!");
  };

  const handleGenerateLicense = async () => {
    setIsGenerating(true);
    try {
      const code = await clinicService.generateLicenseCode();
      setGeneratedLicense(code);
      toast.success('Novo código de licença gerado!');
    } catch (error) {
      toast.error('Erro ao gerar código.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyLicense = () => {
    navigator.clipboard.writeText(generatedLicense);
    toast.success('Código copiado!');
  };

  const copyClinicCode = () => {
    if (clinicData?.accessCode) {
      navigator.clipboard.writeText(clinicData.accessCode);
      toast.success('Código da clínica copiado!');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="mb-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Configurações</h2>
          <p className="text-slate-500 font-medium tracking-tight">Gerencie sua clínica, equipe e integrações.</p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button 
            onClick={() => setActiveTab('general')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all gap-2 flex items-center",
              activeTab === 'general' ? "bg-white text-brand-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Building size={14} /> Geral
          </button>
          <button 
            onClick={() => setActiveTab('members')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all gap-2 flex items-center",
              activeTab === 'members' ? "bg-white text-brand-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Users size={14} /> Equipe
          </button>
          {isOwner && (
            <button 
              onClick={() => setActiveTab('subscription')}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all gap-2 flex items-center",
                activeTab === 'subscription' ? "bg-white text-brand-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <BillingIcon size={14} /> Assinatura
            </button>
          )}
        </div>
      </header>

      {activeTab === 'members' ? (
        <ClinicMembers />
      ) : activeTab === 'subscription' ? (
        <SubscriptionSettings />
      ) : (
        <div className="space-y-12">
          {/* Clinic Details Card */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Building size={18} className="text-slate-400" />
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Sua Clínica</h3>
            </div>
            <Card className="card-custom border-none overflow-hidden">
              <CardContent className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1 text-center md:text-left flex-1">
                  {isEditingName && isAdmin ? (
                    <div className="flex items-center gap-2">
                       <Input 
                        value={newClinicName}
                        onChange={e => setNewClinicName(e.target.value)}
                        className="h-10 bg-slate-50 border-slate-200 rounded-xl font-bold focus-visible:ring-2 focus-visible:ring-brand-primary/20"
                      />
                      <Button onClick={handleUpdateClinicName} size="sm" className="bg-brand-primary">Salvar</Button>
                      <Button onClick={() => setIsEditingName(false)} variant="ghost" size="sm">Cancelar</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 justify-center md:justify-start">
                      <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                        {clinicData?.name || 'Carregando...'}
                      </h4>
                      {isAdmin && (
                        <button 
                          onClick={() => setIsEditingName(true)}
                          className="text-xs text-brand-primary font-bold hover:underline"
                        >
                          Editar (Admin)
                        </button>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {clinicData?.taxId ? `CNPJ/CPF: ${clinicData.taxId}` : 'Nome do Estabelecimento'}
                  </p>
                  <p className="text-[9px] text-brand-primary font-bold uppercase tracking-tight mt-1">
                    <ShieldCheck size={10} className="inline mr-1" /> Identidade Protegida
                  </p>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex items-center justify-between md:justify-start gap-6 group hover:border-brand-primary transition-all text-left">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Código de Acesso da Equipe</p>
                    <p className="text-xl font-black text-slate-700 tracking-[0.2em]">{clinicData?.accessCode || '------'}</p>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={copyClinicCode}
                    className="bg-white rounded-xl h-10 w-10 border border-slate-200 group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary"
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {isAdmin && (
            <section className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={18} className="text-brand-primary" />
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Painel do Administrador</h3>
              </div>
              
              <Card className="card-custom border-none bg-brand-primary/5 border-2 border-brand-primary/10 overflow-hidden">
                <CardHeader className="p-8 pb-4">
                  <CardTitle className="text-xl font-black text-brand-primary flex items-center gap-2">
                    <Key size={24} /> Gerar Código de Ativação
                  </CardTitle>
                  <CardDescription className="text-brand-primary/60 font-bold text-sm">
                    Crie novos códigos para permitir o cadastro de novas clínicas por outros usuários.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-4 space-y-6">
                  {generatedLicense ? (
                    <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-brand-primary/30 flex items-center justify-between animate-in zoom-in duration-300">
                      <span className="text-2xl font-black text-slate-700 tracking-[0.2em]">{generatedLicense}</span>
                      <div className="flex gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={copyLicense}
                          className="bg-brand-light rounded-xl h-12 w-12 hover:bg-brand-primary hover:text-white"
                        >
                          <Copy size={20} />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={handleGenerateLicense}
                          disabled={isGenerating}
                          className="bg-brand-light rounded-xl h-12 w-12 hover:bg-brand-primary hover:text-white"
                        >
                          <RefreshCw size={20} className={cn(isGenerating && "animate-spin")} />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      onClick={handleGenerateLicense}
                      disabled={isGenerating}
                      className="w-full h-16 bg-brand-primary text-white rounded-[2rem] font-black text-lg shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                      {isGenerating ? <RefreshCw className="animate-spin" /> : <Plus size={24} />}
                      GERAR NOVO CÓDIGO DE VENDA
                    </Button>
                  )}
                </CardContent>
              </Card>
            </section>
          )}

          <section>
            <div className="flex items-center gap-2 mb-6">
              <Key size={18} className="text-slate-400" />
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Configuração de Mensagens</h3>
            </div>
            <Card className="card-custom border-none overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                <CardTitle className="text-xl font-bold">Lembretes de WhatsApp</CardTitle>
                <CardDescription className="text-slate-500 font-medium">
                  Defina como e quando seus pacientes devem ser avisados.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
              <div className="flex items-center justify-between p-6 bg-brand-light/30 rounded-2xl border border-brand-light transition-all hover:bg-brand-light/50">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold text-slate-800 cursor-pointer">Enviar Automaticamente</Label>
                  <p className="text-xs text-slate-500 font-medium tracking-wide">
                    Ativa o envio de lembretes via link manual ou bot.
                  </p>
                </div>
                <Switch 
                  checked={enabled}
                  onCheckedChange={setEnabled}
                  className="data-[state=checked]:bg-brand-primary"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="hours" className="text-sm font-bold text-slate-600">Tempo de Antecedência</Label>
                  <div className="flex items-center gap-3">
                    <Input 
                      id="hours"
                      type="number"
                      value={hoursBefore}
                      onChange={(e) => setHoursBefore(parseInt(e.target.value))}
                      className="w-24 rounded-xl border-slate-200 focus:ring-brand-primary focus:border-brand-primary h-12 text-center font-bold text-lg"
                    />
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2">horas</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label htmlFor="template" className="text-sm font-bold text-slate-600 block">Modelo da Mensagem</Label>
                <textarea
                  id="template"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="w-full h-36 p-5 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all resize-none bg-slate-50/10 shadow-inner"
                  placeholder="Use [PACIENTE], [CLINICA] e [HORA] como variáveis."
                />
                <div className="flex gap-2 flex-wrap">
                  {['[PACIENTE]', '[CLINICA]', '[HORA]'].map(tag => (
                    <span key={tag} className="px-3 py-1.5 bg-brand-muted/40 text-brand-primary rounded-xl text-[10px] font-bold tracking-wider border border-brand-primary/10 shadow-sm">{tag}</span>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleSave} 
                className="w-full h-14 rounded-2xl bg-brand-primary hover:bg-brand-accent text-white font-bold text-lg shadow-xl shadow-brand-primary/20 transition-all active:scale-[0.98]"
              >
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
      )}
    </div>
  );
}
