import React, { useState, useEffect } from 'react';
import { Target, Save, Send, AlertCircle, Info, FileText, Plus, Trash2, Loader2 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserKpi } from '../../types';
import { db } from '../../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function PublicMyKpi() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [myKpi, setMyKpi] = useState<UserKpi | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  
  // Custom UI 
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);

  useEffect(() => {
    async function loadKpi() {
      if (!token) return;
      
      try {
        console.log("Fetching KPI token:", token);
        const docRef = doc(db, 'kpis', token);
        console.log("Fetching docRef path:", docRef.path);
        const snap = await getDoc(docRef);
        console.log("Firestore doc exists:", snap.exists());

        if (snap.exists()) {
           const kpiData = snap.data() as UserKpi;
           console.log("KPI Data:", kpiData);
           setMyKpi(kpiData);
        } else {
           console.log("KPI doc does not exist.");
           // No fallback; if it's not in Firestore, it's not found.
        }
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          setIsExpired(true);
        }
        console.error("Failed to fetch KPI from Firestore", e);
      } finally {
        setIsLoading(false);
      }
    }

    loadKpi();
  }, [token]);

  const handleUpdateItem = (itemId: string, field: string, value: string | number) => {
    if (!myKpi) return;
    const updatedItems = myKpi.items.map(it => {
      if (it.id === itemId) return { ...it, [field]: value };
      return it;
    });
    setMyKpi({ ...myKpi, items: updatedItems });
  };

  const handleAddItem = () => {
    if (!myKpi) return;
    const newItem = {
      id: `item_${Date.now()}`,
      category: '임의평가',
      itemDesc: '',
      detailGoal: '',
      notes: '',
      unit: '',
      targetValue: 0,
      weight: 0,
    };
    setMyKpi({ ...myKpi, items: [...myKpi.items, newItem] });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!myKpi) return;
    setMyKpi({ ...myKpi, items: myKpi.items.filter(it => it.id !== itemId) });
  };

  const handleSaveDraft = async () => {
    if (!myKpi) return;
    try {
      if (token) {
        const docRef = doc(db, 'kpis', token);
        await updateDoc(docRef, { items: myKpi.items, status: 'Draft' });
      }
      showToast('임시 저장되었습니다.');
    } catch (e) {
      console.error("Save Draft Error", e);
      showToast('저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleSubmit = async () => {
    if (!myKpi) return;
    
    // Check weighting
    const totalWeight = myKpi.items.reduce((sum, item) => sum + Number(item.weight || 0), 0);
    if (totalWeight !== 100) {
      showToast(`가중치 합계가 100%여야 합니다. (현재: ${totalWeight}%)`, 'error');
      return;
    }

    if (window.confirm('작성하신 개별 KPI 목표를 영업 HR 시스템으로 전송하고 승인 요청하시겠습니까?')) {
      try {
         const submittedTimestamp = new Date().toISOString();
         if (token) {
           const docRef = doc(db, 'kpis', token);
           await updateDoc(docRef, { items: myKpi.items, status: 'Submitted', submittedAt: submittedTimestamp });
         }
         const submittedKpi = { ...myKpi, status: 'Submitted' as any, submittedAt: submittedTimestamp };
         setMyKpi(submittedKpi);
         setIsSubmitSuccess(true);
      } catch (e) {
         console.error("Submit Error", e);
         showToast('제출 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  if (isSubmitSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-10 rounded-2xl shadow-sm border border-[#E2E8F0] max-w-md w-full text-center animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Send className="text-emerald-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-[#0F172A] mb-2">정상적으로 전송되었습니다</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            작성하신 KPI 목표가 영업부 HR 성과 관리 시스템에 성공적으로 등록되었으며, 상위 평가자에게 승인 요청이 전달되었습니다.
          </p>
          <button 
            onClick={() => window.close()}
            className="w-full py-3 rounded-xl font-bold bg-[#0F172A] text-white hover:bg-[#1E293B] transition-colors"
          >
            창 닫기
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500 h-screen">
        <Loader2 size={48} className="mb-4 text-indigo-400 animate-spin" />
        <h2 className="text-xl font-bold text-gray-700">KPI 정보를 불러오는 중입니다...</h2>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500 h-screen bg-gray-50">
        <AlertCircle size={48} className="mb-4 text-red-400" />
        <h2 className="text-xl font-bold text-gray-700">링크가 만료되었습니다.</h2>
        <p className="mt-2 text-sm text-gray-500">이 KPI 초안 수립 링크의 유효기간(14일)이 지났습니다.<br/>담당자에게 새로운 링크 발송을 요청해주세요.</p>
      </div>
    );
  }

  if (!myKpi) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Target size={48} className="mb-4 text-indigo-200" />
        <h2 className="text-xl font-bold text-gray-700">해당 KPI 목표 수립 정보를 찾을 수 없습니다.</h2>
        <p className="mt-2 text-sm">요청 메일의 링크가 올바른지 확인해주세요.</p>
      </div>
    );
  }

  const totalWeight = myKpi.items.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  const isEditable = myKpi.status === 'Draft' || myKpi.status === 'Rejected' || !myKpi.status;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#E2E8F0]">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 border-b border-gray-100 pb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-2">
                <Target className="text-indigo-600" /> 개별 KPI 목표 수립
              </h1>
              <p className="text-sm text-[#64748B] mt-1">
                올해 주도적 업무 목표와 성과 지표를 설정해주세요. 공통 지표는 수정 항목이 제한될 수 있습니다.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${
                myKpi.status === 'Submitted' ? 'bg-amber-100 text-amber-700' :
                myKpi.status === 'TeamLeader_Approved' ? 'bg-blue-100 text-blue-700' :
                myKpi.status === 'DivisionHead_Approved' ? 'bg-emerald-100 text-emerald-700' :
                myKpi.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                {myKpi.status === 'Submitted' ? '승인 대기중 (제출 완료)' :
                 myKpi.status === 'TeamLeader_Approved' ? '1차 승인 완료' :
                 myKpi.status === 'DivisionHead_Approved' ? '최종 승인 완료' :
                 myKpi.status === 'Rejected' ? '반려됨 (수정 필요)' : '작성 중'}
              </span>
              <span className="text-sm font-medium text-gray-500 mt-1">대상자: {myKpi.department} {myKpi.userName}</span>
            </div>
          </div>

          {myKpi.rejectionReason && myKpi.status === 'Rejected' && (
            <div className="mb-8 bg-rose-50 border border-rose-200 rounded-xl p-5 flex gap-3 text-rose-800 shadow-sm">
              <AlertCircle size={22} className="shrink-0 mt-0.5 text-rose-600" />
              <div>
                <h4 className="font-bold text-[15px] mb-1">상위 평가자 수정/보완 요청사항</h4>
                <p className="text-sm whitespace-pre-wrap">{myKpi.rejectionReason}</p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm my-8">
            <table className="w-full text-left text-sm text-[#0F172A]">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                <tr>
                  <th className="px-5 py-4 text-center">구분</th>
                  <th className="px-5 py-4">평가항목 (목표 내용)</th>
                  <th className="px-5 py-4">상세 목표설명</th>
                  <th className="px-5 py-4">지표 정의/메모</th>
                  <th className="px-4 py-4 w-24 text-center text-indigo-700">가중치(%)</th>
                  <th className="px-4 py-4 w-32 text-center text-indigo-700">목표실적 수치</th>
                  <th className="px-4 py-4 w-24 text-center">단위</th>
                  {isEditable && <th className="px-4 py-4 w-16 text-center">관리</th>}
                </tr>
              </thead>
              <tbody className="divide-y border-[#E2E8F0] bg-white">
                {myKpi.items.length === 0 && (
                  <tr>
                    <td colSpan={isEditable ? 8 : 7} className="px-6 py-10 text-center text-gray-400">항목이 없습니다.</td>
                  </tr>
                )}
                {myKpi.items.map(item => {
                  const isCommon = item.category === '공통' || item.category === '팀공통' || item.itemDesc.includes('공통');
                  const canEditWeight = isEditable && !isCommon;
                  const canEditAll = isEditable;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-center">
                        {canEditAll ? (
                          <select
                            value={item.category}
                            onChange={(e) => handleUpdateItem(item.id, 'category', e.target.value)}
                            className="w-full px-2 py-1 text-sm border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="재무성과">재무성과</option>
                            <option value="미션항목">미션항목</option>
                            <option value="임의평가">임의평가</option>
                          </select>
                        ) : (
                          <span className="font-bold text-gray-600">{item.category}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <textarea
                          value={item.itemDesc}
                          onChange={(e) => handleUpdateItem(item.id, 'itemDesc', e.target.value)}
                          disabled={!canEditAll}
                          className="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                          rows={2}
                        />
                      </td>
                      <td className="px-5 py-3">
                        <textarea
                          value={item.detailGoal}
                          onChange={(e) => handleUpdateItem(item.id, 'detailGoal', e.target.value)}
                          disabled={!canEditAll}
                          className="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                          rows={2}
                        />
                      </td>
                      <td className="px-5 py-3">
                        <textarea
                          value={item.notes}
                          onChange={(e) => handleUpdateItem(item.id, 'notes', e.target.value)}
                          disabled={!canEditAll}
                          className="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                          rows={2}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative flex items-center w-20">
                          <input 
                            type="number" 
                            value={item.weight || ''}
                            onChange={(e) => handleUpdateItem(item.id, 'weight', Number(e.target.value))}
                            disabled={!canEditWeight}
                            className={`w-full px-2 py-1 text-right font-bold text-sm border rounded-lg ${
                              canEditWeight ? 'border-gray-300' : 'bg-gray-100'
                            }`}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" 
                          value={item.targetValue || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'targetValue', Number(e.target.value))}
                          disabled={!canEditAll}
                          className="w-full px-2 py-1 text-right font-bold text-sm border border-gray-300 rounded-lg"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value)}
                          disabled={!canEditAll}
                          className="w-full px-2 py-1 text-center border border-gray-300 rounded-lg text-sm"
                        />
                      </td>
                      {isEditable && (
                        <td className="px-4 py-3 text-center align-middle">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-gray-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors"
                            title="항목 삭제"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-[#E2E8F0] shadow-inner">
                <tr>
                  <td colSpan={4} className="px-5 py-4 text-right align-middle text-[#0F172A]">총 가중치 합계:</td>
                  <td className={`px-4 py-4 text-right align-middle ${totalWeight === 100 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {totalWeight}% 
                  </td>
                  <td colSpan={isEditable ? 3 : 2}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {isEditable && (
            <div className="mb-4">
              <button 
                onClick={handleAddItem}
                className="px-4 py-2 rounded-lg font-bold text-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1.5 border border-indigo-100"
              >
                <Plus size={16} /> 개별 항목 추가
              </button>
            </div>
          )}

          {isEditable && (
            <div className="mt-10 flex justify-end gap-4">
              <button 
                onClick={handleSaveDraft}
                className="px-8 py-3 rounded-xl font-bold bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
              >
                <Save size={18} /> 임시 저장
              </button>
              <button 
                onClick={handleSubmit}
                className="px-8 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 flex items-center gap-2"
              >
                <Send size={18} /> 승인 요청하기
              </button>
            </div>
          )}
        </div>

        {toast && (
          <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-xl shadow-2xl font-bold text-sm z-50 flex items-center gap-3 animate-fade-in-up ${
            toast.type === 'success' ? 'bg-[#0F172A] text-white' : 'bg-red-500 text-white'
          }`}>
            {toast.type === 'success' ? <Target className="text-emerald-400" size={20} /> : <AlertCircle size={20} />}
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}
