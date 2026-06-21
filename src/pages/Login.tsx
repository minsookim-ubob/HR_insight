import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login, requestPasswordReset } = useAuth();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saveId, setSaveId] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('saved_login_id');
    if (saved) {
      setId(saved);
      setSaveId(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !pw) {
      setErrorMsg('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }
    
    setErrorMsg('');
    const res = login(id, pw);
    
    if (res.success) {
      if (saveId) {
        localStorage.setItem('saved_login_id', id);
      } else {
        localStorage.removeItem('saved_login_id');
      }
    } else {
      if (res.error === '본 시스템 접근 권한이 없습니다.') {
        alert(res.error);
      }
      setErrorMsg(res.error || '로그인에 실패했습니다.');
    }
  };

  const handleResetRequest = () => {
    if (!id) {
      setErrorMsg('아이디를 입력한 후 비밀번호 초기화를 요청해주세요.');
      return;
    }
    const res = requestPasswordReset(id);
    if (res.success) {
      setErrorMsg('비밀번호 초기화 요청이 마스터에게 전송되었습니다.');
    } else {
      setErrorMsg(res.error || '비밀번호 초기화 요청에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-[#E2E8F0] overflow-hidden">
        <div className="px-8 py-10">
          <h2 className="text-2xl font-bold text-[#0F172A] text-center mb-8">HR Analytics System</h2>
          
          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-bold text-[#475569] mb-1">이메일 (ID)</label>
              <input 
                type="email" 
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] bg-gray-50"
                value={id}
                onChange={e => setId(e.target.value)}
                placeholder="이메일을 입력하세요"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#475569] mb-1">비밀번호</label>
              <input 
                type="password" 
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] bg-gray-50"
                value={pw}
                onChange={e => setPw(e.target.value)}
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#475569] cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={saveId}
                  onChange={e => setSaveId(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E2E8F0] text-[#6366F1] focus:ring-[#6366F1]"
                />
                아이디 저장
              </label>
              
              <button 
                type="button" 
                onClick={handleResetRequest}
                className="text-sm font-bold text-[#6366F1] hover:text-[#4F46E5] transition-colors"
              >
                비밀번호 초기화 요청
              </button>
            </div>

            {errorMsg && (
              <p className="flex items-center gap-1.5 text-sm font-bold text-red-500 bg-red-50 p-3 rounded-lg">
                <AlertCircle size={16} /> {errorMsg}
              </p>
            )}

            <button type="submit" className="w-full py-3 bg-[#0F172A] text-white text-sm font-bold rounded-xl hover:bg-[#1E293B] transition-colors shadow-sm mt-4">
              로그인
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
