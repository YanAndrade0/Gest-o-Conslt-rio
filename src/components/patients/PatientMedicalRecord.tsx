import React, { useState, useEffect } from 'react';
import { 
  History, 
  DollarSign, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Calendar,
  User as UserIcon,
  X,
  CreditCard,
  PlusCircle,
  Clock,
  Camera,
  Edit2,
  Save,
  RotateCcw,
  Upload,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  medicalRecordService, 
  Evolution, 
  PatientPhoto, 
  PatientPayment 
} from '../../services/medicalRecordService';
import { Patient, patientService } from '../../services/patientService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { format, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { appointmentService } from '../../services/appointmentService';

interface PatientMedicalRecordProps {
  patient: Patient;
  onClose: () => void;
}

export function PatientMedicalRecord({ patient, onClose }: PatientMedicalRecordProps) {
  const { user } = useAuth();
  const [evolutions, setEvolutions] = useState<Evolution[]>([]);
  const [photos, setPhotos] = useState<PatientPhoto[]>([]);
  const [payments, setPayments] = useState<PatientPayment[]>([]);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const [evolutionToDelete, setEvolutionToDelete] = useState<string | null>(null);
  
  // Forms
  const [evolutionDesc, setEvolutionDesc] = useState('');
  const [paymentData, setPaymentData] = useState({ amount: '', description: '', method: 'pix' as any });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Finances
  const [totalTreatmentValue, setTotalTreatmentValue] = useState<string>(patient.totalTreatmentValue?.toString() || '');
  const [isUpdatingTotal, setIsUpdatingTotal] = useState(false);

  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const treatmentTotal = parseFloat(totalTreatmentValue) || 0;
  const balance = treatmentTotal - totalPaid;

  // Editing state
  const [editingEvoId, setEditingEvoId] = useState<string | null>(null);
  const [editEvoData, setEditEvoData] = useState({ description: '', date: '' });

  useEffect(() => {
    const cid = user?.clinicId || patient.clinicId;
    if (!patient || !patient.id || !cid) return;
    let isMounted = true;
    
    const unsubEvolutions = medicalRecordService.subscribeToEvolutions(patient.id, cid, (data) => {
      if (isMounted) setEvolutions(data);
    });
    const unsubPhotos = medicalRecordService.subscribeToPhotos(patient.id, cid, (data) => {
      if (isMounted) setPhotos(data);
    });
    const unsubPayments = medicalRecordService.subscribeToPayments(patient.id, cid, (data) => {
      if (isMounted) setPayments(data);
    });

    return () => {
      isMounted = false;
      unsubEvolutions();
      unsubPhotos();
      unsubPayments();
    };
  }, [patient?.id, user?.clinicId, patient.clinicId]);

  if (!patient || !patient.id) return null;

  const handleAddEvolution = async (e: React.FormEvent) => {
    e.preventDefault();
    const cid = user?.clinicId || patient.clinicId;
    if (!evolutionDesc.trim() || !cid || !patient.id) return;

    try {
      await medicalRecordService.addEvolution({
        patientId: patient.id,
        description: evolutionDesc,
        date: new Date().toISOString(),
        clinicId: cid
      });

      // Automatically finalize today's appointment if it exists
      try {
        const patientAppointments = await appointmentService.getAppointmentsByPatient(cid, patient.id);
        const today = new Date();
        const todayAppointment = patientAppointments.find(app => isSameDay(parseISO(app.date), today));
        
        if (todayAppointment && todayAppointment.id && todayAppointment.status !== 'finalizado') {
          await appointmentService.updateAppointment(todayAppointment.id, { status: 'finalizado' });
        }
      } catch (appError) {
        console.error('Erro ao atualizar status da consulta:', appError);
        // We don't block the evolution success if this fails
      }

      setEvolutionDesc('');
      toast.success('Evolução registrada!');
    } catch (error) {
      toast.error('Erro ao salvar evolução.');
    }
  };

  const handleUpdateEvolution = async (id: string) => {
    if (!editEvoData.description.trim()) return;
    try {
      await medicalRecordService.updateEvolution(id, {
        description: editEvoData.description,
        date: editEvoData.date
      });
      setEditingEvoId(null);
      toast.success('Evolução atualizada!');
    } catch (error) {
      toast.error('Erro ao atualizar evolução.');
    }
  };

  const handleDeleteEvolution = async (id: string) => {
    try {
      await medicalRecordService.deleteEvolution(id);
      setEditingEvoId(null);
      toast.success('Evolução excluída.');
    } catch (error) {
      toast.error('Erro ao excluir evolução.');
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const cid = user?.clinicId || patient.clinicId;
    if (!paymentData.amount || !cid || !patient.id) return;

    try {
      await medicalRecordService.addPayment({
        patientId: patient.id,
        amount: parseFloat(paymentData.amount),
        description: paymentData.description || 'Consulta/Procedimento',
        date: new Date().toISOString(),
        status: 'pago',
        paymentMethod: paymentData.method,
        clinicId: cid
      });
      setPaymentData({ amount: '', description: '', method: 'pix' });
      toast.success('Pagamento registrado!');
    } catch (error) {
      toast.error('Erro ao salvar pagamento.');
    }
  };

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    const cid = user?.clinicId || patient.clinicId;
    if (!photoFile || !cid || !patient.id) {
      toast.error('Selecione um arquivo primeiro.');
      return;
    }

    setIsUploading(true);
    try {
      const url = await medicalRecordService.uploadPhoto(photoFile, cid);
      await medicalRecordService.addPhoto({
        patientId: patient.id,
        url: url,
        caption: photoCaption,
        date: new Date().toISOString(),
        clinicId: cid
      });
      setPhotoFile(null);
      setPhotoCaption('');
      toast.success('Foto enviada com sucesso!');
    } catch (error: any) {
      console.error('Erro detalhado do upload:', error);
      let errorMessage = 'Erro ao realizar upload da foto.';
      if (error.code === 'storage/unauthorized') {
        errorMessage = 'Erro de permissão no Firebase Storage. Verifique as regras de segurança.';
      } else if (error.code === 'storage/unknown') {
        errorMessage = 'Erro desconhecido. O Firebase Storage foi ativado no console?';
      }
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateTotalValue = async () => {
    if (!patient.id) return;
    setIsUpdatingTotal(true);
    try {
      const value = parseFloat(totalTreatmentValue) || 0;
      await patientService.updatePatient(patient.id, { totalTreatmentValue: value });
      toast.success('Valor total do tratamento atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar valor do tratamento.');
    } finally {
      setIsUpdatingTotal(false);
    }
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onClose();
  };

  const handleDeletePhoto = async (id: string) => {
    try {
      await medicalRecordService.deletePhoto(id);
      setPhotoToDelete(null);
      toast.success('Foto removida.');
    } catch (error) {
      toast.error('Erro ao remover foto.');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={(e) => e.target === e.currentTarget && handleClose(e as any)}
    >
      <div 
        className="bg-bg-main w-full max-w-5xl h-full lg:h-[90vh] rounded-none lg:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-white animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="bg-white p-4 md:p-8 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-brand-light rounded-2xl flex items-center justify-center text-brand-primary">
              <UserIcon size={24} className="md:size-32" />
            </div>
            <div>
              <h2 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight">{patient.name}</h2>
              <div className="flex gap-2 md:gap-4 items-center mt-1">
                <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 md:px-3 py-1 rounded-lg">Prontuário Digital</span>
                <span className="text-[8px] md:text-[10px] font-black text-brand-primary uppercase tracking-widest bg-brand-light px-2 md:px-3 py-1 rounded-lg">{patient.cpf || 'Cpf não informado'}</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-2xl h-12 w-12 hover:bg-slate-50 transition-all">
            <X size={24} className="text-slate-400" />
          </Button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="evolution" className="h-full flex flex-col">
            <div className="bg-white px-4 md:px-8 pb-0 shrink-0 overflow-x-auto scrollbar-hide">
              <TabsList className="bg-slate-50/50 p-1.5 rounded-2xl border border-slate-100 h-auto gap-1 w-max md:w-auto">
                <TabsTrigger value="evolution" className="rounded-xl px-4 md:px-6 py-2 md:py-3 font-bold text-xs md:text-sm data-[state=active]:bg-brand-primary data-[state=active]:text-white transition-all gap-2">
                  <History size={16} className="md:size-[18px]" /> Histórico & Evolução
                </TabsTrigger>
                <TabsTrigger value="payments" className="rounded-xl px-4 md:px-6 py-2 md:py-3 font-bold text-xs md:text-sm data-[state=active]:bg-brand-primary data-[state=active]:text-white transition-all gap-2">
                  <DollarSign size={16} className="md:size-[18px]" /> Pagamentos
                </TabsTrigger>
                <TabsTrigger value="gallery" className="rounded-xl px-4 md:px-6 py-2 md:py-3 font-bold text-xs md:text-sm data-[state=active]:bg-brand-primary data-[state=active]:text-white transition-all gap-2">
                  <Camera size={16} className="md:size-[18px]" /> Galeria de Fotos
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-6 bg-slate-50/30">
              {/* Evolutions Tab */}
              <TabsContent value="evolution" className="m-0 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <Card className="card-custom border-none shadow-sm overflow-hidden border border-white">
                  <CardContent className="p-0">
                    <form onSubmit={handleAddEvolution} className="p-8 space-y-4">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nova Evolução de Tratamento</Label>
                      <textarea 
                        className="w-full h-32 p-6 rounded-3xl bg-slate-50/50 border border-slate-100 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all font-medium text-sm resize-none"
                        placeholder="Descreva o procedimento realizado hoje, materiais utilizados, recomendações..."
                        value={evolutionDesc}
                        onChange={(e) => setEvolutionDesc(e.target.value)}
                        required
                      />
                      <div className="flex justify-end">
                        <Button type="submit" className="bg-brand-primary text-white rounded-2xl px-8 h-12 font-black shadow-lg shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-2">
                          <PlusCircle size={20} /> REGISTRAR EVOLUÇÃO
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-[1px] flex-1 bg-slate-200"></div>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Linha do Tempo</span>
                    <div className="h-[1px] flex-1 bg-slate-200"></div>
                  </div>

                  {evolutions.length === 0 ? (
                    <div className="py-12 text-center space-y-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                        <History size={32} />
                      </div>
                      <p className="text-slate-400 font-bold italic text-sm">Nenhum registro clínico ainda.</p>
                    </div>
                  ) : (
                    evolutions.map((evo) => (
                      <div key={evo.id} className="relative pl-12 before:absolute before:left-[19px] before:top-0 before:bottom-[-24px] before:w-[2px] before:bg-slate-200 last:before:bottom-[24px]">
                        <div className="absolute left-0 top-0 w-10 h-10 bg-white border-4 border-brand-light rounded-xl flex items-center justify-center text-brand-primary shadow-sm z-10">
                          <Clock size={16} />
                        </div>
                        <Card className="card-custom border-none shadow-sm hover:shadow-md transition-all group">
                          <CardContent className="p-6">
                            {editingEvoId === evo.id ? (
                              <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="flex flex-col sm:flex-row gap-4">
                                  <div className="flex-1 space-y-1.5">
                                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Data e Hora</Label>
                                    <Input 
                                      type="datetime-local" 
                                      value={editEvoData.date.slice(0, 16)} 
                                      onChange={(e) => setEditEvoData({ ...editEvoData, date: new Date(e.target.value).toISOString() })}
                                      className="rounded-xl bg-slate-50 border-slate-200 font-bold"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Descrição</Label>
                                  <textarea 
                                    value={editEvoData.description}
                                    onChange={(e) => setEditEvoData({ ...editEvoData, description: e.target.value })}
                                    className="w-full h-24 p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all font-medium text-sm resize-none"
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="rounded-xl text-slate-400 font-bold hover:bg-slate-100"
                                    onClick={() => setEditingEvoId(null)}
                                  >
                                    <RotateCcw size={16} className="mr-2" /> CANCELAR
                                  </Button>

                                  {evolutionToDelete === evo.id ? (
                                    <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-xl animate-in fade-in zoom-in-95 duration-200 border border-red-100">
                                      <span className="text-[10px] font-black text-red-600 uppercase px-2">Excluir?</span>
                                      <Button 
                                        size="sm" 
                                        variant="destructive"
                                        className="h-8 rounded-lg text-[10px] font-black px-3"
                                        onClick={() => {
                                          handleDeleteEvolution(evo.id!);
                                          setEvolutionToDelete(null);
                                        }}
                                      >
                                        SIM
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="ghost"
                                        className="h-8 rounded-lg text-[10px] font-black text-slate-400 hover:bg-white"
                                        onClick={() => setEvolutionToDelete(null)}
                                      >
                                        NÃO
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="rounded-xl border-red-200 text-red-500 font-bold hover:bg-red-50"
                                      onClick={() => setEvolutionToDelete(evo.id!)}
                                    >
                                      <Trash2 size={16} className="mr-2" /> EXCLUIR
                                    </Button>
                                  )}

                                  <Button 
                                    size="sm" 
                                    className="rounded-xl bg-green-500 text-white font-bold shadow-lg shadow-green-500/20"
                                    onClick={() => handleUpdateEvolution(evo.id!)}
                                  >
                                    <Save size={16} className="mr-2" /> SALVAR
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex justify-between items-start mb-4">
                                  <div className="space-y-1">
                                    <span className="block text-xs font-black text-brand-primary uppercase tracking-widest">{format(parseISO(evo.date), "dd 'de' MMM, yyyy", { locale: ptBR })}</span>
                                    <span className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">{format(parseISO(evo.date), "HH:mm")}</span>
                                  </div>
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 rounded-lg text-slate-400 hover:text-brand-primary hover:bg-brand-light"
                                      onClick={() => {
                                        setEditingEvoId(evo.id!);
                                        setEditEvoData({ description: evo.description, date: evo.date });
                                      }}
                                    >
                                      <Edit2 size={14} />
                                    </Button>
                                    
                                    {evolutionToDelete === evo.id ? (
                                      <div className="flex items-center gap-1 bg-white shadow-xl rounded-xl border border-slate-100 p-1 animate-in slide-in-from-right-2 duration-200">
                                        <Button 
                                          size="sm" 
                                          variant="destructive"
                                          className="h-7 px-2 rounded-lg text-[9px] font-black"
                                          onClick={() => {
                                            handleDeleteEvolution(evo.id!);
                                            setEvolutionToDelete(null);
                                          }}
                                        >
                                          SIM
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="ghost"
                                          className="h-7 px-2 rounded-lg text-[9px] font-black text-slate-400"
                                          onClick={() => setEvolutionToDelete(null)}
                                        >
                                          NÃO
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                                        onClick={() => setEvolutionToDelete(evo.id!)}
                                      >
                                        <Trash2 size={14} />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-slate-700 font-medium whitespace-pre-wrap text-sm leading-relaxed">{evo.description}</p>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Payments Tab */}
              <TabsContent value="payments" className="m-0 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                {/* Finance Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <Card className="card-custom bg-white border-none shadow-sm p-6 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 text-brand-primary group-hover:scale-110 transition-transform">
                      <DollarSign size={48} />
                    </div>
                    <div className="space-y-1 relative z-10">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Total do Tratamento</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-400">R$</span>
                        <input 
                          type="number"
                          value={totalTreatmentValue}
                          onChange={(e) => setTotalTreatmentValue(e.target.value)}
                          onBlur={handleUpdateTotalValue}
                          placeholder="0,00"
                          className="text-2xl font-black text-slate-800 tracking-tight bg-transparent border-none focus:ring-0 w-full p-0"
                        />
                      </div>
                      <p className="text-[9px] font-bold text-brand-primary uppercase italic">Clique para editar</p>
                    </div>
                  </Card>

                  <Card className="card-custom bg-green-50/50 border-none shadow-sm p-6 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-green-500 group-hover:scale-110 transition-transform">
                      <PlusCircle size={48} />
                    </div>
                    <div className="space-y-1 relative z-10">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Valor Pago</Label>
                      <p className="text-2xl font-black text-green-600 tracking-tight">
                        R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] font-bold text-green-400 uppercase">Total acumulado</p>
                    </div>
                  </Card>

                  <Card className={cn(
                    "card-custom border-none shadow-sm p-6 overflow-hidden relative group",
                    balance > 0 ? "bg-red-50/50" : "bg-blue-50/50"
                  )}>
                    <div className={cn(
                      "absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform",
                      balance > 0 ? "text-red-500" : "text-blue-500"
                    )}>
                      <Clock size={48} />
                    </div>
                    <div className="space-y-1 relative z-10">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Saldo Devedor</Label>
                      <p className={cn(
                        "text-2xl font-black tracking-tight",
                        balance > 0 ? "text-red-600" : "text-blue-600"
                      )}>
                        R$ {Math.abs(balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className={cn(
                        "text-[9px] font-bold uppercase",
                        balance > 0 ? "text-red-400" : "text-blue-400"
                      )}>
                        {balance > 0 ? 'Pendente' : 'Tratamento quitado'}
                      </p>
                    </div>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-1">
                    <Card className="card-custom border-none shadow-sm sticky top-0">
                      <CardHeader className="p-8">
                        <CardTitle className="text-lg font-black">Registrar Pagamento</CardTitle>
                        <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Entrada de valor</CardDescription>
                      </CardHeader>
                      <CardContent className="p-8 pt-0">
                        <form onSubmit={handleAddPayment} className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Valor (R$)</Label>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="0,00"
                              value={paymentData.amount}
                              onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                              required
                              className="bg-bg-main border-none h-14 rounded-2xl font-bold text-lg"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Descrição</Label>
                            <Input 
                              placeholder="Ex: Provisório, Limpeza..."
                              value={paymentData.description}
                              onChange={(e) => setPaymentData({...paymentData, description: e.target.value})}
                              className="bg-bg-main border-none h-12 rounded-xl font-bold"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Forma de Pagamento</Label>
                            <select 
                              className="w-full bg-bg-main border-none h-12 rounded-xl px-4 font-bold text-sm"
                              value={paymentData.method}
                              onChange={(e) => setPaymentData({...paymentData, method: e.target.value as any})}
                            >
                              <option value="pix">Pix</option>
                              <option value="cartão">Cartão de Crédito/Débito</option>
                              <option value="dinheiro">Dinheiro</option>
                            </select>
                          </div>
                          <Button type="submit" className="w-full bg-brand-primary text-white rounded-2xl h-14 font-black shadow-lg shadow-brand-primary/20 mt-4 transition-all active:scale-95">
                            CONFIRMAR RECEBIMENTO
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Histórico Financeiro</h3>
                    {payments.length === 0 ? (
                      <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 italic text-slate-400 font-bold text-sm">
                        Nenhum pagamento registrado.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {payments.map((p) => (
                          <Card key={p.id} className="card-custom border-none shadow-sm hover:shadow-md transition-all overflow-hidden group">
                            <CardContent className="p-6 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-500 group-hover:scale-110 transition-all">
                                  <CreditCard size={20} />
                                </div>
                                <div>
                                  <p className="text-sm font-black text-slate-800 tracking-tight">{p.description}</p>
                                  <div className="flex gap-3 items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(parseISO(p.date), "dd/MM/yyyy")}</span>
                                    <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest bg-brand-light/50 px-2 rounded-md">{p.paymentMethod}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-black text-green-600 tracking-tight">R$ {p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Quitado</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Gallery Tab */}
              <TabsContent value="gallery" className="m-0 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <Card className="card-custom border-none shadow-sm overflow-hidden max-w-2xl mx-auto">
                  <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-lg font-black">Adicionar Foto ou Exame</CardTitle>
                    <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Anexe imagens ao prontuário</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 pt-0">
                    <form onSubmit={handleAddPhoto} className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Selecione o Arquivo</Label>
                        <div className="relative group">
                          <input 
                            type="file"
                            accept="image/*"
                            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                            className="hidden"
                            id="photo-upload"
                          />
                          <label 
                            htmlFor="photo-upload"
                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-pointer hover:bg-slate-50 hover:border-brand-primary/40 transition-all group"
                          >
                            {photoFile ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-sm font-black text-brand-primary">{photoFile.name}</span>
                                <span className="text-[10px] font-bold text-slate-400 capitalize">{(photoFile.size / 1024 / 1024).toFixed(2)} MB</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <Upload className="text-slate-300 group-hover:text-brand-primary transition-colors" size={28} />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clique para escolher foto</span>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Legenda / Identificação</Label>
                        <Input 
                          placeholder="Ex: Raio-X Panorâmico, Pré-operatório..."
                          value={photoCaption}
                          onChange={(e) => setPhotoCaption(e.target.value)}
                          className="bg-bg-main border-none h-12 rounded-xl font-bold"
                        />
                      </div>
                      <div className="flex gap-4">
                        <Button 
                          type="submit" 
                          disabled={isUploading}
                          className="flex-1 bg-brand-primary text-white rounded-2xl h-14 font-black shadow-lg shadow-brand-primary/20 transition-all active:scale-95 gap-2"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="animate-spin" size={20} /> ENVIANDO...
                            </>
                          ) : (
                            <>
                              <Plus size={20} /> ADICIONAR À GALERIA
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {photos.length === 0 ? (
                  <div className="py-20 text-center space-y-4 bg-white/50 rounded-[3rem] border-4 border-dashed border-slate-100">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                      <ImageIcon size={40} />
                    </div>
                    <p className="text-slate-400 font-bold italic">Nenhuma imagem registrada para este paciente.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {photos.map((photo) => (
                      <Card key={photo.id} className="card-custom border-none shadow-lg overflow-hidden group hover:scale-[1.02] transition-all">
                        <div className="aspect-square bg-slate-100 relative overflow-hidden">
                          <img 
                            src={photo.url} 
                            alt={photo.caption} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/600x600/f8fafc/94a3b8?text=Erro+ao+carregar+imagem';
                            }}
                          />
                          <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 p-4">
                            {photoToDelete === photo.id ? (
                              <div className="bg-white p-4 rounded-2xl shadow-2xl animate-in zoom-in duration-200 flex flex-col gap-2">
                                <p className="text-[10px] font-black text-slate-800 uppercase text-center">Confirmar?</p>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="destructive" className="h-8 rounded-lg text-[10px] font-black" onClick={() => handleDeletePhoto(photo.id!)}>SIM</Button>
                                  <Button size="sm" variant="ghost" className="h-8 rounded-lg text-[10px] font-black" onClick={() => setPhotoToDelete(null)}>NÃO</Button>
                                </div>
                              </div>
                            ) : (
                              <Button 
                                variant="destructive" 
                                size="icon" 
                                onClick={() => setPhotoToDelete(photo.id!)}
                                className="rounded-xl h-12 w-12"
                              >
                                <Trash2 size={20} />
                              </Button>
                            )}
                          </div>
                        </div>
                        <CardContent className="p-6">
                          <h5 className="font-black text-slate-800 text-sm tracking-tight mb-1">{photo.caption || 'Sem legenda'}</h5>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{format(parseISO(photo.date), "dd 'de' MMM, yyyy")}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
