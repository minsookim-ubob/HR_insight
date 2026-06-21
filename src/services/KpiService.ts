import { collection, doc, getDoc, getDocs, query, where, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './errorHandler';
import { UserKpi } from '../types';

/**
 * Micro-service for managing KPI domain data
 */
export const KpiService = {
  /**
   * Retrieves KPI targets for an employee
   */
  async getUserKpi(userId: string): Promise<UserKpi[]> {
    try {
      const q = query(collection(db, 'kpis'), where('userId', '==', userId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as UserKpi));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'kpis');
      return [];
    }
  },

  /**
   * Saves or updates a KPI target/draft
   */
  async saveKpi(kpiData: UserKpi): Promise<void> {
    try {
      const docRef = doc(db, 'kpis', kpiData.id);
      await setDoc(docRef, kpiData, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'kpis');
    }
  },

  /**
   * Retrieves all KPIs for evaluation/approvals
   */
  async getAllKpis(): Promise<UserKpi[]> {
    try {
      const snap = await getDocs(collection(db, 'kpis'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as UserKpi));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'kpis');
      return [];
    }
  }
};
