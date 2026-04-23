import { 
  collection, 
  addDoc, 
  updateDoc,
  query, 
  where, 
  onSnapshot,
  orderBy,
  Timestamp,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase-config';

export interface Evolution {
  id?: string;
  patientId: string;
  description: string;
  date: string;
  clinicId: string;
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

export const medicalRecordService = {
  // Evolutions
  async addEvolution(evolution: Omit<Evolution, 'id'>) {
    return addDoc(collection(db, 'evolutions'), evolution);
  },

  async updateEvolution(id: string, data: Partial<Evolution>) {
    return updateDoc(doc(db, 'evolutions', id), data);
  },

  async deleteEvolution(id: string) {
    return deleteDoc(doc(db, 'evolutions', id));
  },

  subscribeToEvolutions(patientId: string, clinicId: string, callback: (evolutions: Evolution[]) => void) {
    const q = query(
      collection(db, 'evolutions'),
      where('patientId', '==', patientId),
      where('clinicId', '==', clinicId)
    );
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Evolution[];
      // Client-side sort to avoid index requirement
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      callback(data);
    }, (error) => {
      console.error("Evolution subscription error:", error);
    });
  },

  // Photos
  async uploadPhoto(file: File, clinicId: string) {
    const storageRef = ref(storage, `patients/${clinicId}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  },

  async addPhoto(photo: Omit<PatientPhoto, 'id'>) {
    return addDoc(collection(db, 'patientPhotos'), photo);
  },

  async deletePhoto(id: string) {
    return deleteDoc(doc(db, 'patientPhotos', id));
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
      console.error("Photos subscription error:", error);
    });
  },

  // Payments (linked to Transactions collection)
  async addPayment(payment: Omit<PatientPayment, 'id'>) {
    return addDoc(collection(db, 'transactions'), {
      ...payment,
      type: 'receita'
    });
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
      console.error("Payments subscription error:", error);
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
      console.error("Clinic revenue subscription error:", error);
    });
  }
};
