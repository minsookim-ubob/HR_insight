import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, Rocket, Save, AlertCircle, ChevronRight, CheckCircle2, X, Eye, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import SurveyMappings from './SurveyMappings';
import SelfSurveys from './SelfSurveys';
import { INITIAL_POOLS, QuestionPool } from './SurveyQuestionPools';

export interface SurveySession {
  id: string;
  name: string;
  type: 'self' | 'multi';
  period: string; // e.g., '2026 상반기'
  startDate: string;
  endDate: string;
  status: 'draft' | 'ongoing' | 'completed';
  poolId?: string;
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

export const DEFAULT_SURVEY_MAIL_TEMPLATE = {
  title: '2026년 상반기 정기 다면진단 안내',
  sender: '인사팀 (hr_admin@ubob.com)',
  greeting: '[임직원 이름]님, 안녕하세요.',
  body: '2026년 상반기 본부/팀 다면평가가 시작되었습니다.\n동료들의 성장과 발전을 위해 솔직하고 건설적인 피드백을 부탁드립니다.',
  info1_label: '진단 대상',
  info1_value: '소속 팀 내 피평가자로 지정된 업무 유관자',
  info2_label: '진단 기간',
  info2_value: '공지일로부터 14일간',
  footer: '아래 버튼을 클릭하여 다면평가/진단 페이지로 이동해 참석을 부탁드립니다.\n[다면평가/진단 바로가기]',
  closing: '문의사항이 있으시면 인사팀으로 연락 주시기 바랍니다. 참여해 주셔서 감사합니다.'
};

const formatHtmlEmail = (body: string, footer: string, closing: string, sessionId: string, empEmail: string) => {
  const appUrl = window.location.origin;
  const publicLink = `${appUrl}/survey/public/${sessionId}/${encodeURIComponent(empEmail)}`;
  const formattedContent = `${body}\n\n${footer}\n\n${closing}`
    .replace(/\n/g, '<br />')
    .replace(
      /\[다면평가\/진단 바로가기\]/g, 
      `<span style="display:block;margin:24px 0;"><a href="${publicLink}" style="display:inline-block;padding:12px 24px;background-color:#4F46E5;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">다면평가/진단 바로가기</a></span>`
    );
    
  return `
    <div style="font-family: 'Malgun Gothic', sans-serif; color: #374151; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${formattedContent}
    </div>
  `;
};

const INITIAL_SESSIONS: SurveySession[] = [
  { id: 's1', type: 'multi', period: '2026 상반기', name: '정기 리더십/역량 다면평가', startDate: '2026-05-01', endDate: '2026-05-31', status: 'ongoing', poolId: 'pool_1' },
  { id: 's2', type: 'self', period: '2026 상반기', name: '2026년 상반기 자가진단', startDate: '2026-05-01', endDate: '2026-05-31', status: 'ongoing', poolId: 'pool_1' },
  { id: 's3', type: 'multi', period: '2025 하반기', name: '2025년 하반기 다면진단', startDate: '2025-11-01', endDate: '2025-11-30', status: 'completed', poolId: 'pool_1' },
];

const checkIsEnded = (session: Partial<SurveySession>) => {
  if (session.status === 'completed') return true;
  if (session.endDate) {
    const end = new Date(session.endDate);
    end.setHours(23, 59, 59, 999);
    return new Date() > end;
  }
  return false;
};

export default function SurveySessions() {
  const [sessions, setSessions] = useState<SurveySession[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSession, setEditingSession] = useState<Partial<SurveySession>>({});

  const [activeTab, setActiveTab] = useState<'basic' | 'questions' | 'mapping' | 'mailTemplate'>('basic');
  const [pools, setPools] = useState<QuestionPool[]>([]);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  const { user } = useAuth();

  const getAdminSender = () => {
    let adminName = '관리자';
    let adminDept = '인사팀';
    const myEmail = user?.id || 'hr_admin@ubob.com';
    
    const savedEmps = localStorage.getItem('master_employees');
    if (myEmail && savedEmps) {
       try {
         const parsedEmps = JSON.parse(savedEmps);
         const me = parsedEmps.find((e: any) => e.email === myEmail || e.id === myEmail);
         if (me) {
            adminName = me.name;
            adminDept = me.department;
            if (me.team && me.team !== me.department) adminDept += ` ${me.team}`;
         }
       } catch (e) {}
    }
    
    return `${adminDept} ${adminName} (${myEmail})`;
  };

  useEffect(() => {
    const stored = localStorage.getItem('master_survey_sessions');
    if (stored) {
      setSessions(JSON.parse(stored));
    } else {
      setSessions(INITIAL_SESSIONS);
      localStorage.setItem('master_survey_sessions', JSON.stringify(INITIAL_SESSIONS));
    }

    const storedPools = localStorage.getItem('master_survey_pools');
    if (storedPools) {
      setPools(JSON.parse(storedPools));
    } else {
      setPools(INITIAL_POOLS);
      localStorage.setItem('master_survey_pools', JSON.stringify(INITIAL_POOLS));
    }
  }, []);

  const saveSessions = (data: SurveySession[]) => {
    setSessions(data);
    localStorage.setItem('master_survey_sessions', JSON.stringify(data));
  };

  const handleAddNew = () => {
    const currentYear = new Date().getFullYear();
    const currentHalf = new Date().getMonth() < 6 ? '상반기' : '하반기';
    setEditingSession({
      id: `s_${Date.now()}`,
      name: '',
      type: 'multi',
      period: `${currentYear} ${currentHalf}`,
      startDate: '',
      endDate: '',
      status: 'draft',
      poolId: 'pool_1',
      mailTemplate: { 
        ...DEFAULT_SURVEY_MAIL_TEMPLATE,
        sender: getAdminSender() 
      }
    });
    setActiveTab('basic');
    setIsEditing(true);
  };

  const handleEdit = (session: SurveySession) => {
    setEditingSession({ 
      ...session,
      mailTemplate: session.mailTemplate || { ...DEFAULT_SURVEY_MAIL_TEMPLATE }
    });
    setActiveTab('basic');
    setIsEditing(true);
  };

  const handleDelete = (id: string, name: string) => {
    saveSessions(sessions.filter(s => s.id !== id));
  };

  const handleSave = () => {
    if (checkIsEnded(editingSession)) {
      alert('진단이 종료된 항목은 수정할 수 없습니다.');
      return;
    }

    if (!editingSession.name || !editingSession.startDate || !editingSession.endDate) {
      alert('진단명과 기간은 필수 입력 사항입니다.');
      return;
    }

    if (new Date(editingSession.startDate) > new Date(editingSession.endDate)) {
      alert('시작일은 종료일보다 빨라야 합니다.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(editingSession.startDate);
    start.setHours(0, 0, 0, 0);

    const originalSession = sessions.find(s => s.id === editingSession.id);
    const isNew = !originalSession;
    
    if ((isNew || originalSession.startDate !== editingSession.startDate) && start < today) {
      alert('시작일 설정을 오늘 날짜 이후로 설정해 주세요.');
      return;
    }

    const newSession = editingSession as SurveySession;
    
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
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-100 text-gray-600">준비 대기</span>;
      case 'ongoing': return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-green-100 text-green-700">진행 중</span>;
      case 'completed': return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-700">진단 종료</span>;
      default: return null;
    }
  }

  const isBasicComplete = editingSession.name && editingSession.startDate && editingSession.endDate;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">진단/평가 마스터 관리 (Sessions)</h1>
          <p className="text-sm text-[#475569] mt-1">다면진단과 자가진단의 실시 주기를 생성하고 전체 프로세스를 플로우에 따라 관리합니다.</p>
        </div>
        <button 
          onClick={handleAddNew}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0F172A] text-white text-sm font-bold rounded-lg hover:bg-[#1E293B] transition-colors shadow-sm shrink-0"
        >
          <Plus size={16} /> 새 진단 생성
        </button>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-[#475569]">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] font-bold text-[#94A3B8]">
            <tr>
              <th className="px-6 py-4">진단명 (Period)</th>
              <th className="px-6 py-4">유형</th>
              <th className="px-6 py-4">실시 기간</th>
              <th className="px-6 py-4 text-center">상태</th>
              <th className="px-6 py-4 text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {sessions.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div 
                    className="font-bold text-[#0F172A] cursor-pointer hover:text-[#6366F1] underline-offset-2 hover:underline" 
                    onClick={() => handleEdit(s)}
                  >
                    {s.name}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{s.period}</div>
                </td>
                <td className="px-6 py-4 font-medium">
                  {s.type === 'multi' ? '다면평가' : '자가진단'}
                </td>
                <td className="px-6 py-4 font-medium">
                  {s.startDate} ~ {s.endDate}
                </td>
                <td className="px-6 py-4 text-center">
                  {getStatusBadge(s.status)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button 
                      onClick={() => handleEdit(s)} 
                      className="p-1.5 text-gray-400 hover:text-[#6366F1] bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors"
                      title={checkIsEnded(s) ? '상세조회' : '수정'}
                    >
                      {checkIsEnded(s) ? <Eye size={16} /> : <Edit2 size={16} />}
                    </button>
                    <button onClick={() => handleDelete(s.id, s.name)} className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors" title="삭제">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-400">등록된 진단 회차가 없습니다.</td>
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
                {editingSession.id?.startsWith('s_') ? '새 진단 회차 생성' : '진단 프로세스 진행'}
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
                  onClick={() => setActiveTab('questions')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'questions' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  2. 문항 풀 (Pool) 설정
                </button>
                <div className="flex items-center text-gray-300 px-1"><ChevronRight size={16} /></div>
                <button 
                  onClick={() => setActiveTab('mailTemplate')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'mailTemplate' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  3. 메일 템플릿 설정
                </button>
                <div className="flex items-center text-gray-300 px-1"><ChevronRight size={16} /></div>
                <button 
                  onClick={() => setActiveTab('mapping')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'mapping' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  4. 대상자 맵핑 및 메일 발송
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
                      <label className="block text-sm font-bold text-[#0F172A] mb-1">진단 회차명</label>
                      <input
                        type="text"
                        disabled={checkIsEnded(editingSession)}
                        value={editingSession.name || ''}
                        onChange={e => setEditingSession({...editingSession, name: e.target.value})}
                        placeholder="예: 2026년 하반기 다면평가"
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6366F1] text-sm bg-[#F8FAFC] disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-[#0F172A] mb-1">구분 (Period)</label>
                      <div className="flex gap-2">
                        <select
                          disabled={checkIsEnded(editingSession)}
                          value={editingSession.period?.split(' ')[0] || String(new Date().getFullYear())}
                          onChange={e => {
                            const half = editingSession.period?.split(' ')[1] || (new Date().getMonth() < 6 ? '상반기' : '하반기');
                            setEditingSession({...editingSession, period: `${e.target.value} ${half}`});
                          }}
                          className="flex-1 px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6366F1] text-sm bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                            <option key={year} value={`${year}`}>{year}년</option>
                          ))}
                        </select>
                        <select
                          disabled={checkIsEnded(editingSession)}
                          value={editingSession.period?.split(' ')[1] || (new Date().getMonth() < 6 ? '상반기' : '하반기')}
                          onChange={e => {
                            const year = editingSession.period?.split(' ')[0] || String(new Date().getFullYear());
                            setEditingSession({...editingSession, period: `${year} ${e.target.value}`});
                          }}
                          className="flex-1 px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6366F1] text-sm bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <option value="상반기">상반기</option>
                          <option value="하반기">하반기</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-[#0F172A] mb-1">진단 유형</label>
                      <select
                        disabled={checkIsEnded(editingSession)}
                        value={editingSession.type || 'multi'}
                        onChange={e => setEditingSession({...editingSession, type: e.target.value as 'multi'|'self'})}
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6366F1] text-sm bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <option value="multi">다면평가 (Peer Review)</option>
                        <option value="self">자가진단 (Self Review)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#0F172A] mb-1">시작일</label>
                      <input
                        type="date"
                        disabled={checkIsEnded(editingSession)}
                        value={editingSession.startDate || ''}
                        onChange={e => setEditingSession({...editingSession, startDate: e.target.value})}
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6366F1] text-sm bg-[#F8FAFC] disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-[#0F172A] mb-1">종료일</label>
                      <input
                        type="date"
                        disabled={checkIsEnded(editingSession)}
                        value={editingSession.endDate || ''}
                        onChange={e => setEditingSession({...editingSession, endDate: e.target.value})}
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6366F1] text-sm bg-[#F8FAFC] disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-[#0F172A] mb-1">진행 상태</label>
                      <select
                        disabled={checkIsEnded(editingSession)}
                        value={editingSession.status || 'draft'}
                        onChange={e => setEditingSession({...editingSession, status: e.target.value as any})}
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6366F1] text-sm bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <option value="draft">준비 대기 (Draft)</option>
                        <option value="ongoing">진행 중 (Ongoing)</option>
                        <option value="completed">진단 종료 (Completed)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'questions' && (
                 <div className="w-full h-full bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6 overflow-y-auto">
                   <div className="mb-6 pb-4 border-b border-gray-200">
                     <p className="text-sm font-bold text-gray-500 mb-1">2단계: 진단 문항 풀(Pool) 연결</p>
                     <p className="text-sm text-gray-600 leading-relaxed">
                       해당 진단 마스터에 연결할 진단 문항지(Question Pool)를 선택하세요.<br/>
                       새로운 진단 문항지가 필요하다면 '진단 문항 관리' 메뉴에서 생성 후 연결할 수 있습니다.
                     </p>
                   </div>
                   
                   <div className="space-y-6 max-w-3xl">
                     <div>
                       <label className="block text-sm font-bold text-[#0F172A] mb-2">진단지 선택</label>
                       <select
                         disabled={checkIsEnded(editingSession)}
                         value={editingSession.poolId || pools[0]?.id || ''}
                         onChange={e => setEditingSession({...editingSession, poolId: e.target.value})}
                         className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#6366F1] text-sm font-bold text-[#0F172A] bg-white disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-[#E2E8F0]/30"
                       >
                         {pools.map(pool => (
                           <option key={pool.id} value={pool.id}>{pool.title} ({pool.categories.length}개 유형 / {pool.questions.length}문항)</option>
                         ))}
                       </select>
                     </div>

                     {pools.find(p => p.id === (editingSession.poolId || pools[0]?.id)) && (
                       <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
                         <div className="bg-[#F8FAFC] px-4 py-3 border-b border-[#E2E8F0]">
                           <h4 className="font-bold text-[#0F172A] text-sm">진단지 문항 요약</h4>
                         </div>
                         <div className="p-4 bg-white space-y-4">
                           {pools.find(p => p.id === (editingSession.poolId || pools[0]?.id))?.categories.map(cat => {
                             const qs = pools.find(p => p.id === (editingSession.poolId || pools[0]?.id))?.questions.filter(q => q.categoryId === cat.id) || [];
                             return (
                               <div key={cat.id} className="space-y-2">
                                 <h5 className="font-bold text-[#475569] text-sm pb-1 border-b border-[#E2E8F0]">{cat.name} <span className="text-xs font-normal text-gray-400 ml-1">({qs.length}문항)</span></h5>
                                 <ul className="list-disc list-inside space-y-1">
                                   {qs.map(q => (
                                     <li key={q.id} className={`text-[13px] ${q.isActive ? 'text-[#0F172A]' : 'text-gray-400 line-through'}`}>{q.text}</li>
                                   ))}
                                 </ul>
                               </div>
                             );
                           })}
                         </div>
                       </div>
                     )}
                   </div>
                 </div>
              )}

              {activeTab === 'mapping' && (
                 <div className="w-full h-full bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-y-auto">
                   <div className={checkIsEnded(editingSession) ? "opacity-70 pointer-events-none" : ""}>
                     {editingSession.type === 'multi' ? (
                         <SurveyMappings />
                     ) : (
                         <SelfSurveys />
                     )}
                   </div>
                 </div>
              )}

              {activeTab === 'mailTemplate' && editingSession.mailTemplate && (
                <div className="space-y-6 max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-[#E2E8F0] shadow-sm w-full">
                  <div className="mb-4 pb-4 border-b border-[#E2E8F0] flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-[#0F172A] flex items-center gap-2">
                         <Mail size={18} className="text-[#6366F1]" /> 메일 템플릿 작성
                      </h3>
                      <p className="text-sm text-[#64748B] mt-1">이 회차 대상자에게 발송될 다면진단/자가진단 메일의 양식을 수정합니다.</p>
                    </div>
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
            </div>
            
            {activeTab === 'basic' && (
              <div className="px-6 py-4 border-t border-[#E2E8F0] bg-white flex justify-end gap-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2.5 bg-white border border-[#E2E8F0] text-[#0F172A] rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
                >
                  {checkIsEnded(editingSession) ? '닫기' : '취소'}
                </button>
                {!checkIsEnded(editingSession) && (
                  <button 
                    onClick={handleSave}
                    className="px-6 py-2.5 bg-[#6366F1] text-white rounded-xl text-sm font-bold hover:bg-[#4F46E5] transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Save size={16} /> 기본 설정 저장
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Email Preview Dialog */}
      {showEmailPreview && editingSession.mailTemplate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
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
                    (editingSession.mailTemplate.body || '').replace(/\[임직원 이름\]/g, '홍길동').replace(/\{직무\}/g, '연구원'), 
                    editingSession.mailTemplate.footer || '', 
                    editingSession.mailTemplate.closing || '', 
                    editingSession.id || 's_test', 
                    '홍길동@ubob.com'
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
    </div>
  );
}
