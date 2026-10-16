import React from 'react';
import { 
  Printer, 
  Download, 
  X, 
  Copy
} from 'lucide-react';
import { BudgetItem } from '../../types/budget';
import { Patient } from '../../services/patientService';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface BudgetPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  title: string;
  items: BudgetItem[];
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  total: number;
  paymentConditions: string;
  notes: string;
  dentistName?: string;
  clinicName?: string;
}

export function BudgetPrintModal({
  isOpen,
  onClose,
  patient,
  title,
  items,
  subtotal,
  discountAmount,
  discountPercent,
  total,
  paymentConditions,
  notes,
  dentistName = 'Dr(a). Responsável',
  clinicName = 'OralCloud - Gestão Odontológica'
}: BudgetPrintModalProps) {
  if (!isOpen) return null;

  const currentDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const patientCpf = patient.cpf && patient.cpf.trim() ? patient.cpf : 'Não informado';

  // Aciona a impressão nativa com CSS otimizado para A4
  const handlePrint = () => {
    window.print();
  };

  // Gera e baixa um arquivo formatado (.html pronto para impressão e abertura em qualquer navegador ou Word)
  const handleDownloadFile = () => {
    const tableRows = items.length > 0 
      ? items.map(item => {
          const toothStr = item.toothNumber !== null && item.toothNumber !== -1 
            ? `Dente ${item.toothNumber}` 
            : 'Geral (Boca toda)';
          const facesStr = item.faces && item.faces.length > 0 ? ` <span style="font-size: 11px; color: #588157; font-weight: bold;">(Faces: ${item.faces.join('')})</span>` : '';
          const qtyStr = item.quantity > 1 ? ` <span style="font-size: 11px; color: #64748b;">(${item.quantity}x)</span>` : '';
          const priceStr = `R$ ${item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

          return `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 14px; font-weight: 600; color: #1e293b;">${toothStr}</td>
              <td style="padding: 10px 14px; color: #334155;">
                <div style="font-weight: 600;">${item.procedureName}${facesStr}${qtyStr}</div>
                ${item.notes ? `<div style="font-size: 11px; color: #64748b; font-style: italic; margin-top: 2px;">${item.notes}</div>` : ''}
              </td>
              <td style="padding: 10px 14px; text-align: right; font-weight: 700; color: #0f172a;">${priceStr}</td>
            </tr>
          `;
        }).join('')
      : `
        <tr>
          <td colspan="3" style="padding: 24px; text-align: center; color: #94a3b8; font-style: italic;">
            Nenhum procedimento vinculado a este orçamento.
          </td>
        </tr>
      `;

    const discountVal = discountAmount > 0 
      ? discountAmount 
      : (discountPercent > 0 ? (subtotal * discountPercent) / 100 : 0);

    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Orçamento - ${patient.name}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 20px;
      background-color: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #cbd5e1;
      padding: 32px;
      border-radius: 12px;
      background: #ffffff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #3A5A40;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .clinic-title {
      font-size: 20px;
      font-weight: 800;
      color: #3A5A40;
      letter-spacing: -0.5px;
    }
    .doc-type {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 1px;
    }
    .patient-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .patient-title {
      font-size: 11px;
      font-weight: 800;
      color: #3A5A40;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 8px;
    }
    .patient-grid {
      display: grid;
      grid-template-columns: 2fr 1.5fr;
      gap: 12px;
    }
    .patient-item {
      font-size: 13px;
    }
    .patient-item strong {
      color: #475569;
    }
    .budget-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 13px;
    }
    th {
      background-color: #f1f5f9;
      color: #334155;
      text-transform: uppercase;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 10px 14px;
      border-top: 1px solid #cbd5e1;
      border-bottom: 2px solid #cbd5e1;
      text-align: left;
    }
    th.text-right { text-align: right; }
    .totals-box {
      margin-left: auto;
      width: 280px;
      margin-bottom: 24px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin-bottom: 6px;
      color: #475569;
    }
    .total-row.final {
      border-top: 2px solid #e2e8f0;
      padding-top: 8px;
      margin-top: 8px;
      font-size: 16px;
      font-weight: 800;
      color: #3A5A40;
    }
    .section-box {
      background: #fdfdfd;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
      font-size: 12px;
      line-height: 1.5;
    }
    .section-title {
      font-weight: 700;
      color: #334155;
      margin-bottom: 4px;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 48px;
      padding-top: 16px;
    }
    .signature-block {
      width: 45%;
      text-align: center;
      border-top: 1px solid #94a3b8;
      padding-top: 8px;
      font-size: 12px;
      color: #475569;
    }
    .footer {
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      margin-top: 32px;
      border-top: 1px solid #f1f5f9;
      padding-top: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="clinic-title">${clinicName}</div>
        <div class="doc-type">Orçamento & Plano de Tratamento</div>
      </div>
      <div style="text-align: right; font-size: 12px; color: #64748b;">
        <div><strong>Data:</strong> ${currentDate}</div>
        <div><strong>Status:</strong> Em proposta</div>
      </div>
    </div>

    <!-- Identificação do Paciente -->
    <div class="patient-box">
      <div class="patient-title">Dados do Paciente</div>
      <div class="patient-grid">
        <div class="patient-item">
          <strong>Nome do Paciente:</strong> ${patient.name}
        </div>
        <div class="patient-item">
          <strong>CPF:</strong> ${patientCpf}
        </div>
        ${patient.phone ? `
        <div class="patient-item">
          <strong>Telefone:</strong> ${patient.phone}
        </div>` : ''}
        ${patient.birthDate ? `
        <div class="patient-item">
          <strong>Data de Nascimento:</strong> ${patient.birthDate}
        </div>` : ''}
      </div>
    </div>

    <div class="budget-title">📋 ${title || 'Plano de Tratamento Odontológico'}</div>

    <!-- Tabela com 3 colunas: Dente, Procedimento, Valor -->
    <table>
      <thead>
        <tr>
          <th style="width: 25%;">Dente</th>
          <th style="width: 55%;">Procedimento</th>
          <th style="width: 20%;" class="text-right">Valor</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <!-- Resumo Financeiro -->
    <div class="totals-box">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>R$ ${subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
      </div>
      ${discountVal > 0 ? `
      <div class="total-row" style="color: #e11d48;">
        <span>Desconto:</span>
        <span>- R$ ${discountVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
      </div>` : ''}
      <div class="total-row final">
        <span>Valor Total:</span>
        <span>R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
      </div>
    </div>

    <!-- Condições de Pagamento -->
    ${paymentConditions ? `
    <div class="section-box">
      <div class="section-title">Formas e Condições de Pagamento</div>
      <div>${paymentConditions}</div>
    </div>` : ''}

    <!-- Observações -->
    ${notes ? `
    <div class="section-box">
      <div class="section-title">Observações Clínicas / Recomendações</div>
      <div>${notes}</div>
    </div>` : ''}

    <!-- Assinaturas -->
    <div class="signatures">
      <div class="signature-block">
        <strong>${patient.name}</strong><br />
        CPF: ${patientCpf}
      </div>
      <div class="signature-block">
        <strong>${dentistName}</strong><br />
        Cirurgião-Dentista / Responsável
      </div>
    </div>

    <div class="footer">
      Documento gerado pelo sistema OralCloud em ${currentDate}. Este orçamento tem validade de 30 dias.
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const cleanPatientName = patient.name.replace(/[^a-zA-Z0-9]/g, '_');
    link.href = url;
    link.download = `Orcamento_${cleanPatientName}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Arquivo do orçamento gerado e baixado com sucesso!');
  };

  // Copia o resumo em texto formatado
  const handleCopyText = () => {
    const itemsText = items.map((item, idx) => {
      const toothStr = item.toothNumber !== null && item.toothNumber !== -1 ? `Dente ${item.toothNumber}` : 'Geral';
      return `${idx + 1}. [${toothStr}] ${item.procedureName} - R$ ${item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }).join('\n');

    const fullText = 
      `ORÇAMENTO ODONTOLÓGICO - ${clinicName}\n` +
      `Data: ${currentDate}\n\n` +
      `PACIENTE: ${patient.name}\n` +
      `CPF: ${patientCpf}\n\n` +
      `PROCEDIMENTOS:\n` +
      `DENTE | PROCEDIMENTO | VALOR\n` +
      `----------------------------------------\n` +
      itemsText + '\n' +
      `----------------------------------------\n` +
      `VALOR TOTAL: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      (paymentConditions ? `Condições de Pagamento: ${paymentConditions}\n` : '') +
      (notes ? `Observações: ${notes}\n` : '');

    navigator.clipboard.writeText(fullText);
    toast.success('Resumo copiado para a área de transferência!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Barra de Ações Superior do Modal (Oculta na Impressão) */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-light text-brand-primary flex items-center justify-center">
              <Printer size={20} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-800">
                Imprimir / Gerar Arquivo de Orçamento
              </h3>
              <p className="text-xs text-slate-400">
                Visualização do documento pronto para impressão e exportação
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão Copiar */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyText}
              className="rounded-xl text-xs font-bold gap-1.5 h-9"
              title="Copiar dados como texto"
            >
              <Copy size={14} /> Copiar
            </Button>

            {/* Botão Baixar Arquivo */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadFile}
              className="rounded-xl text-xs font-bold gap-1.5 h-9 border-brand-primary/30 text-brand-primary hover:bg-brand-light/30"
              title="Baixar arquivo formatado no computador"
            >
              <Download size={14} /> Baixar Arquivo
            </Button>

            {/* Botão Imprimir Nativo / Salvar PDF */}
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="bg-brand-primary text-white hover:bg-brand-primary/90 rounded-xl text-xs font-bold gap-1.5 h-9 shadow-md shadow-brand-primary/20"
            >
              <Printer size={14} /> Imprimir / PDF
            </Button>

            {/* Fechar */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all ml-1 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Folha do Documento (Visualização A4) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/70 print:p-0 print:bg-white print:overflow-visible">
          <div 
            id="budget-printable-document" 
            className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-10 max-w-3xl mx-auto space-y-6 print:shadow-none print:border-none print:p-0 print:max-w-none"
          >
            {/* Cabeçalho Oficial */}
            <div className="flex items-start justify-between border-b-2 border-brand-primary pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-brand-primary text-white flex items-center justify-center font-black text-sm">
                    OC
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-brand-primary tracking-tight">
                      {clinicName}
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Orçamento Odontológico & Plano de Tratamento
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-right text-xs text-slate-500 space-y-0.5">
                <p><strong>Emissão:</strong> {currentDate}</p>
                <p className="text-[11px] text-slate-400">Validade: 30 dias</p>
              </div>
            </div>

            {/* Dados do Paciente (Nome e CPF solicitados) */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-primary block">
                Identificação do Paciente
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block text-[11px]">Nome do Paciente:</span>
                  <strong className="text-slate-800 text-sm font-black">{patient.name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[11px]">CPF:</span>
                  <strong className="text-slate-800 text-sm font-black">{patientCpf}</strong>
                </div>
                {patient.phone && (
                  <div>
                    <span className="text-slate-400 font-bold block text-[11px]">Telefone de Contato:</span>
                    <span className="text-slate-700 font-bold">{patient.phone}</span>
                  </div>
                )}
                {patient.birthDate && (
                  <div>
                    <span className="text-slate-400 font-bold block text-[11px]">Data de Nascimento:</span>
                    <span className="text-slate-700 font-bold">{patient.birthDate}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Título do Orçamento */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Título do Orçamento
              </span>
              <h3 className="text-sm sm:text-base font-black text-slate-800">
                {title || 'Plano de Tratamento Personalizado'}
              </h3>
            </div>

            {/* TABELA COM AS 3 COLUNAS: Dente, Procedimento, Valor */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <th className="py-3 px-4 font-black uppercase text-[10px] tracking-wider w-1/4">
                      Dente
                    </th>
                    <th className="py-3 px-4 font-black uppercase text-[10px] tracking-wider w-1/2">
                      Procedimento
                    </th>
                    <th className="py-3 px-4 font-black uppercase text-[10px] tracking-wider text-right w-1/4">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-400 italic">
                        Nenhum procedimento vinculado a este orçamento.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const toothLabel = item.toothNumber !== null && item.toothNumber !== -1
                        ? `Dente ${item.toothNumber}`
                        : 'Geral (Boca toda)';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          {/* Coluna 1: Dente */}
                          <td className="py-3 px-4 font-bold text-slate-800">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs">
                              {toothLabel}
                            </span>
                          </td>

                          {/* Coluna 2: Procedimento */}
                          <td className="py-3 px-4 text-slate-700">
                            <div className="font-bold text-slate-800">
                              {item.procedureName}
                              {item.faces && item.faces.length > 0 && (
                                <span className="ml-1.5 text-[10px] font-bold text-brand-primary bg-brand-light px-1.5 py-0.5 rounded">
                                  Faces: {item.faces.join('')}
                                </span>
                              )}
                              {item.quantity > 1 && (
                                <span className="ml-1.5 text-[10px] font-bold text-slate-400">
                                  ({item.quantity}x)
                                </span>
                              )}
                            </div>
                            {item.notes && (
                              <p className="text-[11px] text-slate-400 italic mt-0.5">{item.notes}</p>
                            )}
                          </td>

                          {/* Coluna 3: Valor */}
                          <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                            R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Resumo Financeiro */}
            <div className="flex justify-end">
              <div className="w-full sm:w-72 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500 font-bold">
                  <span>Subtotal:</span>
                  <span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                {(discountAmount > 0 || discountPercent > 0) && (
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Desconto:</span>
                    <span>
                      - R$ {(discountAmount > 0 ? discountAmount : (subtotal * discountPercent) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline text-sm font-black text-slate-900">
                  <span className="text-brand-primary">Valor Total:</span>
                  <span className="text-base text-brand-primary">
                    R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Condições de Pagamento */}
            {paymentConditions && (
              <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 space-y-1 text-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Formas e Condições de Pagamento
                </span>
                <p className="text-slate-700 font-medium whitespace-pre-line leading-relaxed">
                  {paymentConditions}
                </p>
              </div>
            )}

            {/* Observações Clínicas */}
            {notes && (
              <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 space-y-1 text-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Observações Clínicas
                </span>
                <p className="text-slate-700 font-medium whitespace-pre-line leading-relaxed">
                  {notes}
                </p>
              </div>
            )}

            {/* Assinaturas */}
            <div className="grid grid-cols-2 gap-8 pt-10 text-center text-xs">
              <div className="border-t border-slate-300 pt-2 space-y-0.5">
                <p className="font-bold text-slate-800">{patient.name}</p>
                <p className="text-[11px] text-slate-400">CPF: {patientCpf}</p>
                <p className="text-[10px] text-slate-400">Paciente / Responsável</p>
              </div>

              <div className="border-t border-slate-300 pt-2 space-y-0.5">
                <p className="font-bold text-slate-800">{dentistName}</p>
                <p className="text-[11px] text-slate-400">Cirurgião-Dentista</p>
                <p className="text-[10px] text-slate-400">OralCloud</p>
              </div>
            </div>

            {/* Rodapé Informativo */}
            <div className="text-center pt-4 border-t border-slate-100 text-[10px] text-slate-400">
              Documento gerado pelo sistema OralCloud em {currentDate}. Validade da proposta: 30 dias.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
