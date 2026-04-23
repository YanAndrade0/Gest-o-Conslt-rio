import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Stethoscope,
  Info
} from 'lucide-react';
import { 
  format, 
  addDays, 
  subDays, 
  startOfDay, 
  isSameDay, 
  parseISO, 
  setHours, 
  setMinutes, 
  startOfWeek, 
  eachDayOfInterval, 
  endOfWeek,
  isToday,
  startOfHour,
  addHours
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentService, Appointment } from '../../services/appointmentService';
import { patientService, Patient } from '../../services/patientService';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { PatientMedicalRecord } from '../patients/PatientMedicalRecord';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00 to 20:00

export function AppointmentAgenda() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [selectedPatientRecord, setSelectedPatientRecord] = useState<Patient | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    patientId: '',
    procedure: '',
    doctorName: user?.displayName || '',
    time: '09:00',
    duration: '30',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    if (!user?.clinicId) return;
    const clinicId = user.clinicId;

    const unsubPatients = patientService.subscribeToPatients(clinicId, setPatients);
    const unsubAppointments = appointmentService.subscribeToAppointments(clinicId, (data) => {
      setAppointments(data);
      setLoading(false);
    });

    return () => {
      unsubPatients();
      unsubAppointments();
    };
  }, [user?.clinicId]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  const handleNextWeek = () => setSelectedDate(prev => addDays(prev, 7));
  const handlePrevWeek = () => setSelectedDate(prev => subDays(prev, 7));

  const resetForm = () => {
    setFormData({
      patientId: '',
      procedure: '',
      doctorName: user?.displayName || '',
      time: '09:00',
      duration: '30',
      date: format(new Date(), 'yyyy-MM-dd')
    });
    setEditingAppointment(null);
    setIsConfirmingDelete(false);
  };

  const handleSlotClick = (date: Date, hour: number) => {
    resetForm();
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    setFormData({
      ...formData,
      time: timeStr,
      date: format(date, 'yyyy-MM-dd')
    });
    setIsModalOpen(true);
  };

  const handleEditAppointment = (app: Appointment) => {
    const appDate = parseISO(app.date);
    setEditingAppointment(app);
    setIsConfirmingDelete(false); // Reset confirmation state when editing
    setFormData({
      patientId: app.patientId,
      procedure: app.procedure,
      doctorName: app.doctorName || '',
      time: format(appDate, 'HH:mm'),
      duration: app.duration.toString(),
      date: format(appDate, 'yyyy-MM-dd')
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const selectedPatient = patients.find(p => p.id === formData.patientId);
    if (!selectedPatient) {
      toast.error('Selecione um paciente');
      return;
    }

    const baseDate = parseISO(formData.date);
    const [hours, minutes] = formData.time.split(':').map(Number);
    const appointmentDate = setMinutes(setHours(baseDate, hours), minutes);

    try {
      if (editingAppointment?.id) {
        await appointmentService.updateAppointment(editingAppointment.id, {
          patientId: formData.patientId,
          patientName: selectedPatient.name,
          date: appointmentDate.toISOString(),
          duration: parseInt(formData.duration),
          procedure: formData.procedure,
          doctorName: formData.doctorName
        });
        toast.success('Agendamento atualizado!');
      } else {
        await appointmentService.addAppointment({
          patientId: formData.patientId,
          patientName: selectedPatient.name,
          date: appointmentDate.toISOString(),
          duration: parseInt(formData.duration),
          procedure: formData.procedure,
          doctorName: formData.doctorName,
          status: 'pendente',
          clinicId: user.clinicId!
        });
        toast.success('Consulta agendada com sucesso!');
      }
      
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar agendamento.');
    }
  };

  const handleDeleteAppointment = async () => {
    if (!editingAppointment?.id) return;
    
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }

    try {
      await appointmentService.deleteAppointment(editingAppointment.id);
      toast.success('Agendamento removido.');
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Erro ao remover agendamento.');
    }
  };

  const handleUpdateStatus = async (id: string, status: 'confirmado' | 'cancelado' | 'finalizado') => {
    try {
      await appointmentService.updateAppointment(id, { status });
      toast.success('Status atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar status.');
    }
  };

  const getAppointmentsForSlot = (date: Date, hour: number) => {
    return appointments.filter(app => {
      const appDate = parseISO(app.date);
      return isSameDay(appDate, date) && appDate.getHours() === hour;
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-6 h-full overflow-hidden flex flex-col bg-bg-main animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-center bg-white/70 backdrop-blur-md p-5 rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Agenda Semanal</h2>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              {format(weekDays[0], "dd 'de' MMM", { locale: ptBR })} - {format(weekDays[6], "dd 'de' MMM", { locale: ptBR })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-white">
          <Button variant="ghost" size="icon" onClick={handlePrevWeek} className="rounded-xl hover:bg-white transition-all h-10 w-10">
            <ChevronLeft size={18} />
          </Button>
          <div className="px-4 py-1">
            <span className="text-sm font-black text-slate-700 capitalize">
              {format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextWeek} className="rounded-xl hover:bg-white transition-all h-10 w-10">
            <ChevronRight size={18} />
          </Button>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger 
            render={
              <Button className="bg-brand-primary text-white px-8 rounded-2xl font-bold hover:bg-brand-accent transition-all shadow-xl shadow-brand-primary/20 gap-2 h-12">
                <Plus size={20} />
                <span className="hidden md:inline">Novo Agendamento</span>
              </Button>
            }
          />
          <DialogContent className="max-w-md bg-white rounded-[2.5rem] border-none shadow-2xl p-8">
            <DialogHeader>
              <div className="w-14 h-14 bg-brand-light rounded-2xl flex items-center justify-center text-brand-primary mb-4">
                <Stethoscope size={28} />
              </div>
              <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">
                {editingAppointment ? 'Editar Consulta' : 'Agendar Consulta'}
              </DialogTitle>
              <DialogDescription className="font-medium text-slate-400">
                {editingAppointment ? 'Altere os detalhes ou desmarque este horário.' : 'Preencha os detalhes para reservar o horário.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5 pt-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Paciente</Label>
                <Select value={formData.patientId} onValueChange={(val) => setFormData({...formData, patientId: val})}>
                  <SelectTrigger className="bg-bg-main border-none h-14 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 font-bold text-slate-700">
                    <SelectValue placeholder="Selecione um paciente cadastrado" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-100 shadow-2xl rounded-2xl">
                    {patients.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 font-bold italic">Nenhum paciente cadastrado no momento</div>
                    ) : (
                      patients.map(p => (
                        <SelectItem key={p.id} value={p.id!} className="focus:bg-brand-light focus:text-brand-primary font-bold py-3">
                          {p.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Procedimento</Label>
                <Input 
                  placeholder="Ex: Limpeza, Canal, Avaliação" 
                  value={formData.procedure}
                  onChange={(e) => setFormData({...formData, procedure: e.target.value})}
                  required
                  className="bg-bg-main border-none h-14 rounded-2xl focus-visible:ring-2 focus-visible:ring-brand-primary/20 font-bold text-slate-700"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Doutor(a) Responsável</Label>
                <Input 
                  placeholder="Nome do dentista" 
                  value={formData.doctorName}
                  onChange={(e) => setFormData({...formData, doctorName: e.target.value})}
                  className="bg-bg-main border-none h-14 rounded-2xl focus-visible:ring-2 focus-visible:ring-brand-primary/20 font-bold text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Data</Label>
                  <Input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="bg-bg-main border-none h-14 rounded-2xl focus-visible:ring-2 focus-visible:ring-brand-primary/20 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Horário</Label>
                  <Input 
                    type="time" 
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    className="bg-bg-main border-none h-14 rounded-2xl focus-visible:ring-2 focus-visible:ring-brand-primary/20 font-bold"
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 gap-2 flex-col sm:flex-row">
                {editingAppointment && (
                  <Button 
                    type="button" 
                    variant={isConfirmingDelete ? "destructive" : "ghost"}
                    onClick={handleDeleteAppointment}
                    className={cn(
                      "rounded-2xl font-bold h-14 transition-all",
                      !isConfirmingDelete && "text-red-500 hover:text-red-600 hover:bg-red-50"
                    )}
                  >
                    {isConfirmingDelete ? 'CONFIRMAR DESMARCAÇÃO?' : 'Desmarcar Consulta'}
                  </Button>
                )}
                <div className="flex gap-2 flex-1">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-2xl font-bold h-14 flex-1">Voltar</Button>
                  <Button type="submit" className="bg-brand-primary text-white rounded-2xl font-black h-14 flex-[2] shadow-xl shadow-brand-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all">
                    {editingAppointment ? 'SALVAR ALTERAÇÕES' : 'RESERVAR HORÁRIO'}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-auto flex flex-col scrollbar-hide">
        <div className="min-w-[800px] flex-1 flex flex-col">
          {/* Days Header */}
          <div className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-slate-50 bg-slate-50/20 shrink-0">
          <div className="p-4 border-r border-slate-50 flex items-center justify-center">
            <Clock size={16} className="text-slate-300" />
          </div>
          {weekDays.map((day, i) => (
            <div 
              key={i} 
              className={cn(
                "p-4 text-center border-r border-slate-50 last:border-r-0 flex flex-col items-center justify-center gap-1",
                isToday(day) ? "bg-brand-light/20 relative" : ""
              )}
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {format(day, 'EEE', { locale: ptBR })}
              </span>
              <span className={cn(
                "text-lg font-black w-10 h-10 flex items-center justify-center rounded-xl transition-all",
                isToday(day) ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/30" : "text-slate-700"
              )}>
                {format(day, 'dd')}
              </span>
              {isToday(day) && (
                <div className="absolute top-1 right-1">
                  <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Scrollable Grid */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide" ref={scrollContainerRef}>
          <div className="grid grid-cols-[100px_repeat(7,1fr)] min-h-full">
            {HOURS.map((hour) => (
              <React.Fragment key={hour}>
                {/* Time Scale */}
                <div className="border-r border-b border-slate-50 p-4 h-32 flex flex-col items-center justify-start sticky left-0 bg-white z-10">
                  <span className="text-sm font-black text-slate-800">{hour.toString().padStart(2, '0')}:00</span>
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">Horário</span>
                </div>

                {/* Day Columns for this hour */}
                {weekDays.map((day, i) => {
                  const slotAppointments = getAppointmentsForSlot(day, hour);
                  return (
                    <div 
                      key={i} 
                      onClick={() => handleSlotClick(day, hour)}
                      className={cn(
                        "border-r border-b border-slate-50 last:border-r-0 h-32 p-1.5 transition-all relative group cursor-pointer hover:bg-brand-light/5",
                        isToday(day) ? "bg-brand-light/5" : ""
                      )}
                    >
                      {/* Grid Line Visual Aid */}
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-slate-50 opacity-0 group-hover:opacity-100"></div>
                      
                      <div className="h-full w-full rounded-2xl flex flex-col gap-1.5 overflow-y-auto scrollbar-hide">
                        {slotAppointments.length === 0 ? (
                          <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-8 h-8 rounded-xl bg-brand-light flex items-center justify-center text-brand-primary">
                               <Plus size={14} />
                            </div>
                          </div>
                        ) : (
                          slotAppointments.map((app) => (
                            <div 
                              key={app.id} 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditAppointment(app);
                              }}
                              className={cn(
                                "p-2.5 rounded-2xl text-[10px] font-bold border-l-4 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]",
                                app.status === 'pendente' ? 'bg-orange-50/80 border-orange-400 text-orange-700' : 
                                app.status === 'confirmado' ? 'bg-blue-50/80 border-blue-400 text-blue-700' : 
                                app.status === 'finalizado' ? 'bg-green-50/80 border-green-400 text-green-700' : 
                                'bg-red-50/80 border-red-400 text-red-700'
                              )}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span 
                                  className="font-black truncate block pr-2 hover:text-brand-primary cursor-pointer transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const p = patients.find(pat => pat.id === app.patientId);
                                    if (p) setSelectedPatientRecord(p);
                                  }}
                                >
                                  {app.patientName}
                                </span>
                                <div className="flex gap-1 shrink-0">
                                  {app.status === 'pendente' && (
                                    <button 
                                      onClick={() => handleUpdateStatus(app.id!, 'confirmado')}
                                      className="hover:scale-110 transition-transform"
                                    >
                                      <CheckCircle2 size={12} />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleUpdateStatus(app.id!, 'cancelado')}
                                    className="hover:scale-110 transition-transform"
                                  >
                                    <XCircle size={12} />
                                  </button>
                                </div>
                              </div>
                              <p className="opacity-70 flex items-center gap-1">
                                <Clock size={8} /> {format(parseISO(app.date), 'HH:mm')} • {app.duration}m
                              </p>
                              <p className="font-black mt-1 line-clamp-1">{app.procedure}</p>
                              {app.doctorName && (
                                <p className="text-[9px] font-bold text-brand-primary/60 mt-0.5 truncate flex items-center gap-1">
                                  <User size={8} /> {app.doctorName.split(' ')[0]}
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
        </div>
      </div>

      <footer className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-white flex justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-400"></div>
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pendente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Confirmado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400"></div>
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Finalizado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400"></div>
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cancelado</span>
        </div>
      </footer>

      {selectedPatientRecord && (
        <PatientMedicalRecord 
          patient={selectedPatientRecord} 
          onClose={() => setSelectedPatientRecord(null)} 
        />
      )}
    </div>
  );
}
