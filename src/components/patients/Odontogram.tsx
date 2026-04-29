import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Activity, 
  ShieldAlert,
  Save,
  RotateCcw,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { medicalRecordService, OdontogramData, ToothStatus } from '../../services/medicalRecordService';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

interface OdontogramProps {
  patientId: string;
  clinicId: string;
}

const CONDITIONS = [
  { id: 'healthy', label: 'Saudável', icon: CheckCircle2, color: 'text-green-500', bgColor: 'bg-green-50', hoverColor: 'hover:bg-green-100' },
  { id: 'decay', label: 'Cárie', icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-50', hoverColor: 'hover:bg-red-100' },
  { id: 'restored', label: 'Restaurado', icon: Activity, color: 'text-blue-500', bgColor: 'bg-blue-50', hoverColor: 'hover:bg-blue-100' },
  { id: 'missing', label: 'Ausente', icon: XCircle, color: 'text-slate-400', bgColor: 'bg-slate-50', hoverColor: 'hover:bg-slate-100' },
  { id: 'implant', label: 'Implante', icon: ShieldAlert, color: 'text-purple-500', bgColor: 'bg-purple-50', hoverColor: 'hover:bg-purple-100' },
  { id: 'canal', label: 'Canal', icon: Info, color: 'text-orange-500', bgColor: 'bg-orange-50', hoverColor: 'hover:bg-orange-100' },
];

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

interface ToothItemProps {
  num: number;
  teeth: { [key: number]: ToothStatus };
  selectedTooth: number | null;
  onToothClick: (num: number) => void;
}

function ToothItem({ num, teeth, selectedTooth, onToothClick }: ToothItemProps) {
  const status = teeth[num];
  const condition = CONDITIONS.find(c => c.id === status?.condition) || CONDITIONS[0];
  const isSelected = selectedTooth === num;

  return (
    <button
      onClick={() => onToothClick(num)}
      className={cn(
        "w-9 h-12 md:w-12 md:h-16 flex flex-col items-center justify-between p-1 rounded-lg border-2 transition-all relative group",
        isSelected ? "border-brand-primary bg-brand-light ring-4 ring-brand-primary/10 scale-110 z-20" : 
        status?.treatmentPlanned ? "border-green-500 bg-green-50/50 hover:bg-green-50" : 
        "border-slate-100 bg-white hover:border-slate-200"
      )}
    >
      <span className={cn(
        "text-[7px] md:text-[8px] font-black uppercase tracking-tighter",
        isSelected ? "text-brand-primary" : "text-slate-400"
      )}>
        {num}
      </span>
      <div className={cn(
        "flex-1 flex items-center justify-center transition-transform",
        status?.condition ? condition.color : "text-slate-200 group-hover:text-slate-300"
      )}>
        {status?.condition ? (
          <condition.icon size={isSelected ? 20 : 16} className="drop-shadow-sm md:size-[24px]" />
        ) : (
          <CheckCircle2 size={16} className="opacity-40 md:size-[18px]" />
        )}
      </div>
      {status?.treatmentPlanned && (
        <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 md:w-2 md:h-2 bg-orange-500 rounded-full animate-pulse border border-white" />
      )}
    </button>
  );
}

export function Odontogram({ patientId, clinicId }: OdontogramProps) {
  const [teeth, setTeeth] = useState<{ [key: number]: ToothStatus }>({});
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    const unsub = medicalRecordService.subscribeToOdontogram(patientId, clinicId, (data) => {
      try {
        if (data) {
          setTeeth(data.teeth || {});
        }
        setLoading(false);
      } catch (err) {
        console.error("Error processing odontogram data:", err);
        setError("Erro ao processar dados");
        setLoading(false);
      }
    }, (err) => {
      console.error("Subscription error:", err);
      setError("Sem permissão ou erro de conexão");
      setLoading(false);
    });
    
    return () => unsub();
  }, [patientId, clinicId]);

  useEffect(() => {
    setIsEditing(false);
  }, [selectedTooth]);

  const handleToothClick = (toothNum: number) => {
    setSelectedTooth(toothNum === selectedTooth ? null : toothNum);
  };

  const handleUpdateStatus = (condition: string) => {
    if (selectedTooth === null) return;
    
    setTeeth(prev => ({
      ...prev,
      [selectedTooth]: {
        toothNumber: selectedTooth,
        condition,
        notes: prev[selectedTooth]?.notes || '',
        treatmentPlanned: prev[selectedTooth]?.treatmentPlanned || ''
      }
    }));
    // We don't auto-close to allow multiple changes easily
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await medicalRecordService.saveOdontogram({
        patientId,
        clinicId,
        teeth,
        lastUpdated: new Date().toISOString()
      });
      toast.success('Ficha clínica atualizada!');
    } catch (error) {
      toast.error('Erro ao salvar ficha clínica.');
    } finally {
      setSaving(false);
    }
  };

  const currentToothStatus = selectedTooth !== null ? teeth[selectedTooth] : null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="animate-spin w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full"></div>
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Carregando Odontograma...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center">
          <AlertCircle size={32} />
        </div>
        <div>
          <p className="text-lg font-black text-slate-800">{error}</p>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Verifique sua conexão ou permissões</p>
        </div>
        <Button 
          onClick={() => window.location.reload()}
          variant="outline"
          className="rounded-2xl h-11 border-slate-200 font-black"
        >
          TENTAR NOVAMENTE
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
        {/* Odontogram Visual */}
        <Card className="flex-1 card-custom border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-5 md:p-8 border-b border-slate-50">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-center sm:text-left">
                <CardTitle className="text-base md:text-lg font-black text-slate-800">Odontograma Interativo</CardTitle>
                <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Selecione os dentes para registrar diagnóstico</CardDescription>
              </div>
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="w-full sm:w-auto bg-brand-primary text-white rounded-xl md:rounded-2xl h-11 px-6 font-black shadow-lg shadow-brand-primary/20 hover:scale-[1.02] transition-all gap-2"
              >
                {saving ? <RotateCcw size={18} className="animate-spin" /> : <Save size={18} />}
                SALVAR FICHA
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-8 space-y-8 md:space-y-12">
            {/* Upper Teeth */}
            <div className="space-y-4">
              <Label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block text-center">Arcada Superior</Label>
              <div className="grid grid-cols-8 sm:flex sm:flex-wrap justify-center gap-1.5 md:gap-3">
                {UPPER_TEETH.map(num => (
                  <ToothItem 
                    key={num} 
                    num={num} 
                    teeth={teeth} 
                    selectedTooth={selectedTooth} 
                    onToothClick={handleToothClick} 
                  />
                ))}
              </div>
            </div>

            {/* Lower Teeth */}
            <div className="space-y-4">
              <Label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block text-center">Arcada Inferior</Label>
              <div className="grid grid-cols-8 sm:flex sm:flex-wrap justify-center gap-1.5 md:gap-3">
                {LOWER_TEETH.map(num => (
                  <ToothItem 
                    key={num} 
                    num={num} 
                    teeth={teeth} 
                    selectedTooth={selectedTooth} 
                    onToothClick={handleToothClick} 
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tooth Action Panel */}
        <div className="lg:w-80 space-y-6">
          <Card className={cn(
            "card-custom border-none shadow-xl transition-all h-full lg:sticky lg:top-0",
            selectedTooth ? "translate-y-0 opacity-100" : "opacity-70 pointer-events-none hidden lg:block"
          )}>
            <CardHeader className="p-5 md:p-8 bg-slate-50/50">
              <CardTitle className="text-xl font-black text-slate-800 flex items-center justify-between">
                Dente {selectedTooth || '--'}
                {selectedTooth && <span className="text-[10px] font-black text-brand-primary bg-brand-light px-3 py-1 rounded-full uppercase tracking-widest">Selecionado</span>}
              </CardTitle>
              <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Painel de Ação Individual</CardDescription>
            </CardHeader>
            <CardContent className="p-6 md:p-8 space-y-8">
              {!selectedTooth ? (
                <div className="space-y-6">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Plano Geral de Tratamento</Label>
                  
                  {Object.values(teeth).filter(t => t.treatmentPlanned).length === 0 ? (
                    <div className="py-12 text-center space-y-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                        <Activity size={32} />
                      </div>
                      <p className="text-slate-400 font-bold italic text-sm">Nenhum tratamento planejado ainda.</p>
                      <p className="text-[10px] text-slate-300 font-bold uppercase">Clique em um dente no mapa para iniciar</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 scrollbar-hide">
                      {Object.values(teeth)
                        .filter(t => t.treatmentPlanned)
                        .sort((a, b) => a.toothNumber - b.toothNumber)
                        .map(t => (
                          <div 
                            key={t.toothNumber}
                            onClick={() => setSelectedTooth(t.toothNumber)}
                            className="p-3 rounded-xl bg-white border border-slate-100 hover:border-brand-primary/30 hover:bg-brand-light/10 cursor-pointer transition-all flex items-center gap-3 group"
                          >
                            <div className="w-8 h-8 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 group-hover:bg-brand-primary group-hover:text-white transition-colors">
                              {t.toothNumber}
                            </div>
                            <p className="text-xs text-slate-600 font-bold truncate flex-1 leading-none">
                              {t.treatmentPlanned}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Plano de Tratamento</Label>
                    
                    {!isEditing && teeth[selectedTooth]?.treatmentPlanned ? (
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 italic text-xs font-medium text-slate-600 leading-relaxed min-h-[100px]">
                          "{teeth[selectedTooth].treatmentPlanned}"
                        </div>
                        <Button 
                          onClick={() => setIsEditing(true)}
                          variant="outline"
                          className="w-full rounded-xl h-11 border-brand-primary/20 text-brand-primary font-black hover:bg-brand-light transition-all gap-2"
                        >
                          <Activity size={16} />
                          EDITAR PLANO
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <textarea 
                          className="w-full h-40 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all font-medium text-xs resize-none"
                          placeholder="Descreva o que deve ser feito neste dente..."
                          value={teeth[selectedTooth]?.treatmentPlanned || ''}
                          onChange={(e) => setTeeth(prev => ({
                            ...prev,
                            [selectedTooth]: { 
                              ...prev[selectedTooth], 
                              toothNumber: selectedTooth,
                              treatmentPlanned: e.target.value 
                            }
                          }))}
                          autoFocus={isEditing}
                        />
                        <Button 
                          onClick={async () => {
                            await handleSave();
                            setIsEditing(false);
                          }}
                          disabled={saving}
                          className="w-full bg-brand-primary text-white rounded-xl h-11 font-black shadow-lg shadow-brand-primary/10 hover:scale-[1.01] transition-all gap-2"
                        >
                          {saving ? <RotateCcw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                          CONFIRMAR
                        </Button>
                        {isEditing && teeth[selectedTooth]?.treatmentPlanned && (
                          <Button 
                            onClick={() => setIsEditing(false)}
                            variant="ghost"
                            className="w-full h-8 text-[10px] font-black text-slate-400 uppercase tracking-widest"
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={() => setSelectedTooth(null)}
                    variant="ghost"
                    className="w-full rounded-2xl h-10 font-bold text-slate-400 hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest"
                  >
                    CONCLUIR SELEÇÃO
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
