import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs, 
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase-config';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';
import { auditService, AuditAction } from './auditService';

export interface Appointment {
  id?: string;
  patientId: string;
  patientName: string;
  date: string; // ISO string
  duration: number; // minutes
  procedure: string;
  status: 'marcado' | 'confirmado' | 'aguardando' | 'desmarcado' | 'finalizado';
  clinicId: string;
  doctorName?: string;
  doctorId?: string;
  reminderSent?: boolean;
}

const COLLECTION_NAME = 'appointments';

export const appointmentService = {
  async addAppointment(appointment: Omit<Appointment, 'id'>) {
    try {
      return await addDoc(collection(db, COLLECTION_NAME), appointment);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    }
  },

  async updateAppointment(id: string, appointment: Partial<Appointment>) {
    try {
      const appointmentRef = doc(db, COLLECTION_NAME, id);
      return await updateDoc(appointmentRef, appointment);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    }
  },

  async deleteAppointment(id: string) {
    try {
      const appointmentRef = doc(db, COLLECTION_NAME, id);
      return await deleteDoc(appointmentRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    }
  },

  subscribeToAppointments(clinicId: string, canViewAllOrRole: boolean | string, displayName: string, callback: (appointments: Appointment[]) => void) {
    let q = query(
      collection(db, COLLECTION_NAME), 
      where('clinicId', '==', clinicId)
    );

    const canViewAll = typeof canViewAllOrRole === 'boolean' 
      ? canViewAllOrRole 
      : (canViewAllOrRole === 'owner' || canViewAllOrRole === 'secretary' || canViewAllOrRole === 'admin');

    // If user cannot view all clinic appointments, restrict query to doctor's own name
    if (!canViewAll && displayName) {
      q = query(q, where('doctorName', '==', displayName));
    }

    return onSnapshot(q, (snapshot) => {
      const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Appointment[];
      // Client-side sort to avoid index requirements
      appointments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      callback(appointments);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    });
  },

  async getAppointmentsByPatient(clinicId: string, patientId: string) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('clinicId', '==', clinicId),
        where('patientId', '==', patientId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Appointment[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    }
  },

  /**
   * Atualiza o nome completo e o ID do doutor responsável em todas as consultas agendadas da clínica.
   */
  async updateDoctorNameInAllAppointments(
    clinicId: string, 
    doctorId: string, 
    newDoctorName: string, 
    previousDoctorName?: string
  ): Promise<number> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('clinicId', '==', clinicId)
      );
      const snapshot = await getDocs(q);
      let updatedCount = 0;
      const cleanNew = newDoctorName.trim();
      const cleanPrev = previousDoctorName?.trim().toLowerCase();

      for (const d of snapshot.docs) {
        const data = d.data() as Appointment;
        const currentDocName = (data.doctorName || '').trim().toLowerCase();
        const currentDocId = data.doctorId;

        const isMatchById = !!currentDocId && currentDocId === doctorId;
        const isMatchByPrevName = !!cleanPrev && (
          currentDocName === cleanPrev || 
          currentDocName.includes(cleanPrev) || 
          cleanPrev.includes(currentDocName)
        );
        const isMatchByNewName = currentDocName === cleanNew.toLowerCase();

        if (isMatchById || isMatchByPrevName || isMatchByNewName) {
          if (data.doctorName !== cleanNew || data.doctorId !== doctorId) {
            await updateDoc(doc(db, COLLECTION_NAME, d.id), {
              doctorName: cleanNew,
              doctorId: doctorId
            });
            updatedCount++;
          }
        }
      }

      if (updatedCount > 0) {
        await auditService.log(
          AuditAction.USER_UPDATE, 
          clinicId, 
          doctorId, 
          'appointment', 
          { action: 'UPDATE_DOCTOR_NAME_ALL_APPOINTMENTS', updatedCount, newDoctorName, previousDoctorName }
        );
      }

      return updatedCount;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, COLLECTION_NAME);
      return 0;
    }
  },

  /**
   * Sincroniza e garante o nome completo dos doutores em todas as consultas marcadas da clínica.
   */
  async syncDoctorNamesInClinicAppointments(
    clinicId: string, 
    members: Array<{ uid: string; displayName?: string; email?: string; role?: string }>
  ): Promise<number> {
    try {
      const isSecretary = (role?: string) => {
        if (!role) return false;
        const r = role.toLowerCase().trim();
        return r === 'secretary' || r === 'secretaria' || r === 'secretária';
      };

      const dentists = members.filter(m => !isSecretary(m.role) && m.displayName);
      if (dentists.length === 0) return 0;

      const q = query(
        collection(db, COLLECTION_NAME),
        where('clinicId', '==', clinicId)
      );
      const snapshot = await getDocs(q);
      let updatedCount = 0;

      for (const d of snapshot.docs) {
        const data = d.data() as Appointment;
        const currentDocName = (data.doctorName || '').trim();
        const currentDocId = data.doctorId;

        // Tentar encontrar dentista por ID
        let matchedDentist = dentists.find(doc => doc.uid === currentDocId);

        // Se não encontrou por ID, tentar por nome
        if (!matchedDentist && currentDocName) {
          const lowerName = currentDocName.toLowerCase();
          
          // Correspondência exata
          matchedDentist = dentists.find(doc => doc.displayName?.toLowerCase().trim() === lowerName);
          
          // Correspondência parcial (ex: "Carlos" para "Dr. Carlos Eduardo Silva")
          if (!matchedDentist) {
            matchedDentist = dentists.find(doc => {
              const dName = (doc.displayName || '').toLowerCase();
              return dName.includes(lowerName) || lowerName.includes(dName);
            });
          }

          // Correspondência pelo primeiro nome sem prefixos Dr./Dra.
          if (!matchedDentist) {
            const firstName = lowerName.replace(/^(dr\.|dra\.|doutor|doutora)\s*/i, '').split(' ')[0];
            if (firstName && firstName.length >= 3) {
              matchedDentist = dentists.find(doc => {
                const dFirst = (doc.displayName || '').toLowerCase().replace(/^(dr\.|dra\.|doutor|doutora)\s*/i, '').split(' ')[0];
                return dFirst === firstName;
              });
            }
          }
        }

        // Se há apenas 1 dentista/dono na clínica e a consulta está sem doutor ou com nome genérico
        if (!matchedDentist && dentists.length === 1) {
          matchedDentist = dentists[0];
        }

        if (matchedDentist && matchedDentist.displayName) {
          const needsNameUpdate = data.doctorName !== matchedDentist.displayName;
          const needsIdUpdate = data.doctorId !== matchedDentist.uid;

          if (needsNameUpdate || needsIdUpdate) {
            await updateDoc(doc(db, COLLECTION_NAME, d.id), {
              doctorName: matchedDentist.displayName,
              doctorId: matchedDentist.uid
            });
            updatedCount++;
          }
        }
      }

      if (updatedCount > 0) {
        await auditService.log(
          AuditAction.USER_UPDATE, 
          clinicId, 
          'sync', 
          'appointment', 
          { action: 'SYNC_ALL_DOCTOR_NAMES_APPOINTMENTS', updatedCount }
        );
      }

      return updatedCount;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, COLLECTION_NAME);
      return 0;
    }
  }
};
