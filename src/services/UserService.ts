import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './errorHandler';
import { SalesRep } from '../types';

/**
 * Micro-service for managing User/Employee domain data
 */
export const UserService = {
  /**
   * Retrieves all users (employees/sales reps)
   */
  async getAllUsers(): Promise<SalesRep[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as SalesRep));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'users');
      return [];
    }
  },

  /**
   * Syncs user profile based on MSA principles.
   */
  async syncUser(userId: string, data: Partial<SalesRep>): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await updateDoc(docRef, data);
      } else {
        await setDoc(docRef, data);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
    }
  },

  /**
   * Delete user profile.
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
    }
  }
};
