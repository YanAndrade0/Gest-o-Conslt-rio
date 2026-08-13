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
  Info,
  Lock
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
import { Card } from '../ui/card';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentService, Appointment } from '../../services/appointmentService';
import { patientService, Patient } from '../../services/patientService';
import { clinicService, UserProfile } from '../../services/clinicService';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { PatientMedicalRecord } from '../patients/PatientMedicalRecord';

const TIME_SLOTS = Array.from({ length: (20 - 8) * 2 + 1 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

export function AppointmentAgenda() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const [selectedPatientRecord, setSelectedPatientRecord] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isPatientListOpen, setIsPatientListOpen] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [isDoctorListOpen, setIsDoctorListOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const patientSearchRef = useRef<HTMLDivElement>(null);
  const doctorSearchRef = useRef<HTMLDivElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    patientId: '',
    procedure: '',
    doctorName: user?.displayName || '',
    time: '09:00',
    duration: '30',
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'marcado' as Appointment['status']
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (patientSearchRef.current && !patientSearchRef.current.contains(event.target as Node)) {
        setIsPatientListOpen(false);
      }
      if (doctorSearchRef.current && !doctorSearchRef.current.contains(event.target as Node)) {
        setIsDoctorListOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user?.clinicId) return;
    const clinicId = user.clinicId;

    const unsubPatients = patientService.subscribeToPatients(clinicId, setPatients);
    const unsubAppointments = appointmentService.subscribeToAppointments(
      clinicId, 
      user?.role || 'member',
      user?.displayName || '',
      (data) => {
        setAppointments(data);
        setLoading(false);
      }
    );

    const unsubMembers = clinicService.subscribeToClinicMembers(clinicId, (members) => {
      // Incluir todos os membros vinculados à clínica na pesquisa inteligente
      setDoctors(members);
    });

    return () => {
      unsubPatients();
      unsubAppointments();
      unsubMembers();
    };
  }, [user?.clinicId]);

  const weekDays = useMemo(() => {
    return [selectedDate];
  }, [selectedDate]);

  const handleNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const handlePrevDay = () => setSelectedDate(prev => subDays(prev, 1));

  const resetForm = () => {
    setFormData({
      patientId: '',
      procedure: '',
      doctorName: user?.displayName || '',
      time: '09:00',
      duration: '30',
      date: format(new Date(), 'yyyy-MM-dd'),
      status: 'marcado'
    });
    setPatientSearch('');
    setIsPatientListOpen(false);
    setDoctorSearch(user?.displayName || '');
    setIsDoctorListOpen(false);
    setEditingAppointment(null);
    setIsConfirmingDelete(false);
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
      date: format(appDate, 'yyyy-MM-dd'),
      status: app.status
    });
    setPatientSearch(app.patientName);
    setDoctorSearch(app.doctorName || '');
    setIsModalOpen(true);
  };

  const canManageAgenda = user?.isMasterAdmin || user?.role === 'owner' || user?.canManageAppointments !== false;
  const canCancelAgenda = user?.isMasterAdmin || user?.role === 'owner' || (user?.canManageAppointments !== false && user?.canCancelAppointments !== false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!canManageAgenda) {
      toast.error('Sua conta não possui permissão para criar ou alterar agendamentos.');
      return;
    }

    const selectedPatient = patients.find(p => p.id === formData.patientId);
    if (!selectedPatient) {
      toast.error('Selecione um paciente');
      return;
    }

    const baseDate = parseISO(formData.date);
    const [hours, minutes] = formData.time.split(':').map(Number);
    const appointmentDate = setMinutes(setHours(baseDate, hours), minutes);

    try {
      if (!user.clinicId) {
        toast.error('Erro: Clínica não identificada no seu perfil.');
        return;
      }

      if (editingAppointment?.id) {
        await appointmentService.updateAppointment(editingAppointment.id, {
          patientId: formData.patientId,
          patientName: selectedPatient.name,
          date: appointmentDate.toISOString(),
          duration: parseInt(formData.duration),
          procedure: formData.procedure,
          doctorName: formData.doctorName,
          status: formData.status
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
          status: formData.status,
          clinicId: user.clinicId
        });
        toast.success('Consulta agendada com sucesso!');
      }
      
      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      console.error(error);
      let errorMessage = 'Erro ao salvar agendamento.';
      
      try {
        // Try to parse the enhanced error JSON
        const errorInfo = JSON.parse(error.message);
        if (errorInfo.error.includes('permission-denied') || errorInfo.error.includes('insufficient permissions')) {
          errorMessage = 'Sem permissão para agendar. Verifique se sua conta está ativa.';
        }
      } catch (e) {
        // Not a JSON error or other issue
      }
      
      toast.error(errorMessage);
    }
  };

  const handleDeleteAppointment = async () => {
    if (!editingAppointment?.id) return;
    
    if (!canCancelAgenda) {
      toast.error('Sua conta não possui permissão para desmarcar ou excluir consultas.');
      return;
    }

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

  const handleUpdateStatus = async (id: string, status: Appointment['status']) => {
    if (!canManageAgenda || (status === 'desmarcado' && !canCancelAgenda)) {
      toast.error('Sua conta não possui permissão para alterar esse status.');
      return;
    }

    try {
      await appointmentService.updateAppointment(id, { status });
      toast.success('Status atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar status.');
    }
  };

  const filteredPatients = useMemo(() => {
    if (!patientSearch) return [];
    return patients.filter(p => 
      p.name.toLowerCase().includes(patientSearch.toLowerCase())
    ).slice(0, 5);
  }, [patients, patientSearch]);

  const filteredDoctors = useMemo(() => {
    const search = doctorSearch.toLowerCase().trim();
    
    // If empty search, we show all members (up to 20)
    if (!search) return doctors.slice(0, 20);
    
    return doctors.filter(d => {
      const name = (d.displayName || 'Doutor(a)').toLowerCase();
      const email = (d.email || '').toLowerCase();
      return name.includes(search) || email.includes(search);
    }).slice(0, 30);
  }, [doctors, doctorSearch]);

  const handleSlotClick = (day: Date, timeStr: string) => {
    if (!canManageAgenda) {
      toast.error('Sua conta não possui permissão para agendar consultas.');
      return;
    }
    setEditingAppointment(null);
    const newDate = format(day, 'yyyy-MM-dd');
    setFormData({
      patientId: '',
      procedure: '',
      doctorName: user?.displayName || '',
      time: timeStr,
      duration: '30',
      date: newDate,
      status: 'marcado'
    });
    setPatientSearch('');
    setIsPatientListOpen(false);
    setDoctorSearch(user?.displayName || '');
    setIsDoctorListOpen(false);
    setIsConfirmingDelete(false);
    setIsModalOpen(true);
  };

  const calculatePosition = (dateStr: string, duration: number) => {
    const date = parseISO(dateStr);
    const startHour = 8;
    const minutesFromStart = (date.getHours() - startHour) * 60 + date.getMinutes();
    
    // Each 30 min slot is 80px (h-20)
    // So 1 minute = 80 / 30 = 2.666px
    const slotHeight = 80;
    const minHeight = slotHeight / 30;
    
    return {
      top: minutesFromStart * minHeight,
      height: duration * minHeight
    };
  };

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(app => isSameDay(parseISO(app.date), date));
  };

  const positionedAppointments = useMemo(() => {
    const dayAppts = appointments.filter(app => isSameDay(parseISO(app.date), selectedDate));
    if (dayAppts.length === 0) return [];

    // Sort by start time (safe conversion)
    const sorted = [...dayAppts].sort((a, b) => {
      const timeA = parseISO(a.date).getTime();
      const timeB = parseISO(b.date).getTime();
      return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
    });

    const result: (Appointment & { left: number; width: number })[] = [];
    
    // Group connected overlapping appointments
    const groups: Appointment[][] = [];
    let activeGroup: Appointment[] = [];
    let groupEndTime = 0;

    sorted.forEach(app => {
      const startTime = parseISO(app.date).getTime();
      const dur = typeof app.duration === 'number' ? app.duration : parseInt(app.duration as any) || 30;
      const endTime = startTime + dur * 60 * 1000;

      if (activeGroup.length > 0 && startTime >= groupEndTime) {
        groups.push(activeGroup);
        activeGroup = [app];
        groupEndTime = endTime;
      } else {
        activeGroup.push(app);
        groupEndTime = Math.max(groupEndTime, endTime);
      }
    });
    if (activeGroup.length > 0) groups.push(activeGroup);

    groups.forEach(group => {
      const columns: Appointment[][] = [];
      group.forEach(app => {
        const appStart = parseISO(app.date).getTime();
        let placed = false;

        for (let i = 0; i < columns.length; i++) {
          const lastInCol = columns[i][columns[i].length - 1];
          const lastDur = typeof lastInCol.duration === 'number' ? lastInCol.duration : parseInt(lastInCol.duration as any) || 30;
          const lastEnd = parseISO(lastInCol.date).getTime() + lastDur * 60 * 1000;
          
          if (appStart >= lastEnd) {
            columns[i].push(app);
            placed = true;
            break;
          }
        }

        if (!placed) columns.push([app]);
      });

      const numCols = columns.length;
      columns.forEach((col, colIndex) => {
        col.forEach(app => {
          result.push({
            ...app,
            left: (colIndex / numCols) * 100,
            width: (1 / numCols) * 100
          });
        });
      });
    });

    console.log('[Agenda] Positioned overlapping appointments:', result);
    return result;
  }, [appointments, selectedDate]);

  return (
    <div className="p-4 md:p-8 space-y-6 h-full overflow-hidden flex flex-col bg-bg-main animate-in fade-in duration-500">
      {!canManageAgenda && (
        <div className="bg-amber-50 border border-amber-200/80 p-3 sm:p-4 rounded-2xl flex items-center gap-3 text-amber-800 text-xs font-bold shadow-sm animate-in fade-in duration-300">
          <Lock size={18} className="shrink-0 text-amber-600" />
          <span>Modo de Leitura na Agenda: Sua conta não possui permissão para agendar ou editar consultas. Entre em contato com o proprietário da clínica caso precise desta permissão.</span>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-center bg-white/70 backdrop-blur-md p-5 rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Agenda Diária</h2>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-white">
          <Button variant="ghost" size="icon" onClick={handlePrevDay} className="rounded-xl hover:bg-white transition-all h-10 w-10">
            <ChevronLeft size={18} />
          </Button>
          <div className="px-4 py-1 flex items-center gap-3 relative">
             <span className="text-sm font-black text-slate-700 capitalize">
              {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </span>
            <Input 
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(parseISO(e.target.value))}
              className="w-10 h-10 p-0 border-none bg-transparent cursor-pointer opacity-0 absolute"
            />
             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-brand-primary">
                <CalendarIcon size={14} />
             </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextDay} className="rounded-xl hover:bg-white transition-all h-10 w-10">
            <ChevronRight size={18} />
          </Button>
        </div>

        <div className="flex items-center gap-1 bg-slate-100/30 p-1 rounded-2xl border border-slate-100">
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-xl text-[11px] font-black uppercase tracking-wider text-slate-500 hover:bg-white h-9 px-3 transition-all"
            onClick={() => setSelectedDate(subDays(new Date(), 1))}
            type="button"
          >
            Ontem
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "rounded-xl text-[11px] font-black uppercase tracking-wider h-9 px-3 transition-all",
              isToday(selectedDate) 
                ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary" 
                : "text-brand-primary hover:bg-brand-light/40"
            )}
            onClick={() => setSelectedDate(new Date())}
            type="button"
          >
            Hoje
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-xl text-[11px] font-black uppercase tracking-wider text-slate-500 hover:bg-white h-9 px-3 transition-all"
            onClick={() => setSelectedDate(addDays(new Date(), 1))}
            type="button"
          >
            Amanhã
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
          <DialogContent className="max-w-md md:max-w-2xl lg:max-w-3xl w-[calc(100%-1.5rem)] bg-white rounded-2xl sm:rounded-[2rem] border-none shadow-2xl p-4 sm:p-5 md:p-6 max-h-[92dvh] flex flex-col overflow-hidden">
            <DialogHeader className="shrink-0 mb-2 sm:mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-brand-light rounded-xl sm:rounded-2xl flex items-center justify-center text-brand-primary shrink-0">
                  <Stethoscope size={20} className="sm:w-5 sm:h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
                    {editingAppointment ? 'Editar Consulta' : 'Agendar Consulta'}
                  </DialogTitle>
                  <DialogDescription className="font-medium text-slate-400 text-xs">
                    {editingAppointment ? 'Altere os detalhes ou desmarque este horário.' : 'Preencha os detalhes para reservar o horário.'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-1 py-1 scrollbar-thin">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {/* Coluna 1: Paciente, Procedimento, Doutor */}
                  <div className="space-y-3">
                    <div className="space-y-1 relative" ref={patientSearchRef}>
                      <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Paciente</Label>
                      <div className="relative group">
                        <Input 
                          placeholder="Comece a digitar o nome do paciente..."
                          value={patientSearch}
                          onChange={(e) => {
                            setPatientSearch(e.target.value);
                            setIsPatientListOpen(true);
                            if (formData.patientId) setFormData({...formData, patientId: ''});
                          }}
                          onFocus={() => setIsPatientListOpen(true)}
                          className="bg-bg-main border-none h-10 sm:h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-brand-primary/20 font-bold text-slate-700 pr-10 text-xs sm:text-sm"
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300">
                          <User size={16} />
                        </div>
                      </div>

                      {isPatientListOpen && filteredPatients.length > 0 && (
                        <Card className="absolute z-50 w-full mt-1 border-none shadow-2xl rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="p-2 space-y-1 bg-white max-h-40 overflow-y-auto">
                            {filteredPatients.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setFormData({...formData, patientId: p.id!});
                                  setPatientSearch(p.name);
                                  setIsPatientListOpen(false);
                                }}
                                className="w-full text-left p-2 rounded-lg hover:bg-brand-light hover:text-brand-primary transition-all flex items-center justify-between group"
                              >
                                <span className="font-bold text-xs sm:text-sm">{p.name}</span>
                                <span className="text-[9px] font-black opacity-0 group-hover:opacity-100 uppercase">Selecionar</span>
                              </button>
                            ))}
                          </div>
                        </Card>
                      )}
                      
                      {formData.patientId && (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">Paciente Selecionado</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Procedimento</Label>
                      <Input 
                        placeholder="Ex: Limpeza, Canal, Avaliação" 
                        value={formData.procedure}
                        onChange={(e) => setFormData({...formData, procedure: e.target.value})}
                        required
                        className="bg-bg-main border-none h-10 sm:h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-brand-primary/20 font-bold text-slate-700 text-xs sm:text-sm"
                      />
                    </div>

                    <div className="space-y-1 relative" ref={doctorSearchRef}>
                      <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Doutor(a) Responsável</Label>
                      <div className="relative group">
                        <Input 
                          placeholder="Nome do dentista..." 
                          value={doctorSearch}
                          onChange={(e) => {
                            setDoctorSearch(e.target.value);
                            setIsDoctorListOpen(true);
                            setFormData({...formData, doctorName: e.target.value});
                          }}
                          onFocus={(e) => {
                            setIsDoctorListOpen(true);
                            e.target.select();
                          }}
                          className="bg-bg-main border-none h-10 sm:h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-brand-primary/20 font-bold text-slate-700 pr-10 text-xs sm:text-sm"
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300">
                          <Stethoscope size={16} />
                        </div>
                      </div>

                      {isDoctorListOpen && filteredDoctors.length > 0 && (
                        <Card className="absolute z-50 w-full mt-1 border-none shadow-2xl rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="p-2 space-y-1 bg-white max-h-40 overflow-y-auto">
                            {filteredDoctors.map(d => (
                              <button
                                key={d.uid}
                                type="button"
                                onClick={() => {
                                  const name = d.displayName || 'Doutor(a)';
                                  setFormData({...formData, doctorName: name});
                                  setDoctorSearch(name);
                                  setIsDoctorListOpen(false);
                                }}
                                className="w-full text-left p-2 rounded-lg hover:bg-brand-light hover:text-brand-primary transition-all flex items-center justify-between group"
                              >
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold text-xs sm:text-sm">{d.displayName || 'Doutor(a)'}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">
                                      {d.role === 'owner' ? 'Proprietário' : 
                                       d.role === 'secretary' ? 'Secretário(a)' : 'Doutor(a)'}
                                    </span>
                                    {d.email && <span className="text-[9px] text-slate-300 font-mono lowercase">{d.email}</span>}
                                  </div>
                                </div>
                                <span className="text-[9px] font-black opacity-0 group-hover:opacity-100 uppercase">Selecionar</span>
                              </button>
                            ))}
                          </div>
                        </Card>
                      )}
                    </div>
                  </div>

                  {/* Coluna 2: Data, Horário, Duração, Status */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Data</Label>
                        <Input 
                          type="date" 
                          value={formData.date}
                          onChange={(e) => setFormData({...formData, date: e.target.value})}
                          className="bg-bg-main border-none h-10 sm:h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-brand-primary/20 font-bold text-xs sm:text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Horário</Label>
                        <Input 
                          type="time" 
                          step="1800"
                          value={formData.time}
                          onChange={(e) => setFormData({...formData, time: e.target.value})}
                          className="bg-bg-main border-none h-10 sm:h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-brand-primary/20 font-bold text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Duração</Label>
                        <Select value={formData.duration} onValueChange={(val) => setFormData({...formData, duration: val})}>
                          <SelectTrigger className="bg-bg-main border-none h-10 sm:h-11 rounded-xl focus:ring-2 focus:ring-brand-primary/20 font-bold text-slate-700 text-xs sm:text-sm">
                            <SelectValue placeholder="Duração" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-slate-100 shadow-2xl rounded-xl">
                            <SelectItem value="15" className="py-2 font-bold text-xs">15 minutos</SelectItem>
                            <SelectItem value="30" className="py-2 font-bold text-xs">30 minutos</SelectItem>
                            <SelectItem value="45" className="py-2 font-bold text-xs">45 minutos</SelectItem>
                            <SelectItem value="60" className="py-2 font-bold text-xs">1 hora</SelectItem>
                            <SelectItem value="90" className="py-2 font-bold text-xs">1h 30min</SelectItem>
                            <SelectItem value="120" className="py-2 font-bold text-xs">2 horas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Status</Label>
                        <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val as Appointment['status']})}>
                          <SelectTrigger className="bg-bg-main border-none h-10 sm:h-11 rounded-xl focus:ring-2 focus:ring-brand-primary/20 font-bold text-slate-700 text-xs sm:text-sm">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-slate-100 shadow-2xl rounded-xl">
                            <SelectItem value="marcado" className="py-2 font-bold text-xs text-blue-600">Marcado</SelectItem>
                            <SelectItem value="confirmado" className="py-2 font-bold text-xs text-green-600">Confirmado</SelectItem>
                            <SelectItem value="aguardando" className="py-2 font-bold text-xs text-orange-600">Aguardando</SelectItem>
                            <SelectItem value="desmarcado" className="py-2 font-bold text-xs text-red-600">Desmarcou</SelectItem>
                            <SelectItem value="finalizado" className="py-2 font-bold text-xs text-slate-600">Atendido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="shrink-0 pt-2.5 mt-2 border-t border-slate-100 bg-white gap-2 flex-col sm:flex-row z-10">
                {editingAppointment && canCancelAgenda && (
                  <Button 
                    type="button" 
                    variant={isConfirmingDelete ? "destructive" : "ghost"}
                    onClick={handleDeleteAppointment}
                    className={cn(
                      "rounded-xl font-bold h-10 sm:h-11 transition-all text-xs w-full sm:w-auto",
                      !isConfirmingDelete && "text-red-500 hover:text-red-600 hover:bg-red-50"
                    )}
                  >
                    {isConfirmingDelete ? 'CONFIRMAR DESMARCAÇÃO?' : 'Desmarcar Consulta'}
                  </Button>
                )}
                <div className="flex gap-2 w-full">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold h-10 sm:h-11 flex-1 text-xs">
                    Voltar
                  </Button>
                  {canManageAgenda ? (
                    <Button type="submit" className="bg-brand-primary text-white rounded-xl font-black h-10 sm:h-11 flex-[2] text-xs shadow-lg shadow-brand-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all">
                      {editingAppointment ? 'SALVAR ALTERAÇÕES' : 'RESERVAR HORÁRIO'}
                    </Button>
                  ) : (
                    <Button type="button" disabled className="bg-slate-200 text-slate-400 rounded-xl font-black h-10 sm:h-11 flex-[2] text-xs cursor-not-allowed">
                      Apenas Leitura
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-auto flex flex-col scrollbar-hide">
        <div className="w-full flex-1 flex flex-col">
          {/* Days Header */}
          <div className="grid grid-cols-[100px_1fr] border-b border-slate-50 bg-slate-50/20 shrink-0">
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
                {format(day, 'EEEE', { locale: ptBR })}
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide bg-white rounded-3xl border border-slate-100 shadow-inner group/grid" ref={scrollContainerRef}>
          <div className="grid grid-cols-[100px_1fr] relative">
            
            {/* Time Indicators Column */}
            <div className="flex flex-col">
              <div className="h-6 bg-slate-50 border-b border-slate-100"></div> {/* Header spacer */}
              {TIME_SLOTS.map((timeStr) => (
                <div key={timeStr} className="h-20 border-r border-b border-slate-50 flex flex-col items-center justify-start p-3 bg-white sticky left-0 z-20">
                  <span className={cn(
                    "font-black text-slate-800 transition-all",
                    timeStr.endsWith(':00') ? "text-xs" : "text-[9px] opacity-30"
                  )}>{timeStr}</span>
                  {timeStr.endsWith(':00') && <span className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">Horário</span>}
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {weekDays.map((day, i) => (
              <div key={i} className="flex flex-col relative border-r border-slate-50 last:border-r-0">
                {/* Day Header (Mini) */}
                <div className={cn(
                  "h-6 flex items-center justify-center border-b border-slate-100 sticky top-0 bg-white z-10",
                  isToday(day) ? "bg-brand-primary/5" : "bg-slate-50"
                )}>
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-widest",
                    isToday(day) ? "text-brand-primary" : "text-slate-400"
                  )}>
                    {format(day, 'EEE', { locale: ptBR })}
                  </span>
                </div>

                {/* Vertical Slot Grid */}
                <div className="relative h-full min-h-[1600px]">
                  {/* Background Lines */}
                  {TIME_SLOTS.map((time) => (
                    <div 
                      key={time} 
                      onClick={() => handleSlotClick(day, time)}
                      className={cn(
                        "h-20 border-b border-slate-50 transition-colors hover:bg-brand-light/5 cursor-pointer",
                        isToday(day) ? "bg-brand-light/2" : ""
                      )}
                    />
                  ))}

                  {/* Absolute Appointments */}
                  {positionedAppointments.map((app) => {
                    const pos = calculatePosition(app.date, app.duration || 30);
                    return (
                      <div 
                        key={app.id} 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditAppointment(app);
                        }}
                        style={{ 
                          top: `${pos.top}px`,
                          height: `${pos.height}px`,
                          left: app.width < 100 ? `calc(${app.left}% + 2px)` : `${app.left}%`,
                          width: app.width < 100 ? `calc(${app.width}% - 4px)` : `${app.width}%`,
                        }}
                        className={cn(
                          "absolute p-1.5 rounded-xl text-[10px] font-bold border-l-4 shadow-md transition-all hover:scale-[1.01] active:scale-[0.98] z-30 overflow-hidden select-none",
                          app.status === 'marcado' ? 'bg-blue-50 border-blue-400 text-blue-700' : 
                          app.status === 'confirmado' ? 'bg-green-50 border-green-400 text-green-700' : 
                          app.status === 'aguardando' ? 'bg-orange-50 border-orange-400 text-orange-700' : 
                          app.status === 'desmarcado' ? 'bg-red-50 border-red-400 text-red-700' : 
                          'bg-slate-50 border-slate-400 text-slate-700'
                        )}
                      >
                         <div className="flex justify-between items-start mb-0.5">
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
                          <span className="text-[7px] opacity-70 shrink-0">{app.duration}m</span>
                        </div>
                        <p className="opacity-70 flex items-center gap-1 text-[8px] truncate">
                           {app.procedure}
                        </p>
                        {(app.duration || 0) >= 30 && (
                          <div className="mt-1 pt-1 border-t border-black/5 flex items-center justify-between">
                            <span className="text-[7px] opacity-60 flex items-center gap-1 truncate max-w-[60%]">
                              <User size={8} className="shrink-0" /> {app.doctorName?.split(' ')[0]}
                            </span>
                            <div className="flex gap-1 shrink-0">
                              {(app.status === 'marcado' || app.status === 'aguardando') && (
                                <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(app.id!, 'confirmado'); }} className="hover:text-green-600 transition-colors"><CheckCircle2 size={10} /></button>
                              )}
                              {app.status !== 'desmarcado' && (
                                <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(app.id!, 'desmarcado'); }} className="hover:text-red-600 transition-colors"><XCircle size={10} /></button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>

      <footer className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-white flex justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Marcado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400"></div>
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Confirmado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-400"></div>
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Aguardando</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400"></div>
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Desmarcou</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-400"></div>
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Atendido</span>
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
