import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  UserPlus, 
  History, 
  Check, 
  X,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  MapPin
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
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
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { useAuth } from '../../contexts/AuthContext';
import { patientService, Patient } from '../../services/patientService';
import { toast } from 'sonner';
import { PatientMedicalRecord } from './PatientMedicalRecord';

export function PatientManagement() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [selectedPatientRecord, setSelectedPatientRecord] = useState<Patient | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<Patient, 'id' | 'clinicId'>>({
    name: '',
    cpf: '',
    birthDate: '',
    phone: '',
    email: '',
    address: '',
    medicalHistory: {
      allergies: '',
      diseases: '',
      medications: ''
    }
  });

  useEffect(() => {
    if (!user?.clinicId) return;
    
    const clinicId = user.clinicId;

    const unsubscribe = patientService.subscribeToPatients(clinicId, (data) => {
      setPatients(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.clinicId]);

  const filteredPatients = useMemo(() => {
    return patients.filter(p => 
      (p.name?.toLowerCase().includes(search.toLowerCase())) || 
      (p.cpf?.includes(search))
    );
  }, [patients, search]);

  const resetForm = () => {
    setFormData({
      name: '',
      cpf: '',
      birthDate: '',
      phone: '',
      email: '',
      address: '',
      medicalHistory: {
        allergies: '',
        diseases: '',
        medications: ''
      }
    });
    setEditingPatient(null);
  };

  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const handleOpenModal = (patient?: Patient) => {
    if (patient) {
      setEditingPatient(patient);
      setFormData({
        name: patient.name,
        cpf: patient.cpf || '',
        birthDate: patient.birthDate || '',
        phone: patient.phone || '',
        email: patient.email || '',
        address: patient.address || '',
        medicalHistory: {
          allergies: patient.medicalHistory?.allergies || '',
          diseases: patient.medicalHistory?.diseases || '',
          medications: patient.medicalHistory?.medications || ''
        }
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const dataToSave = { ...formData, clinicId: user.clinicId };
      
      // Clean up empty medical history to avoid sending empty objects to Firestore
      if (!dataToSave.medicalHistory.allergies && !dataToSave.medicalHistory.diseases && !dataToSave.medicalHistory.medications) {
        delete (dataToSave as any).medicalHistory;
      }

      if (editingPatient?.id) {
        await patientService.updatePatient(editingPatient.id, dataToSave, user.clinicId);
        toast.success('Paciente atualizado com sucesso!');
      } else {
        await patientService.addPatient(dataToSave);
        toast.success('Paciente cadastrado com sucesso!');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving patient:', error);
      let message = 'Erro ao salvar paciente. Tente novamente.';
      if (error.code === 'permission-denied') message = 'Sem permissão para salvar no banco de dados.';
      if (error.code === 'unavailable') message = 'Parece que você está offline.';
      
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?.clinicId) return;
    if (window.confirm('Tem certeza que deseja excluir este paciente?')) {
      try {
        await patientService.deletePatient(id, user.clinicId);
        toast.success('Paciente excluído com sucesso.');
      } catch (error) {
        toast.error('Erro ao excluir paciente.');
      }
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 h-full overflow-y-auto animate-in fade-in duration-500">
      <header className="flex justify-between items-center bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Pacientes</h2>
          <p className="text-slate-500 font-medium">Gerencie o histórico e cadastros dos seus pacientes.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger 
            render={
              <Button onClick={() => handleOpenModal()} className="bg-brand-primary text-white px-6 py-2 rounded-xl font-bold hover:bg-brand-accent transition-all shadow-lg shadow-brand-primary/20 gap-2">
                <Plus size={20} />
                Novo Paciente
              </Button>
            }
          />
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl border-none shadow-2xl">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">
                {editingPatient ? 'Editar Paciente' : 'Cadastro de Paciente'}
              </DialogTitle>
              <DialogDescription className="font-medium text-slate-400">
                Preencha os campos abaixo com os dados completos do paciente.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Check size={12} className="text-brand-primary" /> Informações Básicas
                  </h4>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600">Nome Completo</Label>
                    <Input 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      required 
                      className="bg-bg-main border-none rounded-xl h-12 focus-visible:ring-brand-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600">CPF</Label>
                    <Input 
                      value={formData.cpf} 
                      onChange={e => setFormData({...formData, cpf: maskCPF(e.target.value)})} 
                      maxLength={14}
                      placeholder="000.000.000-00"
                      className="bg-bg-main border-none rounded-xl h-12 focus-visible:ring-brand-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600">Data de Nascimento</Label>
                    <Input 
                      type="date" 
                      value={formData.birthDate} 
                      onChange={e => setFormData({...formData, birthDate: e.target.value})} 
                      className="bg-bg-main border-none rounded-xl h-12 focus-visible:ring-brand-primary"
                    />
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Check size={12} className="text-brand-primary" /> Contato e Endereço
                  </h4>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600">Telefone</Label>
                    <Input 
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: maskPhone(e.target.value)})} 
                      maxLength={15}
                      placeholder="(00) 00000-0000"
                      className="bg-bg-main border-none rounded-xl h-12 focus-visible:ring-brand-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600">E-mail</Label>
                    <Input 
                      type="email" 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})} 
                      className="bg-bg-main border-none rounded-xl h-12 focus-visible:ring-brand-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600">Endereço Completo</Label>
                    <Input 
                      value={formData.address} 
                      onChange={e => setFormData({...formData, address: e.target.value})} 
                      className="bg-bg-main border-none rounded-xl h-12 focus-visible:ring-brand-primary"
                    />
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-50" />

              {/* Medical History */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <History size={12} className="text-brand-secondary" /> Histórico Médico (Anamnese)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600">Alergias</Label>
                    <Input 
                      value={formData.medicalHistory?.allergies || ''} 
                      onChange={e => setFormData({...formData, medicalHistory: {...formData.medicalHistory, allergies: e.target.value}})} 
                      placeholder="Ex: Penicilina, Látex"
                      className="bg-bg-main border-none rounded-xl h-12 focus-visible:ring-brand-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600">Doenças</Label>
                    <Input 
                      value={formData.medicalHistory?.diseases || ''} 
                      onChange={e => setFormData({...formData, medicalHistory: {...formData.medicalHistory, diseases: e.target.value}})} 
                      placeholder="Ex: Diabetes, Hipertensão"
                      className="bg-bg-main border-none rounded-xl h-12 focus-visible:ring-brand-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600">Medicamentos</Label>
                    <Input 
                      value={formData.medicalHistory?.medications || ''} 
                      onChange={e => setFormData({...formData, medicalHistory: {...formData.medicalHistory, medications: e.target.value}})} 
                      placeholder="Uso contínuo"
                      className="bg-bg-main border-none rounded-xl h-12 focus-visible:ring-brand-primary"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-6 border-t border-slate-50">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
                <Button type="submit" className="bg-brand-primary text-white px-8 rounded-xl font-bold hover:bg-brand-accent transition-all shadow-lg shadow-brand-primary/20">
                  {editingPatient ? 'Salvar Alterações' : 'Finalizar Cadastro'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 gap-6">
        <div className="card-custom overflow-hidden">
          <div className="p-6 border-b border-slate-50 bg-slate-50/20 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-3 text-slate-300" size={18} />
              <Input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Buscar por nome ou CPF..." 
                className="pl-12 bg-white border-slate-200 rounded-xl h-11 focus-visible:ring-brand-primary"
              />
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
              <Badge variant="outline" className="bg-white text-slate-500 border-slate-200 px-3 py-1 rounded-lg">
                Total: {patients.length} Pacientes
              </Badge>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/30">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-6">Paciente</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">CPF / Nasc.</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contato</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-slate-400 font-medium">Carregando dados dos pacientes...</TableCell>
                  </TableRow>
                ) : filteredPatients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-slate-400 font-medium">Nenhum paciente encontrado.</TableCell>
                  </TableRow>
                ) : (
                  filteredPatients.map((patient) => (
                    <TableRow key={patient.id} className="hover:bg-slate-50/50 transition-colors group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-brand-muted flex items-center justify-center text-sm font-black text-brand-primary border-2 border-white shadow-sm">
                            {patient.name.charAt(0)}
                          </div>
                          <div 
                            className="cursor-pointer hover:bg-brand-light/20 p-1 rounded-lg transition-all"
                            onClick={() => setSelectedPatientRecord(patient)}
                          >
                            <p className="font-bold text-slate-800 hover:text-brand-primary transition-colors">{patient.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                              <MapPin size={10} className="text-slate-300" /> {patient.address || 'Sem endereço'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-600 flex items-center gap-2">
                             <CreditCard size={12} className="text-slate-300" /> {patient.cpf || '---'}
                          </p>
                          <p className="text-xs font-medium text-slate-400 flex items-center gap-2">
                             <Calendar size={12} className="text-slate-300" /> {patient.birthDate || '---'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-600 flex items-center gap-2">
                             <Phone size={12} className="text-brand-primary/50" /> {patient.phone || 'Sem fone'}
                          </p>
                          <p className="text-xs font-medium text-slate-400 flex items-center gap-2">
                             <Mail size={12} className="text-brand-primary/50" /> {patient.email || '---'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleOpenModal(patient)}
                            className="w-10 h-10 rounded-xl hover:bg-white hover:text-brand-primary hover:shadow-sm"
                          >
                            <Edit2 size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(patient.id!)}
                            className="w-10 h-10 rounded-xl hover:bg-white hover:text-red-500 hover:shadow-sm"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {selectedPatientRecord && (
        <PatientMedicalRecord 
          patient={selectedPatientRecord} 
          onClose={() => setSelectedPatientRecord(null)} 
        />
      )}
    </div>
  );
}
