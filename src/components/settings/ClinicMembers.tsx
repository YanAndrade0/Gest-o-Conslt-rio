import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  User, 
  Mail, 
  Share2,
  Copy,
  CheckCircle2,
  ClipboardList,
  ShieldCheck,
  Calendar,
  XCircle,
  Check,
  Lock,
  Settings
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clinicService, UserProfile, Clinic } from '../../services/clinicService';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase-config';

export function ClinicMembers() {
  const { user } = useAuth();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Modal State for permissions
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [memberRole, setMemberRole] = useState<'member' | 'secretary'>('member');
  const [canManageAppts, setCanManageAppts] = useState<boolean>(true);
  const [canCancelAppts, setCanCancelAppts] = useState<boolean>(true);
  const [savingPermissions, setSavingPermissions] = useState(false);

  const isOwnerOrMaster = user?.role === 'owner' || user?.isMasterAdmin;

  useEffect(() => {
    if (!user?.clinicId) return;

    const fetchClinic = async () => {
      const docRef = doc(db, 'clinics', user.clinicId!);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setClinic({ id: docSnap.id, ...docSnap.data() } as Clinic);
      }
    };

    fetchClinic();

    const unsub = clinicService.subscribeToClinicMembers(user.clinicId, (data) => {
      setMembers(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.clinicId]);

  const copyAccessCode = () => {
    if (!clinic?.accessCode) return;
    navigator.clipboard.writeText(clinic.accessCode);
    setCopied(true);
    toast.success('Código copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  const openPermissionModal = (member: UserProfile) => {
    setSelectedMember(member);
    setMemberRole(member.role === 'secretary' ? 'secretary' : 'member');
    setCanManageAppts(member.canManageAppointments !== false);
    setCanCancelAppts(member.canCancelAppointments !== false);
    setIsPermissionModalOpen(true);
  };

  const savePermissions = async () => {
    if (!selectedMember) return;
    setSavingPermissions(true);
    try {
      await clinicService.updateUserProfile(selectedMember.uid, {
        role: memberRole,
        canManageAppointments: canManageAppts,
        canCancelAppointments: canCancelAppts
      });
      toast.success(`Permissões de ${selectedMember.displayName || 'membro'} atualizadas com sucesso!`);
      setIsPermissionModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar permissões:', err);
      toast.error('Erro ao atualizar permissões do membro.');
    } finally {
      setSavingPermissions(false);
    }
  };

  const getPermissionBadge = (member: UserProfile) => {
    if (member.role === 'owner') return null;
    const canManage = member.canManageAppointments !== false;
    const canCancel = member.canCancelAppointments !== false;

    if (!canManage) {
      return (
        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200/60 text-[9px] font-black uppercase tracking-wider rounded-md flex items-center gap-1">
          <Lock size={10} /> Agenda Bloqueada
        </span>
      );
    }

    if (!canCancel) {
      return (
        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 text-[9px] font-black uppercase tracking-wider rounded-md flex items-center gap-1">
          <Calendar size={10} /> Agendar sem Exclusão
        </span>
      );
    }

    return (
      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[9px] font-black uppercase tracking-wider rounded-md flex items-center gap-1">
        <ShieldCheck size={10} /> Agenda Liberação Total
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return (
          <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-[10px] font-black uppercase tracking-widest rounded-md flex items-center gap-1">
            <Shield size={10} /> Proprietário
          </span>
        );
      case 'secretary':
        return (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-md flex items-center gap-1">
            <ClipboardList size={10} /> Secretaria
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-brand-secondary/10 text-brand-secondary text-[10px] font-black uppercase tracking-widest rounded-md flex items-center gap-1">
            <User size={10} /> Dentista
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 bg-gradient-to-br from-brand-primary to-brand-accent text-white border-none rounded-[2rem] shadow-xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <CardHeader className="relative z-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-2">
              <UserPlus size={24} />
            </div>
            <CardTitle className="text-xl font-black tracking-tight">Convidar Equipe</CardTitle>
            <CardDescription className="text-white/70 font-medium text-xs">Compartilhe o código abaixo para que novos membros se vinculem à sua clínica.</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 pt-0">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Código de Acesso</span>
                {copied && <span className="text-[10px] font-black text-white flex items-center gap-1 animate-in zoom-in"><CheckCircle2 size={10} /> Copiado</span>}
              </div>
              <div className="text-3xl font-black tracking-[0.2em] text-center py-2">
                {clinic?.accessCode || '------'}
              </div>
              <Button 
                onClick={copyAccessCode}
                variant="ghost" 
                className="w-full bg-white text-brand-primary hover:bg-slate-100 rounded-xl font-bold h-10 gap-2"
              >
                <Copy size={16} /> Copiar Código
              </Button>
            </div>
            <p className="mt-4 text-[9px] font-bold text-white/50 uppercase tracking-widest text-center">Os membros que usarem este código serão vinculados à clínica "{clinic?.name}"</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col">
          <CardHeader className="border-b border-slate-50 bg-slate-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
                  <Users size={20} />
                </div>
                <div>
                  <CardTitle className="text-lg font-black text-slate-800">Membros da Clínica</CardTitle>
                  <CardDescription className="font-medium text-slate-400 text-xs">Profissionais e equipe vinculados.</CardDescription>
                </div>
              </div>
              <div className="bg-brand-light px-3 py-1 rounded-full">
                <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">{members.length} {members.length === 1 ? 'Membro' : 'Membros'}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto max-h-[400px] scrollbar-hide">
            {loading ? (
              <div className="p-12 text-center space-y-4">
                <div className="w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mx-auto"></div>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Carregando lista...</p>
              </div>
            ) : members.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <Users size={48} className="mx-auto text-slate-100" />
                <p className="text-slate-400 font-bold">Nenhum membro encontrado.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {members.map((member) => (
                  <div key={member.uid} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-brand-muted flex items-center justify-center text-brand-primary font-black border border-white shadow-sm overflow-hidden flex-shrink-0">
                         {member.displayName ? member.displayName.charAt(0).toUpperCase() : <User size={20} />}
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-700 truncate">{member.displayName || 'Usuário'}</h4>
                          {member.uid === user?.uid && (
                            <span className="text-[8px] font-black italic text-brand-primary uppercase">(Você)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <Mail size={12} />
                          <span className="text-xs font-medium truncate">{member.email || 'Sem e-mail'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          {getRoleBadge(member.role)}
                        </div>
                        {getPermissionBadge(member)}
                      </div>
                      
                      {isOwnerOrMaster && member.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPermissionModal(member)}
                          className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-brand-light hover:text-brand-primary font-bold text-xs gap-1.5 transition-all"
                          title="Gerenciar Permissões da Agenda"
                        >
                          <Settings size={14} />
                          <span className="hidden sm:inline">Permissões</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <div className="p-4 bg-slate-50/50 border-t border-slate-50 flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-light rounded-lg flex items-center justify-center text-brand-primary">
              <ShieldCheck size={16} />
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
              O proprietário da clínica pode controlar individualmente quais membros têm permissão para agendar, editar ou desmarcar consultas.
            </p>
          </div>
        </Card>
      </div>

      {/* Modal de Configuração de Permissões do Membro */}
      <Dialog open={isPermissionModalOpen} onOpenChange={setIsPermissionModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-[2rem] border-none shadow-2xl p-6">
          <DialogHeader className="mb-4">
            <div className="w-12 h-12 bg-brand-light rounded-2xl flex items-center justify-center text-brand-primary mb-3">
              <ShieldCheck size={24} />
            </div>
            <DialogTitle className="text-xl font-black text-slate-800 tracking-tight">
              Permissões de Acesso
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-400 text-xs">
              Gerencie a função e as autorizações de agendamento de <span className="font-bold text-slate-700">{selectedMember?.displayName || 'este membro'}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Seletor de Função */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Função na Clínica</Label>
              <Select value={memberRole} onValueChange={(val: 'member' | 'secretary') => setMemberRole(val)}>
                <SelectTrigger className="w-full bg-slate-50 border-slate-200 h-11 rounded-xl font-bold text-slate-700">
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl">
                  <SelectItem value="member">Dentista / Profissional de Saúde</SelectItem>
                  <SelectItem value="secretary">Secretária / Recepção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Permissão 1: Agendar e Editar Consultas */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-brand-primary" />
                  <span className="text-xs font-black text-slate-700">Agendar e Editar Consultas</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-snug">
                  Permite criar novos agendamentos e alterar detalhes de consultas existentes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextVal = !canManageAppts;
                  setCanManageAppts(nextVal);
                  if (!nextVal) setCanCancelAppts(false);
                }}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 cursor-pointer",
                  canManageAppts ? "bg-brand-primary" : "bg-slate-300"
                )}
              >
                <div className={cn(
                  "w-5 h-5 bg-white rounded-full shadow-md transition-transform flex items-center justify-center text-[10px]",
                  canManageAppts ? "translate-x-6 text-brand-primary" : "translate-x-0 text-slate-400"
                )}>
                  {canManageAppts ? <Check size={12} /> : <XCircle size={12} />}
                </div>
              </button>
            </div>

            {/* Permissão 2: Desmarcar / Excluir Consultas */}
            <div className={cn(
              "p-4 rounded-2xl border transition-all flex items-start justify-between gap-3",
              canManageAppts ? "bg-slate-50 border-slate-100" : "bg-slate-100/50 border-slate-200/50 opacity-50 pointer-events-none"
            )}>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <XCircle size={16} className="text-rose-500" />
                  <span className="text-xs font-black text-slate-700">Desmarcar / Excluir Consultas</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-snug">
                  Permite cancelar ou remover horários previamente agendados na agenda da clínica.
                </p>
              </div>
              <button
                type="button"
                disabled={!canManageAppts}
                onClick={() => setCanCancelAppts(!canCancelAppts)}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 cursor-pointer",
                  canCancelAppts ? "bg-brand-primary" : "bg-slate-300"
                )}
              >
                <div className={cn(
                  "w-5 h-5 bg-white rounded-full shadow-md transition-transform flex items-center justify-center text-[10px]",
                  canCancelAppts ? "translate-x-6 text-brand-primary" : "translate-x-0 text-slate-400"
                )}>
                  {canCancelAppts ? <Check size={12} /> : <XCircle size={12} />}
                </div>
              </button>
            </div>
          </div>

          <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsPermissionModalOpen(false)}
              className="w-full sm:w-auto rounded-xl font-bold h-11 border-slate-200 text-slate-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={savePermissions}
              disabled={savingPermissions}
              className="w-full sm:w-auto bg-brand-primary text-white hover:bg-brand-accent rounded-xl font-bold h-11 px-6 shadow-lg shadow-brand-primary/20"
            >
              {savingPermissions ? 'Salvando...' : 'Salvar Permissões'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
