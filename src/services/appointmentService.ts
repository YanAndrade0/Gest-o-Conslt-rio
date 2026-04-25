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

  subscribeToAppointments(clinicId: string, role: string, displayName: string, callback: (appointments: Appointment[]) => void) {
    let q = query(
      collection(db, COLLECTION_NAME), 
      where('clinicId', '==', clinicId)
    );

    // If practitioner (member) and NOT admin/secretary, apply filter
    if (role === 'member') {
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
  }
};
