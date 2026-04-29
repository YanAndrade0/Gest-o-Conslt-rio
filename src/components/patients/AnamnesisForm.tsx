import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Save, 
  RotateCcw, 
  AlertTriangle,
  HeartPulse,
  Activity,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { medicalRecordService, AnamnesisData } from '../../services/medicalRecordService';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

interface AnamnesisFormProps {
  patientId: string;
  clinicId: string;
}

const QUESTIONS = [
  { id: 'motivo', label: 'Qual o principal motivo da sua consulta?', type: 'textarea', category: 'principal' },
  
  { id: 'diabetes', label: 'Possui Diabetes?', type: 'checkbox', category: 'saude_geral' },
  { id: 'hipertensao', label: 'Possui Hipertensão?', type: 'checkbox', category: 'saude_geral' },
  { id: 'alergias', label: 'Possui alguma alergia? (Medicamentos, látex, etc)', type: 'text', category: 'saude_geral' },
  { id: 'cardiaco', label: 'Possui problemas cardíacos?', type: 'checkbox', category: 'saude_geral' },
  { id: 'gravida', label: 'Está grávida?', type: 'checkbox', category: 'saude_geral' },
  { id: 'fumante', label: 'É fumante?', type: 'checkbox', category: 'saude_geral' },
  
  { id: 'medicamentos', label: 'Faz uso de algum medicamento contínuo?', type: 'textarea', category: 'medicamentos' },
  { id: 'cirurgias', label: 'Já passou por alguma cirurgia?', type: 'textarea', category: 'historico' },
  { id: 'hemorragia', label: 'Já teve hemorragia após extração dentária?', type: 'checkbox', category: 'historico' },
  
  { id: 'bruxismo', label: 'Range ou aperta os dentes? (Bruxismo)', type: 'checkbox', category: 'habitos' },
  { id: 'limpeza', label: 'Quantas vezes escova os dentes ao dia?', type: 'text', category: 'habitos' },
  { id: 'observacoes', label: 'Observações Adicionais', type: 'textarea', category: 'outros' },
];

interface QuestionItemProps {
  q: { id: string; label: string; type: string; category: string };
  formData: { [key: string]: any };
  handleToggle: (id: string) => void;
  handleChange: (id: string, value: string) => void;
}

function QuestionItem({ q, formData, handleToggle, handleChange }: QuestionItemProps) {
  switch (q.type) {
    case 'checkbox':
      return (
        <div key={q.id} className="flex items-center space-x-3 p-4 rounded-2xl bg-white border border-slate-100 hover:border-brand-primary/20 transition-all">
          <Checkbox 
            id={q.id} 
            checked={!!formData[q.id]} 
            onCheckedChange={() => handleToggle(q.id)}
            className="rounded-lg border-2 border-slate-200 data-[state=checked]:bg-brand-primary data-[state=checked]:border-brand-primary h-6 w-6"
          />
          <Label htmlFor={q.id} className="text-sm font-bold text-slate-700 cursor-pointer flex-1">{q.label}</Label>
        </div>
      );
    case 'textarea':
      return (
        <div key={q.id} className="space-y-3">
          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{q.label}</Label>
          <textarea 
            className="w-full h-32 p-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all font-medium text-xs resize-none"
            placeholder="Descreva aqui..."
            value={formData[q.id] || ''}
            onChange={(e) => handleChange(q.id, e.target.value)}
          />
        </div>
      );
    default:
      return (
        <div key={q.id} className="space-y-3">
          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{q.label}</Label>
          <input 
            type="text"
            className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all font-medium text-xs"
            placeholder="Resposta..."
            value={formData[q.id] || ''}
            onChange={(e) => handleChange(q.id, e.target.value)}
          />
        </div>
      );
  }
}

export function AnamnesisForm({ patientId, clinicId }: AnamnesisFormProps) {
  const [formData, setFormData] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = medicalRecordService.subscribeToAnamnesis(patientId, clinicId, (data) => {
      if (data) {
        setFormData(data.questions || {});
      }
      setLoading(false);
    });
    return () => unsub();
  }, [patientId, clinicId]);

  const handleToggle = (id: string) => {
    setFormData(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await medicalRecordService.saveAnamnesis({
        patientId,
        clinicId,
        questions: formData,
        lastUpdated: new Date().toISOString()
      });
      toast.success('Anamnese salva com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar anamnese.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="animate-spin w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando Anamnese...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800">Anamnese Odontológica</h2>
          <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Histórico completo de saúde do paciente</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full md:w-auto bg-brand-primary text-white rounded-xl md:rounded-2xl h-12 px-8 font-black shadow-lg shadow-brand-primary/20 hover:scale-[1.02] transition-all gap-2"
        >
          {saving ? <RotateCcw size={18} className="animate-spin" /> : <Save size={18} />}
          SALVAR ANAMNESE
        </Button>
      </div>

      <div className="grid gap-6 md:gap-8">
        {/* Motivo Principal */}
        <Card className="card-custom border-none shadow-sm shadow-slate-100 overflow-hidden bg-white">
          <CardHeader className="bg-brand-light p-5 md:p-6 border-b border-brand-primary/10">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-brand-primary flex items-center justify-center text-white">
                <FileText size={18} />
              </div>
              <CardTitle className="text-base md:text-lg font-black text-slate-800">Queixa Principal</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 md:p-8">
            <QuestionItem 
              q={QUESTIONS.find(q => q.id === 'motivo')!} 
              formData={formData} 
              handleToggle={handleToggle} 
              handleChange={handleChange} 
            />
          </CardContent>
        </Card>

        {/* Saúde Geral */}
        <Card className="card-custom border-none shadow-sm shadow-slate-100 overflow-hidden bg-white">
          <CardHeader className="bg-red-50 p-5 md:p-6 border-b border-red-100">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-red-500 flex items-center justify-center text-white">
                <HeartPulse size={18} />
              </div>
              <CardTitle className="text-base md:text-lg font-black text-slate-800">Saúde Sistêmica</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 md:mb-8">
              {QUESTIONS.filter(q => q.category === 'saude_geral' && q.type === 'checkbox').map(q => (
                <QuestionItem 
                  key={q.id} 
                  q={q} 
                  formData={formData} 
                  handleToggle={handleToggle} 
                  handleChange={handleChange} 
                />
              ))}
            </div>
            <QuestionItem 
              q={QUESTIONS.find(q => q.id === 'alergias')!} 
              formData={formData} 
              handleToggle={handleToggle} 
              handleChange={handleChange} 
            />
          </CardContent>
        </Card>

        {/* Medicamentos e Histórico */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <Card className="card-custom border-none shadow-sm shadow-slate-100 overflow-hidden bg-white">
            <CardHeader className="bg-blue-50 p-5 md:p-6 border-b border-blue-100">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-blue-500 flex items-center justify-center text-white">
                  <Activity size={18} />
                </div>
                <CardTitle className="text-base md:text-lg font-black text-slate-800">Medicamentos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 md:p-8">
              <QuestionItem 
                q={QUESTIONS.find(q => q.id === 'medicamentos')!} 
                formData={formData} 
                handleToggle={handleToggle} 
                handleChange={handleChange} 
              />
            </CardContent>
          </Card>

          <Card className="card-custom border-none shadow-sm shadow-slate-100 overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 p-5 md:p-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-slate-500 flex items-center justify-center text-white">
                  <ClipboardCheck size={18} />
                </div>
                <CardTitle className="text-base md:text-lg font-black text-slate-800">Hábitos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 md:p-8 space-y-6">
              <QuestionItem 
                q={QUESTIONS.find(q => q.id === 'bruxismo')!} 
                formData={formData} 
                handleToggle={handleToggle} 
                handleChange={handleChange} 
              />
              <QuestionItem 
                q={QUESTIONS.find(q => q.id === 'limpeza')!} 
                formData={formData} 
                handleToggle={handleToggle} 
                handleChange={handleChange} 
              />
            </CardContent>
          </Card>
        </div>

        {/* Observações Finais */}
        <Card className="card-custom border-none shadow-sm shadow-slate-100 overflow-hidden bg-white">
          <CardContent className="p-5 md:p-8">
            <QuestionItem 
              q={QUESTIONS.find(q => q.id === 'observacoes')!} 
              formData={formData} 
              handleToggle={handleToggle} 
              handleChange={handleChange} 
            />
          </CardContent>
        </Card>
      </div>

      <div className="py-8 md:py-12 border-t border-slate-100 flex flex-col items-center gap-6">
        <div className="flex items-center gap-2 px-6 py-2 rounded-full bg-orange-50 border border-orange-100">
          <AlertTriangle size={14} className="text-orange-500" />
          <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Informações Confidenciais</span>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full max-w-md bg-brand-primary text-white rounded-2xl h-14 font-black shadow-xl shadow-brand-primary/20 hover:scale-[1.01] transition-all"
        >
          {saving ? <RotateCcw size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
          FINALIZAR E SALVAR ANAMNESE
        </Button>
      </div>
    </div>
  );
}
