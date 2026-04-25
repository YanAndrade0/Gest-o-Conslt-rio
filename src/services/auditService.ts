import { addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../lib/firebase-config';

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PATIENT_CREATE = 'PATIENT_CREATE',
  PATIENT_UPDATE = 'PATIENT_UPDATE',
  PATIENT_DELETE = 'PATIENT_DELETE',
  RECORD_VIEW = 'RECORD_VIEW',
  CLINIC_UPDATE = 'CLINIC_UPDATE',
  TRANSACTION_CREATE = 'TRANSACTION_CREATE',
  TRANSACTION_DELETE = 'TRANSACTION_DELETE',
}

export interface AuditLog {
  userId: string;
  action: AuditAction;
  entityId?: string;
  entityType?: string;
  timestamp: string;
  clinicId: string;
  details?: any;
}

export const auditService = {
  async log(action: AuditAction, clinicId: string, entityId?: string, entityType?: string, details?: any) {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await addDoc(collection(db, 'auditLogs'), {
        userId: user.uid,
        action,
        entityId: entityId || '',
        entityType: entityType || '',
        timestamp: new Date().toISOString(),
        clinicId,
        details: details || {}
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // We don't throw here to avoid blocking the main action if logging fails
    }
  }
};
