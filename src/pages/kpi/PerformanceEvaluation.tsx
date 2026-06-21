import React, { useState, useEffect, useMemo } from 'react';
import { 
  Target, Award, CheckCircle, HelpCircle, Save, Send, AlertTriangle, RefreshCw, 
  Search, Eye, ShieldAlert, Check, X, ShieldCheck, Mail, ArrowRight, ChevronRight, BarChart3, Info, TrendingUp, Lock, Sparkles, AlertCircle, Trash2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserKpi, UserKpiItem } from '../../types';
import { KpiService } from '../../services/KpiService';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';

interface MockKpiTemplate {
  id: string;
  category: string;
  itemDesc: string;
  detailGoal: string;
  weight: number;
  targetValue: number;
  evalMethod: '정량' | '정성';
  unit: string;
  calcFormula: string;
}

const SAMPLE_TEMPLATES: MockKpiTemplate[] = [
  { id: 't_01', category: '재무성과', itemDesc: '스마트러닝 매출 달성율', detailGoal: '경영전략본부 하달 매출 목표액 20억원 달성', weight: 40, targetValue: 2000000000, evalMethod: '정량', unit: '원', calcFormula: '(실적 / 목표) * 가중치' },
  { id: 't_02', category: '비재무성', itemDesc: '신규 기업 고객 확보', detailGoal: '연간 신규 학습 플랫폼 계약사 15개사 확보', weight: 30, targetValue: 15, evalMethod: '정량', unit: '개사', calcFormula: '(실적 / 목표) * 가중치' },
  { id: 't_03', category: '비재무성', itemDesc: '고객 유지율(Retention)', detailGoal: '기존 고객사들의 재계약율 90% 달성 및 관리', weight: 20, targetValue: 90, evalMethod: '정량', unit: '%', calcFormula: '(실적 / 목표) * 가중치' },
  { id: 't_04', category: '기여/문화', itemDesc: '사내 직무 역량 교육 완수', detailGoal: '팀 내 필수 역량 교육 이수 및 스터디 주도', weight: 10, targetValue: 100, evalMethod: '정성', unit: '%', calcFormula: '정성 등급 비례 가중점 산출' }
];

export default function PerformanceEvaluation() {
  const { user } = useAuth();
  
  // Simulation Settings
  const [simulationRole, setSimulationRole] = useState<'employee' | 'leader' | 'director' | 'hr'>('employee');
  const [isSecurityRestricted, setIsSecurityRestricted] = useState<boolean>(true); // 다른 부서장이 타부서 인원 확인 불가 보안 설정 토글
  const [evaluatorDept, setEvaluatorDept] = useState<string>('스마트러닝1사업본부');
  const [evaluatorTeam, setEvaluatorTeam] = useState<string>('영업 1팀');
  
  // Data States
  const [kpis, setKpis] = useState<UserKpi[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedKpi, setSelectedKpi] = useState<UserKpi | null>(null);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  
  // Filter States
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Multi-step Item-level Review Values
  const [itemActuals, setItemActuals] = useState<Record<string, { actualValue: string | number; selfComment: string; selfGrade: 'S'|'A'|'B'|'C'|'D' }>>({});
  const [itemLeaderReview, setItemLeaderReview] = useState<Record<string, { leaderGrade: 'S'|'A'|'B'|'C'|'D'; leaderComment: string; leaderScore: number }>>({});
  const [itemDirectorReview, setItemDirectorReview] = useState<Record<string, { directorGrade: 'S'|'A'|'B'|'C'|'D'; directorComment: string; directorScore: number }>>({});
  
  // Overall Essays and Comments
  const [selfReflection, setSelfReflection] = useState<string>('');
  const [leaderOverallComment, setLeaderOverallComment] = useState<string>('');
  const [directorOverallComment, setDirectorOverallComment] = useState<string>('');

  // Rejections modal state
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionSubject, setRevisionSubject] = useState('');
  const [revisionBody, setRevisionBody] = useState('');

  const clearAllKpiData = () => {
    if (confirm('모든 KPI 데이터를 완전히 삭제하시겠습니까? (되돌릴 수 없습니다)')) {
      localStorage.removeItem('master_kpi_sessions');
      localStorage.removeItem('user_kpis');
      localStorage.removeItem('master_employees');
      localStorage.removeItem('kpi_master_templates');
      localStorage.removeItem('team_kpis');
      localStorage.removeItem('kpi_dummy_data_cleared');
      alert('KPI 데이터가 모두 삭제되었습니다.');
      window.location.reload();
    }
  };

  // 1. Initial Load
  useEffect(() => {
    // Already handled by manual button or the initial clear logic which seems to be working
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const isCleared = !!localStorage.getItem('kpi_dummy_data_cleared');

    // A. Sessions
    const sessionsStr = localStorage.getItem('master_kpi_sessions');
    let loadedSessions: any[] = [];
    if (sessionsStr) {
      loadedSessions = JSON.parse(sessionsStr);
    }
    
    const evalSessions = loadedSessions.filter(s => s.type === 'evaluation');
    if (evalSessions.length === 0 && !isCleared) {
      const demoEvalSession = {
        id: 'ks_default_eval',
        name: '2026년도 상반기 종합 KPI 업적 고과평가',
        year: 2026,
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        status: 'ongoing',
        type: 'evaluation',
        targetDepartments: ['스마트러닝1사업본부', '스마트러닝2사업본부', '경영지원팀']
      };
      loadedSessions = [...loadedSessions, demoEvalSession];
      localStorage.setItem('master_kpi_sessions', JSON.stringify(loadedSessions));
    }
    setSessions(loadedSessions);
    
    const activeEvalSession = loadedSessions.find(s => s.type === 'evaluation') || loadedSessions[0];
    if (activeEvalSession) {
      setSelectedSessionId(activeEvalSession.id);
    }

    // B. Master Employees
    const mockEmployeesStr = localStorage.getItem('master_employees');
    let loadedEmps: any[] = [];
    if (mockEmployeesStr) {
      loadedEmps = JSON.parse(mockEmployeesStr);
    } else if (!isCleared) {
      loadedEmps = [
        { id: 'emp_01', department: '스마트러닝1사업본부', team: '영업 1팀', role: 'Enterprise AE', rank: '책임', name: '김사라', email: 'sara@ubob.com', status: '재직중', statusHistory: [] },
        { id: 'emp_02', department: '스마트러닝1사업본부', team: '영업 1팀', role: 'MM AE', rank: '선임', name: '이민준', email: 'minjun@ubob.com', status: '재직중', statusHistory: [] },
        { id: 'emp_03', department: '스마트러닝2사업본부', team: '영업 3팀', role: 'SMB AE', rank: '주임', name: '박다인', email: 'dain@ubob.com', status: '재직중', statusHistory: [] },
        { id: 'emp_04', department: '스마트러닝2사업본부', team: '영업 3팀', role: 'Enterprise AE', rank: '책임', name: '최지훈', email: 'jihoon@ubob.com', status: '재직중', statusHistory: [] },
        { id: 'emp_taehyung', department: '스마트러닝1사업본부', team: '영업 1팀', role: '팀장', rank: '수석', name: '김태형(팀장)', email: 'taehyung@ubob.com', status: '재직중', statusHistory: [] },
        { id: 'emp_minho', department: '스마트러닝1사업본부', team: '영업 1팀', role: '팀원', rank: '책임', name: '이민호', email: 'minho@ubob.com', status: '재직중', statusHistory: [] },
        { id: 'emp_hskim', department: '경영지원팀', team: '', role: '팀장', rank: '수석', name: '김인사(나)', email: 'hskim@ubob.com', status: '재직중', statusHistory: [] }
      ];
      localStorage.setItem('master_employees', JSON.stringify(loadedEmps));
    }
    setEmployeesList(loadedEmps);

    // Seed active user's actual department & team
    const currentEmp = loadedEmps.find(e => e.email === user?.id);
    if (currentEmp) {
      setEvaluatorDept(currentEmp.department || '스마트러닝1사업본부');
      setEvaluatorTeam(currentEmp.team || '영업 1팀');
    }

    // C. User KPIs
    let loadedKpis = await KpiService.getAllKpis();
    if (loadedKpis.length === 0) {
      const allUserKpisStr = localStorage.getItem('user_kpis');
      if (allUserKpisStr) {
        loadedKpis = JSON.parse(allUserKpisStr);
      }
    }

    const hasEvaluationData = loadedKpis.some(k => k.evalStatus && k.evalStatus !== 'None' && k.sessionId === (activeEvalSession?.id || 'ks_default_eval'));
    if (loadedKpis.length === 0 || !hasEvaluationData) {
      const targetSessionId = activeEvalSession?.id || 'ks_default_eval';
      const kpisPreset: UserKpi[] = loadedEmps.map((emp, index) => {
        const existingKpi = loadedKpis.find(k => k.sessionId === targetSessionId && k.userId === emp.id);
        
        // Distribute diverse evaluation statuses to make simulation alive on load
        const evalStatuses: any[] = ['None', 'Self_Draft', 'Self_Submitted', 'Leader_Approved', 'Director_Approved', 'Eval_Revision_Requested'];
        const assignedEvalStatus = evalStatuses[index % evalStatuses.length];

        // Also vary KPI establishment approval status
        const estStatuses = ['Draft', 'Submitted', 'Rejected', 'TeamLeader_Approved', 'DivisionHead_Approved'];
        let assignedStatus = existingKpi?.status || estStatuses[index % estStatuses.length];
        
        // Logical consistent check: If evaluated, it must be approved.
        if (assignedEvalStatus !== 'None' && assignedEvalStatus !== 'Self_Draft') {
           assignedStatus = 'DivisionHead_Approved';
        }
        
        const finalItems = existingKpi?.items || SAMPLE_TEMPLATES.map((tmpl, tIdx) => {
            const multi = [0.93, 1.05, 0.85, 1.02][(index + tIdx) % 4];
            const sampleActual = tmpl.evalMethod === '정량' ? Math.floor(tmpl.targetValue * multi) : 95;
            const selfGrade: any = multi >= 1.0 ? 'A' : multi >= 0.9 ? 'B' : 'C';
            const leaderScore = Math.floor(tmpl.weight * (sampleActual / (tmpl.targetValue || 1)));
            const leaderScoreClamped = Math.min(tmpl.weight, Math.max(0, isNaN(leaderScore) ? Math.floor(tmpl.weight * 0.8) : leaderScore));

            return {
              id: `item_${tIdx}_${emp.id}`,
              category: tmpl.category,
              itemDesc: tmpl.itemDesc,
              detailGoal: tmpl.detailGoal,
              weight: tmpl.weight,
              targetValue: tmpl.targetValue,
              evalMethod: tmpl.evalMethod,
              unit: tmpl.unit,
              calcFormula: tmpl.calcFormula,
              evalCriteria: { ex: 110, vg: 100, gd: 90, ni: 80, un: 70 },
              notes: '시뮬레이션 기본 연동 지표',
              actualValue: assignedEvalStatus !== 'None' ? sampleActual : 0,
              score: assignedEvalStatus !== 'None' ? Math.round(tmpl.weight * (tmpl.evalMethod === '정량' ? multi : 0.9) * 10) / 10 : 0,
              selfGrade: assignedEvalStatus !== 'None' ? selfGrade : 'B',
              selfComment: assignedEvalStatus !== 'None' ? `목표량 대비 약 ${Math.floor(multi * 100)}% 성실 기여를 인정 추천합니다.` : '',
              leaderGrade: (assignedEvalStatus === 'Leader_Approved' || assignedEvalStatus === 'Director_Approved') ? selfGrade : undefined,
              leaderComment: (assignedEvalStatus === 'Leader_Approved' || assignedEvalStatus === 'Director_Approved') ? `적정한 기여 소명을 확인하였음.` : undefined,
              leaderScore: (assignedEvalStatus === 'Leader_Approved' || assignedEvalStatus === 'Director_Approved') ? leaderScoreClamped : undefined,
              directorGrade: assignedEvalStatus === 'Director_Approved' ? selfGrade : undefined,
              directorComment: assignedEvalStatus === 'Director_Approved' ? `동의 검수 완료.` : undefined,
              directorScore: assignedEvalStatus === 'Director_Approved' ? leaderScoreClamped : undefined
            };
          });

        return {
          id: existingKpi?.id || `ukpi_${targetSessionId}_${emp.id}`,
          userId: emp.id,
          userName: emp.name,
          department: emp.department,
          year: existingKpi?.year || 2026,
          sessionId: targetSessionId,
          status: assignedStatus as any, 
          totalScore: existingKpi?.totalScore || 0,
          evalStatus: existingKpi?.evalStatus || assignedEvalStatus,
          evalSubmittedAt: existingKpi?.evalSubmittedAt || (assignedEvalStatus !== 'None' && assignedEvalStatus !== 'Self_Draft' ? '2026-05-20T10:15:30Z' : undefined),
          evalLeaderApprovedAt: existingKpi?.evalLeaderApprovedAt || ((assignedEvalStatus === 'Leader_Approved' || assignedEvalStatus === 'Director_Approved') ? '2026-05-22T14:20:00Z' : undefined),
          evalDirectorApprovedAt: existingKpi?.evalDirectorApprovedAt || (assignedEvalStatus === 'Director_Approved' ? '2026-05-24T17:45:00Z' : undefined),
          finalGrade: existingKpi?.finalGrade || (assignedEvalStatus === 'Director_Approved' ? (index % 3 === 0 ? 'S' : index % 3 === 1 ? 'A' : 'B') : undefined),
          finalScore: existingKpi?.finalScore || (assignedEvalStatus === 'Director_Approved' ? (88 + (index % 3)) : undefined),
          selfReflection: existingKpi?.selfReflection !== undefined ? existingKpi.selfReflection : (assignedEvalStatus !== 'None' ? '올해는 신규 거래선 확보와 스마트러닝 컨설팅 제재를 극대화하기 위해 발로 뛰었습니다. 고객사들의 긍정적인 재계약 반응과 높은 만족도가 기쁩니다. 다만 매출 규모 확대 과정에서 리스크 대비 미흡한 계약 조항이 있었던 부분은 적극적으로 반성하고 보완하도록 하겠습니다.' : ''),
          leaderOverallComment: existingKpi?.leaderOverallComment !== undefined ? existingKpi.leaderOverallComment : ((assignedEvalStatus === 'Leader_Approved' || assignedEvalStatus === 'Director_Approved') ? '팀의 중추적 역할원으로서 기여도가 탁월하며 정량적 지표 대부분을 안전하게 완성하였습니다. 사후 조치 및 사원 교육 완수도 성실합니다.' : ''),
          directorOverallComment: existingKpi?.directorOverallComment !== undefined ? existingKpi.directorOverallComment : (assignedEvalStatus === 'Director_Approved' ? '사업본부 내 영업 성과 발전에 긍정적인 파급효과를 유발하였습니다. 고과 등급 그대로 최종 확정합니다.' : ''),
          items: finalItems
        };
      });

      const mergedList = [...loadedKpis.filter(k => k.sessionId !== targetSessionId), ...kpisPreset];
      loadedKpis = mergedList;
      localStorage.setItem('user_kpis', JSON.stringify(mergedList));
    }
    setKpis(loadedKpis);

    // Default selection
    const firstKpi = loadedKpis.find(k => k.sessionId === (activeEvalSession?.id || 'ks_default_eval'));
    if (firstKpi) {
      setSelectedKpi(firstKpi);
    }
  };

  // 2. Real-time score calculator helper
  const computeActualToScore = (it: any, actualValue: any, selfGradeParam?: string) => {
    const numActual = Number(actualValue) || 0;
    if (it.evalMethod === '정량') {
      const targetNum = Number(it.targetValue) || 1;
      const score = (numActual / targetNum) * it.weight;
      // Cap at 120% of the maximum weight
      return Math.round(Math.min(it.weight * 1.2, score) * 10) / 10;
    } else {
      const grade = selfGradeParam || 'B';
      const mults = { S: 1.0, A: 0.9, B: 0.8, C: 0.6, D: 0.4 };
      const mult = mults[grade as 'S'|'A'|'B'|'C'|'D'] || 0.8;
      return Math.round(it.weight * mult * 10) / 10;
    }
  };

  // 3. Setup editable states whenever selectedKpi changes
  useEffect(() => {
    if (selectedKpi) {
      const actuals: typeof itemActuals = {};
      const leaderReviews: typeof itemLeaderReview = {};
      const directorReviews: typeof itemDirectorReview = {};

      selectedKpi.items.forEach(it => {
        const actVal = it.actualValue !== undefined ? it.actualValue : '';
        const sGr = it.selfGrade || 'B';
        const defaultAuto = computeActualToScore(it, actVal, sGr);

        actuals[it.id] = {
          actualValue: actVal,
          selfComment: it.selfComment || '',
          selfGrade: sGr
        };
        
        leaderReviews[it.id] = {
          leaderGrade: it.leaderGrade || 'B',
          leaderComment: it.leaderComment || '',
          leaderScore: it.leaderScore !== undefined ? it.leaderScore : defaultAuto
        };
        
        directorReviews[it.id] = {
          directorGrade: it.directorGrade || 'B',
          directorComment: it.directorComment || '',
          directorScore: it.directorScore !== undefined ? it.directorScore : (it.leaderScore !== undefined ? it.leaderScore : defaultAuto)
        };
      });

      setItemActuals(actuals);
      setItemLeaderReview(leaderReviews);
      setItemDirectorReview(directorReviews);
      
      setSelfReflection(selectedKpi.selfReflection || '');
      setLeaderOverallComment(selectedKpi.leaderOverallComment || '');
      setDirectorOverallComment(selectedKpi.directorOverallComment || '');
    }
  }, [selectedKpi?.id]);

  // Unique departments & teams for synchronizing UI filters
  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>();
    employeesList.forEach(e => { if (e.department) depts.add(e.department); });
    kpis.forEach(k => { if (k.department) depts.add(k.department); });
    return Array.from(depts);
  }, [employeesList, kpis]);

  const uniqueTeamsFiltered = useMemo(() => {
    const teams = new Set<string>();
    employeesList.forEach(e => {
      if (deptFilter === 'all' || e.department === deptFilter) {
        if (e.team) teams.add(e.team);
      }
    });
    return Array.from(teams);
  }, [employeesList, deptFilter]);

  // Security restricted visible lists: "다른 부서장이 타부서 인원 확인 불가 보안 정책"
  const visibleKpis = useMemo(() => {
    const currentSessionKpis = kpis.filter(k => k.sessionId === selectedSessionId);
    
    return currentSessionKpis.filter(k => {
      if (!isSecurityRestricted) return true; // Security deactivated (admin / bypass)

      // Master or overall HR mode can see all
      if (user?.isMaster && simulationRole === 'hr') return true;

      if (simulationRole === 'employee') {
        const loggedInEmp = employeesList.find(e => e.email === user?.id);
        if (loggedInEmp) {
          return k.userId === loggedInEmp.id; // Self-oriented restriction for regular employee
        }
        return true; // simulation default fallback
      }

      if (simulationRole === 'leader') {
        // Team Leader: strictly restricted to matches on BOTH department & team
        return k.department === evaluatorDept && k.team === evaluatorTeam;
      }

      if (simulationRole === 'director') {
        // Division Head (본부장): strictly restricted to own department/division
        return k.department === evaluatorDept;
      }

      return true;
    });
  }, [kpis, selectedSessionId, simulationRole, evaluatorDept, evaluatorTeam, isSecurityRestricted, user, employeesList]);

  // Synchronized search results
  const filteredKpis = useMemo(() => {
    return visibleKpis.filter(k => {
      if (statusFilter !== 'all' && k.evalStatus !== statusFilter) return false;
      if (deptFilter !== 'all' && k.department !== deptFilter) return false;
      
      if (teamFilter !== 'all') {
        // Find corresponding employee record to inspect their actual assigned team
        const emp = employeesList.find(e => e.id === k.userId);
        const actualTeam = emp ? emp.team : k.team;
        if (actualTeam !== teamFilter) return false;
      }

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return k.userName.toLowerCase().includes(q) || k.department.toLowerCase().includes(q);
      }
      return true;
    });
  }, [visibleKpis, statusFilter, deptFilter, teamFilter, searchTerm, employeesList]);

  // Counts of overall statuses representing progress tracking (Requirement 10)
  const statusSummary = useMemo(() => {
    const counts = { pending: 0, writing: 0, submitted: 0, leaderApproved: 0, directorApproved: 0, rejected: 0 };
    kpis.filter(k => k.sessionId === selectedSessionId).forEach(k => {
      if (!k.evalStatus || k.evalStatus === 'None') counts.pending++;
      else if (k.evalStatus === 'Self_Draft') counts.writing++;
      else if (k.evalStatus === 'Self_Submitted') counts.submitted++;
      else if (k.evalStatus === 'Leader_Approved') counts.leaderApproved++;
      else if (k.evalStatus === 'Director_Approved') counts.directorApproved++;
      else if (k.evalStatus === 'Eval_Revision_Requested') counts.rejected++;
    });
    return counts;
  }, [kpis, selectedSessionId]);

  // Grade color style mapper helper
  const getGradeColorStyle = (grade: string | undefined) => {
    switch (grade) {
      case 'S': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'A': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'B': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'C': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'D': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  // Readable step badges representing statuses
  const getEvalStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'Self_Draft':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10.5px]">✍️ 자가평가 작성중</span>;
      case 'Self_Submitted':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#E0F2FE] border border-sky-200 text-sky-700 font-bold text-[10.5px]">📥 자가완료 (팀장대기)</span>;
      case 'Leader_Approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[10.5px]">🚀 1차 평가완료 (본부장대기)</span>;
      case 'Director_Approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-emerald-800 rounded bg-emerald-50 border border-emerald-200 font-bold text-[10.5px]">✨ 2차 최종 승인완료 (종료)</span>;
      case 'Eval_Revision_Requested':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10.5px]">⚠️ 반려제출 보완대기</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-55 border border-slate-100 text-slate-400 font-semibold text-[10.5px]">⏳ 자가기술서 대기</span>;
    }
  };

  // Actions: Employee Save Draft
  const handleEmployeeSaveDraft = async () => {
    if (!selectedKpi) return;
    
    const updatedItems = selectedKpi.items.map(it => {
      const formVal = itemActuals[it.id] || { actualValue: '', selfComment: '', selfGrade: 'B' };
      return {
        ...it,
        actualValue: formVal.actualValue === '' ? 0 : Number(formVal.actualValue),
        selfComment: formVal.selfComment,
        selfGrade: formVal.selfGrade,
        score: computeActualToScore(it, formVal.actualValue, formVal.selfGrade)
      };
    });

    const totalSubScore = Math.round(updatedItems.reduce((acc, curr) => acc + Number(curr.score || 0), 0));

    const updatedKpiList = kpis.map(k => {
      if (k.id === selectedKpi.id) {
        return {
          ...k,
          items: updatedItems,
          evalStatus: 'Self_Draft' as const,
          totalScore: totalSubScore,
          selfReflection: selfReflection
        };
      }
      return k;
    });

    setKpis(updatedKpiList);
    localStorage.setItem('user_kpis', JSON.stringify(updatedKpiList));
    const kToSave = updatedKpiList.find(k => k.id === selectedKpi.id);
    if(kToSave) await KpiService.saveKpi(kToSave);
    setSelectedKpi({ 
      ...selectedKpi, 
      items: updatedItems, 
      evalStatus: 'Self_Draft', 
      totalScore: totalSubScore,
      selfReflection: selfReflection 
    });
    alert('[임시저장 완료] 자가 기재 실적과 종합 자가 진단평가서가 임시 보관 하드디스크에 저장되었습니다. (안심하고 브라우저를 닫으셔도 됩니다.)');
  };

  // Actions: Employee Submit
  const handleEmployeeSubmit = async () => {
    if (!selectedKpi) return;

    if (!selfReflection || selfReflection.trim().length === 0) {
      alert('[입력 필수요구] 성과평가 시 개인적 평가 및 성과 기여/반성을 5,000자 이내 기재서 칸에 적어주셔야 제출 가능합니다.');
      return;
    }

    const updatedItems = selectedKpi.items.map(it => {
      const formVal = itemActuals[it.id] || { actualValue: '', selfComment: '', selfGrade: 'B' };
      return {
        ...it,
        actualValue: formVal.actualValue === '' ? 0 : Number(formVal.actualValue),
        selfComment: formVal.selfComment,
        selfGrade: formVal.selfGrade,
        score: computeActualToScore(it, formVal.actualValue, formVal.selfGrade)
      };
    });

    const totalSubScore = Math.round(updatedItems.reduce((acc, curr) => acc + Number(curr.score || 0), 0));

    const updatedKpiList = kpis.map(k => {
      if (k.id === selectedKpi.id) {
        return {
          ...k,
          items: updatedItems,
          evalStatus: 'Self_Submitted' as const,
          evalSubmittedAt: new Date().toISOString(),
          totalScore: totalSubScore,
          selfReflection: selfReflection
        };
      }
      return k;
    });

    setKpis(updatedKpiList);
    localStorage.setItem('user_kpis', JSON.stringify(updatedKpiList));
    const kToSave = updatedKpiList.find(k => k.id === selectedKpi.id);
    if(kToSave) await KpiService.saveKpi(kToSave);
    setSelectedKpi({ 
      ...selectedKpi, 
      items: updatedItems, 
      evalStatus: 'Self_Submitted', 
      evalSubmittedAt: new Date().toISOString(), 
      totalScore: totalSubScore,
      selfReflection: selfReflection 
    });
    alert('🎉 성과 자가소명서와 실적이 1차 평가자(수석 팀장)에게 성공적으로 상신 완료되었습니다! 제출 대조 메일이 팀장 계정으로 상달 발송되었습니다.');
  };

  // Actions: Team Leader 1st Review (1차 평가 완료)
  const handleLeaderApproval = async () => {
    if (!selectedKpi) return;

    if (!leaderOverallComment || leaderOverallComment.trim().length === 0) {
      alert('[입력 필수안내] 팀원 고과 상신 시 우측 하단의 "1차 평가자 종합 심사 의견"을 필히 기술하셔야 상단 결재 완료가 가능합니다.');
      return;
    }

    const updatedItems = selectedKpi.items.map(it => {
      const rev = itemLeaderReview[it.id] || { leaderGrade: 'B', leaderComment: '', leaderScore: 0 };
      
      // Enforce team leader score caps at item's weight limit! (Requirement 4)
      let clampedScore = Number(rev.leaderScore);
      if (clampedScore > it.weight) clampedScore = it.weight;
      if (clampedScore < 0) clampedScore = 0;

      return {
        ...it,
        leaderGrade: rev.leaderGrade,
        leaderComment: rev.leaderComment,
        leaderScore: clampedScore
      };
    });

    // Sum of all leader recommendation scores constitutes total 1차 evaluation points out of 100!
    const leaderSumScore = Math.round(updatedItems.reduce((acc, curr) => acc + Number(curr.leaderScore || 0), 0));

    const updatedKpiList = kpis.map(k => {
      if (k.id === selectedKpi.id) {
        return {
          ...k,
          items: updatedItems,
          evalStatus: 'Leader_Approved' as const,
          evalLeaderApprovedAt: new Date().toISOString(),
          leaderOverallComment: leaderOverallComment,
          totalScore: leaderSumScore
        };
      }
      return k;
    });

    setKpis(updatedKpiList);
    localStorage.setItem('user_kpis', JSON.stringify(updatedKpiList));
    const kToSave = updatedKpiList.find(k => k.id === selectedKpi.id);
    if(kToSave) await KpiService.saveKpi(kToSave);
    setSelectedKpi({ 
      ...selectedKpi, 
      items: updatedItems, 
      evalStatus: 'Leader_Approved', 
      evalLeaderApprovedAt: new Date().toISOString(),
      leaderOverallComment: leaderOverallComment,
      totalScore: leaderSumScore
    });
    alert('👍해당 임직원의 1차 인사고과 심사처리가 승인 완료되었습니다. [1차 평가 완료] 상태로 저장되어 본부장 2차 심의 대기열에 인계 처리되었습니다.');
  };

  // Actions: Division Head 2nd Review (2차 평가 완료 / 최종 종료)
  const handleDirectorApproval = async () => {
    if (!selectedKpi) return;

    if (!directorOverallComment || directorOverallComment.trim().length === 0) {
      alert('[입력 필수요청] 최종 종합 등급 결정을 공인 결정하기 위한 본부장 종합 조율 사유를 평어란에 기록해 주십시오.');
      return;
    }

    const updatedItems = selectedKpi.items.map(it => {
      const rev = itemDirectorReview[it.id] || { directorGrade: 'B', directorComment: '', directorScore: 0 };
      
      // Enforce caps at max weights
      let clampedScore = Number(rev.directorScore);
      if (clampedScore > it.weight) clampedScore = it.weight;
      if (clampedScore < 0) clampedScore = 0;

      return {
        ...it,
        directorGrade: rev.directorGrade,
        directorComment: rev.directorComment,
        directorScore: clampedScore
      };
    });

    // Total points summation by adjusted director scores
    const finalScoreSum = Math.round(updatedItems.reduce((acc, curr) => acc + Number(curr.directorScore || 0), 0));
    
    // Convert finalized point to legal letter grades
    let assignedFinalGrade: 'S'|'A'|'B'|'C'|'D' = 'B';
    if (finalScoreSum >= 95) assignedFinalGrade = 'S';
    else if (finalScoreSum >= 85) assignedFinalGrade = 'A';
    else if (finalScoreSum >= 75) assignedFinalGrade = 'B';
    else if (finalScoreSum >= 60) assignedFinalGrade = 'C';
    else assignedFinalGrade = 'D';

    const updatedKpiList = kpis.map(k => {
      if (k.id === selectedKpi.id) {
        return {
          ...k,
          items: updatedItems,
          evalStatus: 'Director_Approved' as const,
          evalDirectorApprovedAt: new Date().toISOString(),
          directorOverallComment: directorOverallComment,
          finalScore: finalScoreSum,
          finalGrade: assignedFinalGrade,
          totalScore: finalScoreSum
        };
      }
      return k;
    });

    setKpis(updatedKpiList);
    localStorage.setItem('user_kpis', JSON.stringify(updatedKpiList));
    const kToSave = updatedKpiList.find(k => k.id === selectedKpi.id);
    if(kToSave) await KpiService.saveKpi(kToSave);
    setSelectedKpi({ 
      ...selectedKpi, 
      items: updatedItems, 
      evalStatus: 'Director_Approved', 
      evalDirectorApprovedAt: new Date().toISOString(), 
      directorOverallComment: directorOverallComment,
      finalScore: finalScoreSum, 
      finalGrade: assignedFinalGrade,
      totalScore: finalScoreSum
    });
    alert(`👑 2차 성과평가(본부장 최종심의)가 완료되어 평가가 최종 종료되었습니다! (종합등급: ${assignedFinalGrade}등급 / 종합합계: ${finalScoreSum}점)`);
  };

  // Rejection/Revision helper
  const triggerRevisionRequest = () => {
    if (!selectedKpi) return;
    setRevisionSubject(`[성과평가 보완제출요구] ${selectedKpi.userName}님, 자가 기재 실적 내역 보완 요청`);
    setRevisionBody(`안녕하세요, 영업본부 ${selectedKpi.userName}님.\n\n귀하가 상신한 KPI 자가성과 기술내역 중 양적/질적 증빙 사항 혹은 오차가 발견되어 피드백을 기초로 보완을 신청합니다.\n\n[보완 및 요청 부분]\n- 매출 증빙 세금 계산서 번호 첨부\n- 기타 정성 지표 학습 스터디 이수증 링크 기술\n\n위 사항을 신속히 보완하셔서 재제출해 주십시오.`);
    setIsRevisionModalOpen(true);
  };

  const handleExecuteRevision = async () => {
    if (!selectedKpi) return;

    const updatedKpiList = kpis.map(k => {
      if (k.id === selectedKpi.id) {
        return {
          ...k,
          evalStatus: 'Eval_Revision_Requested' as const,
          evalRejectionReason: revisionBody
        };
      }
      return k;
    });

    setKpis(updatedKpiList);
    localStorage.setItem('user_kpis', JSON.stringify(updatedKpiList));
    const kToSave = updatedKpiList.find(k => k.id === selectedKpi.id);
    if(kToSave) await KpiService.saveKpi(kToSave);
    setSelectedKpi({ ...selectedKpi, evalStatus: 'Eval_Revision_Requested', evalRejectionReason: revisionBody });
    setIsRevisionModalOpen(false);
    alert(`[반려 완료] 귀하의 증명 반려안내 메일이 대상자(${selectedKpi.userName})에게 정상 송출되었습니다.`);
  };

  const handleSimulationChange = (role: typeof simulationRole) => {
    setSimulationRole(role);
    // Autofill simulated evaluator assignments based on selected role
    if (role === 'leader') {
      setEvaluatorDept('스마트러닝1사업본부');
      setEvaluatorTeam('영업 1팀');
    } else if (role === 'director') {
      setEvaluatorDept('스마트러닝1사업본부');
    }
    
    // Auto-select a valid entry in the selectable list for dynamic live previewing
    const currentSessionKpis = kpis.filter(k => k.sessionId === selectedSessionId);
    if (currentSessionKpis.length > 0) {
      if (role === 'employee') {
        const target = currentSessionKpis.find(k => k.evalStatus === 'None' || k.evalStatus === 'Self_Draft') || currentSessionKpis[0];
        setSelectedKpi(target);
      } else if (role === 'leader') {
        const target = currentSessionKpis.find(k => k.evalStatus === 'Self_Submitted') || currentSessionKpis[0];
        setSelectedKpi(target);
      } else if (role === 'director') {
        const target = currentSessionKpis.find(k => k.evalStatus === 'Leader_Approved') || currentSessionKpis[0];
        setSelectedKpi(target);
      } else {
        setSelectedKpi(currentSessionKpis[0]);
      }
    }
  };

  const handleResetData = () => {
    if (confirm('평가 시뮬레이션 데이터를 전면 초기화하시겠습니까? (수립된 목표는 무해합니다)')) {
      localStorage.removeItem('user_kpis');
      loadAllData();
      alert('데이터가 표준 초기 상태로 재정립되었습니다.');
    }
  };

  // Charts
  const chartData = useMemo(() => {
    const counts = { S: 0, A: 0, B: 0, C: 0, D: 0 };
    kpis.filter(k => k.sessionId === selectedSessionId).forEach(k => {
      const g = k.finalGrade || 'B';
      if (counts.hasOwnProperty(g)) {
        counts[g as keyof typeof counts]++;
      }
    });

    return [
      { name: 'S (최우수)', value: counts.S, color: '#10B981' },
      { name: 'A (우수)', value: counts.A, color: '#3B82F6' },
      { name: 'B (보통)', value: counts.B, color: '#6366F1' },
      { name: 'C (미흡)', value: counts.C, color: '#F59E0B' },
      { name: 'D (부진)', value: counts.D, color: '#EF4444' }
    ];
  }, [kpis, selectedSessionId]);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      
      {/* Simulation Helper Panel */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-1.5 text-left">
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-700 tracking-wider inline-flex items-center gap-1">
              <Sparkles size={11} /> HR MULTI-STEP SIMULATOR
            </span>
            <h2 className="text-xl font-bold flex items-center gap-1.5"><ShieldCheck className="text-indigo-400" size={20} /> 다단계 KPI 업적 성과평가 및 보안 심의 시스템</h2>
            <p className="text-xs text-indigo-200">
              본 화면은 자가 정량 구술기재(1단계) ➔ 수임 팀장 임의고과(2단계: max 가중치 한도) ➔ 관할 본부장 가감 조정(3단계) ➔ 인사 확정의 전 주기를 실감형 시뮬레이션합니다.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/60 p-2 rounded-xl border border-indigo-700/20">
            <button 
              onClick={() => handleSimulationChange('employee')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${simulationRole === 'employee' ? 'bg-[#4F46E5] text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              🧑‍💼 자가 기재 (본인)
            </button>
            <button 
              onClick={() => handleSimulationChange('leader')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${simulationRole === 'leader' ? 'bg-[#4F46E5] text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              🧑‍🚀 1차 심사 (팀장)
            </button>
            <button 
              onClick={() => handleSimulationChange('director')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${simulationRole === 'director' ? 'bg-[#4F46E5] text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              👑 2차 확정 (본부장)
            </button>
            <button 
              onClick={() => handleSimulationChange('hr')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${simulationRole === 'hr' ? 'bg-[#4F46E5] text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              📊 전사 모니터링
            </button>
            <button 
              onClick={handleResetData}
              title="초기 샘플 데이터 재인입"
              className="p-2 bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-200 rounded-lg border border-slate-800 transition-all flex items-center justify-center"
            >
              <RefreshCw size={14} />
            </button>
          </div>
          
          {/* Dedicated Management Section */}
          <div className="w-full pt-4 mt-4 border-t border-indigo-700/30 flex justify-between items-center text-[10px] text-indigo-300">
            <span>마스터 운영 관리 (주의)</span>
            <button 
              onClick={clearAllKpiData}
              className="px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 text-red-200 rounded border border-red-800 transition-all flex items-center gap-1.5"
            >
              <Trash2 size={12} />
              전체 데이터 삭제
            </button>
          </div>
        </div>
      </div>

      {/* Security Setup Panel (Requirement 1 - 타부장 확인 차단 검증 장치) */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 shrink-0 mt-0.5">
            <Lock size={16} />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-[#0D1B2A] flex items-center gap-1.5">
              조직 관할 평가 확인 및 열람통제 권한 설정 (요구조건 1)
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${isSecurityRestricted ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-500'}`}>
                {isSecurityRestricted ? '🔒 타부서 확인 및 검색 원천차단 활성' : '🔓 마스터 부서 제한 해제 상태 (전사 열람)'}
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              부서장 및 팀장은 타부서 인원의 KPI 내역에 대한 정합성 검토를 행할 수 없습니다. 시뮬레이션의 보안 제한 검증을 위해 평가자의 소속 본부 및 팀 권한을 임의로 교체해 볼 수 있습니다.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 font-bold">보안정책:</span>
            <input 
              type="checkbox" 
              id="sec-toggle" 
              checked={isSecurityRestricted} 
              onChange={(e) => setIsSecurityRestricted(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="sec-toggle" className="font-extrabold text-slate-700 cursor-pointer">강력 필터 적용</label>
          </div>
          
          <div className="h-4 w-px bg-slate-200" />
          
          <div className="flex gap-2">
            <div>
              <span className="text-[9px] font-bold text-slate-400 block mb-0.5">평가자 관할 본부</span>
              <select 
                value={evaluatorDept} 
                onChange={(e) => setEvaluatorDept(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10.5px] font-bold text-slate-700 focus:outline-none"
              >
                <option value="스마트러닝1사업본부">스마트러닝1사업본부</option>
                <option value="스마트러닝2사업본부">스마트러닝2사업본부</option>
                <option value="경영지원팀">경영지원팀</option>
              </select>
            </div>
            {simulationRole === 'leader' && (
              <div>
                <span className="text-[9px] font-bold text-slate-400 block mb-0.5">평가자 관할 팀</span>
                <select 
                  value={evaluatorTeam} 
                  onChange={(e) => setEvaluatorTeam(e.target.value)}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10.5px] font-bold text-[#4F46E5] focus:outline-none"
                >
                  <option value="영업 1팀">영업 1팀</option>
                  <option value="영업 3팀">영업 3팀</option>
                  <option value="">(공란/기타)</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Combined targets catalog and search synchronization */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-5 space-y-4">
            
            {/* Folder Header */}
            <div className="space-y-1 text-left">
              <h3 className="font-extrabold text-[#0D1B2A] text-sm flex items-center gap-1.5">
                🎯 심사 대상자 조회 폴더
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-105 text-slate-600 font-bold">
                  {filteredKpis.length}명
                </span>
              </h3>
              <p className="text-[11px] text-[#94A3B8] leading-tight">지정 세부 회차 및 본부/팀 필터링 조건 동기화 검색 국면</p>
            </div>

            {/* SYNCHRONIZED FILTERS (Requirement 2) */}
            <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-150/40 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block text-left">1. 평가 회차 선택 (마스터 권한 설정)</label>
                <select 
                  className="w-full mt-1 px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-xs font-extrabold bg-white text-slate-800"
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                >
                  {sessions.filter(s => s.type === 'evaluation').map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.year}년)</option>
                  ))}
                  {sessions.filter(s => s.type !== 'evaluation').map(s => (
                    <option key={s.id} value={s.id}>[목표수립연동] {s.name}</option>
                  ))}
                </select>
              </div>

              {/* Cascade Filter Selectors synced together (Requirement 2) */}
              <div className="grid grid-cols-2 gap-2 text-left">
                <div>
                  <label className="text-[9.5px] font-extrabold text-slate-400 block">2. 관할 본부 필터</label>
                  <select
                    value={deptFilter}
                    onChange={(e) => {
                      setDeptFilter(e.target.value);
                      setTeamFilter('all'); // automatic cascade reset
                    }}
                    className="w-full mt-1 p-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="all">전체 본부</option>
                    {uniqueDepartments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9.5px] font-extrabold text-slate-400 block">3. 소속 팀 필터</label>
                  <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className="w-full mt-1 p-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-700"
                  >
                    <option value="all">전체 팀</option>
                    {uniqueTeamsFiltered.map(t => (
                      <option key={t || 'none'} value={t}>{t || '소속 팀 부재'}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Text Search Input (Requirement 2) */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                <input 
                  type="text" 
                  placeholder="피평가 사원 이름 직접 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 w-full border border-[#E2E8F0] bg-white rounded-lg text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-[#6366F1]"
                />
              </div>

              {/* Status Filter Capsules (Requirement 2 & 10) */}
              <div className="space-y-1 text-left">
                <span className="text-[9px] font-extrabold text-[#94A3B8]">4. 진행 상태 필터링</span>
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'all', label: '전체' },
                    { id: 'None', label: '대기' },
                    { id: 'Self_Draft', label: '작성중' },
                    { id: 'Self_Submitted', label: '1차대기' },
                    { id: 'Leader_Approved', label: '2차대기' },
                    { id: 'Director_Approved', label: '확정' }
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setStatusFilter(st.id)}
                      className={`px-2 py-0.5 rounded text-[9.5px] font-bold border transition ${statusFilter === st.id ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* List catalog representing visible employee KPIs (Requirement 1 & 10) */}
            <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredKpis.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-150 rounded-xl space-y-2 text-slate-400">
                  <Eye size={24} className="mx-auto block text-slate-300" />
                  <p className="text-[11px] font-medium leading-relaxed">
                    조회 권한 본부 내에<br />선택한 부서/팀의 피평가 사원이 존재치 않습니다.<br />
                    (보안 제한 필터를 조율하십시오.)
                  </p>
                </div>
              ) : (
                filteredKpis.map(k => {
                  const isSelected = selectedKpi?.id === k.id;
                  const itemCompletes = k.items.filter(i => k.evalStatus !== 'None' ? (i.actualValue !== undefined && i.actualValue !== 0) : false).length;
                  return (
                    <div 
                      key={k.id}
                      onClick={() => setSelectedKpi(k)}
                      className={`p-3.5 rounded-xl cursor-pointer transition flex items-center justify-between border text-left ${isSelected ? 'bg-[#EEF2FF] border-[#6366F1] shadow-sm ring-1 ring-[#6366F1]/20' : 'bg-white border-slate-200/60 hover:bg-slate-50/80'}`}
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <span>{k.userName}</span>
                          <span className="px-1.5 py-0.2 bg-slate-100 text-[9px] font-bold text-slate-500 rounded">
                            {k.team ? k.team : '소속팀 공석'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold">{k.department}</div>
                        
                        {/* Status tracker details (Requirement 10) */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] text-slate-400">
                            과제 완료: <strong className="text-slate-700">{itemCompletes}/{k.items.length}</strong>
                          </span>
                          {k.finalScore !== undefined && (
                            <span className="text-[9px] text-[#4F46E5] font-black bg-indigo-50 px-1 rounded">
                              종합 {k.finalScore}점
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        {getEvalStatusBadge(k.evalStatus)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Workflow status summary counters board (Requirement 10) */}
            <div className="pt-4 border-t border-slate-150 grid grid-cols-2 gap-2 text-[10.5px]">
              <div className="bg-slate-50 p-2.5 rounded-lg text-left">
                <span className="text-slate-400 block text-[9.5px]">자가 미입력 대기</span>
                <span className="font-extrabold text-slate-700 mt-1 block text-base">{statusSummary.pending + statusSummary.writing} 명</span>
              </div>
              <div className="bg-[#E0F3FF]/40 p-2.5 rounded-lg text-left">
                <span className="text-sky-500 block text-[9.5px]">1차 심의 대기</span>
                <span className="font-extrabold text-[#0284C7] mt-1 block text-base">{statusSummary.submitted} 명</span>
              </div>
              <div className="bg-indigo-50 p-2.5 rounded-lg text-left">
                <span className="text-indigo-400 block text-[9.5px]">2차 심의 대기</span>
                <span className="font-extrabold text-indigo-700 mt-1 block text-base">{statusSummary.leaderApproved} 명</span>
              </div>
              <div className="bg-emerald-50 p-2.5 rounded-lg text-left">
                <span className="text-emerald-500 block text-[9.5px]">최종 완료 (종료)</span>
                <span className="font-extrabold text-emerald-800 mt-1 block text-base">{statusSummary.directorApproved} 명</span>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Performance sheet detail & step workflows based on simulation targets */}
        <div className="xl:col-span-2 space-y-6">
          {selectedKpi ? (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden flex flex-col text-left">
              
              {/* Core header inside sheets */}
              <div className="px-6 py-5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-slate-800 text-lg leading-tight">{selectedKpi.userName}님의 인원별 KPI 업적평가서</h3>
                    {getEvalStatusBadge(selectedKpi.evalStatus)}
                  </div>
                  <p className="text-xs text-slate-500 font-semibold">
                    소속 본부: <span className="text-slate-700 font-bold">{selectedKpi.department}</span> | 평가 연도: <span className="text-slate-700 font-bold">{selectedKpi.year}년</span>
                  </p>
                </div>

                {/* Submitting controllers bar */}
                <div className="flex items-center gap-2 shrink-0">
                  {simulationRole === 'employee' && (selectedKpi.evalStatus === 'None' || selectedKpi.evalStatus === 'Self_Draft' || selectedKpi.evalStatus === 'Eval_Revision_Requested') && (
                    <>
                      <button 
                        onClick={handleEmployeeSaveDraft}
                        className="px-3.5 py-2 text-slate-600 bg-white hover:bg-slate-50 border border-slate-250 font-extrabold rounded-lg shadow-sm transition-all text-xs flex items-center gap-1.5"
                      >
                        <Save size={13} /> 임시저장
                      </button>
                      <button 
                        onClick={handleEmployeeSubmit}
                        className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 font-extrabold rounded-lg shadow-sm transition-all text-xs flex items-center gap-1.5"
                      >
                        <Send size={13} /> 1차 결재요청 (팀장상신)
                      </button>
                    </>
                  )}

                  {simulationRole === 'leader' && selectedKpi.evalStatus === 'Self_Submitted' && (
                    <>
                      <button 
                        onClick={triggerRevisionRequest}
                        className="px-3.5 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-250 font-extrabold rounded-lg text-xs flex items-center gap-1.5 transition-all"
                      >
                        <AlertTriangle size={13} /> 실적반려
                      </button>
                      <button 
                        onClick={handleLeaderApproval}
                        className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 font-extrabold rounded-lg shadow-sm text-xs flex items-center gap-1.5 transition-all"
                      >
                        <Check size={14} /> 1차 평가 완료
                      </button>
                    </>
                  )}

                  {simulationRole === 'director' && selectedKpi.evalStatus === 'Leader_Approved' && (
                    <>
                      <button 
                        onClick={triggerRevisionRequest}
                        className="px-3.5 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-250 font-extrabold rounded-lg text-xs flex items-center gap-1.5 transition-all"
                      >
                        <AlertTriangle size={13} /> 실적반려
                      </button>
                      <button 
                        onClick={handleDirectorApproval}
                        className="px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 font-extrabold rounded-lg shadow-sm text-xs flex items-center gap-1.5 transition-all"
                      >
                        <ShieldCheck size={14} /> 2차 평가 완료
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Revision comments reader notice banner */}
              {selectedKpi.evalStatus === 'Eval_Revision_Requested' && (
                <div className="px-6 py-4 bg-red-50 border-b border-red-100 space-y-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700">
                    <AlertCircle size={14} /> 1차 기재 실적 검증 오류 반려 안내 사항
                  </span>
                  <p className="text-xs text-rose-600 font-medium whitespace-pre-wrap leading-relaxed">
                    {selectedKpi.evalRejectionReason}
                  </p>
                </div>
              )}

              {/* Workflow stage progression tracker (Requirement 10) */}
              <div className="bg-slate-50/50 px-6 py-4.5 border-b border-slate-150 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-400">
                <div className={`flex items-center gap-1.5 ${(!selectedKpi.evalStatus || selectedKpi.evalStatus === 'None' || selectedKpi.evalStatus === 'Self_Draft') ? 'text-indigo-650 font-extrabold' : 'text-slate-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono border ${(!selectedKpi.evalStatus || selectedKpi.evalStatus === 'None' || selectedKpi.evalStatus === 'Self_Draft') ? 'bg-indigo-600 text-white border-indigo-650 shadow-sm' : 'bg-white border-slate-200 text-slate-500'}`}>1</span>
                  <span>자가실적 기입</span>
                </div>
                <ChevronRight size={13} className="text-slate-300" />
                <div className={`flex items-center gap-1.5 ${(selectedKpi.evalStatus === 'Self_Submitted') ? 'text-indigo-650 font-extrabold' : 'text-slate-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono border ${(selectedKpi.evalStatus === 'Self_Submitted') ? 'bg-indigo-600 text-white border-indigo-650 shadow-sm' : 'bg-white border-slate-200 text-slate-500'}`}>2</span>
                  <span>1차 팀장 고과 심의</span>
                </div>
                <ChevronRight size={13} className="text-slate-300" />
                <div className={`flex items-center gap-1.5 ${(selectedKpi.evalStatus === 'Leader_Approved') ? 'text-indigo-650 font-extrabold' : 'text-slate-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono border ${(selectedKpi.evalStatus === 'Leader_Approved') ? 'bg-indigo-600 text-white border-indigo-650 shadow-sm' : 'bg-white border-slate-200 text-slate-500'}`}>3</span>
                  <span>2차 본부장 검증/가감</span>
                </div>
                <ChevronRight size={13} className="text-slate-300" />
                <div className={`flex items-center gap-1.5 ${(selectedKpi.evalStatus === 'Director_Approved') ? 'text-emerald-700 font-extrabold' : 'text-slate-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono border ${(selectedKpi.evalStatus === 'Director_Approved') ? 'bg-emerald-600 text-white border-emerald-650 shadow-sm' : 'bg-white border-slate-200 text-slate-500'}`}>4</span>
                  <span>심사 종합 확정</span>
                </div>
              </div>

              {/* KPI sheets lists, incorporating exact columns (Requirement 3) */}
              <div className="p-6 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] pb-2 text-slate-400 font-bold uppercase tracking-wider text-[10.5px]">
                      <th className="pb-3 w-4/12 text-left">핵심 KPI 정의 및 목표 수치</th>
                      <th className="pb-3 px-2 text-center w-2/12">가중점 / 목표치</th>
                      <th className="pb-3 px-2 text-center w-2/12">달성 실적치 (본인입력)</th>
                      <th className="pb-3 px-2 text-center w-1/12 bg-indigo-50/40 border-l border-r border-indigo-100/60">환산점수 (자동계산)</th>
                      <th className="pb-3 px-2 text-left w-3/12">평가 사후심의 (팀장/본부장)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {selectedKpi.items.map(it => {
                      const empVal = itemActuals[it.id] || { actualValue: '', selfComment: '', selfGrade: 'B' };
                      const leadVal = itemLeaderReview[it.id] || { leaderGrade: 'B', leaderComment: '', leaderScore: 0 };
                      const dirVal = itemDirectorReview[it.id] || { directorGrade: 'B', directorComment: '', directorScore: 0 };

                      // Live auto calculated points (Requirement 3)
                      const computedScore = computeActualToScore(it, empVal.actualValue, empVal.selfGrade);
                      const maxLimit = it.weight; // Max cap limit (Requirement 4)

                      return (
                        <tr key={it.id} className="hover:bg-slate-50/20 transition-colors">
                          {/* 1. Core info */}
                          <td className="py-4 text-left pr-2 space-y-1 align-top">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-bold">
                              {it.category}
                            </span>
                            <div className="font-extrabold text-[#0D1B2A] text-[13.5px] mt-1">
                              {it.itemDesc}
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed leading-tight">
                              {it.detailGoal}
                            </p>
                            <span className="text-[9.5px] text-slate-400 block font-mono">
                              수식: {it.evalMethod} ({it.calcFormula || '기준점 환산 수치'})
                            </span>
                          </td>

                          {/* 2. Weight and goal */}
                          <td className="py-4 px-1 text-center align-top space-y-2">
                            <div>
                              <span className="text-[9.5px] text-slate-400 block font-bold">비중(가중치)</span>
                              <strong className="text-xs font-black text-indigo-700">{it.weight}%</strong>
                            </div>
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <span className="text-[9px] text-slate-400 block font-semibold">목표서 기준</span>
                              <strong className="text-[11px] text-slate-700 font-extrabold font-mono">
                                {it.evalMethod === '정량' ? Number(it.targetValue).toLocaleString() : '정성심사'}
                              </strong>
                              {it.evalMethod === '정량' && <span className="text-[10px] text-slate-500"> {it.unit}</span>}
                            </div>
                          </td>

                          {/* 3. Actual performance entry (Requirement 3) */}
                          <td className="py-4 px-2 text-center align-top space-y-2">
                            {simulationRole === 'employee' && (selectedKpi.evalStatus === 'None' || selectedKpi.evalStatus === 'Self_Draft' || selectedKpi.evalStatus === 'Eval_Revision_Requested') ? (
                              <div className="space-y-2">
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 block text-left mb-1">실적치 직접 기입 ({it.unit})</label>
                                  <input 
                                    type={it.evalMethod === '정량' ? 'number' : 'text'}
                                    value={empVal.actualValue}
                                    placeholder={it.evalMethod === '정량' ? '수치기록' : '텍스트소명'}
                                    onChange={(e) => setItemActuals({
                                      ...itemActuals,
                                      [it.id]: { ...empVal, actualValue: e.target.value }
                                    })}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-[#6366F1] focus:ring-1 focus:ring-indigo-100"
                                  />
                                </div>
                                <div className="text-left">
                                  <label className="text-[9.5px] font-bold text-slate-400 block mb-1">자가 등급</label>
                                  <select 
                                    value={empVal.selfGrade} 
                                    onChange={(e) => setItemActuals({
                                      ...itemActuals,
                                      [it.id]: { ...empVal, selfGrade: e.target.value as any }
                                    })}
                                    className="w-full p-1.5 bg-white border border-slate-200 text-[11px] rounded font-bold text-indigo-700"
                                  >
                                    <option value="S">S (초과달성)</option>
                                    <option value="A">A (정상 완결)</option>
                                    <option value="B">B (보통 완결)</option>
                                    <option value="C">C (소폭 미흡)</option>
                                    <option value="D">D (과소 부진)</option>
                                  </select>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 space-y-1 text-left">
                                <span className="text-[10px] text-slate-400 block font-semibold">입력 완료 실적 :</span>
                                <strong className="text-xs text-slate-800 font-extrabold font-mono block">
                                  {it.evalMethod === '정량' ? Number(it.actualValue).toLocaleString() : it.actualValue || '소명대체'} {it.unit}
                                </strong>
                                <span className={`inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-bold ${getGradeColorStyle(it.selfGrade)}`}>
                                  자가 {it.selfGrade}등급
                                </span>
                              </div>
                            )}
                          </td>

                          {/* 4. Automated computed conversion score (Requirement 3) */}
                          <td className="py-4 px-2 text-center align-top bg-indigo-50/10 border-l border-r border-[#6366F1]/10 space-y-1">
                            <span className="text-[9.5px] text-slate-400 block font-semibold">자동 산출 환산점</span>
                            <div className="py-2.5 px-1 bg-white rounded-lg border border-[#6366F1]/20 shadow-sm inline-block min-w-[54px]">
                              <span className="text-[14px] font-black text-indigo-700 font-mono block">
                                {computedScore}
                              </span>
                              <span className="text-[8px] text-slate-400 block font-bold">Max {it.weight}</span>
                            </div>
                            <div className="text-[8.5px] text-slate-405 leading-normal">
                              {it.evalMethod === '정량' ? (
                                <span>{(Number(empVal.actualValue)/Number(it.targetValue || 1) * 100).toFixed(0)}% 비율</span>
                              ) : (
                                <span>정성 등급 비례</span>
                              )}
                            </div>
                          </td>

                          {/* 5. Evaluations (Requirement 4 & 8) */}
                          <td className="py-4 px-3.5 text-left align-top space-y-3">
                            
                            {/* Employee Comments */}
                            {simulationRole === 'employee' && (selectedKpi.evalStatus === 'None' || selectedKpi.evalStatus === 'Self_Draft' || selectedKpi.evalStatus === 'Eval_Revision_Requested') ? (
                              <div className="space-y-1 text-left">
                                <span className="text-[9.5px] font-bold text-slate-400">자가 추천 사유 기술 (증빙 포함)</span>
                                <textarea
                                  rows={3}
                                  value={empVal.selfComment}
                                  onChange={(e) => setItemActuals({
                                    ...itemActuals,
                                    [it.id]: { ...empVal, selfComment: e.target.value }
                                  })}
                                  placeholder="달성하신 성과 수치 요인과 증빙 서류 하이퍼링크를 상세히 기술하세요..."
                                  className="w-full text-[10.5px] p-2 bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-[#6366F1]"
                                />
                              </div>
                            ) : (
                              <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                                <span className="text-[9px] font-extrabold text-[#6366F1] block flex items-center gap-1">🧑‍💼 사원 기재소명</span>
                                <p className="text-[10px] text-slate-650 italic leading-normal mt-1 whitespace-pre-wrap">
                                  {it.selfComment ? `"${it.selfComment}"` : '기록된 의견 사유가 부재합니다.'}
                                </p>
                              </div>
                            )}

                            {/* Team Leader 1차 Evaluator (Requirement 4) */}
                            {simulationRole === 'leader' && selectedKpi.evalStatus === 'Self_Submitted' && (
                              <div className="bg-indigo-50/30 p-3 rounded-2xl border border-indigo-150/40 space-y-2.5">
                                <div className="text-[9.5px] font-black text-indigo-800 flex items-center gap-1">
                                  🧑‍🚀 1차 평가자(팀장) 고과 입력
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-400 block">임의추천 등급</label>
                                    <select
                                      value={leadVal.leaderGrade}
                                      onChange={(e) => setItemLeaderReview({
                                        ...itemLeaderReview,
                                        [it.id]: { ...leadVal, leaderGrade: e.target.value as any }
                                      })}
                                      className="w-full mt-1 p-1.5 bg-white border border-slate-200 rounded text-[11px] font-extrabold text-slate-800"
                                    >
                                      <option value="S">S (초우수)</option>
                                      <option value="A">A (우수)</option>
                                      <option value="B">B (보통)</option>
                                      <option value="C">C (미흡)</option>
                                      <option value="D">D (불량)</option>
                                    </select>
                                  </div>
                                  
                                  <div>
                                    <label className="text-[9px] font-black text-[#5F56EB] flex justify-between">
                                      <span>임의평가 점수</span>
                                      <span className="text-slate-400 font-medium">Max {it.weight}</span>
                                    </label>
                                    <div className="flex items-center gap-1 mt-1">
                                      <input 
                                        type="number"
                                        min={0}
                                        max={it.weight}
                                        value={leadVal.leaderScore}
                                        onChange={(e) => {
                                          let val = Number(e.target.value);
                                          if (val > it.weight) val = it.weight;
                                          if (val < 0) val = 0;
                                          setItemLeaderReview({
                                            ...itemLeaderReview,
                                            [it.id]: { ...leadVal, leaderScore: val }
                                          });
                                        }}
                                        className="p-1 w-2/3 border border-slate-250 bg-white rounded font-extrabold font-mono text-xs text-center text-[#4F46E5] focus:outline-[#6366F1]"
                                      />
                                      {/* Easy pre-fill button */}
                                      <button 
                                        type="button"
                                        title="자동환산점 입력"
                                        onClick={() => setItemLeaderReview({
                                          ...itemLeaderReview,
                                          [it.id]: { ...leadVal, leaderScore: Math.round(computedScore) }
                                        })}
                                        className="p-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold rounded text-[9px] transition"
                                      >
                                        대입
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 block">지표 세부 인사 의견</label>
                                  <textarea 
                                    rows={1}
                                    value={leadVal.leaderComment}
                                    placeholder="정량 지표 대비 팀 기여 보정 이유..."
                                    onChange={(e) => setItemLeaderReview({
                                      ...itemLeaderReview,
                                      [it.id]: { ...leadVal, leaderComment: e.target.value }
                                    })}
                                    className="w-full text-[10px] p-1.5 border border-slate-200 rounded-lg placeholder-slate-400"
                                  />
                                </div>
                              </div>
                            )}

                            {/* View Leader score when frozen */}
                            {simulationRole !== 'leader' && (it.leaderScore !== undefined || selectedKpi.evalStatus === 'Leader_Approved' || selectedKpi.evalStatus === 'Director_Approved') && (
                              <div className="bg-indigo-50/10 p-2.5 border border-indigo-100 rounded-xl space-y-1">
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-indigo-700 font-extrabold flex items-center gap-1">🧑‍🚀 1차(팀장) 심사위원 의견 :</span>
                                  <span className="px-1.5 py-0.2 bg-white text-indigo-700 border border-indigo-200 rounded text-[9px] font-black">
                                    {it.leaderGrade}등급 ({it.leaderScore}점 / {it.weight}점 한도)
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 italic mt-0.5 whitespace-pre-wrap">
                                  {it.leaderComment ? `"${it.leaderComment}"` : '세부 의견 생략'}
                                </p>
                              </div>
                            )}

                            {/* Division Head 2nd Evaluator with adjust calculations (Requirement 8) */}
                            {simulationRole === 'director' && selectedKpi.evalStatus === 'Leader_Approved' && (
                              <div className="bg-emerald-50/20 p-3 rounded-2xl border border-emerald-200/60 space-y-2.5">
                                <div className="text-[9.5px] font-black text-emerald-800 flex items-center gap-1">
                                  👑 2차 평가자(본부장) 가감 심의조정
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-400 block">확정 등급 조율</label>
                                    <select
                                      value={dirVal.directorGrade}
                                      onChange={(e) => setItemDirectorReview({
                                        ...itemDirectorReview,
                                        [it.id]: { ...dirVal, directorGrade: e.target.value as any }
                                      })}
                                      className="w-full mt-1 p-1.5 bg-white border border-slate-200 rounded text-[11px] font-extrabold text-slate-800"
                                    >
                                      <option value="S">S (최우수 고과)</option>
                                      <option value="A">A (우수 고과)</option>
                                      <option value="B">B (기본 고과)</option>
                                      <option value="C">C (조정 경고)</option>
                                      <option value="D">D (미완료 부진)</option>
                                    </select>
                                  </div>

                                  <div>
                                    <div className="flex justify-between text-[9px] font-extrabold">
                                      <span className="text-emerald-800">최종 확정점수</span>
                                      <span className="text-slate-400">Max {it.weight}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <input 
                                        type="number"
                                        min={0}
                                        max={it.weight}
                                        value={dirVal.directorScore}
                                        onChange={(e) => {
                                          let val = Number(e.target.value);
                                          if (val > it.weight) val = it.weight;
                                          if (val < 0) val = 0;
                                          setItemDirectorReview({
                                            ...itemDirectorReview,
                                            [it.id]: { ...dirVal, directorScore: val }
                                          });
                                        }}
                                        className="p-1 w-1/2 border border-slate-250 bg-white rounded font-extrabold font-mono text-xs text-center text-emerald-700"
                                      />
                                      {/* Live Delta calculations indicator badge (Requirement 8) */}
                                      <div className="shrink-0">
                                        {(() => {
                                          const leaderOriginal = it.leaderScore || 0;
                                          const directorAdjusted = dirVal.directorScore || 0;
                                          const delta = directorAdjusted - leaderOriginal;
                                          if (delta > 0) return <span className="px-1 text-[8.5px] font-black font-mono rounded bg-emerald-100 text-emerald-800">+{delta}점 가산</span>;
                                          if (delta < 0) return <span className="px-1 text-[8.5px] font-black font-mono rounded bg-rose-100 text-rose-800">{delta}점 감산</span>;
                                          return <span className="px-1 text-[8.5px] font-bold font-mono rounded bg-slate-100 text-slate-400">변동무</span>;
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 block">조정 확정 근거 기록</label>
                                  <textarea 
                                    rows={1}
                                    value={dirVal.directorComment}
                                    placeholder="팀장 평가 대비 가산/감산 단행 조율 이유..."
                                    onChange={(e) => setItemDirectorReview({
                                      ...itemDirectorReview,
                                      [it.id]: { ...dirVal, directorComment: e.target.value }
                                    })}
                                    className="w-full text-[10px] p-1.5 border border-slate-200 rounded-lg placeholder-slate-400"
                                  />
                                </div>
                              </div>
                            )}

                            {/* View director score frozen */}
                            {simulationRole !== 'director' && (it.directorScore !== undefined || selectedKpi.evalStatus === 'Director_Approved') && (
                              <div className="bg-emerald-50/20 p-2.5 border border-emerald-100 rounded-xl space-y-1 text-left">
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-emerald-800 font-extrabold flex items-center gap-1">👑 2차(본부장) 최종 심의의견 :</span>
                                  <span className="px-1.5 py-0.2 bg-white text-emerald-800 border border-emerald-200 rounded text-[9px] font-black">
                                    {it.directorGrade}등급 ({it.directorScore}점 조율)
                                  </span>
                                </div>
                                <p className="text-[10px] text-emerald-600 font-medium italic mt-0.5 whitespace-pre-wrap">
                                  {it.directorComment ? `"${it.directorComment}"` : '특이 조율 보정 사유 없음'}
                                </p>
                              </div>
                            )}

                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Comprehensive descriptive essay areas (Requirement 5 & 6) */}
              <div className="bg-slate-50 border-t border-slate-200 p-6 space-y-6 text-left">
                
                {/* 1. Employee Self Reflection (Requirement 5) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                      📝 자가 종합 진단서 (개인적 성과와 성찰 기재)
                      <span className="text-red-500 font-bold">*</span>
                    </label>
                    <span className="text-[10px] font-bold font-mono text-slate-400">
                      (현재: {selfReflection?.length || 0} / 5,000자 이내)
                    </span>
                  </div>
                  
                  {simulationRole === 'employee' && (selectedKpi.evalStatus === 'None' || selectedKpi.evalStatus === 'Self_Draft' || selectedKpi.evalStatus === 'Eval_Revision_Requested') ? (
                    <textarea 
                      rows={5}
                      maxLength={5000}
                      value={selfReflection}
                      onChange={(e) => setSelfReflection(e.target.value)}
                      placeholder="올해 본인이 수립한 kpi 과제 수행과 관련하여 개인적으로 성취한 업적, 장점 및 미흡했던 성과와 진지한 성찰/반성 내용을 구체적으로 작성해 주십시오. (5000자 한도)"
                      className="w-full text-xs p-3 border border-slate-250 bg-white rounded-xl focus:outline-[#6366F1]"
                    />
                  ) : (
                    <div className="bg-white border border-slate-200 p-4 rounded-xl text-xs text-slate-705 leading-relaxed whitespace-pre-wrap italic">
                      {selectedKpi.selfReflection || '임직원이 작성한 자가진단서가 부재합니다.'}
                    </div>
                  )}
                </div>

                {/* 2. Team Leader Commentary (Requirement 6) */}
                <div className="space-y-2 pt-2 border-t border-slate-200/50">
                  <label className="text-xs font-black text-slate-800 block">
                    💬 1차 검증자(팀장) 인사 고과 의견 기재란 (개인 의견 하단)
                  </label>
                  
                  {simulationRole === 'leader' && selectedKpi.evalStatus === 'Self_Submitted' ? (
                    <textarea 
                      rows={4}
                      value={leaderOverallComment}
                      onChange={(e) => setLeaderOverallComment(e.target.value)}
                      placeholder="피평가 임직원의 자가 평가내역과 실적증빙을 면치 대조한 결과 타당성 및 정성적 업무적 적극도, 평소 태도를 기반한 팀장의 고과 소명을 기재하십시오..."
                      className="w-full text-xs p-3 border border-slate-250 bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  ) : (
                    <div className="bg-white border border-slate-200 p-4 rounded-xl text-xs text-slate-705 leading-relaxed whitespace-pre-wrap italic">
                      {selectedKpi.leaderOverallComment || '1차 평가자의 인사 심사 의견서가 대기 중입니다.'}
                    </div>
                  )}
                </div>

                {/* 3. Division Head commentary */}
                {(simulationRole === 'director' || selectedKpi.evalStatus === 'Director_Approved') && (
                  <div className="space-y-2 pt-2 border-t border-slate-200/50">
                    <label className="text-xs font-black text-emerald-800 block">
                      👑 2차 최종 심의관(본부장) 종합 조율 기여 사유평어
                    </label>
                    {simulationRole === 'director' && selectedKpi.evalStatus === 'Leader_Approved' ? (
                      <textarea 
                        rows={3}
                        value={directorOverallComment}
                        onChange={(e) => setDirectorOverallComment(e.target.value)}
                        placeholder="관할 소속 본부 전체 정합 고정 보정 근거 및 최종 승격/연봉 고과 추천 보증 사유를 최종 기재하십시오..."
                        className="w-full text-xs p-3 border border-[#A7F3D0] bg-white rounded-xl focus:outline-[#10B981]"
                      />
                    ) : (
                      <div className="bg-emerald-50/40 border border-[#A7F3D0] p-4 rounded-xl text-xs text-[#065F46] leading-relaxed whitespace-pre-wrap italic">
                        {selectedKpi.directorOverallComment || '2차 최종 결재 의견이 대기 중입니다.'}
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Bottom total report summaries */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
                <div className="space-y-1">
                  <div className="text-slate-800 text-xs font-bold flex items-center gap-1">
                    <Info size={14} className="text-slate-400" /> 종합 업적고과 평어 산출 기준
                  </div>
                  <p className="text-[11px] text-gray-400">
                    전 가중지 정량 비율 합산치로 95점 초과는 S등급, 85점 이상은 A등급, 75점 이상은 B등급, 60점 이상은 C등급으로 가감 조율 확정합니다.
                  </p>
                </div>
                
                <div className="flex items-center gap-6">
                  {selectedKpi.totalScore !== undefined && (
                    <div className="text-right space-y-0.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">종합 실시간 심사계산점</span>
                      <strong className="text-2xl font-black text-indigo-700 font-mono tracking-tight">
                        {selectedKpi.evalStatus === 'Director_Approved' ? selectedKpi.finalScore : selectedKpi.totalScore}점
                      </strong>
                    </div>
                  )}
                  {selectedKpi.finalGrade && (
                    <div className="text-right space-y-0.5 border-l border-slate-200 pl-6">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">최종 승인확정 등급</span>
                      <span className="px-3.5 py-1 rounded-full text-xs font-black bg-emerald-50 border border-emerald-200 text-emerald-800 tracking-wide">
                        {selectedKpi.finalGrade} 등급
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-16 text-center space-y-4 flex flex-col items-center justify-center min-h-[440px]">
              <Target size={44} className="text-slate-300 animate-pulse" />
              <div className="space-y-1">
                <h3 className="font-extrabold text-[#0D1B2A] text-lg">심사 대상 임직원을 선택하십시오</h3>
                <p className="text-slate-400 text-xs max-w-sm mx-auto">
                  왼쪽 대상 임직원 디렉토리에서 카드를 클릭하여 1차 자가소명 대조, 팀장 임의고과 심사 및 본부장 최종 확정을 시작하십시오.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Revision comment Modal */}
      {isRevisionModalOpen && selectedKpi && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5"><AlertTriangle size={18} className="text-red-500" /> {selectedKpi.userName}님 실적 소명 반려/보완요구</h3>
              <button onClick={() => setIsRevisionModalOpen(false)} className="text-gray-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">통보 문서 제목</label>
                <input 
                  type="text"
                  value={revisionSubject}
                  onChange={(e) => setRevisionSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">상세 반려 구술 및 피드백 서한</label>
                <textarea 
                  rows={6}
                  value={revisionBody}
                  onChange={(e) => setRevisionBody(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-lg text-xs leading-relaxed"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-[#F8FAFC] border-t border-gray-100 flex justify-end gap-2 text-xs font-bold">
              <button 
                onClick={() => setIsRevisionModalOpen(false)}
                className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-lg border border-slate-205"
              >
                닫기
              </button>
              <button 
                onClick={handleExecuteRevision}
                className="px-5 py-2 text-white bg-rose-650 hover:bg-rose-700 rounded-lg shadow-sm"
              >
                반려 메일 발송
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
