import React, { useState, useEffect } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function SmtpSettings() {
  const [smtp, setSmtp] = useState({
    host: '',
    port: 587,
    user: '',
    pass: '',
    from: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const docRef = doc(db, 'app_settings', 'smtp');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSmtp(docSnap.data() as any);
        }
      } catch (error) {
        console.error("Failed to load SMTP settings:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'app_settings', 'smtp'), smtp);
      alert('SMTP 설정이 저장되었습니다.');
    } catch (e) {
      console.error(e);
      alert('저장 실패');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-4">SMTP 설정</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold">SMTP Host</label>
          <input type="text" value={smtp.host} onChange={e => setSmtp({...smtp, host: e.target.value})} className="w-full border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm font-bold">SMTP Port</label>
          <input type="number" value={smtp.port} onChange={e => setSmtp({...smtp, port: Number(e.target.value)})} className="w-full border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm font-bold">Sender User</label>
          <input type="text" value={smtp.user} onChange={e => setSmtp({...smtp, user: e.target.value})} className="w-full border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm font-bold">Sender Pass</label>
          <input type="password" value={smtp.pass} onChange={e => setSmtp({...smtp, pass: e.target.value})} className="w-full border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm font-bold">From Email</label>
          <input type="text" value={smtp.from} onChange={e => setSmtp({...smtp, from: e.target.value})} className="w-full border rounded p-2" />
        </div>
        <button onClick={handleSave} className="flex gap-2 items-center bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700">
          <Save size={16} /> 설정 저장
        </button>
      </div>
      <div className="mt-6 p-4 bg-yellow-50 text-yellow-800 text-sm rounded flex gap-2">
        <AlertCircle size={20} />
        <div>
          설정 후 서버에서 적용하려면 서버 코드가 이 Firestore 설정을 읽도록 업데이트해야 합니다. 현재 백엔드 로직은 환경변수를 우선합니다.
        </div>
      </div>
    </div>
  );
}
