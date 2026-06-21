import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { initAuth, googleSignIn, logout as googleLogout } from '../lib/workspaceAuth';
import { useAuth } from '../contexts/AuthContext';

export default function MySettings() {
  const { user } = useAuth();
  const [isCalendarLinked, setIsCalendarLinked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if token exists
    try {
      const stored = localStorage.getItem('gapi_access_token');
      if (stored) {
         const parsed = JSON.parse(stored);
         if (parsed.expiresAt > Date.now()) {
            setIsCalendarLinked(true);
         }
      }
    } catch(e) {}
    setIsChecking(false);
  }, []);

  const handleConnectCalendar = () => {
    googleSignIn()
      .then((res) => {
        if (res && res.accessToken) {
          setIsCalendarLinked(true);
        }
      })
      .catch((err) => {
        console.error('Failed to sign in', err);
        alert('구글 계정 연동에 실패했습니다.');
      });
  };

  const handleDisconnectCalendar = () => {
    googleLogout().then(() => {
        setIsCalendarLinked(false);
        localStorage.removeItem('gapi_access_token');
    });
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden">
        <div className="p-6 border-b border-[#E2E8F0] space-y-1">
          <h2 className="text-lg font-bold text-[#0F172A]">구글 캘린더 연동</h2>
          <p className="text-sm text-[#64748B]">면담 및 회의 일정을 본인의 구글 캘린더에 바로 등록할 수 있습니다.</p>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex items-start gap-4">
             <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 mt-1">
                <CalendarIcon size={20} />
             </div>
             <div className="flex-1 space-y-4">
                <div>
                   <h3 className="font-bold pr-2 text-[#1E293B]">Google Calendar 연동 상태</h3>
                   {!isChecking && isCalendarLinked ? (
                     <div className="flex items-center gap-1.5 mt-1 text-sm font-bold text-emerald-600">
                        <CheckCircle2 size={16} /> 정상적으로 연동되었습니다.
                     </div>
                   ) : !isChecking ? (
                     <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                        <AlertCircle size={16} /> 현재 연동된 계정이 없습니다.
                     </div>
                   ) : (
                     <div className="text-sm mt-1 text-gray-400">상태 확인 중...</div>
                   )}
                </div>

                {!isChecking && isCalendarLinked ? (
                    <button 
                       onClick={handleDisconnectCalendar}
                       className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                       연동 해제하기
                    </button>
                ) : !isChecking ? (
                    <button 
                       onClick={handleConnectCalendar}
                       className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-bold text-white hover:bg-blue-700 transition-colors"
                    >
                       Google 계정 연동하기
                    </button>
                ) : null}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
