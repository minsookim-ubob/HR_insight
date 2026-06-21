import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, ChevronLeft, Activity, Info, LogOut } from 'lucide-react';
import { SurveyService } from '../../services/SurveyService';

export default function SelfSurveyExecute() {
  const { userId } = useParams();
  
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [employeeName, setEmployeeName] = useState<string>('본인');
  const [sessionData, setSessionData] = useState<{ categories: any[], questions: any[] } | null>(null);

  useEffect(() => {
    // Find the employee name to display properly
    const savedEmps = localStorage.getItem('master_employees');
    if (savedEmps && userId) {
      const emps = JSON.parse(savedEmps);
      const emp = emps.find((e: any) => e.id === userId);
      if (emp) {
        setEmployeeName(`${emp.name} (${emp.team})`);
      }
    }

    // Load dynamic questions
    try {
      const sessionsStr = localStorage.getItem('master_survey_sessions');
      const poolsStr = localStorage.getItem('master_survey_pools');
      let pool = null;

      if (sessionsStr && poolsStr) {
        const sessions = JSON.parse(sessionsStr);
        // Find the active self survey session
        const selfSession = sessions.find((s: any) => s.type === 'self' && s.status === 'ongoing');
        const sessionId = selfSession ? selfSession.id : sessions.find((s: any) => s.type === 'self')?.id;
        
        if (sessionId) {
          const session = sessions.find((s: any) => s.id === sessionId);
          if (session && session.poolId) {
            const pools = JSON.parse(poolsStr);
            pool = pools.find((p: any) => p.id === session.poolId);
          }
        }
      }

      if (pool) {
        setSessionData({
          categories: pool.categories || [],
          questions: pool.questions || []
        });
      } else {
        setSessionData({ categories: [], questions: [] });
      }
    } catch (e) {
      console.error(e);
      setSessionData({ categories: [], questions: [] });
    }
  }, [userId]);

  if (!userId) {
     return <Navigate to="/" replace />;
  }

  if (!sessionData) {
    return <div className="p-8 text-center text-gray-500">로딩 중...</div>;
  }

  const CATEGORIES = sessionData.categories;
  const QUESTIONS = sessionData.questions;

  const currentCategory = CATEGORIES[currentCategoryIndex];
  const currentQuestions = currentCategory ? QUESTIONS.filter(q => q.categoryId === currentCategory.id) : [];

  const isCurrentCategoryComplete = currentQuestions.every(q => answers[q.id] !== undefined && answers[q.id] !== '');

  const handleNext = () => {
    if (currentCategoryIndex < CATEGORIES.length - 1) {
      setCurrentCategoryIndex(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrev = () => {
    if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    if (confirm('제출 후에는 평가를 수정할 수 없으며 시스템에 자동 저장됩니다. 제출하시겠습니까?')) {
      if (userId) {
         try {
           const sessionsStr = localStorage.getItem('master_survey_sessions');
           const sessions = sessionsStr ? JSON.parse(sessionsStr) : [];
           const selfSession = sessions.find((s: any) => s.type === 'self' && s.status === 'ongoing') 
                                || sessions.find((s: any) => s.type === 'self');
           const sessionId = selfSession ? selfSession.id : 's_self_default';
           const mappingId = `${userId}_${userId}_${sessionId}`;

           await SurveyService.saveResult(mappingId, {
             status: 'completed',
             completedAt: new Date().toISOString(),
             answers: answers
           });

           setIsSubmitted(true);
         } catch (e) {
           console.error("Firestore 저장 오류", e);
           alert("제출에 실패했습니다. 관리자에게 문의하세요.");
         }
      }
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl p-10 max-w-lg w-full text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-[#EEF2FF] text-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A] mb-3 tracking-tight">자가진단 제출 완료</h1>
          <p className="text-[#475569] mb-8 leading-relaxed">
            성공적으로 자가진단 평가 내용이 저장되었습니다.<br/>본인의 성장을 위해 솔직한 의견을 남겨주셔서 감사합니다.
          </p>
          <button 
            onClick={() => window.close()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 text-[#475569] hover:text-[#0F172A] font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <LogOut size={18} /> 브라우저 창 닫기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#475569] flex flex-col animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-[#E2E8F0] h-16 flex items-center justify-center px-6 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-lg text-[#0F172A] tracking-tight">
          <div className="w-8 h-8 bg-[#6366F1] rounded-lg flex items-center justify-center text-white shadow-sm">
            <Activity size={18} strokeWidth={2.5} />
          </div>
          <span>SalesIQ <span className="text-[#94A3B8] font-normal text-sm ml-1">스스로 평가하는 자가진단</span></span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:px-8 md:py-6 space-y-6">
        
        {/* Info Banner */}
        <div className="bg-gradient-to-r from-[#EEF2FF] to-[#E0E7FF] border border-[#C7D2FE] p-4 rounded-xl flex gap-3 items-start shadow-sm">
           <Info className="text-[#4F46E5] shrink-0 mt-0.5" size={20} />
           <div>
             <h3 className="font-bold text-[#0F172A] mb-1 text-base">평가 진행: <span className="text-[#4F46E5]">{employeeName}</span> 본인</h3>
             <p className="text-[13px] text-[#475569] leading-relaxed">각 문항을 확인하고 자신에 대해 1점(전혀 그렇지 않다)~5점(매우 그렇다) 척도로 객관적으로 판단하여 클릭해주세요. 이 데이터는 다면평가 결과와 비교 분석됩니다.</p>
           </div>
        </div>

        {/* Progress Stepper */}
        <div className="flex items-center justify-between px-4 relative max-w-3xl mx-auto">
          <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-1 bg-gray-200 -z-10 rounded-full">
             <div className="h-full bg-[#6366F1] transition-all duration-500 rounded-full" style={{ width: `${(currentCategoryIndex / (CATEGORIES.length - 1)) * 100}%` }}></div>
          </div>
          {CATEGORIES.map((cat, idx) => {
             const isPast = idx < currentCategoryIndex;
             const isCurrent = idx === currentCategoryIndex;
             return (
               <div key={cat.id} className="flex flex-col items-center gap-1.5 bg-[#F8FAFC] px-2 relative transition-all duration-300">
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors shadow-sm ${
                   isPast ? 'bg-[#6366F1] border-[#6366F1] text-white' : 
                   isCurrent ? 'bg-white border-[#6366F1] text-[#6366F1] shadow border-2' : 
                   'bg-white border-gray-300 text-gray-400'
                 }`}>
                   {isPast ? <CheckCircle2 size={16} /> : (idx + 1)}
                 </div>
                 <span className={`text-[11px] font-bold transition-colors ${isCurrent ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>{cat.name}</span>
               </div>
             )
          })}
        </div>

        {/* Questions Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden animate-in slide-in-from-bottom-1 duration-300">
          <div className="px-5 py-3.5 bg-[#0F172A] text-white flex justify-between items-center">
            <h2 className="text-base font-bold tracking-tight">Q. {currentCategory.name} 카테고리 항목</h2>
            <span className="text-xs bg-white/20 px-2 py-1 rounded text-gray-100">{currentQuestions.length}문항</span>
          </div>
          
          <div className="divide-y divide-[#E2E8F0]">
            {/* Desktop Header */}
            <div className="hidden md:flex items-center px-6 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] justify-end">
               <div className="flex justify-between w-64 pr-2 text-[11px] font-bold text-[#94A3B8] text-center">
                 <span className="w-8 shrink-0">1<br/><span className="text-[9px] font-medium leading-none text-gray-400">전혀아님</span></span>
                 <span className="w-8 shrink-0">2</span>
                 <span className="w-8 shrink-0">3<br/><span className="text-[9px] font-medium leading-none text-gray-400">보통</span></span>
                 <span className="w-8 shrink-0">4</span>
                 <span className="w-8 shrink-0">5<br/><span className="text-[9px] font-medium leading-none text-[#6366F1]">매우그렇다</span></span>
               </div>
            </div>

            {currentQuestions.map((q, idx) => (
              <div key={q.id} className="p-5 md:px-6 md:py-5 flex flex-col md:flex-row md:items-center gap-4 hover:bg-[#F8FAFC] transition-colors">
                 <div className="flex-1 flex gap-3">
                   <div className="shrink-0 w-6 h-6 rounded bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center font-bold text-xs mt-0.5">
                     {idx + 1}
                   </div>
                   <p className="text-[14px] md:text-[15px] font-medium text-[#0F172A] leading-relaxed pt-0.5" dangerouslySetInnerHTML={{ __html: q.text.replace(/본인/g, '<span class="text-[#4F46E5] font-bold">본인</span>') }}></p>
                 </div>
                 
                 {/* Rating Scale */}
                 <div className="flex items-center justify-between md:justify-end w-full md:w-auto mt-2 md:mt-0 px-2 md:px-0">
                    {q.scaleType === 'text' ? (
                      <div className="w-full md:w-64 pt-2 pb-1">
                         <textarea
                           value={(answers[q.id] as string) || ''}
                           onChange={(e) => setAnswers(prev => ({...prev, [q.id]: e.target.value}))}
                           placeholder="답변을 입력하세요"
                           className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                           rows={2}
                         />
                      </div>
                    ) : (
                      <div className={`flex justify-between w-full gap-1 ${q.scaleType === '7pt' ? 'md:w-80' : 'md:w-64'}`}>
                        {Array.from({ length: q.scaleType === '7pt' ? 7 : 5 }, (_, i) => i + 1).map(score => {
                          const isSelected = answers[q.id] === score;
                          const maxScore = q.scaleType === '7pt' ? 7 : 5;
                          const midScore = q.scaleType === '7pt' ? 4 : 3;
                          return (
                            <div key={score} className="flex flex-col items-center gap-1 group relative">
                              {/* Mobile Label showing only for first/last/middle logic */}
                              <span className="text-[10px] text-gray-400 md:hidden h-3 text-center mb-0.5">
                                {score === 1 && '전혀아님'}
                                {score === midScore && '보통'}
                                {score === maxScore && '매우그렇다'}
                              </span>
                              
                              <button
                                onClick={() => setAnswers(prev => ({ ...prev, [q.id]: score }))}
                                className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6366F1] shadow-sm
                                  ${isSelected 
                                    ? 'bg-[#6366F1] text-white border-2 border-[#4F46E5] scale-110 shadow-md' 
                                    : 'bg-white border-2 border-[#E2E8F0] text-[#64748B] hover:border-[#6366F1] hover:text-[#6366F1] hover:bg-[#EEF2FF]'
                                  }
                                `}
                              >
                                {score}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                 </div>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-between items-center text-sm">
            <div className="font-medium text-[#64748B]">
              <span className="text-[#0F172A] font-bold">{Object.keys(answers).filter(id => currentQuestions.some(q => q.id === id)).length}</span> / {currentQuestions.length} 완료
            </div>
            {!isCurrentCategoryComplete && (
               <span className="text-red-500 font-bold text-xs flex items-center gap-1">모든 문항에 응답해주세요.</span>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-2">
          <button
             onClick={handlePrev}
             disabled={currentCategoryIndex === 0}
             className="flex items-center gap-1.5 px-6 py-3 font-bold text-[#475569] bg-white border border-[#E2E8F0] rounded-xl hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} /> 이전
          </button>
          
          {currentCategoryIndex === CATEGORIES.length - 1 ? (
             <button
               onClick={handleSubmit}
               disabled={!isCurrentCategoryComplete}
               className="flex items-center gap-1.5 px-8 py-3 font-bold text-white bg-[#0F172A] rounded-xl hover:bg-[#1E293B] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
             >
               제출하기 <CheckCircle2 size={18} />
             </button>
          ) : (
             <button
               onClick={handleNext}
               disabled={!isCurrentCategoryComplete}
               className="flex items-center gap-1.5 px-8 py-3 font-bold text-white bg-[#6366F1] rounded-xl hover:bg-[#4F46E5] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
             >
               다음 <ChevronRight size={18} />
             </button>
          )}
        </div>
      </main>
    </div>
  );
}
