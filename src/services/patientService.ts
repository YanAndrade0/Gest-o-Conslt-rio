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
import { auditService, AuditAction } from './auditService';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

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
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), patient);
      await auditService.log(AuditAction.PATIENT_CREATE, patient.clinicId, docRef.id, 'patient', { name: patient.name });
      return docRef;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    }
  },

  async updatePatient(id: string, patient: Partial<Patient>, clinicId: string) {
    try {
      const patientRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(patientRef, patient);
      await auditService.log(AuditAction.PATIENT_UPDATE, clinicId, id, 'patient', patient);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    }
  },

  async deletePatient(id: string, clinicId: string) {
    try {
      const patientRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(patientRef);
      await auditService.log(AuditAction.PATIENT_DELETE, clinicId, id, 'patient');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    }
  },

  async getPatientsByClinic(clinicId: string) {
    try {
      const q = query(collection(db, COLLECTION_NAME), where('clinicId', '==', clinicId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Patient[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    }
  },

  subscribeToPatients(clinicId: string, callback: (patients: Patient[]) => void) {
    const q = query(collection(db, COLLECTION_NAME), where('clinicId', '==', clinicId));
    return onSnapshot(q, (snapshot) => {
      const patients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Patient[];
      callback(patients);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    });
  }
};
