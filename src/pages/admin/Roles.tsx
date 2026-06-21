import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Shield, ShieldAlert, Key, Unlock, Lock, Mail, UserPlus, CheckCircle2 } from 'lucide-react';

export default function Roles() {
  const { users, user: currentUser, resetUserPassword, approveUser, blockUser, unblockUser, deleteUser, addUser } = useAuth();
  const [newUserId, setNewUserId] = useState('');
  const [selectedHistoryUser, setSelectedHistoryUser] = useState<any>(null);

  if (!currentUser?.isMaster) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#475569]">
        <ShieldAlert size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-[#0F172A] mb-2">접근 권한이 없습니다</h2>
        <p>이 페이지는 마스터(Master) 권한을 가진 사용자만 접근할 수 있습니다.</p>
      </div>
    );
  }

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserId.trim()) return;
    
    if (addUser(newUserId)) {
      alert(`${newUserId} 계정이 추가되었습니다.`);
      setNewUserId('');
    } else {
      alert('이미 존재하는 계정입니다.');
    }
  };

  const handleResetPassword = (id: string) => {
    if (confirm(`${id} 사용자의 비밀번호를 '1234!'로 초기화하시겠습니까?`)) {
      resetUserPassword(id);
      alert('비밀번호가 초기화되었습니다.');
    }
  };

  const pendingUsers = users.filter(u => u.status === 'pending');
  const activeUsers = users.filter(u => u.status === 'active' || u.status === 'blocked' || u.status === 'deleted');

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* 승인 대기 또는 추가 */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center flex-wrap gap-4">
           <h3 className="font-bold text-[#0F172A] flex items-center gap-2">
             <UserPlus size={18} className="text-[#6366F1]" />
             신규 계정 발급 및 승인 대기 ({pendingUsers.length})
           </h3>
           <form onSubmit={handleAddUser} className="flex items-center gap-2">
             <input 
               type="email" 
               placeholder="추가할 계정(이메일) 입력..."
               className="border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:border-[#6366F1]"
               value={newUserId}
               onChange={e => setNewUserId(e.target.value)}
             />
             <button type="submit" className="px-4 py-1.5 bg-[#0F172A] text-white text-sm font-bold rounded-lg hover:bg-[#1E293B] transition-colors shadow-sm">
               계정 생성
             </button>
           </form>
        </div>
        
        {pendingUsers.length > 0 ? (
          <table className="w-full text-left text-sm text-[#475569]">
            <thead className="bg-gray-50 border-b border-[#E2E8F0] font-bold text-[#94A3B8]">
              <tr>
                <th className="px-6 py-3">계정 (ID)</th>
                <th className="px-6 py-3">상태</th>
                <th className="px-6 py-3 text-right">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {pendingUsers.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-bold text-[#0F172A]">{u.id}</td>
                  <td className="px-6 py-3">
                    <span className="px-2.5 py-1 text-xs font-bold rounded bg-orange-50 text-orange-600 border border-orange-200">
                      승인 대기중
                    </span>
                  </td>
                  <td className="px-6 py-3 flex justify-end gap-2">
                    <button 
                      onClick={() => approveUser(u.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 font-bold rounded border border-green-200 hover:bg-green-100 transition-colors"
                    >
                      <CheckCircle2 size={14} /> 승인
                    </button>
                    <button 
                      onClick={() => { if(confirm('삭제하시겠습니까?')) deleteUser(u.id); }}
                      className="px-3 py-1.5 bg-white border border-[#E2E8F0] text-red-500 font-bold rounded hover:bg-red-50 transition-colors"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-[#94A3B8] text-sm">대기 중인 신규 계정이 없습니다.</div>
        )}
      </div>

      {/* 활성 및 차단 사용자 */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
           <h3 className="font-bold text-[#0F172A] flex items-center gap-2">
             <Shield size={18} className="text-[#10B981]" />
             접근 계정 상태 및 권한 관리
           </h3>
        </div>
        <table className="w-full text-left text-sm text-[#475569]">
          <thead className="bg-gray-50 border-b border-[#E2E8F0] font-bold text-[#94A3B8]">
            <tr>
              <th className="px-6 py-3">계정 (ID)</th>
              <th className="px-6 py-3">권한</th>
              <th className="px-6 py-3">상태</th>
              <th className="px-6 py-3 text-right">계정/비밀번호 관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {activeUsers.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 font-bold text-[#0F172A]">
                  <div className="flex items-center gap-2">
                    {u.id}
                    {u.resetRequestedAt && (
                      <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold" title="비밀번호 초기화 요청됨">
                        <Mail size={10} /> 초기화 요청됨
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-3">
                  {u.isMaster ? (
                    <span className="text-[#4F46E5] font-bold bg-indigo-50 px-2 py-0.5 rounded">Master</span>
                  ) : (
                    <span className="text-gray-500">일반(HR)</span>
                  )}
                </td>
                <td className="px-6 py-3">
                  {u.status === 'blocked' ? (
                     <span className="flex items-center gap-1 text-red-600 font-bold">
                       <Lock size={14} /> 차단됨 (오류 3회)
                     </span>
                  ) : u.status === 'deleted' ? (
                     <span className="flex items-center gap-1 text-gray-400 font-bold">
                       <ShieldAlert size={14} /> 삭제된 계정
                     </span>
                  ) : (
                     <span className="text-green-600 font-bold">정상 (활성)</span>
                  )}
                </td>
                <td className="px-6 py-3 flex justify-end gap-2 items-center">
                   <button 
                     onClick={() => setSelectedHistoryUser(u)} 
                     className="px-3 py-1.5 font-bold rounded border bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors text-xs mr-2"
                   >
                     이력 보기
                   </button>
                   {!u.isMaster && u.status !== 'deleted' && (
                     <>
                        <button 
                          onClick={() => handleResetPassword(u.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 font-bold rounded border transition-colors ${u.resetRequestedAt ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' : 'bg-white border-[#E2E8F0] text-indigo-600 hover:bg-indigo-50'}`}
                        >
                          <Key size={14} /> PW 초기화
                        </button>
                        
                        {u.status === 'blocked' ? (
                          <button 
                            onClick={() => unblockUser(u.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 font-bold rounded border bg-white border-[#E2E8F0] text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Unlock size={14} /> 차단 해제
                          </button>
                        ) : (
                          <button 
                            onClick={() => { if(confirm('차단하시겠습니까?')) blockUser(u.id); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 font-bold rounded border bg-white border-[#E2E8F0] text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Lock size={14} /> 수동 차단
                          </button>
                        )}
                        <button 
                          onClick={() => { if(confirm('계정을 완전히 삭제하시겠습니까?')) deleteUser(u.id); }}
                          className="px-3 py-1.5 font-bold rounded border bg-white border-[#E2E8F0] text-red-400 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all ml-2"
                        >
                          삭제
                        </button>
                     </>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedHistoryUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
              <h3 className="font-bold text-[#0F172A] text-lg">계정 이력 조회 ({selectedHistoryUser.id})</h3>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="mb-4">
                 <p className="text-sm font-bold text-gray-500 mb-1">계정 생성일</p>
                 <p className="text-[#0F172A]">{selectedHistoryUser.createdAt ? new Date(selectedHistoryUser.createdAt).toLocaleString() : '기록 없음'}</p>
              </div>
              <div>
                 <p className="text-sm font-bold text-gray-500 mb-2">상태 변경 이력</p>
                 {selectedHistoryUser.history && selectedHistoryUser.history.length > 0 ? (
                    <ul className="space-y-3">
                       {selectedHistoryUser.history.map((h: any, idx: number) => (
                          <li key={idx} className="flex gap-3 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                             <div className="text-gray-400 font-mono text-xs w-24 shrink-0">{new Date(h.date).toLocaleDateString()}</div>
                             <div className="text-[#0F172A]">{h.action}</div>
                          </li>
                       ))}
                    </ul>
                 ) : (
                    <p className="text-sm text-gray-400 py-4 text-center bg-gray-50 rounded-lg">이력이 없습니다.</p>
                 )}
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end border-t border-[#E2E8F0]">
              <button 
                onClick={() => setSelectedHistoryUser(null)}
                className="px-4 py-2 border border-[#E2E8F0] text-gray-700 bg-white hover:bg-gray-100 font-bold rounded-lg transition-colors shadow-sm"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
