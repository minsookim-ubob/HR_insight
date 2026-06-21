import React, { useState, useEffect } from 'react';
import { Target, Check, X, Search, Filter, AlertCircle, Building2, UserCircle2, Calendar, Mail } from 'lucide-react';
import { UserKpi } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { KpiSession } from '../admin/KpiSessions';
import { KpiService } from '../../services/KpiService';

export const REJECT_TEMPLATES = {
  target_adjust: {
    label: '목표 수치 조정 필요',
    subject: '[KPI 수정요청] 올해 연간 KPI 수립 목표치 조정이 필요합니다.',
    body: (name: string) => `안녕하세요, ${name}님.\n\n제출해주신 KPI 수립안을 검토한 결과, 일부 평가항목에 대한 연간 목표치 설정의 타당성이나 보완이 필요합니다.\n\n[조정 권장 내용]\n- 팀/본부 목표 대비 과소 설정된 목표 수치를 상향 조정 바랍니다.\n- 하향 조정하여 기술한 특별한 배경이 있다면 상세 사유를 비고란에 추가 작성해주십시오.\n\n감사합니다.\n스마트러닝본부장 (hskim@ubob.com) 드림`
  },
  evidence_need: {
    label: '실적 증빙 자료 보완',
    subject: '[KPI 수정요청] 실적 성과 및 증빙 자료 보완 요청의 건',
    body: (name: string) => `안녕하세요, ${name}님.\n\n입력해주신 실적 및 성과 대비 이를 증명할 수 있는 정량적 구체성 및 증빙 기재 내용이 미흡합니다.\n\n[조정 권장 내용]\n- 산출 기준 하단의 수식과 산출 공식에 맞춰 정확하게 성과 수치 및 비고란 증빙 자료 링크/내용을 업데이트하여 다시 제출 부탁 드립니다.\n\n감사합니다.\n스마트러닝본부장 (hskim@ubob.com) 드림`
  },
  weight_mismatch: {
    label: '공통 KPI 가중치 미일치',
    subject: '[KPI 수정요청] 팀/사업부 공통 KPI 가중치 일치 여부 확인 요망',
    body: (name: string) => `안녕하세요, ${name}님.\n\n수립하신 개별 KPI 리스트 중 공통 KPI 또는 본부 공통 항목들의 가중치 배분 기준이 가이드라인과 상이합니다.\n\n[조정 권장 내용]\n- 전체 가중치 합이 100%인지 재검토하시고, 부서 공통 핵심 성과 지표 가중치가 올바르게 부여되었는지 확인 및 수정 후 재제출 바랍니다.\n\n감사합니다.\n스마트러닝본부장 (hskim@ubob.com) 드림`
  },
  custom: {
    label: '기타 요청 사항 (직접 입력)',
    subject: '[KPI 수정요청] KPI 수립 보완 및 수정 요청드립니다.',
    body: (name: string) => `안녕하세요, ${name}님.\n\n제출하신 연간 KPI 수집 내용 중 아래 사항에 대한 추가 보완 및 수정을 정중히 요청드립니다.\n\n[기타 보완 요청 및 이유]\n- 여기에 구체적인 보완요청 코멘트를 기입해주세요.\n\n감사합니다.\n스마트러닝본부장 (hskim@ubob.com) 드림`
  }
};

export default function KpiApprovals() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<UserKpi[]>([]);
  const [sessions, setSessions] = useState<KpiSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Session filters
  const [filterYear, setFilterYear] = useState<string>('all');
  const [sessionFilter, setSessionFilter] = useState<'ongoing' | 'all'>('ongoing');
  
  const [viewKpi, setViewKpi] = useState<UserKpi | null>(null);

  // States for Custom Revision Request Dialog
  const [rejectingKpi, setRejectingKpi] = useState<UserKpi | null>(null);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<keyof typeof REJECT_TEMPLATES>('target_adjust');
  const [customComment, setCustomComment] = useState<string>('');
  const [rejectSubject, setRejectSubject] = useState<string>('');

  // Update feedback form content whenever target employee/template changes
  useEffect(() => {
    if (rejectingKpi) {
      const tmpl = REJECT_TEMPLATES[selectedTemplateKey];
      if (tmpl) {
        setRejectSubject(tmpl.subject);
        setCustomComment(tmpl.body(rejectingKpi.userName));
      }
    }
  }, [rejectingKpi?.id, selectedTemplateKey]);

  // States for Manual KPI Input Dialog
  const [isManualInputOpen, setIsManualInputOpen] = useState(false);
  const [manualSessionId, setManualSessionId] = useState<string>('');
  const [manualEmployeeId, setManualEmployeeId] = useState<string>('');
  const [manualEmployee, setManualEmployee] = useState<any>(null);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState<string>('');
  const [manualKpi, setManualKpi] = useState<Partial<UserKpi>>({});

  useEffect(() => {
    async function initKpis() {
      let loadedSessions = [];
      const sessionsStr = localStorage.getItem('master_kpi_sessions');
      if (sessionsStr) {
        loadedSessions = JSON.parse(sessionsStr);
        setSessions(loadedSessions);
        if (loadedSessions.length > 0) {
          setSelectedSessionId(loadedSessions[0].id);
          setManualSessionId(loadedSessions[0].id);
        }
      }
      
      let loadedKpis: UserKpi[] = await KpiService.getAllKpis();
      if (loadedKpis.length === 0) {
        const allUserKpisStr = localStorage.getItem('user_kpis');
        if (allUserKpisStr) {
          loadedKpis = JSON.parse(allUserKpisStr);
        }
      }

      const targetSessionId = loadedSessions.length > 0 ? (loadedSessions.find(s => s.type === 'establishment')?.id || loadedSessions[0].id) : 'ks_default';
      const hasData = loadedKpis.some(k => k.sessionId === targetSessionId && ['Draft', 'Submitted', 'Rejected', 'TeamLeader_Approved', 'DivisionHead_Approved'].includes(k.status));
      
      if (loadedKpis.length === 0 || !hasData) {
         const mockEmployeesStr = localStorage.getItem('master_employees');
         let loadedEmps: any[] = [];
         if (mockEmployeesStr) {
           loadedEmps = JSON.parse(mockEmployeesStr);
         } else {
           loadedEmps = [
             { id: 'emp_01', department: '스마트러닝1사업본부', team: '영업 1팀', role: 'Enterprise AE', rank: '책임', name: '김사라', email: 'sara@ubob.com' },
             { id: 'emp_02', department: '스마트러닝1사업본부', team: '영업 1팀', role: 'MM AE', rank: '선임', name: '이민준', email: 'minjun@ubob.com' },
             { id: 'emp_03', department: '스마트러닝2사업본부', team: '영업 3팀', role: 'SMB AE', rank: '주임', name: '박다인', email: 'dain@ubob.com' },
             { id: 'emp_04', department: '스마트러닝2사업본부', team: '영업 3팀', role: 'Enterprise AE', rank: '책임', name: '최지훈', email: 'jihoon@ubob.com' },
             { id: 'emp_taehyung', department: '스마트러닝1사업본부', team: '영업 1팀', role: '팀장', rank: '수석', name: '김태형(팀장)', email: 'taehyung@ubob.com' }
           ];
         }

         const mockTemplates = [
           { id: 't_01', category: '재무성과', itemDesc: '스마트러닝 매출 달성율', detailGoal: '경영전략본부 하달 매출 목표액 20억원 달성', weight: 40, targetValue: 2000000000, evalMethod: '정량', unit: '원', calcFormula: '(실적 / 목표) * 가중치' },
           { id: 't_02', category: '비재무성', itemDesc: '신규 기업 고객 확보', detailGoal: '연간 신규 학습 플랫폼 계약사 15개사 확보', weight: 30, targetValue: 15, evalMethod: '정량', unit: '개사', calcFormula: '(실적 / 목표) * 가중치' },
           { id: 't_03', category: '관리', itemDesc: '부서 공통 만족도 달성', detailGoal: '고객 만족도 4.5 이상 유지', weight: 30, targetValue: 4.5, evalMethod: '정성', unit: '점', calcFormula: '평균 산출' }
         ];

         const estStatuses = ['Draft', 'Submitted', 'Rejected', 'TeamLeader_Approved', 'DivisionHead_Approved'];
         
         const kpisPreset = loadedEmps.map((emp, index) => {
           const assignedStatus = estStatuses[index % estStatuses.length];
           return {
              id: `ukpi_mock_${targetSessionId}_${emp.id}`,
              userId: emp.id,
              userName: emp.name,
              department: `${emp.department} ${emp.team}`,
              year: 2026,
              sessionId: targetSessionId,
              status: assignedStatus as any,
              totalScore: 0,
              items: mockTemplates.map((tmpl, tIdx) => ({
                id: `item_mock_${tIdx}_${emp.id}`,
                category: tmpl.category,
                itemDesc: tmpl.itemDesc,
                detailGoal: tmpl.detailGoal,
                weight: tmpl.weight,
                targetValue: tmpl.targetValue,
                evalMethod: tmpl.evalMethod as any,
                unit: tmpl.unit,
                calcFormula: tmpl.calcFormula,
                evalCriteria: { ex: 120, vg: 110, gd: 100, ni: 90, un: 80 },
                notes: '',
                actualValue: 0,
                score: 0
              }))
           };
         });

         const mergedList = [...loadedKpis.filter(k => k.sessionId !== targetSessionId), ...kpisPreset];
         loadedKpis = mergedList;
         localStorage.setItem('user_kpis', JSON.stringify(mergedList));
      }
      
      setKpis(loadedKpis);
    }
    initKpis();
  }, []);
  
  const saveToSystem = async (updated: UserKpi[], impactedKpi?: UserKpi) => {
      setKpis(updated);
      localStorage.setItem('user_kpis', JSON.stringify(updated));
      if(impactedKpi) {
         await KpiService.saveKpi(impactedKpi);
      }
  };
  
  const handleApprove = async (id: string, currentStatus: string) => {
      let nextStatus: any = 'TeamLeader_Approved';
      if (currentStatus === 'TeamLeader_Approved') {
          nextStatus = 'DivisionHead_Approved';
      }
      
      const updated = kpis.map(k => k.id === id ? { ...k, status: nextStatus, approvedAt: new Date().toISOString(), rejectionReason: undefined } : k);
      const impactedKpi = updated.find(k => k.id === id);
      await saveToSystem(updated, impactedKpi);
  };
  
  const handleReject = (id: string) => {
      const target = kpis.find(k => k.id === id);
      if (target) {
          setRejectingKpi(target);
          setSelectedTemplateKey('target_adjust');
      }
  };

  const handleUpdateItem = async (kpiId: string, itemId: string, field: 'weight' | 'targetValue', value: number) => {
      const updatedKpis = kpis.map(k => {
          if (k.id === kpiId) {
             const updatedItems = k.items.map(it => {
                 if (it.id === itemId) {
                     return { ...it, [field]: value };
                 }
                 return it;
             });
             const totalScore = updatedItems.reduce((s, it) => s + (it.score || 0), 0);
             const newKpi = { ...k, items: updatedItems, totalScore };
             if (viewKpi?.id === kpiId) setViewKpi(newKpi);
             return newKpi;
          }
          return k;
      });
      const impactedKpi = updatedKpis.find(k => k.id === kpiId);
      await saveToSystem(updatedKpis, impactedKpi);
  };

  // Auto-Remind Simulation for D-1
  useEffect(() => {
     if (!selectedSessionId || sessions.length === 0 || kpis.length === 0) return;
     const activeSession = sessions.find(s => s.id === selectedSessionId);
     if (!activeSession || !activeSession.endDate) return;
     
     const today = new Date();
     const endDate = new Date(activeSession.endDate);
     // Calculate D-Day difference
     const diffTime = endDate.getTime() - today.getTime();
     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
     
     if (diffDays <= 1) {
         // Auto remind
         const currentUnsubmitted = kpis.filter(k => k.sessionId === selectedSessionId && k.status === 'Draft' && !k.lastRemindedAt);
         if (currentUnsubmitted.length > 0) {
             const updated = kpis.map(k => {
                 if (k.sessionId === selectedSessionId && k.status === 'Draft' && !k.lastRemindedAt) {
                     return { ...k, lastRemindedAt: new Date().toLocaleString() };
                 }
                 return k;
             });
             setKpis(updated);
             localStorage.setItem('user_kpis', JSON.stringify(updated));
             setTimeout(() => {
                 alert(`[시스템 알림] '${activeSession.name}' 회차 마감이 임박하여(D${diffDays <= 0 ? '+' : '-'}${Math.abs(diffDays)}), 미제출 인원 ${currentUnsubmitted.length}명에게 '[REMIND] KPI 제출 요청' 메일이 자동 발송되었습니다.`);
             }, 300);
         }
     }
  }, [selectedSessionId, sessions.length, kpis.length]); // Intentionally omitting full kpis array dependency to prevent loops

  // Mock checking if user is HR master or normal leader
  const isMaster = user?.id === 'hskim@ubob.com';
  
  const sessionKpis = kpis.filter(k => selectedSessionId ? k.sessionId === selectedSessionId : true);
  
  // Calculate stats
  const totalCount = sessionKpis.length;
  const draftCount = sessionKpis.filter(k => k.status === 'Draft').length;
  const submittedCount = sessionKpis.filter(k => k.status === 'Submitted').length;
  const teamLeaderApprovedCount = sessionKpis.filter(k => k.status === 'TeamLeader_Approved').length;
  const divisionHeadApprovedCount = sessionKpis.filter(k => k.status === 'DivisionHead_Approved').length;
  const rejectedCount = sessionKpis.filter(k => k.status === 'Rejected').length;
  
  // Filter targets
  const displayKpis = sessionKpis.filter(k => {
      if (filterStatus !== 'all') {
         if (k.status !== filterStatus) return false;
      }
      if (searchTerm && !k.userName.includes(searchTerm) && !k.department.includes(searchTerm)) return false;
      return true;
  });

  const availableYears = React.useMemo(() => Array.from(new Set(sessions.map(s => Number(s.year)))).sort((a: any, b: any) => b - a), [sessions]);

  const filteredSessions = React.useMemo(() => {
    return sessions.filter(s => {
      if (filterYear !== 'all' && s.year.toString() !== filterYear) return false;
      if (sessionFilter === 'ongoing') {
        const today = new Date().toISOString().split('T')[0];
        if (s.endDate < today) return false;
      }
      return true;
    });
  }, [sessions, filterYear, sessionFilter]);

  useEffect(() => {
    if (!selectedSessionId || !filteredSessions.find(s => s.id === selectedSessionId)) {
       if (filteredSessions.length > 0) {
           setSelectedSessionId(filteredSessions[0].id);
       } else {
           setSelectedSessionId('');
       }
    }
  }, [filteredSessions, selectedSessionId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">KPI 승인 현황</h1>
          <p className="text-sm text-[#475569] mt-1">회차별 조직원의 KPI 제출 현황을 파악하고 상세 내역을 수정 요청하거나 승인합니다.</p>
        </div>
        <button 
          onClick={() => setIsManualInputOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 shadow-sm"
        >
          직접 KPI 등록
        </button>
        <button 
          onClick={() => {
            if (confirm('테스트를 위해 전체 KPI 데이터를 초기화합니다. 진행하시겠습니까? (초기화 후 새로고침 됩니다)')) {
              localStorage.removeItem('user_kpis');
              window.location.reload();
            }
          }}
          className="text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors"
        >
          데이터 초기화 (테스트용)
        </button>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col p-5">
         <div className="flex flex-col gap-4">
           <div>
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
               <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                 <Calendar size={18} className="text-indigo-600"/> 평가 회차 선택
               </h3>
               <div className="flex items-center gap-3">
                 <select
                   value={filterYear}
                   onChange={(e) => setFilterYear(e.target.value)}
                   className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                 >
                   <option value="all">전체 연도</option>
                   {availableYears.map(y => (
                     <option key={y} value={y}>{y}년</option>
                   ))}
                 </select>
                 <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                   <button
                     onClick={() => setSessionFilter('ongoing')}
                     className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${sessionFilter === 'ongoing' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                   >
                     진행 중
                   </button>
                   <button
                     onClick={() => setSessionFilter('all')}
                     className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${sessionFilter === 'all' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                   >
                     전체 보기
                   </button>
                 </div>
               </div>
             </div>
             
             <div className="flex flex-wrap gap-2">
                {filteredSessions.map(s => (
                   <button 
                     key={s.id} 
                     onClick={() => setSelectedSessionId(s.id)}
                     className={`px-4 py-2.5 rounded-lg border text-sm font-bold transition-colors ${selectedSessionId === s.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                   >
                     {s.name} ({s.year}년)
                   </button>
                ))}
                {filteredSessions.length === 0 && <div className="text-sm text-gray-500 py-2">조건에 맞는 회차가 없습니다.</div>}
             </div>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-4 border-t border-[#E2E8F0]">
             <div 
                onClick={() => setFilterStatus('all')}
                className={`flex flex-col items-center px-4 py-3 rounded-xl border cursor-pointer transition-all ${filterStatus === 'all' ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500 shadow-sm' : 'bg-[#F8FAFC] border-[#E2E8F0] hover:bg-slate-100 hover:border-slate-300'}`}
             >
                <span className="text-xs text-slate-500 font-bold mb-1">대상 인원</span>
                <span className={`text-xl font-extrabold ${filterStatus === 'all' ? 'text-indigo-700' : 'text-slate-800'}`}>{totalCount}</span>
             </div>
             
             <div 
                onClick={() => setFilterStatus('Draft')}
                className={`flex flex-col items-center px-4 py-3 rounded-xl border cursor-pointer transition-all ${filterStatus === 'Draft' ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-500 shadow-sm' : 'bg-white border-[#E2E8F0] hover:bg-slate-50 hover:border-slate-300 shadow-sm'}`}
             >
                <span className="text-xs text-slate-500 font-bold mb-1">작성 중</span>
                <span className={`text-xl font-extrabold ${filterStatus === 'Draft' ? 'text-amber-700' : 'text-slate-700'}`}>{draftCount}</span>
             </div>
             
             <div 
                onClick={() => setFilterStatus('Submitted')}
                className={`flex flex-col items-center px-4 py-3 rounded-xl border cursor-pointer transition-all ${filterStatus === 'Submitted' ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500 shadow-sm' : 'bg-white border-[#E2E8F0] hover:bg-slate-50 hover:border-slate-300 shadow-sm'}`}
             >
                <span className="text-xs text-slate-500 font-bold mb-1">1차 결재 대기</span>
                <span className={`text-xl font-extrabold ${filterStatus === 'Submitted' ? 'text-blue-700' : 'text-slate-700'}`}>{submittedCount}</span>
             </div>
             
             <div 
                onClick={() => setFilterStatus('Rejected')}
                className={`flex flex-col items-center px-4 py-3 rounded-xl border cursor-pointer transition-all ${filterStatus === 'Rejected' ? 'bg-rose-50 border-rose-200 ring-1 ring-rose-500 shadow-sm' : 'bg-white border-[#E2E8F0] hover:bg-slate-50 hover:border-slate-300 shadow-sm'}`}
             >
                <span className="text-xs text-slate-500 font-bold mb-1">KPI 수정 요청</span>
                <span className={`text-xl font-extrabold ${filterStatus === 'Rejected' ? 'text-rose-700' : 'text-slate-700'}`}>{rejectedCount}</span>
             </div>
             
             <div 
                onClick={() => setFilterStatus('TeamLeader_Approved')}
                className={`flex flex-col items-center px-4 py-3 rounded-xl border cursor-pointer transition-all ${filterStatus === 'TeamLeader_Approved' ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-500 shadow-sm' : 'bg-white border-[#E2E8F0] hover:bg-slate-50 hover:border-slate-300 shadow-sm'}`}
             >
                <span className="text-xs text-slate-500 font-bold mb-1">2차 결재 대기</span>
                <span className={`text-xl font-extrabold ${filterStatus === 'TeamLeader_Approved' ? 'text-purple-700' : 'text-slate-700'}`}>{teamLeaderApprovedCount}</span>
             </div>

             <div 
                onClick={() => setFilterStatus('DivisionHead_Approved')}
                className={`flex flex-col items-center px-4 py-3 rounded-xl border cursor-pointer transition-all ${filterStatus === 'DivisionHead_Approved' ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-500 shadow-sm' : 'bg-white border-[#E2E8F0] hover:bg-slate-50 hover:border-slate-300 shadow-sm'}`}
             >
                <span className="text-xs text-slate-500 font-bold mb-1">KPI 수립 완료</span>
                <span className={`text-xl font-extrabold ${filterStatus === 'DivisionHead_Approved' ? 'text-emerald-700' : 'text-slate-700'}`}>{divisionHeadApprovedCount}</span>
             </div>
           </div>
         </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
         <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row gap-4 items-center justify-between">
           <div className="flex items-center gap-4 text-sm w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="이름 또는 부서 검색..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6366F1] shadow-sm bg-white"
              />
            </div>
           </div>
           
           <div className="text-sm text-[#475569] font-medium flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-lg">
             <AlertCircle size={14}/> 표시 목록 {displayKpis.length}건
           </div>
         </div>
         
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#0F172A] min-w-[900px]">
               <thead className="bg-[#F1F5F9] border-b border-[#E2E8F0] tracking-wider text-[#475569] font-bold">
                 <tr>
                    <th className="px-4 py-3 text-center">평가 회차</th>
                    <th className="px-4 py-3 text-center">본부/팀</th>
                    <th className="px-4 py-3 text-center">이름</th>
                    <th className="px-4 py-3 text-center">환산 점수</th>
                    <th className="px-4 py-3">현재 진행 상태</th>
                    <th className="px-4 py-3 text-center">기능</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-[#E2E8F0]">
                 {displayKpis.map((kpi, idx) => {
                    const sessionName = sessions.find(s => s.id === kpi.sessionId)?.name || `${kpi.year}년 연간 KPI`;
                    return (
                    <tr key={kpi.id} className="hover:bg-indigo-50/50 transition-colors cursor-pointer" onClick={() => setViewKpi(kpi)}>
                       <td className="px-4 py-4 text-center">
                           <div className="text-[12px] font-bold text-[#0F172A]">{sessionName}</div>
                       </td>
                       <td className="px-4 py-4 text-center">
                           <div className="text-xs text-[#475569] font-medium"><Building2 size={12} className="inline mr-1"/>{kpi.department}</div>
                       </td>
                       <td className="px-4 py-4 text-center">
                           <div className="font-bold flex items-center justify-center gap-1.5"><UserCircle2 size={16} className="text-indigo-400"/> {kpi.userName}</div>
                       </td>
                       <td className="px-4 py-4 text-center">
                           <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg text-lg">
                              {(kpi.totalScore || 0).toFixed(1)}
                           </span>
                       </td>
                       <td className="px-4 py-4">
                           <div className="flex flex-col gap-1">
                               {kpi.status === 'Draft' ? (
                                  <div className="flex flex-col gap-1">
                                     <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                        <span className="text-xs font-bold text-gray-500">작성 중</span>
                                     </div>
                                     {kpi.lastRemindedAt && (
                                        <div className="flex items-center gap-1 mt-0.5 text-rose-500 font-bold ml-4 text-[10px] bg-rose-50 px-1.5 py-0.5 rounded w-fit">
                                           <Mail size={10} /> [REMIND] 발송 완료
                                        </div>
                                     )}
                                  </div>
                               ) : (
                                  <>
                                     <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${kpi.status === 'Submitted' ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                                        <span className={`text-xs font-bold ${kpi.status === 'Submitted' ? 'text-orange-700' : 'text-gray-400'}`}>팀장 결재 (1차)</span>
                                     </div>
                                     <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${kpi.status === 'DivisionHead_Approved' ? 'bg-green-500' : kpi.status === 'TeamLeader_Approved' ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                                        <span className={`text-xs font-bold ${kpi.status === 'DivisionHead_Approved' ? 'text-green-700' : kpi.status === 'TeamLeader_Approved' ? 'text-orange-700' : 'text-gray-400'}`}>본부장 승인 (최종)</span>
                                     </div>
                                  </>
                               )}
                               {kpi.status === 'Rejected' && (
                                   <div className="text-xs text-red-600 font-bold mt-1 flex flex-col gap-0.5">
                                      <span className="flex items-center gap-1"><AlertCircle size={12}/> 수정 요청됨</span>
                                      {kpi.lastRequestedAt && <span className="text-[10px] text-gray-500 font-normal ml-4">{kpi.lastRequestedAt}</span>}
                                   </div>
                               )}
                           </div>
                       </td>
                       <td className="px-4 py-4 text-center">
                          {kpi.status !== 'Draft' && kpi.status !== 'DivisionHead_Approved' && kpi.status !== 'Rejected' ? (
                              <div className="flex items-center justify-center gap-2">
                                 <button onClick={(e) => { e.stopPropagation(); setViewKpi(kpi); }} className="text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg border border-gray-200 inline-flex items-center gap-1 transition-colors">
                                    상세보기
                                 </button>
                                 <button onClick={(e) => { e.stopPropagation(); handleApprove(kpi.id, kpi.status); }} className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 font-bold text-xs rounded-lg flex items-center gap-1 border border-green-200">
                                   <Check size={14}/> 승인 
                                 </button>
                                 <button onClick={(e) => { e.stopPropagation(); handleReject(kpi.id); }} className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs rounded-lg flex items-center gap-1 border border-rose-200 transition-colors">
                                   <Mail size={14}/> 수정요청
                                 </button>
                              </div>
                          ) : (
                              <button onClick={(e) => { e.stopPropagation(); setViewKpi(kpi); }} className="text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg border border-gray-200 inline-block transition-colors">조회하기</button>
                          )}
                       </td>
                    </tr>
                 );
                 })}
                 {displayKpis.length === 0 && (
                    <tr>
                       <td colSpan={5} className="py-20 text-center text-gray-400">조회된 문서가 없습니다.</td>
                    </tr>
                 )}
               </tbody>
            </table>
         </div>
      </div>

      {viewKpi && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC] rounded-t-xl">
              <div>
                 <h2 className="text-xl font-bold text-[#0F172A]">{viewKpi.year}년 KPI 상세 조회</h2>
                 <p className="text-sm text-[#64748B] mt-1">{viewKpi.department} - {viewKpi.userName}</p>
              </div>
              <button onClick={() => setViewKpi(null)} className="p-2 text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E2E8F0] mb-4">
                 <h3 className="font-bold text-[#0F172A] mb-3 text-sm flex items-center gap-2"><Target size={16} className="text-indigo-600"/> KPI 지표 목록</h3>
                 <table className="w-full text-left text-xs text-[#0F172A]">
                   <thead className="bg-[#F1F5F9] border border-[#E2E8F0] text-[#475569] font-bold">
                     <tr>
                       <th className="px-3 py-2 w-24 text-center">구분</th>
                       <th className="px-3 py-2 w-48 text-center">평가항목</th>
                       <th className="px-3 py-2">상세목표</th>
                       <th className="px-2 py-2 w-20 text-center text-indigo-700 bg-indigo-50">가중치(%)</th>
                       <th className="px-2 py-2 w-24 text-center text-indigo-700 bg-indigo-50">목표실적</th>
                       <th className="px-2 py-2 w-16 text-center">단위</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y border border-[#E2E8F0]">
                     {viewKpi.items.map(item => {
                        const isCommon = item.category === '공통' || item.category === '팀공통' || item.itemDesc.includes('공통');
                        return (
                           <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                             <td className="px-3 py-3 text-center bg-gray-50 font-bold">{item.category}</td>
                             <td className="px-3 py-3 whitespace-pre-wrap">{item.itemDesc}</td>
                             <td className="px-3 py-3 whitespace-pre-wrap">{item.detailGoal}</td>
                             <td className="px-2 py-3">
                                <input 
                                   type="number" 
                                   value={item.weight} 
                                   onChange={e => handleUpdateItem(viewKpi.id, item.id, 'weight', Number(e.target.value))}
                                   disabled={viewKpi.status === 'DivisionHead_Approved' || !isCommon || viewKpi.status === 'Draft'}
                                   className={`w-full px-1 py-1.5 text-center font-bold border rounded ${isCommon && viewKpi.status !== 'DivisionHead_Approved' && viewKpi.status !== 'Draft' ? 'bg-white border-indigo-200 text-indigo-700 focus:outline-none focus:border-indigo-500' : 'bg-transparent border-transparent text-gray-500'}`}
                                />
                             </td>
                             <td className="px-2 py-3">
                                <input 
                                   type="number" 
                                   value={item.targetValue} 
                                   onChange={e => handleUpdateItem(viewKpi.id, item.id, 'targetValue', Number(e.target.value))}
                                   disabled={viewKpi.status === 'DivisionHead_Approved' || !isCommon || viewKpi.status === 'Draft'}
                                   className={`w-full px-1 py-1.5 text-center font-bold border rounded ${isCommon && viewKpi.status !== 'DivisionHead_Approved' && viewKpi.status !== 'Draft' ? 'bg-white border-indigo-200 text-indigo-700 focus:outline-none focus:border-indigo-500' : 'bg-transparent border-transparent text-gray-500'}`}
                                />
                             </td>
                             <td className="px-2 py-3 text-center font-medium">{item.unit}</td>
                           </tr>
                        );
                     })}
                   </tbody>
                 </table>
                 <div className="mt-3 text-xs text-gray-500 flex items-center gap-1.5">
                    <AlertCircle size={14}/> "공통" 항목에 대해서만 관리자가 비중(가중치)과 목표실적을 직접 수정할 수 있습니다. 개별(개인) 목표는 대상자가 기입해야 합니다.
                 </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-[#E2E8F0] bg-white flex justify-end gap-3 rounded-b-xl">
              <button onClick={() => setViewKpi(null)} className="px-5 py-2.5 bg-white border border-[#E2E8F0] text-gray-700 rounded-xl hover:bg-gray-100 font-bold transition-colors">닫기</button>
              {viewKpi.status !== 'Draft' && viewKpi.status !== 'DivisionHead_Approved' && viewKpi.status !== 'Rejected' && (
                  <>
                     <button onClick={() => { handleReject(viewKpi.id); }} className="px-5 py-2.5 border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl font-bold flex items-center gap-2 transition-colors"><Mail size={16}/> 수정 요청 메일 발송</button>
                     <button onClick={() => { handleApprove(viewKpi.id, viewKpi.status); setViewKpi(null); }} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold flex items-center gap-2 shadow-sm transition-colors"><Check size={16}/> 승인하기</button>
                  </>
              )}
            </div>
          </div>
        </div>
      )}

      {rejectingKpi && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-rose-50 rounded-t-xl animate-in slide-in-from-top-4">
              <div>
                 <h2 className="text-lg font-bold text-rose-950 flex items-center gap-2">
                   <Mail className="text-rose-600" size={20}/> KPI 수정 및 보완 요청 메일 발송
                 </h2>
                 <p className="text-xs text-rose-700 mt-1">대상자: {rejectingKpi.userName} ({rejectingKpi.department})</p>
              </div>
              <button onClick={() => setRejectingKpi(null)} className="p-2 text-rose-400 hover:text-rose-950 bg-rose-100 hover:bg-rose-250 rounded-lg transition-colors"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-auto p-5 space-y-4">
               {/* 1. Template selection buttons */}
               <div>
                 <label className="block text-xs font-bold text-gray-500 mb-2">보완 요청 메일 템플릿 선택</label>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(REJECT_TEMPLATES).map(([key, item]) => (
                       <button
                         key={key}
                         type="button"
                         onClick={() => setSelectedTemplateKey(key as any)}
                         className={`p-2.5 rounded-lg border text-xs font-bold text-left transition-all ${selectedTemplateKey === key ? 'bg-rose-55 border-rose-300 text-rose-800 ring-2 ring-rose-250' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                       >
                         {item.label}
                       </button>
                    ))}
                 </div>
               </div>

               {/* 2. Mail Preview */}
               <div className="bg-[#FAF9F5] p-4 rounded-xl border border-rose-100 space-y-3">
                  <div className="text-xs font-bold text-rose-800 flex items-center gap-1 mb-1">
                     <span>📬 발송 메일 실시간 미리보기 (사내망 연동)</span>
                  </div>
                  
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">메일 제목</label>
                    <input
                      type="text"
                      value={rejectSubject}
                      onChange={e => setRejectSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold focus:outline-none focus:border-rose-400 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">메일 상세 본문 (수정 요청 사항 및 피드백 직접 편집 가능)</label>
                    <textarea
                      rows={10}
                      value={customComment}
                      onChange={e => setCustomComment(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 text-xs font-sans leading-relaxed focus:outline-none focus:border-rose-400 bg-white"
                      placeholder="여기에 부서원에게 전달할 피드백이나 지표 조정 내용을 작성하세요."
                    />
                  </div>
               </div>
            </div>
            
            <div className="p-4 border-t border-[#E2E8F0] bg-white flex justify-end gap-3 rounded-b-xl">
              <button onClick={() => setRejectingKpi(null)} className="px-5 py-2.5 bg-white border border-[#E2E8F0] text-gray-700 rounded-xl hover:bg-gray-100 font-bold text-sm transition-colors">취소</button>
              <button 
                onClick={async () => {
                   const finalReason = customComment || '수정 필요';
                   const updated = kpis.map(k => k.id === rejectingKpi.id ? { 
                       ...k, 
                       status: 'Rejected' as any, 
                       rejectionReason: finalReason, 
                       lastRequestedAt: new Date().toLocaleString() 
                   } : k);
                   const impactedKpi = updated.find(k => k.id === rejectingKpi.id);
                   await saveToSystem(updated, impactedKpi);
                   alert(`${rejectingKpi.userName}님에게 수정요청 메일이 정상 발송되었습니다.`);
                   setRejectingKpi(null);
                   if (viewKpi?.id === rejectingKpi.id) setViewKpi(null);
                }} 
                className="px-6 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-750 font-bold text-sm flex items-center gap-2 shadow-sm transition-colors"
              >
                <Mail size={16}/> 수정 요청 메일 발송하기
              </button>
            </div>
          </div>
        </div>
      )}
      {isManualInputOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
             <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC] rounded-t-xl">
               <h2 className="text-lg font-bold text-[#0F172A]">관리자 직접 KPI 등록</h2>
               <button onClick={() => setIsManualInputOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"><X size={20}/></button>
             </div>
             <div className="p-6 space-y-4">
                <div>
                   <label className="block text-sm font-bold mb-1">회차 선택</label>
                   <select className="w-full p-2 border rounded-lg text-sm" value={manualSessionId} onChange={e => setManualSessionId(e.target.value)}>
                     {sessions.map(s => <option key={s.id} value={s.id}>{s.name} ({s.year})</option>)}
                   </select>
                </div>
                <div className="relative">
                   <label className="block text-sm font-bold mb-1">직원 선택</label>
                   <input 
                      type="text" 
                      placeholder="이름 또는 부서 검색..." 
                      className="w-full p-2 border rounded-lg text-sm" 
                      value={employeeSearchTerm}
                      onChange={e => {
                        setEmployeeSearchTerm(e.target.value);
                        if (!e.target.value) {
                           setManualEmployeeId('');
                           setManualEmployee(null);
                        }
                      }}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                              e.preventDefault();
                              const employees = JSON.parse(localStorage.getItem('master_employees') || '[]');
                              const filtered = employees.filter((e: any) => e.name.includes(employeeSearchTerm) || e.team.includes(employeeSearchTerm));
                              if (filtered.length > 0) {
                                  const e = filtered[0];
                                  setManualEmployeeId(e.id);
                                  setManualEmployee(e);
                                  setEmployeeSearchTerm(`${e.name} (${e.team})`);
                              }
                          }
                      }}
                   />
                   {employeeSearchTerm && (
                     <div className="absolute z-50 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                        {JSON.parse(localStorage.getItem('master_employees') || '[]')
                          .filter((e: any) => e.name.includes(employeeSearchTerm) || e.team.includes(employeeSearchTerm))
                          .map((e: any) => (
                           <button key={e.id} type="button" className="w-full p-2 text-left text-sm hover:bg-gray-100" onClick={() => {
                              setManualEmployeeId(e.id);
                              setManualEmployee(e);
                              setEmployeeSearchTerm(`${e.name} (${e.team})`);
                           }}>
                              {e.name} ({e.team})
                           </button>
                        ))}
                     </div>
                   )}
                </div>
             </div>
             <div className="p-4 border-t flex justify-end gap-3">
                <button onClick={() => setIsManualInputOpen(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-sm">닫기</button>
                <button 
                  onClick={async () => {
                     if (!manualSessionId || !manualEmployeeId || !manualEmployee) {
                        alert('회차와 직원을 모두 선택해주세요.');
                        return;
                     }
                     const sessions = JSON.parse(localStorage.getItem('master_kpi_sessions') || '[]');
                     const session = sessions.find((s:any) => s.id === manualSessionId);
                     if (!session) return;
                     
                     const newKpi: UserKpi = {
                         id: `ukpi_manual_${manualSessionId}_${manualEmployeeId}_${Date.now()}`,
                         userId: manualEmployeeId,
                         userName: manualEmployee.name,
                         department: `${manualEmployee.department} ${manualEmployee.team}`,
                         year: session.year,
                         sessionId: manualSessionId,
                         status: 'DivisionHead_Approved',
                         totalScore: 0,
                         items: (session.templateItems || []).map((it:any) => ({
                             ...it,
                             id: `item_manual_${it.id}_${manualEmployeeId}`,
                             actualValue: 0,
                             score: 0
                         }))
                     };
                     
                     const updatedKpis = [...kpis, newKpi];
                     await saveToSystem(updatedKpis, newKpi);
                     setIsManualInputOpen(false);
                     setViewKpi(newKpi); // Automatically open the detail view for the just-created KPI
                     alert('등록되었습니다.');
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-bold text-sm"
                >
                  등록
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
