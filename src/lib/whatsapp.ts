/**
 * Utility to generate WhatsApp message links.
 */
export function getWhatsAppLink(phone: string, message: string) {
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export const DEFAULT_REMINDER_TEMPLATE = "Olá [PACIENTE], passando para lembrar da sua consulta na [CLINICA] amanhã às [HORA]. Podemos confirmar?";

export function formatReminder(template: string, data: { patient: string; clinic: string; time: string }) {
  return template
    .replace('[PACIENTE]', data.patient)
    .replace('[CLINICA]', data.clinic)
    .replace('[HORA]', data.time);
}
