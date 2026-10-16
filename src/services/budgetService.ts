import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase-config';
import { Budget, BudgetItem, BudgetStatus } from '../types/budget';
import { auditService, AuditAction } from './auditService';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

function sanitizeBudgetItem(item: BudgetItem): any {
  const cleanItem: any = {
    id: item.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    toothNumber: item.toothNumber !== undefined ? item.toothNumber : null,
    toothLabel: item.toothLabel || (item.toothNumber ? `Dente ${item.toothNumber}` : 'Geral'),
    procedureId: item.procedureId || `proc_${Date.now()}`,
    procedureName: item.procedureName || '',
    category: item.category || 'Geral',
    unitPrice: Number(item.unitPrice) || 0,
    quantity: Number(item.quantity) || 1,
    discount: Number(item.discount) || 0,
    total: Number(item.total) || 0,
  };

  if (item.notes && item.notes.trim()) {
    cleanItem.notes = item.notes.trim();
  }
  if (Array.isArray(item.faces) && item.faces.length > 0) {
    cleanItem.faces = item.faces;
  }

  return cleanItem;
}

function sanitizeBudgetPayload(budget: Budget, clinicId: string): any {
  const now = new Date().toISOString();
  const clean: any = {
    clinicId,
    patientId: budget.patientId,
    patientName: budget.patientName || '',
    title: budget.title?.trim() || 'Orçamento Odontológico',
    status: budget.status || 'pendente',
    items: (budget.items || []).map(sanitizeBudgetItem),
    subtotal: Number(budget.subtotal) || 0,
    discountAmount: Number(budget.discountAmount) || 0,
    discountPercent: Number(budget.discountPercent) || 0,
    total: Number(budget.total) || 0,
    paymentConditions: budget.paymentConditions?.trim() || '',
    notes: budget.notes?.trim() || '',
    updatedAt: now,
  };

  if (budget.patientPhone) clean.patientPhone = budget.patientPhone;
  if (budget.dentistName) clean.dentistName = budget.dentistName;
  if (budget.dentistId) clean.dentistId = budget.dentistId;
  if (budget.validUntil) clean.validUntil = budget.validUntil;
  if (budget.createdAt) clean.createdAt = budget.createdAt;

  return clean;
}

export const budgetService = {
  /**
   * Cria ou atualiza um orçamento no Firestore
   */
  async saveBudget(budget: Budget, clinicId: string): Promise<string> {
    const payload = sanitizeBudgetPayload(budget, clinicId);

    if (budget.id) {
      // Atualização
      const path = `budgets/${budget.id}`;
      try {
        await updateDoc(doc(db, 'budgets', budget.id), payload);
        await auditService.log(
          AuditAction.BUDGET_UPDATE, 
          clinicId, 
          budget.id, 
          'Budget', 
          { patientId: budget.patientId, total: payload.total, status: payload.status }
        );
        return budget.id;
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
        throw error;
      }
    } else {
      // Criação
      const path = 'budgets';
      try {
        const newBudgetPayload = {
          ...payload,
          createdAt: payload.createdAt || new Date().toISOString(),
        };
        const docRef = await addDoc(collection(db, 'budgets'), newBudgetPayload);
        await auditService.log(
          AuditAction.BUDGET_CREATE, 
          clinicId, 
          docRef.id, 
          'Budget', 
          { patientId: budget.patientId, total: payload.total, status: payload.status }
        );
        return docRef.id;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
        throw error;
      }
    }
  },

  /**
   * Altera apenas o status de um orçamento (ex: de pendente para aprovado)
   */
  async updateBudgetStatus(budgetId: string, status: BudgetStatus, clinicId: string): Promise<void> {
    const path = `budgets/${budgetId}`;
    try {
      await updateDoc(doc(db, 'budgets', budgetId), {
        status,
        updatedAt: new Date().toISOString()
      });
      await auditService.log(
        AuditAction.BUDGET_UPDATE, 
        clinicId, 
        budgetId, 
        'Budget', 
        { newStatus: status }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  },

  /**
   * Exclui um orçamento
   */
  async deleteBudget(budgetId: string, clinicId: string, patientId: string): Promise<void> {
    const path = `budgets/${budgetId}`;
    try {
      await deleteDoc(doc(db, 'budgets', budgetId));
      await auditService.log(
        AuditAction.BUDGET_DELETE, 
        clinicId, 
        budgetId, 
        'Budget', 
        { patientId }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      throw error;
    }
  },

  /**
   * Monitora em tempo real os orçamentos de um paciente específico
   */
  subscribeToPatientBudgets(
    patientId: string, 
    clinicId: string, 
    callback: (budgets: Budget[]) => void,
    errorCallback?: (error: any) => void
  ) {
    const path = 'budgets';
    const q = query(
      collection(db, path),
      where('clinicId', '==', clinicId),
      where('patientId', '==', patientId)
    );

    return onSnapshot(q, (snapshot) => {
      const items: Budget[] = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      // Ordena por data de criação descrescente
      items.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
      callback(items);
    }, (error) => {
      console.error('Error fetching patient budgets:', error);
      if (errorCallback) errorCallback(error);
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  /**
   * Monitora em tempo real todos os orçamentos da clínica
   */
  subscribeToClinicBudgets(
    clinicId: string,
    callback: (budgets: Budget[]) => void,
    errorCallback?: (error: any) => void
  ) {
    const path = 'budgets';
    const q = query(
      collection(db, path),
      where('clinicId', '==', clinicId)
    );

    return onSnapshot(q, (snapshot) => {
      const items: Budget[] = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      // Ordena decrescente por atualização/criação
      items.sort((a, b) => new Date(b.updatedAt || b.createdAt || '').getTime() - new Date(a.updatedAt || a.createdAt || '').getTime());
      callback(items);
    }, (error) => {
      console.error('Error fetching clinic budgets:', error);
      if (errorCallback) errorCallback(error);
      handleFirestoreError(error, OperationType.LIST, path);
    });
  }
};
