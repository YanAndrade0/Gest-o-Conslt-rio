import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  getDocs, 
  limit,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase-config';

export interface Clinic {
  id?: string;
  name: string;
  ownerId: string;
  accessCode: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  clinicId: string | null;
  role: 'owner' | 'member';
}

const CLINICS_COL = 'clinics';
const USERS_COL = 'users';
const LICENSE_COL = 'licenseCodes';

export const clinicService = {
  // Generate a random 6-character code
  generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  },

  async generateLicenseCode(): Promise<string> {
    const code = 'REG-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    await setDoc(doc(db, LICENSE_COL, code), {
      code,
      used: false,
      createdAt: new Date().toISOString()
    });
    return code;
  },

  async validateLicenseCode(code: string): Promise<boolean> {
    const docRef = doc(db, LICENSE_COL, code);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() && docSnap.data()?.used === false;
  },

  async createClinic(userId: string, name: string, licenseCode: string, userEmail?: string | null): Promise<string> {
    const isAdmin = userEmail?.toLowerCase() === 'yanandraderfo@gmail.com' || userEmail?.toLowerCase() === 'yandatafox@gmail.com';
    
    // Verify license code only if not admin
    if (!isAdmin) {
      if (!licenseCode) throw new Error('Código de ativação é obrigatório.');
      const isValid = await this.validateLicenseCode(licenseCode);
      if (!isValid) {
        throw new Error('Código de ativação inválido ou já utilizado.');
      }
    }

    const accessCode = this.generateCode();
    const clinicDoc = await addDoc(collection(db, CLINICS_COL), {
      name,
      ownerId: userId,
      accessCode,
      createdAt: new Date().toISOString(),
      isSystemAdminClinic: isAdmin
    });

    // Mark license code as used if not admin
    if (!isAdmin && licenseCode) {
      await updateDoc(doc(db, LICENSE_COL, licenseCode), {
        used: true,
        usedBy: userId,
        usedAt: new Date().toISOString(),
        clinicId: clinicDoc.id
      });
    }

    // Also link the user to this clinic
    await setDoc(doc(db, USERS_COL, userId), {
      uid: userId,
      clinicId: clinicDoc.id,
      role: 'owner'
    });

    return clinicDoc.id;
  },

  async joinClinic(userId: string, accessCode: string): Promise<string> {
    const q = query(
      collection(db, CLINICS_COL), 
      where('accessCode', '==', accessCode.toUpperCase()),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      throw new Error('Código de clínica inválido.');
    }

    const clinicId = querySnapshot.docs[0].id;

    // Link user to this clinic
    await setDoc(doc(db, USERS_COL, userId), {
      uid: userId,
      clinicId,
      role: 'member'
    });

    return clinicId;
  },

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const userRef = doc(db, USERS_COL, userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    return null;
  }
};
