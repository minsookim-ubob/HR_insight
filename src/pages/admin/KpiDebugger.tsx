import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function KpiDebugger() {
  const [kpis, setKpis] = useState<any[]>([]);

  useEffect(() => {
    async function loadKpis() {
      const querySnapshot = await getDocs(collection(db, 'kpis'));
      const list: any[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setKpis(list);
    }
    loadKpis();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Firestore KPI Debugger</h1>
      <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(kpis, null, 2)}</pre>
    </div>
  );
}
