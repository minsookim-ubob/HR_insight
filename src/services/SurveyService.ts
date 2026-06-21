import { collection, doc, getDoc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './errorHandler';

export const SurveyService = {
  // Save a survey result
  async saveResult(resultId: string, resultData: any): Promise<void> {
    try {
      const docRef = doc(db, 'surveyResults', resultId);
      await setDoc(docRef, resultData, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'surveyResults');
      throw err;
    }
  },

  // Get results for a specific session
  async getResultsBySession(sessionId: string): Promise<any[]> {
    try {
      const q = query(collection(db, 'surveyResults'), where('sessionId', '==', sessionId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'surveyResults');
      return [];
    }
  },
  
  // Get all survey results
  async getAllResults(): Promise<any[]> {
    try {
      const snap = await getDocs(collection(db, 'surveyResults'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'surveyResults');
      return [];
    }
  },

  // Save survey session
  async saveSession(sessionData: any): Promise<void> {
    try {
       const docRef = doc(db, 'surveySessions', sessionData.id);
       await setDoc(docRef, sessionData, { merge: true });
    } catch (err) {
       handleFirestoreError(err, OperationType.WRITE, 'surveySessions');
       throw err;
    }
  },
  
  // Get all survey sessions
  async getAllSessions(): Promise<any[]> {
    try {
       const snap = await getDocs(collection(db, 'surveySessions'));
       return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
       handleFirestoreError(err, OperationType.LIST, 'surveySessions');
       return [];
    }
  }
};
