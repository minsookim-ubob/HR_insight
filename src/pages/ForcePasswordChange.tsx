import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

export default function ForcePasswordChange() {
  const { changePassword, logout } = useAuth();
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChangePw = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) {
      setErrorMsg('비밀번호는 8자리 이상이어야 합니다.');
      return;
    }
    if (newPw !== confirmPw) {
      setErrorMsg('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    
    if (changePassword(newPw)) {
      alert('비밀번호가 성공적으로 변경되었습니다.');
    } else {
      setErrorMsg('비밀번호 변경에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-[#E2E8F0] p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0F172A] text-center">비밀번호 변경 안내</h2>
          <p className="mt-2 text-sm text-[#475569] text-center">최초 로그인, 또는 관리자에 의해 비밀번호가 초기화되었습니다.<br/>안전한 8자리 이상의 비밀번호로 변경해주세요.</p>
        </div>
        
        <form className="space-y-4" onSubmit={handleChangePw}>
          <div>
            <label className="block text-sm font-bold text-[#475569] mb-1">새 비밀번호</label>
            <input 
              type="password" 
              className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              placeholder="8자리 이상 입력"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#475569] mb-1">비밀번호 확인</label>
            <input 
              type="password" 
              className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="다시 한번 입력"
            />
          </div>
          
          {errorMsg && (
            <p className="flex items-center gap-1.5 text-sm font-bold text-red-500 bg-red-50 p-3 rounded-lg">
              <AlertCircle size={16} /> {errorMsg}
            </p>
          )}

          <div className="pt-2 flex flex-col gap-2">
            <button type="submit" className="w-full py-3 bg-[#6366F1] text-white text-sm font-bold rounded-xl hover:bg-[#4F46E5] transition-colors shadow-sm">
              비밀번호 변경 완료
            </button>
            <button type="button" onClick={logout} className="w-full py-3 bg-white border border-[#E2E8F0] text-[#64748B] text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
              로그아웃 (다음에 변경하기)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
