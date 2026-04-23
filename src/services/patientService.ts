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

export interface Patient {
  id?: string;
  name: string;
  cpf?: string;
  birthDate?: string;
  phone?: string;
  email?: string;
  address?: string;
  medicalHistory?: {
    allergies?: string;
    diseases?: string;
    medications?: string;
  };
  clinicId: string;
  totalTreatmentValue?: number;
}

const COLLECTION_NAME = 'patients';

export const patientService = {
  async addPatient(patient: Omit<Patient, 'id'>) {
    return addDoc(collection(db, COLLECTION_NAME), patient);
  },

  async updatePatient(id: string, patient: Partial<Patient>) {
    const patientRef = doc(db, COLLECTION_NAME, id);
    return updateDoc(patientRef, patient);
  },

  async deletePatient(id: string) {
    const patientRef = doc(db, COLLECTION_NAME, id);
    return deleteDoc(patientRef);
  },

  async getPatientsByClinic(clinicId: string) {
    const q = query(collection(db, COLLECTION_NAME), where('clinicId', '==', clinicId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Patient[];
  },

  subscribeToPatients(clinicId: string, callback: (patients: Patient[]) => void) {
    const q = query(collection(db, COLLECTION_NAME), where('clinicId', '==', clinicId));
    return onSnapshot(q, (snapshot) => {
      const patients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Patient[];
      callback(patients);
    });
  }
};
