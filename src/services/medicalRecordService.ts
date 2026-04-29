import { 
  collection, 
  addDoc, 
  updateDoc,
  query, 
  where, 
  onSnapshot,
  deleteDoc,
  doc,
  getDocs
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase-config';
import { auditService, AuditAction } from './auditService';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

export interface Evolution {
  id?: string;
  patientId: string;
  description: string;
  date: string;
  clinicId: string;
  recordedBy?: string;
  recorderId?: string;
}

export interface PatientPhoto {
  id?: string;
  patientId: string;
  url: string;
  caption: string;
  date: string;
  clinicId: string;
}

export interface PatientPayment {
  id?: string;
  patientId: string;
  amount: number;
  description: string;
  date: string;
  status: 'pago' | 'pendente';
  paymentMethod: 'pix' | 'cartão' | 'dinheiro';
  clinicId: string;
}

export interface ToothStatus {
  toothNumber: number;
  condition: string; // e.g., 'healthy', 'decay', 'restored', 'missing', 'implant', 'canal'
  notes?: string;
  treatmentPlanned?: string;
}

export interface OdontogramData {
  id?: string;
  patientId: string;
  clinicId: string;
  teeth: { [key: number]: ToothStatus };
  lastUpdated: string;
}

export interface AnamnesisData {
  id?: string;
  patientId: string;
  clinicId: string;
  questions: { [key: string]: any };
  lastUpdated: string;
}

export const medicalRecordService = {
  // ... existing items ...

  // Anamnesis
  async saveAnamnesis(data: AnamnesisData) {
    try {
      const q = query(
        collection(db, 'anamneses'),
        where('patientId', '==', data.patientId),
        where('clinicId', '==', data.clinicId)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        await updateDoc(doc(db, 'anamneses', docId), {
          questions: data.questions,
          lastUpdated: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'anamneses'), {
          ...data,
          lastUpdated: new Date().toISOString()
        });
      }
      
      await auditService.log(AuditAction.PATIENT_UPDATE, data.clinicId, data.patientId, 'patient', { type: 'anamnesis_update' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'anamneses');
    }
  },

  subscribeToAnamnesis(patientId: string, clinicId: string, callback: (data: AnamnesisData | null) => void) {
    const q = query(
      collection(db, 'anamneses'),
      where('patientId', '==', patientId),
      where('clinicId', '==', clinicId)
    );
    return onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        callback(null);
      } else {
        const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as AnamnesisData;
        callback(data);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'anamneses');
    });
  },

  // Evolutions
  async addEvolution(evolution: Omit<Evolution, 'id'>) {
    try {
      const docRef = await addDoc(collection(db, 'evolutions'), evolution);
      await auditService.log(AuditAction.PATIENT_UPDATE, evolution.clinicId, evolution.patientId, 'patient', { type: 'evolution_add', evolutionId: docRef.id });
      return docRef;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'evolutions');
    }
  },

  async updateEvolution(id: string, data: Partial<Evolution>, clinicId: string, patientId: string) {
    try {
      await updateDoc(doc(db, 'evolutions', id), data);
      await auditService.log(AuditAction.PATIENT_UPDATE, clinicId, patientId, 'patient', { type: 'evolution_update', evolutionId: id });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `evolutions/${id}`);
    }
  },

  async deleteEvolution(id: string, clinicId: string, patientId: string) {
    try {
      await deleteDoc(doc(db, 'evolutions', id));
      await auditService.log(AuditAction.PATIENT_UPDATE, clinicId, patientId, 'patient', { type: 'evolution_delete', evolutionId: id });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `evolutions/${id}`);
    }
  },

  subscribeToEvolutions(patientId: string, clinicId: string, callback: (evolutions: Evolution[]) => void) {
    const q = query(
      collection(db, 'evolutions'),
      where('patientId', '==', patientId),
      where('clinicId', '==', clinicId)
    );
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Evolution[];
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      callback(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'evolutions');
    });
  },

  // Photos
  async uploadPhoto(file: File, clinicId: string) {
    try {
      const storageRef = ref(storage, `patients/${clinicId}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      return getDownloadURL(snapshot.ref);
    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  },

  async addPhoto(photo: Omit<PatientPhoto, 'id'>) {
    try {
      const docRef = await addDoc(collection(db, 'patientPhotos'), photo);
      await auditService.log(AuditAction.PATIENT_UPDATE, photo.clinicId, photo.patientId, 'patient', { type: 'photo_add', photoId: docRef.id });
      return docRef;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'patientPhotos');
    }
  },

  async deletePhoto(id: string, clinicId: string, patientId: string) {
    try {
      await deleteDoc(doc(db, 'patientPhotos', id));
      await auditService.log(AuditAction.PATIENT_UPDATE, clinicId, patientId, 'patient', { type: 'photo_delete', photoId: id });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `patientPhotos/${id}`);
    }
  },

  subscribeToPhotos(patientId: string, clinicId: string, callback: (photos: PatientPhoto[]) => void) {
    const q = query(
      collection(db, 'patientPhotos'),
      where('patientId', '==', patientId),
      where('clinicId', '==', clinicId)
    );
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PatientPhoto[];
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      callback(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'patientPhotos');
    });
  },

  // Payments
  async addPayment(payment: Omit<PatientPayment, 'id'>) {
    try {
      const docRef = await addDoc(collection(db, 'transactions'), {
        ...payment,
        type: 'receita'
      });
      await auditService.log(AuditAction.TRANSACTION_CREATE, payment.clinicId, docRef.id, 'transaction', { patientId: payment.patientId, amount: payment.amount });
      return docRef;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
    }
  },

  subscribeToPayments(patientId: string, clinicId: string, callback: (payments: PatientPayment[]) => void) {
    const q = query(
      collection(db, 'transactions'),
      where('patientId', '==', patientId),
      where('clinicId', '==', clinicId),
      where('type', '==', 'receita')
    );
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PatientPayment[];
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      callback(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });
  },

  subscribeToClinicRevenue(clinicId: string, callback: (payments: PatientPayment[]) => void) {
    const q = query(
      collection(db, 'transactions'),
      where('clinicId', '==', clinicId),
      where('type', '==', 'receita')
    );
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PatientPayment[];
      callback(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });
  },

  // Odontogram
  async saveOdontogram(data: OdontogramData) {
    try {
      const q = query(
        collection(db, 'odontograms'),
        where('patientId', '==', data.patientId),
        where('clinicId', '==', data.clinicId)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        await updateDoc(doc(db, 'odontograms', docId), {
          teeth: data.teeth,
          lastUpdated: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'odontograms'), {
          ...data,
          lastUpdated: new Date().toISOString()
        });
      }
      
      await auditService.log(AuditAction.PATIENT_UPDATE, data.clinicId, data.patientId, 'patient', { type: 'odontogram_update' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'odontograms');
    }
  },

  subscribeToOdontogram(patientId: string, clinicId: string, callback: (data: OdontogramData | null) => void, errorCallback?: (error: any) => void) {
    const q = query(
      collection(db, 'odontograms'),
      where('patientId', '==', patientId),
      where('clinicId', '==', clinicId)
    );
    return onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        callback(null);
      } else {
        const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as OdontogramData;
        callback(data);
      }
    }, (error) => {
      if (errorCallback) {
        errorCallback(error);
      } else {
        handleFirestoreError(error, OperationType.GET, 'odontograms');
      }
    });
  }
};
