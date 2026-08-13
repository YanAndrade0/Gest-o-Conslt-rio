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
  canManageAppointments?: boolean;
  canCancelAppointments?: boolean;
  status?: 'active' | 'pending' | 'removed' | 'rejected';
  pendingClinicId?: string | null;
  previousClinicId?: string | null;
  requestedAt?: string;
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
        trialEndsAt: trialEndsAt.toISOString().replace(/\.\d+Z$/, 'Z'),
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

  async joinClinic(userId: string, accessCode: string, displayName?: string, userEmail?: string, role: 'member' | 'secretary' = 'member'): Promise<{ clinicId: string; pending: boolean }> {
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

      // Check user's current profile status
      const userRef = doc(db, USERS_COL, userId);
      const userSnap = await getDoc(userRef);
      const userProfile = userSnap.exists() ? (userSnap.data() as UserProfile) : null;

      const isRejoining = userProfile?.status === 'removed' || userProfile?.previousClinicId === clinicId;

      if (isRejoining) {
        // Requires owner approval if previously removed or requesting re-entry
        await setDoc(userRef, {
          uid: userId,
          email: userEmail || '',
          clinicId: null,
          pendingClinicId: clinicId,
          previousClinicId: clinicId,
          status: 'pending',
          role: role,
          displayName: displayName || userProfile?.displayName || (role === 'secretary' ? 'Secretário(a)' : 'Doutor(a)'),
          requestedAt: new Date().toISOString(),
          lastAccess: new Date().toISOString(),
          userAgent: navigator.userAgent
        }, { merge: true });

        await auditService.log(AuditAction.LOGIN, clinicId, userId, 'user', { action: 'request_rejoin_clinic', role, agent: navigator.userAgent });

        return { clinicId, pending: true };
      }

      // Direct join for new members
      let resultPending = false;
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

        transaction.set(userRef, {
          uid: userId,
          email: userEmail || '',
          clinicId,
          pendingClinicId: null,
          status: 'active',
          role: role,
          displayName: displayName || (role === 'secretary' ? 'Secretário(a)' : 'Doutor(a)'),
          lastAccess: new Date().toISOString(),
          userAgent: navigator.userAgent
        }, { merge: true });

        transaction.update(clinicRef, {
          userCount: currentUserCount + 1
        });
      });

      await auditService.log(AuditAction.LOGIN, clinicId, userId, 'user', { action: 'join_clinic', role, agent: navigator.userAgent });

      return { clinicId, pending: resultPending };
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
  },

  async removeMemberFromClinic(userId: string, clinicId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, USERS_COL, userId);
        const clinicRef = doc(db, CLINICS_COL, clinicId);
        const clinicSnap = await transaction.get(clinicRef);

        transaction.update(userRef, {
          clinicId: null,
          status: 'removed',
          previousClinicId: clinicId,
          pendingClinicId: null,
          canManageAppointments: false,
          canCancelAppointments: false,
          lastAccess: new Date().toISOString()
        });

        if (clinicSnap.exists()) {
          const currentCount = clinicSnap.data().userCount || 1;
          transaction.update(clinicRef, {
            userCount: Math.max(0, currentCount - 1),
            updatedAt: new Date().toISOString()
          });
        }
      });

      await auditService.log(AuditAction.USER_UPDATE, clinicId, userId, 'user', { action: 'remove_member' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${USERS_COL}/${userId}`);
    }
  },

  subscribeToPendingMembers(clinicId: string, callback: (members: UserProfile[]) => void) {
    const q = query(
      collection(db, USERS_COL),
      where('pendingClinicId', '==', clinicId),
      where('status', '==', 'pending')
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as UserProfile));
    }, (error) => {
      console.warn('Error subscribing to pending members:', error);
      callback([]);
    });
  },

  async approveMemberAccess(userId: string, clinicId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, USERS_COL, userId);
        const clinicRef = doc(db, CLINICS_COL, clinicId);
        const clinicSnap = await transaction.get(clinicRef);

        transaction.update(userRef, {
          clinicId: clinicId,
          pendingClinicId: null,
          status: 'active',
          canManageAppointments: true,
          canCancelAppointments: true,
          lastAccess: new Date().toISOString()
        });

        if (clinicSnap.exists()) {
          const currentCount = clinicSnap.data().userCount || 0;
          transaction.update(clinicRef, {
            userCount: currentCount + 1,
            updatedAt: new Date().toISOString()
          });
        }
      });

      await auditService.log(AuditAction.USER_UPDATE, clinicId, userId, 'user', { action: 'approve_member_access' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${USERS_COL}/${userId}`);
    }
  },

  async rejectMemberAccess(userId: string): Promise<void> {
    try {
      const userRef = doc(db, USERS_COL, userId);
      await updateDoc(userRef, {
        pendingClinicId: null,
        status: 'rejected',
        lastAccess: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${USERS_COL}/${userId}`);
    }
  },

  async cancelJoinRequest(userId: string): Promise<void> {
    try {
      const userRef = doc(db, USERS_COL, userId);
      await updateDoc(userRef, {
        pendingClinicId: null,
        status: 'removed',
        lastAccess: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${USERS_COL}/${userId}`);
    }
  }
};
