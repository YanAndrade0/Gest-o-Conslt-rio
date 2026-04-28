import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { ArrowLeft, Shield, FileText, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Legal = ({ type }: { type: 'terms' | 'privacy' }) => {
  const navigate = useNavigate();

  const content = {
    terms: {
      title: 'Termos de Uso',
      icon: <FileText className="text-brand-primary" size={48} />,
      sections: [
        {
          title: '1. Aceitação dos Termos',
          text: 'Ao acessar e utilizar o OralCloud, você concorda em cumprir estes termos de serviço. O sistema é destinado ao uso profissional odontológico.'
        },
        {
          title: '2. Responsabilidade sobre Dados',
          text: 'A responsabilidade pela precisão dos dados dos pacientes e registros médicos é inteiramente do usuário (dentista ou clínica). O OralCloud provê a infraestrutura de armazenamento, mas não valida informações clínicas.'
        },
        {
          title: '3. Assinaturas e Pagamentos',
          text: 'O acesso ao sistema é baseado em assinaturas. O cancelamento pode ser feito a qualquer momento, sendo mantido o acesso até o fim do período já pago.'
        }
      ]
    },
    privacy: {
      title: 'Política de Privacidade',
      icon: <Shield className="text-brand-primary" size={48} />,
      sections: [
        {
          title: '1. Coleta de Informações',
          text: 'Coletamos dados necessários para a identificação da clínica, gestão de usuários e registros de pacientes. Todos os dados são armazenados de forma criptografada.'
        },
        {
          title: '2. Lei Geral de Proteção de Dados (LGPD)',
          text: 'O OralCloud está em conformidade com a LGPD. O usuário tem direito a solicitar a exportação ou exclusão de seus dados a qualquer momento conforme as normas vigentes.'
        },
        {
          title: '3. Segurança',
          text: 'Utilizamos infraestrutura Google Cloud com múltiplos níveis de segurança física e lógica para garantir que as informações de saúde não sejam acessadas por terceiros.'
        }
      ]
    }
  };

  const current = content[type];

  return (
    <div className="min-h-screen bg-bg-main p-6 lg:p-12 font-sans animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="rounded-full h-12 w-12 p-0 hover:bg-white"
          >
            <ArrowLeft size={24} />
          </Button>
          <div className="flex items-center gap-3">
             <Lock className="text-brand-primary" size={16} />
             <span className="text-xs font-black uppercase tracking-widest text-brand-primary">Sistema Seguro</span>
          </div>
        </div>

        <header className="text-center space-y-6">
          <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl shadow-brand-primary/5">
            {current.icon}
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-800 tracking-tight">{current.title}</h1>
          <p className="text-slate-500 font-medium max-w-xl mx-auto">Última atualização: Abril de 2024</p>
        </header>

        <div className="space-y-6">
          {current.sections.map((section, idx) => (
            <Card key={idx} className="card-custom border-none p-8">
              <CardContent className="p-0 space-y-4">
                <h3 className="text-xl font-bold text-slate-800">{section.title}</h3>
                <p className="text-slate-600 leading-relaxed font-medium">{section.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <footer className="text-center pt-8 border-t border-slate-200">
          <p className="text-sm font-bold text-slate-400">© 2024 OralCloud - Gestão Inteligente para Dentistas</p>
        </footer>
      </div>
    </div>
  );
};
