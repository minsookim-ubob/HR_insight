import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Plus, Edit2, Trash2, Rocket, Save, AlertCircle, Mail, Settings, Target, ChevronRight, FileText, Search, User, CheckCircle2, X, CheckCircle, Info, Loader2, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { KpiTemplateItem, Department } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { initialDepartments } from '../../data';
import { sendEmailViaGmail } from '../../lib/gmailApi';
import { getAccessToken, googleSignIn } from '../../lib/workspaceAuth';
import { EmailOrchestrator } from '../../services/EmailOrchestrator';
import { db } from '../../services/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface Employee {
  id: string;
  name: string;
  department: string;
  team: string;
  email: string;
}

export interface KpiSession {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  status: 'draft' | 'ongoing' | 'completed';
  type?: 'setup' | 'evaluation'; 
  targetDepartments?: string[];
  targetEmployees?: string[]; // New: manually selected target employees
  templateItems?: KpiTemplateItem[];
  mailTemplate?: {
    title: string;
    sender: string;
    greeting: string;
    body: string;
    info1_label: string;
    info1_value: string;
    info2_label: string;
    info2_value: string;
    footer: string;
    closing: string;
  };
}

const DEFAULT_TEMP_ITEMS: KpiTemplateItem[] = [
  {
    id: 'ti1',
    category: '재무성과',
    itemDesc: '스마트러닝사업본부매출',
    detailGoal: '26년 경영계획 본부 목표 매출액 달성',
    weight: 20,
    evalMethod: '정량',
    calcFormula: '(실적 / 목표) * 가중치',
    unit: '억원',
    evalCriteria: { ex: 110, vg: 100, gd: 90, ni: 80, un: 70 },
    notes: '점수 부분은 실적 입력 시 자동 계산됨'
  }
];

const DEFAULT_MAIL_TEMPLATE = {
  title: '2026년 개인 KPI 목표 수립 안내',
  sender: '스마트러닝본부장 (hskim@ubob.com)',
  greeting: '[임직원 이름]님, 안녕하세요.',
  body: '2026년 개인 KPI 목표 수립 일정을 안내해 드립니다.\n본 수립 과정은 팀 공통 항목을 바탕으로 개인의 핵심 과제를 설정하는 단계입니다.',
  info1_label: '수립 항목',
  info1_value: '재무성과 및 미션항목 목표치 설정, 개인 항목 추가',
  info2_label: '기한',
  info2_value: '공지 후 7일 이내 제출 요망',
  footer: '아래 버튼을 클릭하면 KPI 목표관리(개인) 화면으로 이동합니다.\n[개별 KPI 수립하기]',
  closing: '문의사항은 스마트러닝본부장에게 연락 주시기 바랍니다. 감사합니다.'
};

const DEFAULT_EVAL_MAIL_TEMPLATE = {
  title: '2026년 개인 KPI 업적 성과평가 및 실적 입력 안내',
  sender: '스마트러닝본부장 (hskim@ubob.com)',
  greeting: '[임직원 이름]님, 안녕하세요.',
  body: '2026년도 최종 승인된 개인 KPI에 대해 실제 성취도/실적과 자가평가 의견을 기재하는 성과 평가 기간이 개시되었습니다.\n본 링크를 통해 자신이 승인받은 목표 항목들을 확인하고 달성도 실적 수치와 자가 의견을 작성해 제출하여 주시기 바랍니다.',
  info1_label: '평가 대상 항목',
  info1_value: '최종 승인된 개인 KPI 전체 항목에 대한 달성 실적 및 자가 종합평가',
  info2_label: '기한',
  info2_value: '해당 안내 공지 후 7일 이내 제출 (이후 팀장/본부장 단계적 평가 진행)',
  footer: '아래 단추를 클릭하여 KPI 성과 입력 포털로 바로 접속하십시오.\n[KPI 성과 평가 및 실적 입력 바로가기]',
  closing: '본 평가는 연간 종합 인사 고과 산정의 중요한 근거가 되므로 기한 엄수 바랍니다. 감사합니다.'
};

const formatHtmlEmail = (body: string, footer: string, closing: string, kpiToken: string) => {
  const appUrl = window.location.origin;
  const publicLink = `${appUrl}/kpi/public/${kpiToken}`;
  const formattedContent = `${body}\n\n${footer}\n\n${closing}`
    .replace(/\n/g, '<br />')
    .replace(
      /\[개별 KPI 수립하기\]/g, 
      `<span style="display:block;margin:24px 0;"><a href="${publicLink}" style="display:inline-block;padding:12px 24px;background-color:#4F46E5;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">개별 KPI 수립하기</a></span>`
    );
    
  return `
    <div style="font-family: 'Malgun Gothic', sans-serif; color: #374151; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${formattedContent}
    </div>
  `;
};

export default function KpiSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<KpiSession[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSession, setEditingSession] = useState<Partial<KpiSession>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'template' | 'mailTemplate' | 'sendMail'>('basic');
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  
  // States for SendMail tab
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [deployments, setDeployments] = useState<Record<string, Record<string, any>>>({});
  const [deployError, setDeployError] = useState<string | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'not_sent' | 'sent' | 'completed'>('all');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [showAllDepts, setShowAllDepts] = useState(false);
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const [showEmpDropdown, setShowEmpDropdown] = useState(false);

  // Custom UI Dialogs
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'|'info'} | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{message: string, onConfirm: () => void} | null>(null);
  const [promptDialog, setPromptDialog] = useState<{message: string, value: string, onConfirm: (val: string) => void} | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [showFormPreview, setShowFormPreview] = useState(false);

  const showToast = (message: string, type: 'success'|'error'|'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };


  const { user } = useAuth();

  const autocompleteEmployees = useMemo(() => {
    if (!empSearch) return [];
    const q = empSearch.toLowerCase();
    return employees.filter(emp => emp.name.toLowerCase().includes(q) || emp.team?.toLowerCase().includes(q) || emp.department.toLowerCase().includes(q));
  }, [empSearch, employees]);

  const getAdminSender = () => {
    let adminName = '관리자';
    let adminDept = '인사팀';
    const myEmail = user?.id || 'hskim@ubob.com';
    
    if (myEmail && employees.length > 0) {
       const me = employees.find(e => e.email === myEmail || e.id === myEmail);
       if (me) {
          adminName = me.name;
          adminDept = me.department;
          if (me.team && me.team !== me.department) adminDept += ` ${me.team}`;
       }
    }
    
    return `${adminDept} ${adminName} (${myEmail})`;
  };

  useEffect(() => {
    const stored = localStorage.getItem('master_kpi_sessions');
    if (stored) {
      setSessions(JSON.parse(stored));
    }
    const savedDepts = localStorage.getItem('master_departments');
    if (savedDepts) {
      setDepartments(JSON.parse(savedDepts));
    }
    const savedEmps = localStorage.getItem('master_employees');
    if (savedEmps) {
      setEmployees(JSON.parse(savedEmps));
    }
    const savedDeps = localStorage.getItem('kpi_mail_deployments');
    if (savedDeps) {
      setDeployments(JSON.parse(savedDeps));
    }
  }, []);

  const saveSessions = (data: KpiSession[]) => {
    setSessions(data);
    localStorage.setItem('master_kpi_sessions', JSON.stringify(data));
  };

  const handleAddNew = () => {
    setEditingSession({
      id: `ks_${Date.now()}`,
      name: '',
      year: new Date().getFullYear(),
      startDate: '',
      endDate: '',
      status: 'draft',
      type: 'setup',
      targetDepartments: [],
      templateItems: [...DEFAULT_TEMP_ITEMS],
      mailTemplate: { 
        ...DEFAULT_MAIL_TEMPLATE,
        sender: getAdminSender() 
      }
    });
    setActiveTab('basic');
    setIsEditing(true);
  };

  const handleEdit = (session: KpiSession) => {
    setEditingSession({ 
      ...session,
      templateItems: session.templateItems || [...DEFAULT_TEMP_ITEMS],
      targetDepartments: session.targetDepartments || [],
      mailTemplate: session.mailTemplate || { ...DEFAULT_MAIL_TEMPLATE }
    });
    setActiveTab('basic');
    setIsEditing(true);
    
    // Reset mail tab filters
    setSelectedEmployees(new Set());
    setSearchTerm('');
    setFilterMode('all');
    setSelectedDept('');
    setSelectedTeam('');
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmDialog({
      message: `'${name}' KPI 수립 회차를 삭제하시겠습니까?`,
      onConfirm: () => {
        saveSessions(sessions.filter(s => s.id !== id));
      }
    });
  };

  const handleSaveDraft = () => {
    if (!editingSession.name) {
      showToast('진단명은 필수 입력 사항입니다.', 'error');
      return;
    }
    const newSession = { ...editingSession, status: 'draft' } as KpiSession;
    let updated;
    const exists = sessions.find(s => s.id === newSession.id);
    if (exists) {
      updated = sessions.map(s => s.id === newSession.id ? newSession : s);
    } else {
      updated = [...sessions, newSession];
    }
    saveSessions(updated);
    setIsEditing(false);
    setEditingSession({});
    showToast('임시 저장되었습니다. 아직 준비 중 상태입니다.', 'success');
  };

  const handleSaveAndClose = () => {
    if (!editingSession.name || !editingSession.startDate || !editingSession.endDate) {
      showToast('기본 설정의 진단명과 기간은 필수 입력 사항입니다.', 'error');
      setActiveTab('basic');
      return;
    }
    
    if (new Date(editingSession.startDate) > new Date(editingSession.endDate)) {
      showToast('시작일은 종료일보다 빨라야 합니다.', 'error');
      setActiveTab('basic');
      return;
    }

    const totalWeight = editingSession.templateItems?.reduce((sum, item) => sum + Number(item.weight), 0) || 0;
    if (totalWeight !== 100 && editingSession.templateItems && editingSession.templateItems.length > 0) {
       showToast(`가중치 합이 100%가 아닙니다. 가중치 100%로 조정하세요. (현재 ${totalWeight}%)`, 'error');
       setActiveTab('template');
       return;
    }

    const newSession = { 
      ...editingSession, 
      status: editingSession.status === 'draft' ? 'ongoing' : editingSession.status 
    } as KpiSession;
    
    let updated;
    const exists = sessions.find(s => s.id === newSession.id);
    if (exists) {
      updated = sessions.map(s => s.id === newSession.id ? newSession : s);
    } else {
      updated = [...sessions, newSession];
    }
    
    saveSessions(updated);
    setIsEditing(false);
    setEditingSession({});
    showToast('저장되었습니다.', 'success');
  };
  
  // --- TEMPLATE TAB METHODS --- //
  const handleAddItem = () => {
    const newItem: KpiTemplateItem = {
      id: `ti_${Date.now()}`,
      category: '재무성과',
      itemDesc: '신규 평가항목',
      detailGoal: '',
      weight: 10,
      evalMethod: '정량',
      calcFormula: '(실적 / 목표) * 가중치',
      unit: '건',
      targetValue: 0,
      evalCriteria: { ex: 110, vg: 100, gd: 90, ni: 80, un: 70 },
      notes: ''
    };
    setEditingSession(prev => ({
      ...prev,
      templateItems: [...(prev.templateItems || []), newItem]
    }));
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (!editingSession.templateItems) return;
    const items = [...editingSession.templateItems];
    if (direction === 'up' && index > 0) {
      const temp = items[index - 1];
      items[index - 1] = items[index];
      items[index] = temp;
    } else if (direction === 'down' && index < items.length - 1) {
      const temp = items[index + 1];
      items[index + 1] = items[index];
      items[index] = temp;
    }
    setEditingSession(prev => ({ ...prev, templateItems: items }));
  };

  const handleItemChange = (itemId: string, field: keyof KpiTemplateItem, value: any) => {
    setEditingSession(prev => ({
      ...prev,
      templateItems: prev.templateItems?.map(it => it.id === itemId ? { ...it, [field]: value } : it)
    }));
  };

  const handleCriteriaChange = (itemId: string, level: 'ex'|'vg'|'gd'|'ni'|'un', value: number) => {
    setEditingSession(prev => ({
      ...prev,
      templateItems: prev.templateItems?.map(it => {
        if (it.id === itemId) return { ...it, evalCriteria: { ...it.evalCriteria, [level]: value } };
        return it;
      })
    }));
  };

  const handleRemoveItem = (id: string) => {
    setEditingSession(prev => ({
      ...prev,
      templateItems: prev.templateItems?.filter(it => it.id !== id)
    }));
  };
  
  // --- SEND MAIL TAB LOGIC --- //
  
  // Auto-select target department employees when entering step 4
  useEffect(() => {
    if (activeTab === 'sendMail' && selectedEmployees.size === 0 && editingSession && employees.length > 0) {
      const targets = editingSession.targetDepartments || [];
      const individualTargets = editingSession.targetEmployees || [];
      
      if (targets.length > 0 || individualTargets.length > 0) {
        const defaultSelected = employees
          .filter(emp => targets.includes(emp.department) || individualTargets.includes(emp.id))
          .map(emp => emp.id);
        setSelectedEmployees(new Set(defaultSelected));
      } else {
        setSelectedEmployees(new Set(employees.map(emp => emp.id)));
      }
    }
  }, [activeTab, editingSession, employees]);

  const getStatus = (empId: string) => {
    if (!editingSession.id) return 'not_sent';
    const sessionDeps = deployments[editingSession.id] || {};
    const dep = sessionDeps[empId];
    if (!dep) return 'not_sent';
    if (dep.status === 'completed') return 'completed';
    return 'sent';
  };

  const filteredEmployees = employees.filter(emp => {
    const targets = editingSession.targetDepartments || [];
    const individualTargets = editingSession.targetEmployees || [];
    const isTarget = targets.includes(emp.department) || individualTargets.includes(emp.id);

    // 1. If not showAllDepts AND no active searchTerm, restrict list to designated target departments AND selected employees
    if (!showAllDepts && !searchTerm) {
       if (targets.length === 0 && individualTargets.length === 0) return false;
       if (targets.length > 0 || individualTargets.length > 0) {
          if (!isTarget) return false;
       }
    }
    
    const status = getStatus(emp.id);
    if (filterMode !== 'all' && status !== filterMode) return false;
    
    if (selectedDept && emp.department !== selectedDept) return false;
    if (selectedTeam && emp.team !== selectedTeam) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!emp.name.toLowerCase().includes(search) && !emp.team?.toLowerCase().includes(search) && !emp.department.toLowerCase().includes(search)) {
        return false;
      }
    }
    return true;
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selectedEmployees);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedEmployees(next);
  };

  const toggleSelectAll = () => {
    if (selectedEmployees.size === filteredEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(filteredEmployees.map(e => e.id)));
    }
  };

  const handleTestSend = () => {
    if (!editingSession.id) return;
    
    if (selectedEmployees.size === 0) {
      showToast('테스트 메일 변수 매핑을 확인할 대상자를 최소 1명 선택해주세요.', 'error');
      return;
    }
    
    setPromptDialog({
      message: '테스트 메일을 수신할 이메일 주소를 입력하세요:',
      value: 'test@ubob.com',
      onConfirm: async (emailPrompt) => {
        setIsSendingMail(true);
        try {
          const firstEmpId = Array.from(selectedEmployees)[0];
          const emp = employees.find(e => e.id === firstEmpId);
          
          let parsedBody = editingSession.mailTemplate?.body || '';
          if (emp) {
            parsedBody = parsedBody.replace(/{이름}/g, emp.name)
                                   .replace(/{직무}/g, emp.team);
          }
          const emailBody = formatHtmlEmail(parsedBody, editingSession.mailTemplate?.footer || '', editingSession.mailTemplate?.closing || '', 'test_token');
          const subject = editingSession.mailTemplate?.title || `[테스트] ${editingSession.name} KPI 수립 안내`;
          
          // 테스트용 KPI 초안 생성
          const draftItems = (editingSession.templateItems || []).map((it: any) => ({
             ...it,
             id: "ti_" + it.id + "_test_" + Date.now(),
             targetValue: it.targetValue || 0,
             actualValue: 0,
             score: 0
          }));
          
          const testKpi = {
             id: `kpi_test_${Date.now()}_${emailPrompt}`,
             userId: emailPrompt,
             userName: (emp?.name || '테스터') + ' (테스트)',
             department: emp ? `${emp.department} ${emp.team}` : '테스트부서',
             year: editingSession.year,
             items: draftItems,
             status: 'Draft',
             totalScore: 0,
             sessionId: editingSession.id
          };
          
          const userKpisStr = localStorage.getItem('user_kpis');
          const allUserKpis = userKpisStr ? JSON.parse(userKpisStr) : [];
          // Remove old tests for this email
          const filtered = allUserKpis.filter((k: any) => !(k.sessionId === editingSession.id && k.userId === emailPrompt));
          filtered.push(testKpi);
          localStorage.setItem('user_kpis', JSON.stringify(filtered));

          await sendEmailViaGmail(emailPrompt, subject, emailBody);
          showToast(`입력하신 이메일(${emailPrompt})로 테스트 메일이 성공적으로 발송되었습니다.`, 'success');
        } catch (error: any) {
          showToast(`메일 발송에 실패했습니다: ${error.message}`, 'error');
        } finally {
          setIsSendingMail(false);
        }
      }
    });
  };

  const isCancelled = React.useRef(false);

  const handleDeploy = () => {
    if (!editingSession.id) return;
    
    if (selectedEmployees.size === 0) {
      showToast('대상자를 선택해주세요.', 'error');
      return;
    }
    
    // Save current session first silently if needed
    const newSession = { ...editingSession, status: 'ongoing' } as KpiSession;
    let updated;
    const exists = sessions.find(s => s.id === newSession.id);
    if (exists) {
      updated = sessions.map(s => s.id === newSession.id ? newSession : s);
    } else {
      updated = [...sessions, newSession];
    }
    saveSessions(updated);
    setEditingSession(newSession); // update local
    
    isCancelled.current = false;
    
    setConfirmDialog({
      message: `선택한 ${selectedEmployees.size}명의 임직원에게 개인 KPI 수립 요청 메일을 발송하시겠습니까?`,
      onConfirm: async () => {
        setIsSendingMail(true);
        const nextDeps = { ...deployments };
        if (!nextDeps[newSession.id]) {
          nextDeps[newSession.id] = {};
        }
        const sessionDeps = nextDeps[newSession.id];
        
        const now = new Date().toISOString().split('T')[0];
        
        const userKpisStr = localStorage.getItem('user_kpis');
        const allUserKpis = userKpisStr ? JSON.parse(userKpisStr) : [];
        let newDraftsAdded = false;
        
        let successCount = 0;
        let failCount = 0;
        let tokenRefreshed = false;
        
        let token = await getAccessToken();
        if (!token) {
           try {
              const res = await googleSignIn();
              token = res?.accessToken || null;
           } catch(e) {
              console.error(e);
           }
        }
        
        if (!token) {
           showToast("메일 서비스를 이용하기 위해서는 Google 계정 연동 및 권한 승인이 필요합니다.", 'error');
           setIsSendingMail(false);
           return;
        }

        for (const id of Array.from(selectedEmployees)) {
           if (isCancelled.current) break; // Allow cancellation
           
           const emp = employees.find(e => e.id === id);
           
           if (emp && emp.email) {
              const existingDraft = allUserKpis.find((k: any) => k.sessionId === newSession.id && k.userId === (emp.email || id));
              let kpiToken = '';
              let draftObj = null;

              if (!existingDraft) {
                const draftItems = (newSession.templateItems || []).map((it: any) => ({
                    ...it,
                    id: "ti_" + it.id + "_" + Date.now() + Math.floor(Math.random() * 100),
                    targetValue: it.targetValue || 0,
                    actualValue: 0,
                    score: 0
                }));
                
                kpiToken = crypto.randomUUID ? crypto.randomUUID() : `kpi_${Date.now()}_${Math.random().toString(36).substring(2,15)}`;
                const newDraft = {
                    id: kpiToken,
                    userId: emp.email || id,
                    userName: emp.name || id,
                    department: `${emp.department} ${emp.team}`,
                    year: newSession.year,
                    items: draftItems,
                    status: 'Draft',
                    totalScore: 0,
                    sessionId: newSession.id,
                    expiresAt: Date.now() + (14 * 24 * 60 * 60 * 1000)
                };
                allUserKpis.push(newDraft);
                newDraftsAdded = true;
                draftObj = newDraft;
              } else {
                kpiToken = existingDraft.id;
                draftObj = existingDraft;
              }

              // Save to Firestore
              try {
                 await setDoc(doc(db, 'kpis', draftObj.id), draftObj, { merge: true });
              } catch(err) {
                 console.error("Firestore Save Error for KPI:", err);
                 // We don't throw here so one failure doesn't break everything, just don't count success
                 continue;
              }

              // Send email (sequential for reliability, not parallel to avoid rate limiting)
              try {
                 let parsedBody = newSession.mailTemplate?.body || '';
                 parsedBody = parsedBody.replace(/{이름}/g, emp.name)
                                        .replace(/{직무}/g, emp.team);
                 
                 const emailBody = formatHtmlEmail(parsedBody, newSession.mailTemplate?.footer || '', newSession.mailTemplate?.closing || '', kpiToken);
                 const subject = newSession.mailTemplate?.title || `[K-CUBE] ${newSession.name} KPI 수립 안내`;
                 await sendEmailViaGmail(emp.email, subject, emailBody, token);
                 successCount++;
              } catch (e) {
                 failCount++;
                 console.error('Failed to send mail to', emp.email, e);
              }
           }

           if (emp) {
              if (!sessionDeps[id]) {
                sessionDeps[id] = {
                  id,
                  status: 'sent',
                  sentAt: now,
                  completedAt: null
                };
              } else {
                 sessionDeps[id].sentAt = now;
              }
           }
        }
        
        if (newDraftsAdded) {
           localStorage.setItem('user_kpis', JSON.stringify(allUserKpis));
        }
        
        setDeployments(nextDeps);
        localStorage.setItem('kpi_mail_deployments', JSON.stringify(nextDeps));
        setSelectedEmployees(new Set());
        setIsSendingMail(false);
        showToast(isCancelled.current ? `발송이 중단되었습니다.` : `발송이 완료되었습니다 (성공: ${successCount}건, 실패: ${failCount}건).`);
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-100 text-gray-600">준비 중</span>;
      case 'ongoing': return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-700">진행 중</span>;
      case 'completed': return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-800 text-white">마감됨</span>;
      default: return null;
    }
  };

  const isBasicComplete = editingSession.name && editingSession.startDate && editingSession.endDate;
  const isTemplateComplete = editingSession.templateItems && editingSession.templateItems.length > 0;
  const isMailComplete = editingSession.mailTemplate && editingSession.mailTemplate.title && editingSession.mailTemplate.body;
  // SendMail is complete if at least some were sent
  const targetEmployeeIds = employees.filter(e => {
     const targets = editingSession.targetDepartments || [];
     const individualTargets = editingSession.targetEmployees || [];
     if (targets.length === 0 && individualTargets.length === 0) return false;
     return targets.includes(e.department) || individualTargets.includes(e.id);
  }).map(e=>e.id);
  const isSendMailComplete = editingSession.id ? targetEmployeeIds.some(id => (deployments[editingSession.id] || {})[id]) : false;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">수립 회차 및 템플릿 관리</h1>
          <p className="text-sm text-[#475569] mt-1">개인 KPI 목표 수립 회차를 생성하고, 공통 지표와 메일 발송을 한 곳에서 진행하세요.</p>
        </div>
        <button 
          onClick={handleAddNew}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0F172A] text-white text-sm font-bold rounded-lg hover:bg-[#1E293B] transition-colors shadow-sm shrink-0"
        >
          <Plus size={16} /> 새 회차 생성
        </button>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-[#475569]">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] font-bold text-[#94A3B8]">
            <tr>
              <th className="px-6 py-4">진단 회차명</th>
              <th className="px-6 py-4">대상 연도 / 부서</th>
              <th className="px-6 py-4">실시 기간</th>
              <th className="px-6 py-4">상태</th>
              <th className="px-6 py-4 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {sessions.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-[#0F172A] cursor-pointer hover:text-[#6366F1] hover:underline" onClick={() => handleEdit(s)}>{s.name}</div>
                    {s.type === 'evaluation' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#EEF2FF] text-[#4F46E5] border border-indigo-100 shrink-0">📊 업적평가</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#F0FDF4] text-[#166534] border border-green-100 shrink-0">🎯 목표수립</span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#94A3B8] mt-1 space-x-2 flex">
                    <span>템플릿: <strong className="text-gray-500">{s.templateItems?.length || 0}</strong>항목</span>
                    <span>상태: {s.status === 'draft' ? '임시저장' : '진행중'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-medium">
                  <div>{s.year}년</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.targetDepartments?.length ? s.targetDepartments.join(', ') : '전체 부서'}</div>
                </td>
                <td className="px-6 py-4 font-medium">
                  {s.startDate} ~ {s.endDate}
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(s.status)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleEdit(s)} className="p-1.5 text-gray-500 hover:text-[#6366F1] bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors border border-gray-200" title="프로세스 진행 및 수정">
                      <Settings size={16} />
                    </button>
                    <button onClick={() => handleDelete(s.id, s.name)} className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors border border-gray-100" title="삭제">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-400">등록된 KPI 수립 회차가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[1400px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[95vh] h-full">
            <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <Rocket className="text-[#6366F1]" size={20} />
                {editingSession.id?.startsWith('ks_') ? '새 회차 프로세스' : '회차 프로세스 진행'}
              </h2>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button 
                  onClick={() => setActiveTab('basic')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'basic' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  1. 기본 설정
                  {isBasicComplete && <CheckCircle2 size={14} className="text-emerald-500" />}
                </button>
                <div className="flex items-center text-gray-300 px-1"><ChevronRight size={16} /></div>
                <button 
                  onClick={() => setActiveTab('template')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'template' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  2. 템플릿/지표 설정
                  {isTemplateComplete && <CheckCircle2 size={14} className="text-emerald-500" />}
                </button>
                <div className="flex items-center text-gray-300 px-1"><ChevronRight size={16} /></div>
                <button 
                  onClick={() => setActiveTab('mailTemplate')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'mailTemplate' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  3. 메일 템플릿 설정
                  {isMailComplete && <CheckCircle2 size={14} className="text-emerald-500" />}
                </button>
                <div className="flex items-center text-gray-300 px-1"><ChevronRight size={16} /></div>
                <button 
                  onClick={() => setActiveTab('sendMail')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'sendMail' ? 'bg-[#0F172A] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  4. 요청 메일 발송
                  {isSendMailComplete && <CheckCircle2 size={14} className={activeTab==='sendMail' ? 'text-emerald-400' : 'text-emerald-500'} />}
                </button>
              </div>
              <button 
                onClick={() => { setIsEditing(false); setEditingSession({}); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col p-6">
              {activeTab === 'basic' && (
                <div className="space-y-6 max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-[#E2E8F0] shadow-sm w-full">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-[#0F172A] mb-1">회차명</label>
                      <input
                        type="text"
                        value={editingSession.name || ''}
                        onChange={e => setEditingSession({...editingSession, name: e.target.value})}
                        placeholder="예: 2026년 개인 KPI 목표 수립"
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6366F1] text-sm bg-[#F8FAFC]"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-[#0F172A] mb-1">대상 연도</label>
                      <input
                        type="number"
                        value={editingSession.year || ''}
                        onChange={e => setEditingSession({...editingSession, year: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6366F1] text-sm bg-[#F8FAFC]"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-[#0F172A] mb-1">진행 상태</label>
                      <select
                        value={editingSession.status || 'draft'}
                        onChange={e => setEditingSession({...editingSession, status: e.target.value as 'draft'|'ongoing'|'completed'})}
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6366F1] text-sm bg-[#F8FAFC]"
                      >
                        <option value="draft">준비 중</option>
                        <option value="ongoing">진행 중</option>
                        <option value="completed">마감됨</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#0F172A] mb-1">개별 대상자 추가 (이름/팀 검색)</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="이름이나 팀명으로 검색"
                          className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:border-[#6366F1] text-sm bg-white"
                          value={empSearch}
                          onChange={(e) => {
                            setEmpSearch(e.target.value);
                            setShowEmpDropdown(true);
                          }}
                          onBlur={() => setTimeout(() => setShowEmpDropdown(false), 200)}
                        />
                        {showEmpDropdown && empSearch && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-indigo-100 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                            {autocompleteEmployees.length > 0 ? (
                              autocompleteEmployees.map(emp => (
                                <button
                                  key={emp.id}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b border-gray-50 last:border-0"
                                  onClick={() => {
                                    const current = editingSession.targetEmployees || [];
                                    if (!current.includes(emp.id)) {
                                      setEditingSession({ ...editingSession, targetEmployees: [...current, emp.id] });
                                    }
                                    setEmpSearch('');
                                    setShowEmpDropdown(false);
                                  }}
                                >
                                  <span className="font-bold">{emp.name}</span> <span className="text-gray-500">({emp.team})</span>
                                </button>
                              ))
                            ) : (
                              <div className="p-3 text-xs text-gray-400 text-center">검색 결과가 없습니다.</div>
                            )}
                          </div>
                        )}
                      </div>
                      {(editingSession.targetEmployees || []).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {editingSession.targetEmployees!.map(empId => {
                            const emp = employees.find(e => e.id === empId);
                            if (!emp) return null;
                            return (
                              <span key={empId} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {emp.name} ({emp.team})
                                <button 
                                  onClick={() => setEditingSession({...editingSession, targetEmployees: editingSession.targetEmployees!.filter(id => id !== empId)})}
                                  className="text-indigo-400 hover:text-indigo-600 focus:outline-none"
                                >
                                  <X size={14} />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#0F172A] mb-1">시작일</label>
                      <input
                        type="date"
                        value={editingSession.startDate || ''}
                        onChange={e => setEditingSession({...editingSession, startDate: e.target.value})}
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6366F1] text-sm bg-[#F8FAFC]"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-[#0F172A] mb-1">종료일</label>
                      <input
                        type="date"
                        value={editingSession.endDate || ''}
                        onChange={e => setEditingSession({...editingSession, endDate: e.target.value})}
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6366F1] text-sm bg-[#F8FAFC]"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-[#0F172A] mb-2">대상 부서 (선택한 부서만 대상)</label>
                      <div className="flex flex-wrap gap-2">
                         {departments.map(dept => (
                           <button 
                              key={dept.id}
                              onClick={() => {
                                 const current = editingSession.targetDepartments || [];
                                 if (current.includes(dept.name)) {
                                   setEditingSession({ ...editingSession, targetDepartments: current.filter(d => d !== dept.name) });
                                 } else {
                                   setEditingSession({ ...editingSession, targetDepartments: [...current, dept.name] });
                                 }
                              }}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${editingSession.targetDepartments?.includes(dept.name) ? 'bg-[#EEF2FF] border-[#C7D2FE] text-[#4F46E5]' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                           >
                             {editingSession.targetDepartments?.includes(dept.name) && '✓ '}
                             {dept.name}
                           </button>
                         ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'template' && (
                <div className="space-y-4 max-w-[1200px] w-full mx-auto">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm gap-4">
                     <div className="text-sm font-medium text-[#475569]">
                       <span className="font-bold text-[#0F172A] text-base mb-1 block">템플릿/지표 수립</span>
                       이 회차의 대상자들에게 <strong>기본으로 부여될 공통 KPI 항목과 평가기준</strong>을 설정합니다.<br/>
                       추후 발송될 메일을 통해 대상자는 이 항목을 수정하거나 새로운 개인 항목을 추가하게 됩니다.
                     </div>
                     <div className="flex gap-2">
                       <button onClick={() => setShowFormPreview(true)} className="px-5 py-2.5 bg-white text-indigo-600 font-bold text-sm rounded-xl hover:bg-gray-50 flex items-center gap-1.5 border border-indigo-200 whitespace-nowrap shadow-sm">
                         <Target size={16}/> 작성화면 미리보기
                       </button>
                       <button onClick={handleAddItem} className="px-5 py-2.5 bg-[#EEF2FF] text-[#4F46E5] font-bold text-sm rounded-xl hover:bg-[#E0E7FF] flex items-center gap-1.5 border border-indigo-100 whitespace-nowrap shadow-sm">
                         <Plus size={16}/> 항목 추가
                       </button>
                     </div>
                  </div>
                  
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#0F172A] min-w-[1200px]">
                       <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] tracking-wider text-[#64748B] font-bold">
                         <tr>
                            <th className="px-2 py-3 w-16 text-center">이동</th>
                            <th className="px-3 py-3 w-28 text-center">구분</th>
                            <th className="px-3 py-3 w-32 text-center">평가항목</th>
                            <th className="px-3 py-3 w-40 text-center">상세목표내용</th>
                            <th className="px-2 py-3 w-16 text-center">가중치</th>
                            <th className="px-2 py-3 w-20 text-center">평가방법</th>
                            <th className="px-2 py-3 w-24 text-center">연간목표</th>
                            <th className="px-2 py-3 w-16 text-center">단위</th>
                            <th className="px-2 py-3 text-center border-l border-r border-[#E2E8F0]" colSpan={5}>평가기준 (%) - EX/VG/GD/NI/UN</th>
                            <th className="px-3 py-3 w-40 text-center">지표 정의/메모</th>
                            <th className="w-12 text-center">삭제</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-[#E2E8F0]">
                         {editingSession.templateItems?.length === 0 && (
                            <tr><td colSpan={15} className="py-12 text-center text-[#94A3B8]">설정된 공통 항목이 없습니다. 항목 추가를 클릭하세요.</td></tr>
                         )}
                         {editingSession.templateItems?.map((item, index) => (
                            <tr key={item.id} className="hover:bg-slate-50/50">
                               <td className="p-2 text-center">
                                  <div className="flex flex-col gap-1 items-center justify-center">
                                     <button onClick={() => handleMoveItem(index, 'up')} disabled={index === 0} className="text-gray-400 hover:text-[#0F172A] disabled:opacity-30 disabled:hover:text-gray-400 p-0.5"><div className="w-0 h-0 border-l-[5px] border-l-transparent border-b-[6px] border-b-current border-r-[5px] border-r-transparent"></div></button>
                                     <button onClick={() => handleMoveItem(index, 'down')} disabled={index === (editingSession.templateItems?.length || 0) - 1} className="text-gray-400 hover:text-[#0F172A] disabled:opacity-30 disabled:hover:text-gray-400 p-0.5"><div className="w-0 h-0 border-l-[5px] border-l-transparent border-t-[6px] border-t-current border-r-[5px] border-r-transparent"></div></button>
                                  </div>
                               </td>
                               <td className="p-2">
                                   <select value={item.category} onChange={e => handleItemChange(item.id, 'category', e.target.value)} className="w-full px-1 py-1.5 border border-[#E2E8F0] rounded-md text-center bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#6366F1]">
                                      <option value="재무성과">재무성과</option>
                                      <option value="미션항목">미션항목</option>
                                      <option value="임의평가">임의평가</option>
                                   </select>
                               </td>
                               <td className="p-2">
                                   <textarea value={item.itemDesc} onChange={e => handleItemChange(item.id, 'itemDesc', e.target.value)} className="w-full px-2 py-1.5 border border-[#E2E8F0] rounded-md min-h-[60px] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#6366F1] resize-y" />
                               </td>
                               <td className="p-2">
                                   <textarea value={item.detailGoal} onChange={e => handleItemChange(item.id, 'detailGoal', e.target.value)} className="w-full px-2 py-1.5 border border-[#E2E8F0] rounded-md min-h-[60px] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#6366F1] resize-y" />
                               </td>
                               <td className="p-2">
                                   <input type="number" value={item.weight} onChange={e => handleItemChange(item.id, 'weight', Number(e.target.value))} className="w-full px-1 py-1.5 border border-[#E2E8F0] rounded-md text-center font-bold bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#6366F1]" />
                               </td>
                               <td className="p-2">
                                   <select value={item.evalMethod} onChange={e => handleItemChange(item.id, 'evalMethod', e.target.value)} className="w-full px-1 py-1.5 border border-[#E2E8F0] rounded-md text-center bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#6366F1]">
                                      <option value="정량">정량</option>
                                      <option value="정성">정성</option>
                                   </select>
                               </td>
                               <td className="p-2">
                                   <input type="text" value={item.targetValue || ''} onChange={e => handleItemChange(item.id, 'targetValue', e.target.value)} className="w-full px-2 py-1.5 border border-[#E2E8F0] rounded-md text-center bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#6366F1]" />
                               </td>
                               <td className="p-2">
                                   <input type="text" value={item.unit || ''} onChange={e => handleItemChange(item.id, 'unit', e.target.value)} className="w-full px-2 py-1.5 border border-[#E2E8F0] rounded-md text-center bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#6366F1]" />
                               </td>
                               <td className="p-1 border-l border-[#E2E8F0] bg-gray-50/30">
                                  <div className="flex flex-col items-center"><span className="text-[9px] font-bold text-[#64748B] mb-0.5">EX</span>
                                  <input type="number" value={item.evalCriteria.ex} onChange={e => handleCriteriaChange(item.id, 'ex', Number(e.target.value))} className="w-9 border border-[#E2E8F0] rounded-md text-center py-1 bg-white focus:outline-none focus:border-[#6366F1]" /></div>
                               </td>
                               <td className="p-1 bg-gray-50/30">
                                  <div className="flex flex-col items-center"><span className="text-[9px] font-bold text-[#64748B] mb-0.5">VG</span>
                                  <input type="number" value={item.evalCriteria.vg} onChange={e => handleCriteriaChange(item.id, 'vg', Number(e.target.value))} className="w-9 border border-[#E2E8F0] rounded-md text-center py-1 bg-white focus:outline-none focus:border-[#6366F1]" /></div>
                               </td>
                               <td className="p-1 bg-gray-50/30">
                                  <div className="flex flex-col items-center"><span className="text-[9px] font-bold text-[#64748B] mb-0.5">GD</span>
                                  <input type="number" value={item.evalCriteria.gd} onChange={e => handleCriteriaChange(item.id, 'gd', Number(e.target.value))} className="w-9 border border-[#E2E8F0] rounded-md text-center py-1 bg-white focus:outline-none focus:border-[#6366F1]" /></div>
                               </td>
                               <td className="p-1 bg-gray-50/30">
                                  <div className="flex flex-col items-center"><span className="text-[9px] font-bold text-[#64748B] mb-0.5">NI</span>
                                  <input type="number" value={item.evalCriteria.ni} onChange={e => handleCriteriaChange(item.id, 'ni', Number(e.target.value))} className="w-9 border border-[#E2E8F0] rounded-md text-center py-1 bg-white focus:outline-none focus:border-[#6366F1]" /></div>
                               </td>
                               <td className="p-1 border-r border-[#E2E8F0] bg-gray-50/30">
                                  <div className="flex flex-col items-center"><span className="text-[9px] font-bold text-[#64748B] mb-0.5">UN</span>
                                  <input type="number" value={item.evalCriteria.un} onChange={e => handleCriteriaChange(item.id, 'un', Number(e.target.value))} className="w-9 border border-[#E2E8F0] rounded-md text-center py-1 bg-white focus:outline-none focus:border-[#6366F1]" /></div>
                               </td>
                               <td className="p-2">
                                   <textarea value={item.notes || ''} onChange={e => handleItemChange(item.id, 'notes', e.target.value)} className="w-full px-2 py-1.5 border border-[#E2E8F0] rounded-md min-h-[60px] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#6366F1] resize-y" />
                               </td>
                               <td className="p-2 text-center">
                                  <button onClick={() => handleRemoveItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mx-auto block">
                                     <Trash2 size={16}/>
                                  </button>
                               </td>
                            </tr>
                         ))}
                       </tbody>
                       <tfoot className="bg-[#F8FAFC] border-t border-[#E2E8F0] font-bold text-sm">
                         <tr>
                           <td colSpan={4} className="px-4 py-4 text-right text-[#475569]">총 가중치 합계:</td>
                           <td className={`px-2 py-4 text-center ${editingSession.templateItems?.reduce((sum, item) => sum + Number(item.weight), 0) === 100 ? 'text-[#6366F1]' : 'text-red-600'}`}>
                              {editingSession.templateItems?.reduce((sum, item) => sum + Number(item.weight), 0)}%
                           </td>
                           <td colSpan={10}></td>
                         </tr>
                       </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'mailTemplate' && editingSession.mailTemplate && (
                <div className="space-y-6 max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-[#E2E8F0] shadow-sm w-full">
                  <div className="mb-4 pb-4 border-b border-[#E2E8F0] flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-[#0F172A] flex items-center gap-2">
                         <FileText size={18} className="text-[#6366F1]" /> 메일 템플릿 작성
                      </h3>
                      <p className="text-sm text-[#64748B] mt-1">이 회차 대상자에게 발송될 안내 메일의 양식을 수정합니다.</p>
                    </div>
                    <button
                      onClick={() => setShowEmailPreview(true)}
                      className="px-3 py-1.5 bg-[#F8FAFC] text-sm text-[#475569] border border-[#E2E8F0] rounded-lg shadow-sm hover:bg-gray-100 font-bold"
                    >
                      미리보기
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#0F172A] mb-2">메일 제목</label>
                    <input 
                      type="text" 
                      value={editingSession.mailTemplate.title}
                      onChange={(e) => setEditingSession({...editingSession, mailTemplate: {...editingSession.mailTemplate!, title: e.target.value}})}
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1] bg-[#F8FAFC]" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#0F172A] mb-2">발신자 명/주소</label>
                    <input 
                      type="text" 
                      value={editingSession.mailTemplate.sender}
                      onChange={(e) => setEditingSession({...editingSession, mailTemplate: {...editingSession.mailTemplate!, sender: e.target.value}})}
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1] bg-[#F8FAFC]" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#0F172A] mb-2">인사말</label>
                    <textarea 
                      value={editingSession.mailTemplate.greeting}
                      onChange={(e) => setEditingSession({...editingSession, mailTemplate: {...editingSession.mailTemplate!, greeting: e.target.value}})}
                      rows={2}
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1] bg-[#F8FAFC]" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#0F172A] mb-2">본문 안내</label>
                    <textarea 
                      value={editingSession.mailTemplate.body}
                      onChange={(e) => setEditingSession({...editingSession, mailTemplate: {...editingSession.mailTemplate!, body: e.target.value}})}
                      rows={3}
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1] bg-[#F8FAFC]" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="block text-sm font-bold text-[#0F172A]">요약 정보 1</label>
                       <div className="flex gap-2">
                         <input 
                           type="text"
                           value={editingSession.mailTemplate.info1_label}
                           onChange={(e) => setEditingSession({...editingSession, mailTemplate: {...editingSession.mailTemplate!, info1_label: e.target.value}})}
                           className="w-1/3 px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1] bg-[#F8FAFC]" 
                         />
                         <input 
                           type="text"
                           value={editingSession.mailTemplate.info1_value}
                           onChange={(e) => setEditingSession({...editingSession, mailTemplate: {...editingSession.mailTemplate!, info1_value: e.target.value}})}
                           className="w-2/3 px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1] bg-[#F8FAFC]" 
                         />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="block text-sm font-bold text-[#0F172A]">요약 정보 2</label>
                       <div className="flex gap-2">
                         <input 
                           type="text"
                           value={editingSession.mailTemplate.info2_label}
                           onChange={(e) => setEditingSession({...editingSession, mailTemplate: {...editingSession.mailTemplate!, info2_label: e.target.value}})}
                           className="w-1/3 px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1] bg-[#F8FAFC]" 
                         />
                         <input 
                           type="text"
                           value={editingSession.mailTemplate.info2_value}
                           onChange={(e) => setEditingSession({...editingSession, mailTemplate: {...editingSession.mailTemplate!, info2_value: e.target.value}})}
                           className="w-2/3 px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1] bg-[#F8FAFC]" 
                         />
                       </div>
                    </div>
                  </div>

                  <div>
                     <label className="block text-sm font-bold text-[#0F172A] mb-2">맺음말</label>
                     <textarea 
                       value={editingSession.mailTemplate.closing}
                       onChange={(e) => setEditingSession({...editingSession, mailTemplate: {...editingSession.mailTemplate!, closing: e.target.value}})}
                       rows={2}
                       className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1] bg-[#F8FAFC]" 
                     />
                  </div>
                </div>
              )}

              {activeTab === 'sendMail' && (
                 <div className="space-y-6 max-w-[1200px] w-full mx-auto flex flex-col h-full">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm gap-4 shrink-0">
                       <div className="text-sm font-medium text-[#475569]">
                         <span className="font-bold text-[#0F172A] text-base mb-1 block flex items-center gap-2">
                            <Mail className="text-[#6366F1]" size={18}/> 부서명부 및 메일 발송
                         </span>
                         기본 설정에서 타겟팅된 부서의 임직원 명단입니다.<br/>체크박스로 발송할 인원을 선택하고 메일 템플릿을 기반으로 발송합니다.
                       </div>
                       <div className="flex flex-wrap items-center gap-3 mt-4 sm:mt-0">
                         <button 
                           onClick={handleTestSend}
                           disabled={isSendingMail}
                           className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm
                             ${selectedEmployees.size > 0 
                               ? 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 shadow-sm' 
                               : 'bg-gray-50 text-gray-400 border border-[#E2E8F0]'
                             }
                           `}
                         >
                           {isSendingMail ? <Loader2 className="animate-spin" size={16} /> : null} 테스트 메일 발송
                         </button>
                         <button 
                           onClick={handleDeploy}
                           disabled={selectedEmployees.size === 0 || isSendingMail}
                           className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm
                             ${selectedEmployees.size > 0 
                               ? 'bg-[#0F172A] text-white hover:bg-[#1E293B] shadow-md' 
                               : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-[#E2E8F0]'
                             }
                           `}
                         >
                           {isSendingMail ? <Loader2 className="animate-spin" size={18} /> : <Mail size={18} />}
                           {selectedEmployees.size > 0 ? `선택 인원 발송 (${selectedEmployees.size}명)` : '대상 인원 선택 필요'}
                         </button>
                       </div>
                    </div>

                    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm flex flex-col min-h-[400px] flex-1">
                      {/* Toolbar */}
                      <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center rounded-t-2xl shrink-0">
                        <div className="flex flex-wrap gap-4 items-center">
                          <button 
                            type="button"
                            onClick={() => {
                              setShowAllDepts(!showAllDepts);
                              setSelectedDept('');
                              setSelectedTeam('');
                            }}
                            className={`px-3.5 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                              showAllDepts 
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <span>{showAllDepts ? '🎯 지정 타겟 부서만 보기' : '🌐 회사 전체 임직원 보기'}</span>
                          </button>

                          <div className="flex items-center gap-2 bg-white rounded-lg border border-[#E2E8F0] p-1 shadow-sm">
                            <select 
                              className="bg-transparent border-none text-sm font-bold text-[#0F172A] focus:ring-0 cursor-pointer py-1 pl-2 pr-6"
                              value={selectedDept}
                              onChange={(e) => {
                                setSelectedDept(e.target.value);
                                setSelectedTeam('');
                              }}
                            >
                              <option value="">{showAllDepts ? "전체 부서 필터" : "지정 부서 전체"}</option>
                              {showAllDepts 
                                ? departments.map(d => (
                                    <option key={d.id} value={d.name}>{d.name}</option>
                                  ))
                                : departments.filter(d=> !editingSession.targetDepartments?.length || editingSession.targetDepartments.includes(d.name)).map(d => (
                                    <option key={d.id} value={d.name}>{d.name}</option>
                                  ))
                              }
                            </select>
                            
                            <select 
                              className="bg-transparent border-none text-sm font-bold text-[#0F172A] focus:ring-0 cursor-pointer py-1 pl-2 pr-6 border-l border-[#E2E8F0]"
                              value={selectedTeam}
                              onChange={(e) => setSelectedTeam(e.target.value)}
                              disabled={!selectedDept}
                            >
                              <option value="">팀 전체</option>
                              {selectedDept && departments.find(d => d.name === selectedDept)?.teams.map(t => (
                                <option key={t.id} value={t.name}>{t.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="relative border-l pl-4 border-[#E2E8F0]">
                            <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                              type="text" 
                              value={searchTerm}
                              onChange={e => setSearchTerm(e.target.value)}
                              placeholder="이름, 부서 또는 팀 단위 검색..." 
                              className="pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm w-64 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] bg-white shadow-sm"
                            />
                          </div>
                        </div>

                        <div className="flex bg-white rounded-lg border border-[#E2E8F0] p-1 shadow-sm">
                          {['all', 'not_sent', 'sent', 'completed'].map(mode => {
                             const lbl = mode==='all'?'전체':mode==='not_sent'?'미발송':mode==='sent'?'발송됨':'작성완료';
                             return (
                              <button 
                                key={mode}
                                onClick={() => setFilterMode(mode as any)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${filterMode === mode ? 'bg-[#1E293B] text-white shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'}`}
                              >
                                {lbl}
                              </button>
                             )
                          })}
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left text-sm text-[#475569] relative">
                          <thead className="bg-white border-b border-[#E2E8F0] font-bold text-[#64748B] sticky top-0 z-10">
                            <tr>
                              <th className="px-6 py-4 w-[50px] text-center">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 rounded border-[#E2E8F0] text-[#6366F1] focus:ring-[#6366F1]"
                                  checked={filteredEmployees.length > 0 && selectedEmployees.size === filteredEmployees.length}
                                  onChange={toggleSelectAll}
                                />
                              </th>
                              <th className="px-6 py-4">대상자 이름</th>
                              <th className="px-6 py-4">소속 본부/팀</th>
                              <th className="px-6 py-4 text-center">상태</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9] bg-white">
                            {filteredEmployees.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-6 py-20 text-center text-[#94A3B8]">
                                  조건에 맞는 임직원이 없습니다. 기본 설정의 타겟 그룹을 확인하세요.
                                </td>
                              </tr>
                            ) : filteredEmployees.map(emp => {
                              const status = getStatus(emp.id);
                              const isSelected = selectedEmployees.has(emp.id);
                              
                              return (
                                <tr 
                                  key={emp.id} 
                                  className={`hover:bg-[#F8FAFC] transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/20' : ''}`}
                                  onClick={() => toggleSelect(emp.id)}
                                >
                                  <td className="px-6 py-3 text-center" onClick={e => e.stopPropagation()}>
                                    <input 
                                      type="checkbox" 
                                      className="w-4 h-4 rounded border-[#E2E8F0] text-[#6366F1] focus:ring-[#6366F1]"
                                      checked={isSelected}
                                      onChange={() => toggleSelect(emp.id)}
                                    />
                                  </td>
                                  <td className="px-6 py-3">
                                     <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                          {emp.name.charAt(0)}
                                        </div>
                                        <div className="font-bold text-[#0F172A]">{emp.name}</div>
                                     </div>
                                  </td>
                                  <td className="px-6 py-3 text-[#475569]">{emp.department} / {emp.team}</td>
                                  <td className="px-6 py-3 text-center">
                                    {status === 'not_sent' && (
                                      <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 font-bold text-[11px] border border-slate-200">
                                        미발송
                                      </span>
                                    )}
                                    {status === 'sent' && (
                                      <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-600 font-bold text-[11px] border border-blue-200">
                                        발송됨 (초안)
                                      </span>
                                    )}
                                    {status === 'completed' && (
                                      <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-50 text-emerald-600 font-bold text-[11px] border border-emerald-200">
                                        작성완료
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                 </div>
              )}
            </div>

            <div className="px-6 py-4 bg-white border-t border-[#E2E8F0] flex justify-between items-center rounded-b-2xl shrink-0">
              <button 
                onClick={() => { setIsEditing(false); isCancelled.current = true; setIsSendingMail(false); }}
                className="px-6 py-2.5 border border-[#E2E8F0] text-[#475569] font-bold text-sm hover:bg-gray-50 rounded-xl transition-colors shadow-sm"
              >
                진행 취소
              </button>
              
              <div className="flex gap-3">
                 {activeTab === 'basic' && (
                    <button onClick={() => setActiveTab('template')} className="px-6 py-2.5 bg-[#4F46E5] text-white font-bold text-sm hover:bg-[#4338CA] rounded-xl transition-colors shadow-sm flex items-center gap-2">
                       다음: 템플릿 설정 <ChevronRight size={16} />
                    </button>
                 )}
                 {activeTab === 'template' && (
                    <button onClick={() => setActiveTab('mailTemplate')} className="px-6 py-2.5 bg-[#4F46E5] text-white font-bold text-sm hover:bg-[#4338CA] rounded-xl transition-colors shadow-sm flex items-center gap-2">
                       다음: 메일 템플릿 설정 <ChevronRight size={16} />
                    </button>
                 )}
                 {activeTab === 'mailTemplate' && (
                    <button onClick={() => setActiveTab('sendMail')} className="px-6 py-2.5 bg-[#4F46E5] text-white font-bold text-sm hover:bg-[#4338CA] rounded-xl transition-colors shadow-sm flex items-center gap-2">
                       다음: 대상자 메일 발송 <ChevronRight size={16} />
                    </button>
                 )}
                 {activeTab === 'sendMail' && (
                    <>
                       <button onClick={handleSaveDraft} className="px-6 py-2.5 bg-white border border-[#E2E8F0] text-gray-700 font-bold text-sm hover:bg-gray-50 rounded-xl transition-colors shadow-sm">
                         임시 저장
                       </button>
                       <button onClick={handleSaveAndClose} className="flex items-center gap-2 px-6 py-2.5 bg-[#0F172A] text-white font-bold text-sm hover:bg-[#1E293B] rounded-xl transition-colors shadow-sm">
                         <Save size={16} /> 저장 후 닫기
                       </button>
                    </>
                 )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg font-medium text-sm z-50 flex items-center gap-2 animate-fade-in-up ${
          toast.type === 'success' ? 'bg-indigo-600 text-white' : 
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-gray-800 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : toast.type === 'error' ? <AlertCircle size={18} /> : <Info size={18} />}
          {toast.message}
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 animate-fade-in-up">
            <h3 className="text-lg font-bold text-gray-900 mb-2">확인</h3>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed whitespace-pre-wrap">{confirmDialog.message}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDialog(null)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition">취소</button>
              <button 
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }} 
                className="px-4 py-2 text-sm font-bold bg-[#0F172A] text-white hover:bg-[#1E293B] rounded-lg transition"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Dialog */}
      {promptDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 animate-fade-in-up">
            <h3 className="text-lg font-bold text-gray-900 mb-2">입력 요청</h3>
            <p className="text-gray-600 mb-4 text-sm leading-relaxed">{promptDialog.message}</p>
            <input 
              type="text" 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none mb-6"
              value={promptDialog.value}
              onChange={(e) => setPromptDialog({...promptDialog, value: e.target.value})}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setPromptDialog(null)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition">취소</button>
              <button 
                onClick={() => {
                  promptDialog.onConfirm(promptDialog.value);
                  setPromptDialog(null);
                }} 
                className="px-4 py-2 text-sm font-bold bg-[#0F172A] text-white hover:bg-[#1E293B] rounded-lg transition"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Preview Dialog */}
      {showEmailPreview && editingSession.mailTemplate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in-up">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Mail size={20} className="text-[#6366F1]" /> 메일 양식 디자인 미리보기
              </h3>
              <button onClick={() => setShowEmailPreview(false)} className="text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-100 flex items-start justify-center">
               <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full max-w-[600px] text-left" dangerouslySetInnerHTML={{
                  __html: formatHtmlEmail(
                    (editingSession.mailTemplate.body || '').replace(/{이름}/g, '홍길동').replace(/{직무}/g, '팀장'), 
                    editingSession.mailTemplate.footer || '', 
                    editingSession.mailTemplate.closing || '', 
                    editingSession.id || 'ks_test'
                  )
               }} />
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end bg-gray-50">
              <button 
                onClick={() => setShowEmailPreview(false)} 
                className="px-6 py-2.5 text-sm font-bold bg-[#0F172A] text-white hover:bg-[#1E293B] rounded-lg transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Preview Dialog */}
      {showFormPreview && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-slate-50 rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col h-[90vh] animate-fade-in-up">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm z-10">
              <div className="flex flex-col">
                 <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                   <Target size={20} className="text-indigo-600" /> 수신자 작성화면 미리보기 (가상 데이터)
                 </h3>
                 <p className="text-xs text-gray-500 mt-1">※ 메일 수신자가 링크를 클릭했을 때 보게 될 화면의 예시입니다.</p>
              </div>
              <button onClick={() => setShowFormPreview(false)} className="text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
               <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#E2E8F0] w-full max-w-4xl opacity-90 pointer-events-none">
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
                     <span className="px-4 py-1.5 rounded-full text-sm font-bold shadow-sm bg-slate-100 text-slate-700 border border-slate-200">
                       작성 중
                     </span>
                     <span className="text-sm font-medium text-gray-500 mt-1">대상자: 부서 팀장 홍길동</span>
                   </div>
                 </div>

                 <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm my-8">
                   <table className="w-full text-left text-sm text-[#0F172A]">
                     <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                       <tr>
                         <th className="px-5 py-4 text-center">구분</th>
                         <th className="px-5 py-4">평가항목 (목표 내용)</th>
                         <th className="px-5 py-4">상세 목표설명</th>
                         <th className="px-4 py-4 w-32 text-center text-indigo-700">가중치(%)</th>
                         <th className="px-4 py-4 w-36 text-center text-indigo-700">목표실적 수치</th>
                         <th className="px-4 py-4 w-24 text-center">단위</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y border-[#E2E8F0] bg-white">
                       {(editingSession.templateItems || []).length === 0 && (
                         <tr>
                           <td colSpan={6} className="px-6 py-10 text-center text-gray-400">등록된 템플릿 항목이 없습니다.</td>
                         </tr>
                       )}
                       {(editingSession.templateItems || []).map((item: any, i: number) => (
                         <tr key={i} className="hover:bg-slate-50 transition-colors">
                           <td className="px-5 py-5 text-center font-bold text-gray-600 bg-gray-50/50">{item.category || '공통'}</td>
                           <td className="px-5 py-5 whitespace-pre-wrap font-medium">{item.itemDesc || '항목명'}</td>
                           <td className="px-5 py-5 whitespace-pre-wrap text-gray-600">{item.detailGoal || '상세 목표 설명'}</td>
                           <td className="px-4 py-5">
                             <div className="relative flex items-center">
                               <input type="number" readOnly value={item.weight || ''} className="w-full px-3 py-2 pr-7 text-right font-bold text-[15px] border bg-gray-100 border-transparent text-gray-500 rounded-lg" />
                               <span className="absolute right-3 text-gray-400 text-xs font-semibold">%</span>
                             </div>
                           </td>
                           <td className="px-4 py-5">
                             <input type="number" readOnly value={item.targetValue || ''} className="w-full px-3 py-2 text-right font-bold text-[15px] border bg-gray-100 border-transparent text-gray-500 rounded-lg" />
                           </td>
                           <td className="px-4 py-5 text-center font-medium text-gray-600 bg-gray-50/50">{item.unit || '%'}</td>
                         </tr>
                       ))}
                     </tbody>
                     <tfoot className="bg-slate-50 font-bold border-t border-[#E2E8F0] shadow-inner">
                       <tr>
                         <td colSpan={3} className="px-5 py-4 text-right align-middle text-[#0F172A]">총 가중치 합계:</td>
                         <td className="px-4 py-4 text-right align-middle text-lg text-emerald-600">
                           {(editingSession.templateItems || []).reduce((sum: number, it: any) => sum + Number(it.weight || 0), 0)}%
                         </td>
                         <td colSpan={2}></td>
                       </tr>
                     </tfoot>
                   </table>
                 </div>

                 <div className="mt-10 flex justify-end gap-4">
                   <button className="px-8 py-3 rounded-xl font-bold bg-white border-2 border-gray-200 text-gray-700 flex items-center gap-2">
                     <Save size={18} /> 임시 저장
                   </button>
                   <button className="px-8 py-3 rounded-xl font-bold bg-indigo-600 text-white flex items-center gap-2">
                     <Send size={18} /> 승인 요청하기
                   </button>
                 </div>
               </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end bg-white z-10">
              <button 
                onClick={() => setShowFormPreview(false)} 
                className="px-6 py-2.5 text-sm font-bold bg-[#0F172A] text-white hover:bg-[#1E293B] rounded-lg transition-colors"
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
