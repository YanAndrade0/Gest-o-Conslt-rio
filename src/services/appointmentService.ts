import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs, 
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase-config';

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
    return addDoc(collection(db, COLLECTION_NAME), appointment);
  },

  async updateAppointment(id: string, appointment: Partial<Appointment>) {
    const appointmentRef = doc(db, COLLECTION_NAME, id);
    return updateDoc(appointmentRef, appointment);
  },

  async deleteAppointment(id: string) {
    const appointmentRef = doc(db, COLLECTION_NAME, id);
    return deleteDoc(appointmentRef);
  },

  subscribeToAppointments(clinicId: string, callback: (appointments: Appointment[]) => void) {
    const q = query(
      collection(db, COLLECTION_NAME), 
      where('clinicId', '==', clinicId)
    );
    return onSnapshot(q, (snapshot) => {
      const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Appointment[];
      // Client-side sort to avoid index requirements
      appointments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      callback(appointments);
    });
  },

  async getAppointmentsByPatient(clinicId: string, patientId: string) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('clinicId', '==', clinicId),
      where('patientId', '==', patientId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Appointment[];
  }
};
