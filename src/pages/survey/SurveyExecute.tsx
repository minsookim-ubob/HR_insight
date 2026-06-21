import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, ChevronRight, ChevronLeft, Activity, Info, LogOut } from 'lucide-react';
import { SurveyService } from '../../services/SurveyService';

export default function SurveyExecute() {
  const { mappingId } = useParams();
  
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [sessionData, setSessionData] = useState<{ categories: any[], questions: any[] } | null>(null);
  const [rateeInfo, setRateeInfo] = useState<{ name: string, team: string } | null>(null);

  useEffect(() => {
    try {
      const sessionsStr = localStorage.getItem('master_survey_sessions');
      const poolsStr = localStorage.getItem('master_survey_pools');
      const empsStr = localStorage.getItem('master_employees');
      
      let pool = null;

      if (mappingId) {
        const parts = mappingId.split('_');
        const rateeId = parts[1];
        const sessionId = parts[2];

        if (empsStr) {
          const emps = JSON.parse(empsStr);
          const r = emps.find((e: any) => e.id === rateeId);
          if (r) {
            setRateeInfo({ name: r.name, team: r.team });
          }
        }

        if (sessionsStr && poolsStr && sessionId) {
          const sessions = JSON.parse(sessionsStr);
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
        // Fallback or handle missing pool
        setSessionData({ categories: [], questions: [] });
      }
    } catch (e) {
      console.error(e);
      setSessionData({ categories: [], questions: [] });
    }
  }, [mappingId]);

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
      if (mappingId) {
         try {
           // Firestore 업데이트
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
          <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A] mb-3 tracking-tight">다면진단 제출 완료</h1>
          <p className="text-[#475569] mb-8 leading-relaxed">
            성공적으로 평가 내용이 등록 및 저장되었습니다.<br/>시간 내어 동료의 성장을 돕는 피드백을 전달해주셔서 감사합니다.
          </p>
          <button 
            onClick={() => window.close()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 text-[#475569] hover:text-[#0F172A] font-bold rounded-xl hover:bg-gray-200 transition-colors"
          >
            <LogOut size={18} /> 브라우저 창 닫기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#475569] flex flex-col animate-in fade-in duration-500">
      {/* Header */}
      <header className="bg-white border-b border-[#E2E8F0] h-16 flex items-center justify-center px-6 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-lg text-[#0F172A] tracking-tight">
          <div className="w-8 h-8 bg-[#6366F1] rounded-lg flex items-center justify-center text-white shadow-sm">
            <Activity size={18} strokeWidth={2.5} />
          </div>
          <span>SalesIQ <span className="text-[#94A3B8] font-normal text-sm ml-1">동료평가 다면진단</span></span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:px-8 md:py-6 space-y-6">
        
        {/* Info Banner */}
        <div className="bg-gradient-to-r from-[#EEF2FF] to-[#E0E7FF] border border-[#C7D2FE] p-4 rounded-xl flex gap-3 items-start shadow-sm">
           <Info className="text-[#4F46E5] shrink-0 mt-0.5" size={20} />
           <div>
             <h3 className="font-bold text-[#0F172A] mb-1 text-base">평가 대상자: <span className="text-[#4F46E5]">{rateeInfo ? `${rateeInfo.name} (${rateeInfo.team})` : '로딩 중...'}</span></h3>
             <p className="text-[13px] text-[#475569] leading-relaxed">각 문항을 확인하고 1점(전혀 그렇지 않다)~5점(매우 그렇다) 척도로 클릭해주세요. 평가는 완벽하게 익명이 보장됩니다.</p>
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
                 <span className="w-8 shrink-0">3</span>
                 <span className="w-8 shrink-0">4</span>
                 <span className="w-8 shrink-0">5<br/><span className="text-[9px] font-medium leading-none text-gray-400">매우그럼</span></span>
               </div>
            </div>

            {currentQuestions.map((q, qIdx) => (
              <div key={q.id} className={`flex flex-col md:flex-row md:items-center py-3 px-4 md:px-6 transition-colors gap-3 ${answers[q.id] ? 'bg-blue-50/20' : 'hover:bg-[#F8FAFC]'}`}>
                 <h4 className="text-[14px] font-medium text-[#0F172A] flex gap-2.5 flex-1 leading-snug">
                   <span className={`shrink-0 font-mono text-[13px] font-bold mt-px transition-colors ${answers[q.id] ? 'text-[#4F46E5]' : 'text-[#94A3B8]'}`}>{qIdx + 1}.</span> {q.text}
                 </h4>
                 
                 <div className="flex items-center justify-between md:justify-end gap-2 md:gap-0 mt-1 md:mt-0 px-8 md:px-0">
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
                      <>
                        <span className="md:hidden text-[10px] font-bold text-[#94A3B8] mr-2">1(전혀아님)</span>
                        <div className={`flex justify-between items-center w-full md:pr-2 ${q.scaleType === '7pt' ? 'md:w-80' : 'md:w-64'}`}>
                          {Array.from({ length: q.scaleType === '7pt' ? 7 : 5 }, (_, i) => i + 1).map(score => (
                            <label key={score} className="relative cursor-pointer flex flex-col items-center group">
                              <input 
                                type="radio" 
                                name={q.id} 
                                value={score}
                                checked={answers[q.id] === score}
                                onChange={() => setAnswers(prev => ({...prev, [q.id]: score}))}
                                className="sr-only"
                              />
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-200 text-[13px] font-bold shrink-0
                                ${answers[q.id] === score 
                                  ? 'bg-[#6366F1] border-[#6366F1] text-white shadow-sm ring-2 ring-indigo-100 ring-offset-1 transform scale-105' 
                                  : 'bg-white border-gray-300 text-gray-500 group-hover:border-[#a5b4fc] group-hover:text-[#6366F1] group-hover:bg-indigo-50/50'
                                }
                              `}>
                                {score}
                              </div>
                            </label>
                          ))}
                        </div>
                        <span className="md:hidden text-[10px] font-bold text-[#94A3B8] ml-2">{q.scaleType === '7pt' ? '7' : '5'}(매우그렇다)</span>
                      </>
                    )}
                 </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center py-4 border-t border-[#E2E8F0]">
          <button 
            onClick={handlePrev}
            disabled={currentCategoryIndex === 0}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors ${
              currentCategoryIndex === 0 
                ? 'opacity-0 pointer-events-none' 
                : 'bg-white border border-[#E2E8F0] text-[#475569] hover:bg-gray-50 shadow-sm'
            }`}
          >
            <ChevronLeft size={16} /> 이전
          </button>
          
          {currentCategoryIndex === CATEGORIES.length - 1 ? (
            <button 
              onClick={handleSubmit}
              disabled={!isCurrentCategoryComplete}
              className={`flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm ${
                isCurrentCategoryComplete 
                  ? 'bg-gradient-to-r from-[#14B8A6] to-[#0D9488] text-white hover:shadow hover:-translate-y-px' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              }`}
            >
              제출하기 <CheckCircle2 size={16} />
            </button>
          ) : (
            <button 
              onClick={handleNext}
              disabled={!isCurrentCategoryComplete}
              className={`flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm ${
                isCurrentCategoryComplete 
                  ? 'bg-[#0F172A] text-white hover:bg-[#1E293B] hover:-translate-y-px' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              }`}
            >
              다음 <ChevronRight size={16} />
            </button>
          )}
        </div>
        
      </main>
    </div>
  );
}
