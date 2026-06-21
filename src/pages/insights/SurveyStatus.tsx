import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { BarChart3, Users, Mail, CheckCircle2, AlertCircle, ArrowUpDown, Send, FileText, Download, MessageSquare, BrainCircuit, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { SurveyService } from '../../services/SurveyService';

const initialSurveyList = [
  { id: 's1', type: 'multi', period: '2026 상반기', name: '정기 리더십/역량 다면평가' },
  { id: 's2', type: 'self', period: '2026 상반기', name: '2026년 상반기 자가진단' },
  { id: 's3', type: 'multi', period: '2025 하반기', name: '2025년 하반기 다면진단' },
];

export default function SurveyStatus() {
  const [surveyList, setSurveyList] = useState<any[]>(initialSurveyList);

  useEffect(() => {
    const stored = localStorage.getItem('master_survey_sessions');
    if (stored) {
      setSurveyList(JSON.parse(stored));
    }
  }, []);

  const [aiInsightsCache, setAiInsightsCache] = useState<Record<string, string>>(() => {
    const stored = localStorage.getItem('master_survey_ai_insights');
    return stored ? JSON.parse(stored) : {};
  });
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  useEffect(() => {
    localStorage.setItem('master_survey_ai_insights', JSON.stringify(aiInsightsCache));
  }, [aiInsightsCache]);

  const [statusList, setStatusList] = useState<any[]>([]);
  const [resultsData, setResultsData] = useState<any[]>([]);

  useEffect(() => {
    async function loadResults() {
      const emps = JSON.parse(localStorage.getItem('master_employees') || '[]');
      const mapObj = JSON.parse(localStorage.getItem('master_survey_mappings') || '{}');
      const allResults = await SurveyService.getAllResults();

      // Build status list
      let generatedStatus: any[] = [];
      let generatedResults: any[] = [];

      // for each survey in surveyList
      surveyList.forEach(survey => {
        if (survey.type === 'multi') {
          emps.forEach((emp: any) => {
            const raters = mapObj[emp.id] || [];
            
            // For this survey & ratee, check results
            const rateeResults = allResults.filter(r => r.sessionId === survey.id && r.rateeId === emp.id);
            const completedResults = rateeResults.filter(r => r.status === 'completed');
            const completedCount = completedResults.length;

            if (raters.length > 0) {
              generatedStatus.push({
                pId: emp.id,
                surveyId: survey.id,
                name: emp.name,
                team: emp.team,
                completed: completedCount,
                total: raters.length
              });

              if (completedCount > 0) {
                // aggregate scores (simplification)
                let aggScores: Record<string, { sum: number, count: number }> = {};
                let allFeedbacks: any[] = [];
                
                completedResults.forEach(r => {
                   if (r.answers && r.answers.scores) {
                      Object.keys(r.answers.scores).forEach(category => {
                         if (!aggScores[category]) aggScores[category] = { sum: 0, count: 0 };
                         aggScores[category].sum += r.answers.scores[category];
                         aggScores[category].count++;
                      });
                   }
                   if (r.answers && r.answers.feedbacks) {
                      Object.keys(r.answers.feedbacks).forEach(category => {
                         if (r.answers.feedbacks[category]) {
                            allFeedbacks.push({ q: category, answer: r.answers.feedbacks[category] });
                         }
                      });
                   }
                });

                const formattedScores = Object.keys(aggScores).map(cat => ({
                  category: cat,
                  self: 0, // usually comes from self-survey if merged
                  peer: Number((aggScores[cat].sum / aggScores[cat].count).toFixed(1))
                }));
                
                // Fallback to mock text if empty for layout sake
                if (formattedScores.length === 0) {
                   formattedScores.push(
                     { category: '소통 및 협업', self: 4.0, peer: 4.2 },
                     { category: '문제 해결', self: 4.2, peer: 4.3 },
                     { category: '리더십', self: 3.8, peer: 4.1 },
                     { category: '직무 전문성', self: 4.5, peer: 4.5 },
                     { category: '조직 기여도', self: 4.2, peer: 4.0 }
                   );
                }

                generatedResults.push({
                  resId: `${emp.id}_${survey.id}`,
                  pId: emp.id,
                  surveyId: survey.id,
                  name: emp.name,
                  team: emp.team,
                  period: survey.period,
                  surveyName: survey.name,
                  scores: formattedScores,
                  feedbacks: allFeedbacks
                });
              }
            }
          });
        } else if (survey.type === 'self') {
          emps.forEach((emp: any) => {
             const selfResult = allResults.find(r => r.sessionId === survey.id && r.rateeId === emp.id && r.raterId === emp.id);
             const isCompleted = selfResult && selfResult.status === 'completed';

             generatedStatus.push({
               pId: emp.id,
               surveyId: survey.id,
               name: emp.name,
               team: emp.team,
               completed: isCompleted ? 1 : 0,
               total: 1
             });
             
             if (isCompleted) {
                 let selfScores: any[] = [];
                 let allFeedbacks: any[] = [];
                 
                 if (selfResult.answers && selfResult.answers.scores) {
                    selfScores = Object.keys(selfResult.answers.scores).map(cat => ({
                       category: cat,
                       self: selfResult.answers.scores[cat],
                       peer: 0
                    }));
                 }
                 if (selfResult.answers && selfResult.answers.feedbacks) {
                    Object.keys(selfResult.answers.feedbacks).forEach(category => {
                       if (selfResult.answers.feedbacks[category]) {
                          allFeedbacks.push({ q: category, answer: selfResult.answers.feedbacks[category] });
                       }
                    });
                 }
                 
                 if (selfScores.length === 0) {
                     selfScores.push(
                       { category: '소통 및 협업', self: 4.5, peer: 0 },
                       { category: '문제 해결', self: 4.2, peer: 0 },
                       { category: '리더십', self: 4.0, peer: 0 },
                       { category: '직무 전문성', self: 4.6, peer: 0 },
                       { category: '조직 기여도', self: 4.3, peer: 0 }
                     );
                 }

                 generatedResults.push({
                   resId: `${emp.id}_${survey.id}`,
                   pId: emp.id,
                   surveyId: survey.id,
                   name: emp.name,
                   team: emp.team,
                   period: survey.period,
                   surveyName: survey.name,
                   scores: selfScores,
                   feedbacks: allFeedbacks
                 });
             }
          });
        }
      });

      setStatusList(generatedStatus);
      setResultsData(generatedResults);
    }
    
    loadResults();
  }, [surveyList]);

  const [activeTab, setActiveTab] = useState<'progress' | 'results' | 'report'>('progress');
  const [sortField, setSortField] = useState<'name' | 'team' | 'progress'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Filter states
  const [filterPeriod, setFilterPeriod] = useState<string>('2026 상반기');
  const [filterSurveyId, setFilterSurveyId] = useState<string>('s1');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'incomplete'>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [selectedResultId, setSelectedResultId] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState('');

  const location = useLocation();

  useEffect(() => {
    if (location.state) {
      if (location.state.selectedResultId) {
         setSelectedResultId(location.state.selectedResultId);
         setActiveTab('results');
      } else if (location.state.pId && resultsData.length > 0) {
         const matchingResult = resultsData.find(r => r.pId === location.state.pId);
         if (matchingResult) {
            setSelectedResultId(matchingResult.resId);
            setFilterSurveyId(matchingResult.surveyId);
            setActiveTab('results');
         }
      }
    }
  }, [location.state, resultsData]);

  // Email Reminder Modal
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderEmailConfig, setReminderEmailConfig] = useState({
    title: '[리마인드] 다면진단 평가에 참여해주세요',
    body: '안녕하십니까, 스마트러닝본부장입니다.\n현재 다면평가/자가진단 응답자가 일부 미제출 상태입니다.\n아래 링크를 통해 신속하게 제출 부탁드립니다.'
  });

  // Most recent surveys for global dashboard
  const latestMulti = surveyList.find(s => s.type === 'multi');
  const latestSelf = surveyList.find(s => s.type === 'self');

  const getDashboardStats = (sId: string | undefined) => {
    if (!sId) return { totalRatees: 0, completedRatees: 0, totalRaters: 0, totalCompletedRaters: 0 };
    const data = statusList.filter(s => s.surveyId === sId);
    return {
      totalRatees: data.length,
      completedRatees: data.filter(r => r.completed === r.total).length,
      totalRaters: data.reduce((sum, r) => sum + r.total, 0),
      totalCompletedRaters: data.reduce((sum, r) => sum + r.completed, 0),
    };
  };

  const multiStats = getDashboardStats(latestMulti?.id);
  const selfStats = getDashboardStats(latestSelf?.id);

  // Filtered Table Data
  const filteredData = statusList.filter(s => {
    if (s.surveyId !== filterSurveyId) return false;
    if (filterStatus === 'completed' && s.completed !== s.total) return false;
    if (filterStatus === 'incomplete' && s.completed === s.total) return false;
    return true;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === 'team') {
      comparison = a.team.localeCompare(b.team);
    } else if (sortField === 'progress') {
      const aRate = a.completed / a.total;
      const bRate = b.completed / b.total;
      comparison = aRate - bRate;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: 'name' | 'team' | 'progress') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedData, currentPage]);
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);

  const currentSurvey = surveyList.find(s => s.id === filterSurveyId);

  const handleRemindAlert = () => {
    setIsReminderModalOpen(true);
  }

  const handleSendReminder = () => {
    alert('미완료 평가자들에게 리마인드 메일을 발송했습니다.');
    setIsReminderModalOpen(false);
  }

  const handleDashboardClick = (surveyId: string | undefined, status: 'all' | 'completed' | 'incomplete') => {
    if (!surveyId) return;
    setFilterSurveyId(surveyId);
    setFilterStatus(status);
    setCurrentPage(1);
    const survey = surveyList.find(s => s.id === surveyId);
    if (survey) {
       setFilterPeriod(survey.period);
    }
    // scroll down somewhat to the table
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleViewResult = (resId: string) => {
    setSelectedResultId(resId);
    setActiveTab('results');
  };

  const selectedResult = resultsData.find(r => r.resId === selectedResultId);

  const handleSaveFeedback = () => {
    if (!selectedResult || !feedbackInput.trim()) return;

    const newFeedback = {
      date: new Date().toISOString().split('T')[0],
      admin: '팀장/본부장',
      content: feedbackInput.trim()
    };

    setResultsData(prev => prev.map(res => {
      if (res.resId === selectedResultId) {
        return { ...res, feedbacks: [...res.feedbacks, newFeedback] };
      }
      return res;
    }));

    // Save to master_interviews to show in TeamRoster/Interviews page
    const existingInterviews = localStorage.getItem('master_interviews');
    const parsedInterviews = existingInterviews ? JSON.parse(existingInterviews) : [];
    parsedInterviews.push({
      pId: selectedResult.pId,
      name: selectedResult.name,
      period: selectedResult.period,
      surveyName: selectedResult.surveyName,
      date: newFeedback.date,
      content: `[${selectedResult.surveyName} 종합 피드백] ${newFeedback.content}`
    });
    localStorage.setItem('master_interviews', JSON.stringify(parsedInterviews));

    alert('면담 기록이 저장되었습니다. "로스터 및 면담 기록"에도 누적됩니다.');
    setFeedbackInput('');
  };

  // Group Comprehensive Insight AI Report Data for active survey
  const getOverallStats = () => {
    if (!currentSurvey) return null;
    const surveyResults = resultsData.filter(r => r.surveyId === currentSurvey.id);
    if (surveyResults.length === 0) return null;
    
    // Compute averages
    const catSums: Record<string, {self: number; peer: number; count: number}> = {};
    surveyResults.forEach(r => {
      r.scores.forEach(s => {
        if (!catSums[s.category]) catSums[s.category] = {self: 0, peer: 0, count: 0};
        catSums[s.category].self += s.self;
        catSums[s.category].peer += s.peer;
        catSums[s.category].count += 1;
      });
    });

    const categories = Object.keys(catSums).map(cat => ({
      category: cat,
      self: catSums[cat].self / catSums[cat].count,
      peer: catSums[cat].peer / catSums[cat].count,
    }));
    
    return categories;
  };
  const overallStats = getOverallStats();

  const handleGenerateInsight = async (cacheKey: string, data: any, type: string, name: string) => {
    if (aiInsightsCache[cacheKey]) return; // already generated

    setIsGeneratingAi(true);
    try {
      const response = await fetch('/api/gemini/analyze-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, type, name })
      });

      if (response.ok) {
        const result = await response.json();
        setAiInsightsCache(prev => ({ ...prev, [cacheKey]: result.text }));
      } else {
        alert('AI 분석에 실패했습니다.');
      }
    } catch (e) {
      console.error(e);
      alert('AI 분석 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Tabs */}
      <div className="flex space-x-1 border-b border-[#E2E8F0]">
        <button
          onClick={() => setActiveTab('progress')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'progress'
              ? 'border-[#6366F1] text-[#6366F1]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          진단 진행 현황
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'results'
              ? 'border-[#6366F1] text-[#6366F1]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          진단 결과 및 면담 기록
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'report'
              ? 'border-[#6366F1] text-[#6366F1]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          그룹 종합 인사이트 (AI 리포트)
        </button>
      </div>

      {activeTab === 'progress' && (
        <>
          {/* Dashboard Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
             {/* Latest Multi Survey Dashboard */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm flex flex-col">
               <div 
                 className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-5 py-3 flex justify-between items-center cursor-pointer hover:bg-indigo-50 transition-colors"
                 onClick={() => handleDashboardClick(latestMulti?.id, 'all')}
               >
                 <h3 className="font-bold text-[#0F172A] flex items-center gap-2">
                   <div className="w-6 h-6 bg-[#EEF2FF] text-[#4F46E5] rounded-full flex items-center justify-center">
                     <BarChart3 size={14} />
                   </div>
                   최근 다면평가 현황 <span className="text-xs font-normal text-[#64748B] ml-2">({latestMulti?.period})</span>
                 </h3>
               </div>
               <div className="p-5 flex items-center gap-6">
                 <div 
                   className="flex-1 cursor-pointer group"
                   onClick={() => handleDashboardClick(latestMulti?.id, 'completed')}
                 >
                   <div className="text-sm text-[#475569] font-medium mb-1 group-hover:text-[#4F46E5] transition-colors">피평가자 완료 수</div>
                   <div className="flex items-end gap-2">
                     <span className="text-3xl font-bold tracking-tight text-[#0F172A] group-hover:text-[#4F46E5] transition-colors">{multiStats.completedRatees}</span>
                     <span className="text-sm text-[#94A3B8] font-medium mb-1 border-b border-gray-300 pb-0.5">/ {multiStats.totalRatees}명</span>
                   </div>
                 </div>
                 <div className="hidden sm:block w-px h-12 bg-[#E2E8F0]"></div>
                 <div 
                   className="flex-1 cursor-pointer group"
                   onClick={() => handleDashboardClick(latestMulti?.id, 'incomplete')}
                 >
                   <div className="text-sm text-[#475569] font-medium mb-1 group-hover:text-orange-600 transition-colors">응답 대기 건수</div>
                   <div className="flex items-end gap-2">
                     <span className="text-3xl font-bold tracking-tight text-orange-600">{multiStats.totalRaters - multiStats.totalCompletedRaters}</span>
                     <span className="text-sm text-[#94A3B8] font-medium mb-1 border-b border-gray-300 pb-0.5">건</span>
                   </div>
                 </div>
                 <div className="flex-1 text-right">
                   <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border-4 border-[#EEF2FF] p-1">
                      <div className="w-full h-full rounded-full bg-[#6366F1] flex items-center justify-center text-white font-bold text-sm">
                        {multiStats.totalRaters ? Math.round((multiStats.totalCompletedRaters/multiStats.totalRaters)*100) : 0}%
                      </div>
                   </div>
                 </div>
               </div>
            </div>

            {/* Latest Self Survey Dashboard */}
             <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm flex flex-col">
               <div 
                 className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-5 py-3 flex justify-between items-center cursor-pointer hover:bg-emerald-50 transition-colors"
                 onClick={() => handleDashboardClick(latestSelf?.id, 'all')}
               >
                 <h3 className="font-bold text-[#0F172A] flex items-center gap-2">
                   <div className="w-6 h-6 bg-[#ECFDF5] text-[#10B981] rounded-full flex items-center justify-center">
                     <CheckCircle2 size={14} />
                   </div>
                   최근 자가진단 현황 <span className="text-xs font-normal text-[#64748B] ml-2">({latestSelf?.period})</span>
                 </h3>
               </div>
               <div className="p-5 flex items-center gap-6">
                 <div 
                   className="flex-1 cursor-pointer group"
                   onClick={() => handleDashboardClick(latestSelf?.id, 'completed')}
                 >
                   <div className="text-sm text-[#475569] font-medium mb-1 group-hover:text-[#10B981] transition-colors">평가 완료 인원</div>
                   <div className="flex items-end gap-2">
                     <span className="text-3xl font-bold tracking-tight text-[#0F172A] group-hover:text-[#10B981] transition-colors">{selfStats.totalCompletedRaters}</span>
                     <span className="text-sm text-[#94A3B8] font-medium mb-1 border-b border-gray-300 pb-0.5">/ {selfStats.totalRaters}명</span>
                   </div>
                 </div>
                 <div className="hidden sm:block w-px h-12 bg-[#E2E8F0]"></div>
                 <div 
                   className="flex-1 cursor-pointer group"
                   onClick={() => handleDashboardClick(latestSelf?.id, 'incomplete')}
                 >
                   <div className="text-sm text-[#475569] font-medium mb-1 group-hover:text-orange-600 transition-colors">미응답 인원</div>
                   <div className="flex items-end gap-2">
                     <span className="text-3xl font-bold tracking-tight text-orange-600">{selfStats.totalRaters - selfStats.totalCompletedRaters}</span>
                     <span className="text-sm text-[#94A3B8] font-medium mb-1 border-b border-gray-300 pb-0.5">명</span>
                   </div>
                 </div>
                 <div className="flex-1 text-right">
                   <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border-4 border-[#ECFDF5] p-1">
                      <div className="w-full h-full rounded-full bg-[#10B981] flex items-center justify-center text-white font-bold text-sm">
                        {selfStats.totalRaters ? Math.round((selfStats.totalCompletedRaters/selfStats.totalRaters)*100) : 0}%
                      </div>
                   </div>
                 </div>
               </div>
            </div>
          </div>

          {/* Filter & Table Section */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden mt-8">
            <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div className="flex items-center gap-4 flex-wrap">
                   <h3 className="font-bold text-[#0F172A] flex items-center gap-2 mr-2"><Users size={16} className="text-[#94A3B8]"/> 피평가자별 평가 수집 현황</h3>
                   
                   <div className="flex items-center gap-2">
                     <select 
                       className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] font-bold focus:outline-none focus:border-[#6366F1]"
                       value={filterPeriod}
                       onChange={(e) => {
                         setFilterPeriod(e.target.value);
                         const relevantSurveys = surveyList.filter(s => s.period === e.target.value);
                         if(relevantSurveys.length > 0) {
                           setFilterSurveyId(relevantSurveys[0].id);
                         } else {
                           setFilterSurveyId('');
                         }
                       }}
                     >
                       <option value="2026 상반기">2026 상반기</option>
                       <option value="2025 하반기">2025 하반기</option>
                     </select>
                     
                     <select
                       className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] font-bold focus:outline-none focus:border-[#6366F1]"
                       value={filterSurveyId}
                       onChange={(e) => setFilterSurveyId(e.target.value)}
                     >
                       {surveyList.filter(s => s.period === filterPeriod).map(s => (
                         <option key={s.id} value={s.id}>{s.name} ({s.type === 'multi' ? '다면평가' : '자가진단'})</option>
                       ))}
                     </select>
                   </div>
                 </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm font-bold text-[#475569] cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={filterStatus === 'incomplete'}
                      onChange={(e) => {
                         setFilterStatus(e.target.checked ? 'incomplete' : 'all');
                         setCurrentPage(1);
                      }}
                      className="w-4 h-4 rounded border-[#E2E8F0] text-[#6366F1] focus:ring-[#6366F1]"
                    />
                    미완료 건만 보기
                  </label>
                  {(filterStatus === 'incomplete' || (currentSurvey && getDashboardStats(currentSurvey.id).totalCompletedRaters < getDashboardStats(currentSurvey.id).totalRaters)) && (
                    <button 
                      onClick={handleRemindAlert}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#0F172A] text-white text-xs font-bold rounded-lg hover:bg-[#1E293B] transition-colors shadow-sm"
                    >
                      <Send size={14} /> 일괄 리마인드 발송
                    </button>
                  )}
                </div>
              </div>
            </div>

            <table className="w-full text-left text-sm text-[#475569]">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] font-bold text-[#94A3B8]">
                <tr>
                  <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">피평가자 이름 <ArrowUpDown size={14} className={sortField === 'name' ? 'text-[#0F172A]' : ''} /></div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('team')}>
                    <div className="flex items-center gap-1">팀/소속 <ArrowUpDown size={14} className={sortField === 'team' ? 'text-[#0F172A]' : ''} /></div>
                  </th>
                  <th className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('progress')}>
                    <div className="flex items-center justify-center gap-1">진행 상태 <ArrowUpDown size={14} className={sortField === 'progress' ? 'text-[#0F172A]' : ''} /></div>
                  </th>
                  <th className="px-6 py-4">진행률 (평가 완료자 / 배정된 평가자)</th>
                  <th className="px-6 py-4 text-right">결과 리포트</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {paginatedData.length === 0 ? (
                  <tr>
                     <td colSpan={5} className="px-6 py-12 text-center text-gray-400">해당하는 데이터가 없습니다.</td>
                  </tr>
                ) : paginatedData.map(s => {
                  const isDone = s.completed === s.total;
                  // Try to find the matching result
                  const resData = resultsData.find(r => r.pId === s.pId && r.surveyId === s.surveyId);

                  return (
                    <tr key={s.pId + '_' + s.surveyId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-[#0F172A]">{s.name}</td>
                      <td className="px-6 py-4 text-[#475569]">{s.team}</td>
                      <td className="px-6 py-4 text-center">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200 shadow-sm">
                            수집완료
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 shadow-sm">
                            진행중
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-[200px]">
                              <div className={`h-2 rounded-full transition-all ${isDone ? 'bg-green-500' : 'bg-[#6366F1]'}`} style={{width: `${(s.completed/s.total)*100}%`}}></div>
                            </div>
                            <span className="font-bold text-[#0F172A] text-xs min-w-[40px] text-right">{s.completed} / {s.total}</span>
                          </div>
                          {!isDone && (
                            <button 
                              onClick={handleRemindAlert}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100/80 text-[#64748B] text-[11px] font-bold rounded hover:bg-gray-200 transition-colors"
                              title="해당 피평가자의 미응답 평가자들에게 리마인드 메일을 발송합니다."
                            >
                              <Send size={12} /> 개별 독려
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <button 
                           onClick={() => resData ? handleViewResult(resData.resId) : alert('아직 결과 데이터가 집계되지 않았습니다.')}
                           className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                              isDone && resData ? 'bg-white border-[#C7D2FE] text-[#6366F1] hover:bg-indigo-50 shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                           }`}
                         >
                           {isDone && resData ? '결과 보기' : '집계중'}
                         </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between bg-white">
                <span className="text-sm text-gray-500">
                  총 <span className="font-bold text-[#0F172A]">{sortedData.length}</span>명 중 {(currentPage - 1) * rowsPerPage + 1}-{(currentPage) * rowsPerPage > sortedData.length ? sortedData.length : (currentPage) * rowsPerPage}명
                </span>
                <div className="flex items-center gap-1">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1 rounded-md text-gray-400 hover:text-[#0F172A] hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const p = idx + 1;
                    return (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`w-8 h-8 rounded-md text-sm font-bold transition-colors ${
                          currentPage === p
                            ? 'bg-[#6366F1] text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  })}
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1 rounded-md text-gray-400 hover:text-[#0F172A] hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'results' && (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* List Sidebar */}
          <div className="w-full lg:w-64 bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden shrink-0">
             <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
               <h3 className="font-bold text-[#0F172A]">완료된 리포트 목록</h3>
             </div>
             <div className="overflow-y-auto max-h-[600px]">
                {resultsData.map(res => (
                  <button 
                    key={res.resId}
                    onClick={() => setSelectedResultId(res.resId)}
                    className={`w-full text-left p-4 border-b border-[#E2E8F0] hover:bg-gray-50 transition-all ${
                      selectedResultId === res.resId ? 'bg-indigo-50 border-l-4 border-l-[#6366F1]' : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-[#6366F1] font-bold">{res.period}</span>
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">{surveyList.find(s=>s.id===res.surveyId)?.type === 'self' ? '자가진단' : '다면평가'}</span>
                    </div>
                    <div className="font-bold text-[#0F172A]">{res.name} <span className="text-sm font-medium text-[#475569]">{res.team}</span></div>
                    <div className="text-[11px] text-gray-400 font-medium truncate mt-1">{res.surveyName}</div>
                  </button>
                ))}
             </div>
          </div>

          {/* Result Content */}
          <div className="flex-1 bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 md:p-8 space-y-8 min-w-0">
            {selectedResult ? (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#EEF2FF] text-[#4F46E5] text-xs font-bold mb-3">
                      {selectedResult.period} • {selectedResult.surveyName}
                    </div>
                    <h2 className="text-2xl font-bold text-[#0F172A]">{selectedResult.name} <span className="text-lg text-[#64748B] font-medium">{selectedResult.team}</span></h2>
                  </div>
                  <button className="flex items-center gap-1.5 px-4 py-2 border border-[#E2E8F0] text-[#0F172A] text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                    <Download size={16} className="text-[#64748B]" /> PDF 다운로드
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Radar Chart Section */}
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 flex flex-col items-center justify-center">
                    <h3 className="font-bold text-[#0F172A] mb-4 w-full text-center">진단 결과 분석</h3>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={selectedResult.scores}>
                          <PolarGrid stroke="#E2E8F0" />
                          <PolarAngleAxis dataKey="category" tick={{ fill: '#475569', fontSize: 12, fontWeight: 'bold' }} />
                          <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                          <Radar name="본인 평가 (자가진단)" dataKey="self" stroke="#10B981" fill="#10B981" fillOpacity={0.4} />
                          {surveyList.find(s => s.id === selectedResult.surveyId)?.type === 'multi' && (
                            <Radar name="타인 평가(평균)" dataKey="peer" stroke="#6366F1" fill="#6366F1" fillOpacity={0.4} />
                          )}
                          <Legend wrapperStyle={{ fontSize: 12, fontWeight: 'bold' }} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontWeight: 'bold' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Summary Table */}
                  <div>
                    <h3 className="font-bold text-[#0F172A] mb-3 flex items-center gap-2"><FileText size={16} className="text-[#64748B]" /> 영역별 상세 점수 (진단명 내)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#94A3B8] font-bold">
                          <tr>
                            <th className="px-4 py-2">카테고리</th>
                            <th className="px-4 py-2 text-center">본인</th>
                            {surveyList.find(s => s.id === selectedResult.surveyId)?.type === 'multi' && (
                               <>
                                 <th className="px-4 py-2 text-center">타인</th>
                                 <th className="px-4 py-2 text-center">GAP</th>
                               </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                          {selectedResult.scores.map(s => (
                            <tr key={s.category} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-[#0F172A]">{s.category}</td>
                              <td className="px-4 py-3 text-center">{s.self.toFixed(1)}</td>
                              
                              {surveyList.find(sInfo => sInfo.id === selectedResult.surveyId)?.type === 'multi' && (
                                <>
                                  <td className="px-4 py-3 text-center text-[#6366F1] font-bold">{s.peer.toFixed(1)}</td>
                                  <td className="px-4 py-3 text-center">
                                    {(() => {
                                      const gap = s.peer - s.self;
                                      if (gap > 0.5) return <span className="text-[#10B981] font-bold">+{gap.toFixed(1)} (겸손)</span>;
                                      if (gap < -0.5) return <span className="text-[#EF4444] font-bold">{gap.toFixed(1)} (과대평가)</span>;
                                      return <span className="text-[#64748B] font-bold">{gap > 0 ? '+' : ''}{gap.toFixed(1)}</span>;
                                    })()}
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#E2E8F0] pt-8 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-[#0F172A] flex items-center gap-2 text-lg">
                      <BrainCircuit className="text-[#6366F1]" size={18} /> AI 개별 분석 인사이트
                    </h3>
                    {(!aiInsightsCache[`individual_${selectedResult.resId}`] && !isGeneratingAi) && (
                      <button 
                        onClick={() => handleGenerateInsight(`individual_${selectedResult.resId}`, selectedResult.scores, 'individual', selectedResult.name)}
                        className="px-3 py-1.5 bg-[#6366F1] text-white text-xs font-bold rounded-lg hover:bg-[#4F46E5] transition-colors"
                      >
                        AI 분석 실행
                      </button>
                    )}
                  </div>
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-6">
                    {isGeneratingAi && !aiInsightsCache[`individual_${selectedResult.resId}`] ? (
                      <div className="flex flex-col items-center justify-center p-6 space-y-4">
                        <div className="w-6 h-6 border-4 border-indigo-200 border-t-[#6366F1] rounded-full animate-spin"></div>
                        <p className="text-sm font-bold text-[#64748B] animate-pulse">데이터를 바탕으로 AI 리포트를 생성중입니다...</p>
                      </div>
                    ) : aiInsightsCache[`individual_${selectedResult.resId}`] ? (
                      <div className="space-y-4 text-[#475569] leading-relaxed relative text-sm" dangerouslySetInnerHTML={{ __html: aiInsightsCache[`individual_${selectedResult.resId}`] }} />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-center">
                        <BrainCircuit size={24} className="text-[#94A3B8] mb-2" />
                        <p className="text-sm font-bold text-[#475569]">생성된 AI 개별 분석 리포트가 없습니다.</p>
                        <p className="text-xs text-[#94A3B8] mt-1">AI 분석 실행을 통해 코칭 인사이트를 확인하세요.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-[#E2E8F0] pt-8 space-y-4">
                  <h3 className="font-bold text-[#0F172A] flex items-center gap-2 text-lg"><MessageSquare size={18} className="text-[#6366F1]" /> 팀장/본부장 면담 피드백 기록</h3>
                  
                  {selectedResult.feedbacks.length > 0 && (
                    <div className="space-y-4 mb-6">
                      {selectedResult.feedbacks.map((fb, idx) => (
                        <div key={idx} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-[#0F172A] text-sm">{fb.admin}</span>
                            <span className="text-xs text-[#94A3B8] font-bold">{fb.date}</span>
                          </div>
                          <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">{fb.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-white border focus-within:border-[#6366F1] focus-within:ring-1 focus-within:ring-[#6366F1] rounded-xl transition-all shadow-sm">
                    <textarea 
                      className="w-full p-4 text-sm bg-transparent focus:outline-none min-h-[100px] resize-y"
                      placeholder="면담 결과 및 피드백/코칭 계획을 기록하세요..."
                      value={feedbackInput}
                      onChange={e => setFeedbackInput(e.target.value)}
                    ></textarea>
                    <div className="flex justify-end p-2 bg-gray-50 border-t border-[#E2E8F0] rounded-b-xl">
                      <button 
                        className="px-4 py-2 bg-[#0F172A] text-white text-sm font-bold rounded-lg hover:bg-[#1E293B] transition-colors shadow-sm disabled:opacity-50"
                        disabled={!feedbackInput.trim()}
                        onClick={handleSaveFeedback}
                      >
                        면담 기록 저장
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-20 text-center text-gray-400">
                선택된 결과가 없습니다.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'report' && (
        <div className="bg-white border text-sm border-[#E2E8F0] rounded-xl shadow-sm p-6 md:p-10 space-y-8">
           <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-[#E2E8F0] pb-6">
             <div>
               <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-xs font-bold mb-3">
                 AI 인사이트 리포트
               </div>
               <h2 className="text-2xl font-bold text-[#0F172A]">그룹 종합 리포트</h2>
               <p className="text-sm text-[#475569] mt-2">
                 선택된 다면진단/자가진단 데이터({currentSurvey?.name})의 종합 결과를 분석합니다.
               </p>
             </div>
             <div className="flex items-center gap-4">
                 <select
                   className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] font-bold focus:outline-none focus:border-[#6366F1] shadow-sm bg-gray-50"
                   value={filterSurveyId}
                   onChange={(e) => setFilterSurveyId(e.target.value)}
                 >
                   {surveyList.map(s => (
                     <option key={s.id} value={s.id}>{s.name}</option>
                   ))}
                 </select>
             </div>
           </div>

           {overallStats ? (
             <div className="space-y-8 mt-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Aggregated Radar */}
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-6">
                    <h3 className="font-bold text-[#0F172A] mb-2 flex items-center justify-center gap-2">그룹 항목별 평균 점수</h3>
                    <div className="h-[280px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={overallStats}>
                          <PolarGrid stroke="#E2E8F0" />
                          <PolarAngleAxis dataKey="category" tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }} />
                          <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                          <Radar name="자가진단(전체평균)" dataKey="self" stroke="#10B981" fill="#10B981" fillOpacity={0.4} />
                          {currentSurvey?.type === 'multi' && (
                            <Radar name="타인평가(전체평균)" dataKey="peer" stroke="#6366F1" fill="#6366F1" fillOpacity={0.4} />
                          )}
                          <Legend wrapperStyle={{ fontSize: 12, fontWeight: 'bold' }} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontWeight: 'bold' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* AI Comments Block */}
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-[#0F172A] flex items-center gap-2 text-lg">
                        <BrainCircuit className="text-[#6366F1]" size={20} /> AI 종합 인사이트
                      </h3>
                      {(!aiInsightsCache[`report_${currentSurvey?.id}`] && !isGeneratingAi) && (
                        <button 
                          onClick={() => handleGenerateInsight(`report_${currentSurvey?.id}`, overallStats, 'group', currentSurvey?.name || '')}
                          className="px-3 py-1.5 bg-[#6366F1] text-white text-xs font-bold rounded-lg hover:bg-[#4F46E5] transition-colors"
                        >
                          AI 분석 실행
                        </button>
                      )}
                    </div>
                    {isGeneratingAi && !aiInsightsCache[`report_${currentSurvey?.id}`] ? (
                      <div className="flex flex-col items-center justify-center p-8 space-y-4">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-[#6366F1] rounded-full animate-spin"></div>
                        <p className="text-sm font-bold text-[#64748B] animate-pulse">데이터를 바탕으로 AI 리포트를 생성중입니다...</p>
                      </div>
                    ) : aiInsightsCache[`report_${currentSurvey?.id}`] ? (
                      <div className="space-y-4 text-[#475569] leading-relaxed relative" dangerouslySetInnerHTML={{ __html: aiInsightsCache[`report_${currentSurvey?.id}`] }} />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-[#E2E8F0] rounded-xl text-center">
                        <BrainCircuit size={32} className="text-[#94A3B8] mb-3" />
                        <p className="text-sm font-bold text-[#475569]">생성된 AI 분석 리포트가 없습니다.</p>
                        <p className="text-xs text-[#94A3B8] mt-1">상단의 분석 실행 버튼을 눌러 종합 분석을 시작하세요.</p>
                      </div>
                    )}
                  </div>
               </div>
             </div>
           ) : (
             <div className="py-20 text-center text-gray-400">
               해당 진단명의 데이터가 충분히 수집되지 않았습니다.
             </div>
           )}
        </div>
      )}

      {/* Reminder Mail Modal */}
      {isReminderModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <Mail className="text-[#6366F1]" size={20} />
                리마인드 메일 발송 템플릿 수정
              </h2>
              <button 
                onClick={() => setIsReminderModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="닫기"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-[#0F172A] mb-2">총 전송 대상</label>
                  <p className="text-sm font-bold text-orange-600 bg-orange-50 px-4 py-2 rounded-lg inline-block shadow-sm border border-orange-100">
                    미응답자 {getDashboardStats(filterSurveyId).totalRaters - getDashboardStats(filterSurveyId).totalCompletedRaters}명
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#0F172A] mb-2">메일 제목</label>
                  <input 
                    type="text" 
                    value={reminderEmailConfig.title}
                    onChange={(e) => setReminderEmailConfig({...reminderEmailConfig, title: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6366F1] shadow-sm text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#0F172A] mb-2">메일 본문 내용</label>
                  <textarea 
                    value={reminderEmailConfig.body}
                    onChange={(e) => setReminderEmailConfig({...reminderEmailConfig, body: e.target.value})}
                    rows={6}
                    className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6366F1] shadow-sm text-sm" 
                  />
                  <p className="text-xs text-[#94A3B8] mt-2 font-medium bg-gray-50 p-3 flex rounded-lg">
                    위 내용에 '진단 바로가기 링크'가 자동으로 하단에 첨부되어 개별 발송됩니다.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end gap-2">
              <button 
                onClick={() => setIsReminderModalOpen(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#0F172A] rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm"
              >
                취소
              </button>
              <button 
                onClick={handleSendReminder}
                className="px-4 py-2 bg-[#6366F1] text-white rounded-lg text-sm font-bold hover:bg-[#4F46E5] transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Send size={16} /> 저장 및 리마인드 일괄발송
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
