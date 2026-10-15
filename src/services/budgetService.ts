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
import { Budget, BudgetStatus } from '../types/budget';
import { auditService, AuditAction } from './auditService';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

export const budgetService = {
  /**
   * Cria ou atualiza um orçamento no Firestore
   */
  async saveBudget(budget: Budget, clinicId: string): Promise<string> {
    const now = new Date().toISOString();
    const payload = {
      ...budget,
      clinicId,
      updatedAt: now,
    };

    if (budget.id) {
      // Atualização
      const path = `budgets/${budget.id}`;
      try {
        const { id, ...dataToUpdate } = payload;
        await updateDoc(doc(db, 'budgets', budget.id), dataToUpdate);
        await auditService.log(
          AuditAction.BUDGET_UPDATE, 
          clinicId, 
          budget.id, 
          'Budget', 
          { patientId: budget.patientId, total: budget.total, status: budget.status }
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
          createdAt: now,
          status: budget.status || 'pendente'
        };
        const docRef = await addDoc(collection(db, 'budgets'), newBudgetPayload);
        await auditService.log(
          AuditAction.BUDGET_CREATE, 
          clinicId, 
          docRef.id, 
          'Budget', 
          { patientId: budget.patientId, total: budget.total, status: newBudgetPayload.status }
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
