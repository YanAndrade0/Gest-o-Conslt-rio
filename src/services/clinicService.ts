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
  getDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase-config';
import { auditService, AuditAction } from './auditService';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

export interface Clinic {
  id?: string;
  name: string;
  ownerId: string;
  accessCode: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email?: string;
  clinicId: string | null;
  role: 'owner' | 'member' | 'secretary';
  displayName?: string;
  lastAccess?: string;
  userAgent?: string;
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
    try {
      const code = 'REG-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      await setDoc(doc(db, LICENSE_COL, code), {
        code,
        used: false,
        createdAt: new Date().toISOString()
      });
      return code;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, LICENSE_COL);
    }
  },

  async validateLicenseCode(code: string): Promise<boolean> {
    try {
      const docRef = doc(db, LICENSE_COL, code);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() && docSnap.data()?.used === false;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${LICENSE_COL}/${code}`);
    }
  },

  async createClinic(userId: string, name: string, licenseCode: string, userEmail?: string | null, displayName?: string, taxId?: string): Promise<string> {
    const isAdmin = userEmail?.toLowerCase() === 'yanandraderfo@gmail.com' || userEmail?.toLowerCase() === 'yandatafox@gmail.com';
    
    // Verify license code only if not admin
    if (!isAdmin) {
      if (!licenseCode) throw new Error('Código de ativação é obrigatório.');
      const isValid = await this.validateLicenseCode(licenseCode);
      if (!isValid) {
        throw new Error('Código de ativação inválido ou já utilizado.');
      }
    }

    try {
      const accessCode = this.generateCode();
      const clinicData = {
        name,
        taxId: taxId || '', // CNPJ ou CPF
        ownerId: userId,
        accessCode,
        createdAt: new Date().toISOString(),
        isSystemAdminClinic: isAdmin,
        settings: {
          locked: true // Bloqueia edição de nome/taxId após criação
        }
      };

      const clinicDoc = await addDoc(collection(db, CLINICS_COL), clinicData);

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
        email: userEmail || '',
        clinicId: clinicDoc.id,
        role: 'owner',
        displayName: displayName || userEmail?.split('@')[0] || 'Doutor(a)',
        lastAccess: new Date().toISOString(),
        userAgent: navigator.userAgent
      });

      await auditService.log(AuditAction.CLINIC_UPDATE, clinicDoc.id, clinicDoc.id, 'clinic', { name, taxId, action: 'create' });

      return clinicDoc.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'clinic-creation');
    }
  },

  async joinClinic(userId: string, accessCode: string, displayName?: string, userEmail?: string, role: 'member' | 'secretary' = 'member'): Promise<string> {
    try {
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
        email: userEmail || '',
        clinicId,
        role: role,
        displayName: displayName || (role === 'secretary' ? 'Secretário(a)' : 'Doutor(a)'),
        lastAccess: new Date().toISOString(),
        userAgent: navigator.userAgent
      });

      await auditService.log(AuditAction.LOGIN, clinicId, userId, 'user', { action: 'join_clinic', role, agent: navigator.userAgent });

      return clinicId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'join-clinic');
    }
  },

  async getClinicMembers(clinicId: string): Promise<UserProfile[]> {
    try {
      const q = query(
        collection(db, USERS_COL),
        where('clinicId', '==', clinicId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as UserProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, USERS_COL);
    }
  },

  subscribeToClinicMembers(clinicId: string, callback: (members: UserProfile[]) => void) {
    const q = query(
      collection(db, USERS_COL),
      where('clinicId', '==', clinicId)
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as UserProfile));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, USERS_COL);
    });
  },

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const userRef = doc(db, USERS_COL, userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${USERS_COL}/${userId}`);
    }
  },

  async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
    try {
      const userRef = doc(db, USERS_COL, userId);
      const updateData = {
        ...data,
        lastAccess: new Date().toISOString(),
        userAgent: navigator.userAgent
      };
      await setDoc(userRef, updateData, { merge: true });
      if (data.clinicId) {
        await auditService.log(AuditAction.LOGIN, data.clinicId, userId, 'user', { action: 'update_profile', fields: Object.keys(data), agent: navigator.userAgent });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${USERS_COL}/${userId}`);
    }
  }
};
