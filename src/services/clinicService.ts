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
  onSnapshot,
  runTransaction
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
  taxId?: string;
  userCount: number;
  trialEndsAt: string;
  unlimitedUsers?: boolean;
  subscription?: {
    status: string;
    planName: string;
    currentPeriodEnd?: any;
  };
}

export interface UserProfile {
  uid: string;
  email?: string;
  clinicId: string | null;
  role: 'owner' | 'member' | 'secretary';
  displayName?: string;
  lastAccess?: string;
  userAgent?: string;
  hasReadManual?: boolean;
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

  async createClinic(userId: string, name: string, userEmail?: string | null, displayName?: string, taxId?: string): Promise<string> {
    const isAdmin = userEmail?.toLowerCase() === 'yanandraderfo@gmail.com' || userEmail?.toLowerCase() === 'yandatafox@gmail.com';
    
    try {
      const accessCode = this.generateCode();
      const trialDays = 7;
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

      const clinicData = {
        name,
        taxId: taxId || '', // CNPJ ou CPF
        ownerId: userId,
        accessCode,
        userCount: 1,
        createdAt: new Date().toISOString(),
        trialEndsAt: trialEndsAt.toISOString(),
        subscription: {
          status: 'trialing',
          planName: 'Trial 7 Dias'
        },
        isSystemAdminClinic: isAdmin,
        settings: {
          locked: true // Bloqueia edição de nome/taxId após criação
        }
      };

      const clinicDoc = await addDoc(collection(db, CLINICS_COL), clinicData);

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

      const clinicDoc = querySnapshot.docs[0];
      const clinicId = clinicDoc.id;

      await runTransaction(db, async (transaction) => {
        const clinicRef = doc(db, CLINICS_COL, clinicId);
        const clinicSnap = await transaction.get(clinicRef);
        
        if (!clinicSnap.exists()) {
          throw new Error('Clínica não encontrada.');
        }

        const data = clinicSnap.data();
        const currentUserCount = data.userCount || 0;
        const isUnlimited = data.unlimitedUsers || data.name?.toLowerCase().includes('andrade odontologia');

        if (!isUnlimited && currentUserCount >= 5) {
          throw new Error('Limite de usuários (5) atingido para esta clínica. Entre em contato com o suporte para expandir seu plano.');
        }

        // Link user to this clinic
        const userRef = doc(db, USERS_COL, userId);
        transaction.set(userRef, {
          uid: userId,
          email: userEmail || '',
          clinicId,
          role: role,
          displayName: displayName || (role === 'secretary' ? 'Secretário(a)' : 'Doutor(a)'),
          lastAccess: new Date().toISOString(),
          userAgent: navigator.userAgent
        });

        // Update clinic user count
        transaction.update(clinicRef, {
          userCount: currentUserCount + 1
        });
      });

      await auditService.log(AuditAction.LOGIN, clinicId, userId, 'user', { action: 'join_clinic', role, agent: navigator.userAgent });

      return clinicId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'join-clinic');
    }
  },

  async getClinic(clinicId: string): Promise<Clinic | null> {
    try {
      const clinicRef = doc(db, CLINICS_COL, clinicId);
      const clinicSnap = await getDoc(clinicRef);
      if (clinicSnap.exists()) {
        return { id: clinicSnap.id, ...clinicSnap.data() } as Clinic;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${CLINICS_COL}/${clinicId}`);
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
