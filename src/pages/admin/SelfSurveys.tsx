import React, { useState, useEffect } from 'react';
import { Search, Plus, CheckCircle2, AlertCircle, Mail, Filter, Users, Save, Check, FileText, Eye, X, Edit2 } from 'lucide-react';
import { initialDepartments } from '../../data';
import type { Department } from '../../types';
import { sendEmailViaGmail } from '../../lib/gmailApi';
import { getAccessToken, googleSignIn } from '../../lib/workspaceAuth';
import { SurveyService } from '../../services/SurveyService';

interface Employee {
  id: string;
  name: string;
  department: string;
  team: string;
  email: string;
}

const formatHtmlEmail = (body: string, footer: string, closing: string, link: string) => {
  const formattedContent = `${body}\n\n${footer}\n\n${closing}`
    .replace(/\n/g, '<br />')
    .replace(
      footer,
      `<div style="text-align: center; margin: 30px 0;"><a href="${link}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">자가진단 바로가기</a></div>`
    );

  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; color: #333; line-height: 1.6;">
      <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-bottom: 2px solid #e2e8f0;">
        <h2 style="margin: 0; color: #0f172a; font-size: 24px;">자가진단 실시 안내</h2>
      </div>
      <div style="padding: 30px; background-color: #ffffff; border: 1px solid #e2e8f0; border-top: none;">
        ${formattedContent}
      </div>
    </div>
  `;
};

export default function SelfSurveys() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [deployments, setDeployments] = useState<Record<string, Record<string, any>>>(() => {
    const saved = localStorage.getItem('self_survey_deployments');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'not_sent' | 'sent' | 'completed'>('all');
  
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [template, setTemplate] = useState(() => {
    const saved = localStorage.getItem('self_survey_template');
    if (saved) return JSON.parse(saved);
    return {
      title: '2026년 상반기 자가진단 평가 안내',
      sender: '스마트러닝본부장 (hskim@ubob.com)',
      greeting: '[임직원 이름]님, 안녕하세요.',
      body: '2026년 상반기 자가진단 평가 일정을 안내해 드립니다.\n본 진단은 임직원 스스로 본인의 업무 성과와 역량을 되돌아보는 중요한 과정입니다.',
      info1_label: '진단 항목',
      info1_value: '팀워크, 직무 전문성 등 핵심 역량',
      info2_label: '기한',
      info2_value: '수신 후 7일 이내',
      footer: '아래 버튼을 눌러 자가진단을 시작해 주시기 바랍니다.',
      closing: '진단 내용에 관한 문의가 있으시면 스마트러닝본부장에게 연락 주시기 바랍니다. 감사합니다.'
    };
  });
  
  const [editTemplate, setEditTemplate] = useState({ ...template });

  useEffect(() => {
    if (isPreviewModalOpen) {
      setEditTemplate({ ...template });
      setIsEditMode(false);
    }
  }, [isPreviewModalOpen, template]);

  useEffect(() => {
    const savedEmps = localStorage.getItem('master_employees');
    if (savedEmps) {
      setEmployees(JSON.parse(savedEmps));
    }
    const savedDepts = localStorage.getItem('master_departments');
    if (savedDepts) {
      setDepartments(JSON.parse(savedDepts));
    }
  }, []);

  const handleSaveTemplate = () => {
    setTemplate(editTemplate);
    localStorage.setItem('self_survey_template', JSON.stringify(editTemplate));
    setIsEditMode(false);
  };

  const getStatus = (empId: string) => {
    const dep = deployments[empId];
    if (!dep) return 'not_sent';
    if (dep.status === 'completed') return 'completed';
    return 'sent';
  };

  const filteredEmployees = employees.filter(emp => {
    const status = getStatus(emp.id);
    if (filterMode !== 'all' && status !== filterMode) return false;
    
    if (selectedDept && emp.department !== selectedDept) return false;
    if (selectedTeam && emp.team !== selectedTeam) return false;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!emp.name.toLowerCase().includes(search) && !emp.team?.toLowerCase().includes(search)) {
        return false;
      }
    }
    return true;
  });

  const currentDept = departments.find(d => d.name === selectedDept);
  const teamsInDept = currentDept ? currentDept.teams : [];

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

  const handleDeploy = async () => {
    if (selectedEmployees.size === 0) {
      alert('대상자를 선택해주세요.');
      return;
    }
    
    if (confirm(`선택한 ${selectedEmployees.size}명의 임직원에게 자가진단 메일을 발송하시겠습니까?`)) {
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
         alert("메일 서비스를 이용하기 위해서는 Google 계정 연동 및 권한 승인이 필요합니다.");
         return;
      }

      const nextDeps = { ...deployments };
      const now = new Date().toISOString().split('T')[0];
      
      let successCount = 0;
      let failCount = 0;
      
      const sessionStr = localStorage.getItem('master_survey_sessions');
      const sessions = sessionStr ? JSON.parse(sessionStr) : [];
      let activeSelfSession = sessions.find((s: any) => s.type === 'self' && s.status === 'ongoing');
      if (!activeSelfSession) {
         activeSelfSession = sessions.find((s: any) => s.type === 'self') || { id: 's_self_default' };
      }

      for (const id of Array.from(selectedEmployees) as string[]) {
        const emp = employees.find(e => e.id === id);
        if (emp && emp.email) {
          try {
            // Firestore Draft Creation
            const mappingId = `${emp.id}_${emp.id}_${activeSelfSession.id}`;
            try {
              await SurveyService.saveResult(mappingId, {
                sessionId: activeSelfSession.id,
                raterId: emp.id,
                rateeId: emp.id,
                status: 'Draft',
                sentAt: now
              });
            } catch (err) {
              console.error("Firestore draft save error:", err);
            }

            let parsedBody = template?.body || '';
            parsedBody = parsedBody.replace(/{이름}/g, emp.name)
                                   .replace(/\[임직원 이름\]/g, emp.name);
            let parsedGreeting = template?.greeting || '';
            parsedGreeting = parsedGreeting.replace(/{이름}/g, emp.name)
                                          .replace(/\[임직원 이름\]/g, emp.name);
                                          
            const combinedBody = `${parsedGreeting}\n\n${parsedBody}\n\n- ${template?.info1_label}: ${template?.info1_value}\n- ${template?.info2_label}: ${template?.info2_value}`;
            
            const appUrl = window.location.origin;
            // The template already has footer and closing
            const emailBody = formatHtmlEmail(combinedBody, template?.footer || '', template?.closing || '', `${appUrl}/self-evaluate/${emp.id}`);
            const subject = template?.title || `[K-CUBE] 자가진단 실행 안내`;
            
            await sendEmailViaGmail(emp.email, subject, emailBody, token);
            successCount++;

            if (!nextDeps[id]) {
              nextDeps[id] = {
                id,
                status: 'sent',
                sentAt: now,
                completedAt: null
              };
            }
          } catch (e) {
            failCount++;
            console.error('Failed to send mail to', emp.email, e);
          }
        }
      }
      
      setDeployments(nextDeps);
      localStorage.setItem('self_survey_deployments', JSON.stringify(nextDeps));
      setSelectedEmployees(new Set());
      alert(`자가진단 메일 발송이 완료되었습니다. (성공: ${successCount}건, 실패: ${failCount}건)`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
            <FileText className="text-[#6366F1]" size={24} />
            자가진단 배포 및 관리
          </h2>
          <p className="text-[#475569] text-sm mt-1">임직원 스스로를 평가하는 자가진단을 배포하고 현황을 추적합니다.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsPreviewModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-gray-50"
          >
            <Eye size={18} className="text-[#64748B]" />
            발송 메일 템플릿 미리보기
          </button>
          <button 
            onClick={handleDeploy}
            disabled={selectedEmployees.size === 0}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm
              ${selectedEmployees.size > 0 
                ? 'bg-[#0F172A] text-white hover:bg-[#1E293B] shadow-md' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-[#E2E8F0]'
              }
            `}
          >
            <Mail size={18} />
            선택 인원 메일 발송 ({selectedEmployees.size}명)
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-220px)] min-h-[600px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center shrink-0">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 bg-white rounded-lg border border-[#E2E8F0] p-1 shadow-sm">
              <select 
                className="bg-transparent border-none text-sm font-bold text-[#0F172A] focus:ring-0 cursor-pointer py-1 pl-2 pr-6"
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setSelectedTeam('');
                }}
              >
                <option value="">본부 전체</option>
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
              
              <select 
                className="bg-transparent border-none text-sm font-bold text-[#0F172A] focus:ring-0 cursor-pointer py-1 pl-2 pr-6 border-l border-[#E2E8F0]"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                disabled={!selectedDept}
              >
                <option value="">팀 전체</option>
                {teamsInDept.map(t => (
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
                placeholder="이름 또는 팀 단위 검색..." 
                className="pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm w-64 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] bg-white shadow-sm"
              />
            </div>
          </div>

          <div className="flex bg-white rounded-lg border border-[#E2E8F0] p-1 shadow-sm">
            <button 
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${filterMode === 'all' ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'text-[#64748B] hover:text-[#0F172A]'}`}
            >
              전체
            </button>
            <button 
              onClick={() => setFilterMode('not_sent')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${filterMode === 'not_sent' ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'text-[#64748B] hover:text-[#0F172A]'}`}
            >
              미발송
            </button>
            <button 
              onClick={() => setFilterMode('sent')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${filterMode === 'sent' ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'text-[#64748B] hover:text-[#0F172A]'}`}
            >
              진행중
            </button>
            <button 
              onClick={() => setFilterMode('completed')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${filterMode === 'completed' ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'text-[#64748B] hover:text-[#0F172A]'}`}
            >
              완료
            </button>
          </div>
        </div>

        {/* User Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-sm text-[#475569] relative">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] font-bold text-[#64748B] sticky top-0 z-10 shadow-sm">
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
                <th className="px-6 py-4">소속 본부</th>
                <th className="px-6 py-4">소속 팀</th>
                <th className="px-6 py-4">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] bg-white">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-[#94A3B8]">
                    해당하는 임직원이 없습니다.
                  </td>
                </tr>
              ) : filteredEmployees.map(emp => {
                const status = getStatus(emp.id);
                const isSelected = selectedEmployees.has(emp.id);
                
                return (
                  <tr 
                    key={emp.id} 
                    className={`hover:bg-[#F8FAFC] transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/30' : ''}`}
                    onClick={() => toggleSelect(emp.id)}
                  >
                    <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-[#E2E8F0] text-[#6366F1] focus:ring-[#6366F1]"
                        checked={isSelected}
                        onChange={() => toggleSelect(emp.id)}
                      />
                    </td>
                    <td className="px-6 py-4 font-bold text-[#0F172A]">{emp.name}</td>
                    <td className="px-6 py-4">{emp.department}</td>
                    <td className="px-6 py-4">{emp.team}</td>
                    <td className="px-6 py-4">
                      {status === 'not_sent' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-100 text-gray-500 font-bold text-xs border border-gray-200 shadow-sm">
                          미발송
                        </span>
                      )}
                      {status === 'sent' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 text-blue-600 font-bold text-xs border border-blue-200 shadow-sm">
                          진행중 (응답 대기)
                        </span>
                      )}
                      {status === 'completed' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 text-emerald-600 font-bold text-xs border border-emerald-200 shadow-sm">
                          <CheckCircle2 size={14} /> 완료됨
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
      
      {/* Email Template Preview Modal */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
              <h3 className="font-bold text-[#0F172A] flex items-center gap-2">
                <Mail size={18} className="text-[#6366F1]" />
                자가진단 메일 템플릿 미리보기
              </h3>
              <button 
                onClick={() => setIsPreviewModalOpen(false)}
                className="text-[#64748B] hover:text-[#0F172A] transition-colors"
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>
            
            {!isEditMode ? (
              <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                <div className="bg-white border text-sm border-[#E2E8F0] rounded-xl shadow-sm p-8 max-w-lg mx-auto">
                  <div className="mb-8 border-b border-[#E2E8F0] pb-6">
                    <div className="w-12 h-12 bg-[#EEF2FF] text-[#4F46E5] rounded-xl flex items-center justify-center mb-4">
                      <FileText size={24} />
                    </div>
                    <h1 className="text-xl font-bold text-[#0F172A] mb-2">{template.title}</h1>
                    <p className="text-[#64748B] text-sm">발신: {template.sender}</p>
                  </div>
                  
                  <div className="space-y-4 text-base text-[#475569] leading-relaxed">
                    <p className="whitespace-pre-wrap">{template.greeting}</p>
                    <p className="whitespace-pre-wrap">{template.body}</p>
                    
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 my-6">
                      <ul className="space-y-2 text-sm">
                        <li className="flex justify-between"><span className="text-[#64748B] font-medium">{template.info1_label}</span> <span className="font-bold text-[#0F172A] text-right">{template.info1_value}</span></li>
                        <li className="flex justify-between"><span className="text-[#64748B] font-medium">{template.info2_label}</span> <span className="font-bold text-[#0F172A] text-right">{template.info2_value}</span></li>
                      </ul>
                    </div>
                    
                    <p className="whitespace-pre-wrap">{template.footer}</p>
                    
                    <div className="mt-8 mb-6 text-center">
                      <span className="inline-block py-3 px-8 bg-[#6366F1] text-white font-bold rounded-xl cursor-default opacity-90 shadow-sm">
                        자가진단 시작하기
                      </span>
                    </div>
                    
                    <p className="text-sm text-[#94A3B8] whitespace-pre-wrap">{template.closing}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 overflow-y-auto flex-1 bg-white">
                <div className="space-y-5 max-w-2xl mx-auto">
                  <div>
                    <label className="block text-sm font-bold text-[#0F172A] mb-2">메일 제목</label>
                    <input 
                      type="text" 
                      value={editTemplate.title}
                      onChange={(e) => setEditTemplate({...editTemplate, title: e.target.value})}
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1]" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#0F172A] mb-2">발신자 명/주소</label>
                    <input 
                      type="text" 
                      value={editTemplate.sender}
                      onChange={(e) => setEditTemplate({...editTemplate, sender: e.target.value})}
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1]" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#0F172A] mb-2">인사말</label>
                    <textarea 
                      value={editTemplate.greeting}
                      onChange={(e) => setEditTemplate({...editTemplate, greeting: e.target.value})}
                      rows={2}
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1]" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#0F172A] mb-2">본문 안내</label>
                    <textarea 
                      value={editTemplate.body}
                      onChange={(e) => setEditTemplate({...editTemplate, body: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1]" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-[#0F172A]">요약 정보 1</label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={editTemplate.info1_label}
                          onChange={(e) => setEditTemplate({...editTemplate, info1_label: e.target.value})}
                          placeholder="라벨 (예: 진단 항목)"
                          className="w-1/3 px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1]" 
                        />
                        <input 
                          type="text"
                          value={editTemplate.info1_value}
                          onChange={(e) => setEditTemplate({...editTemplate, info1_value: e.target.value})}
                          placeholder="내용"
                          className="w-2/3 px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1]" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-[#0F172A]">요약 정보 2</label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={editTemplate.info2_label}
                          onChange={(e) => setEditTemplate({...editTemplate, info2_label: e.target.value})}
                          placeholder="라벨 (예: 기한)"
                          className="w-1/3 px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1]" 
                        />
                        <input 
                          type="text"
                          value={editTemplate.info2_value}
                          onChange={(e) => setEditTemplate({...editTemplate, info2_value: e.target.value})}
                          placeholder="내용"
                          className="w-2/3 px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1]" 
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#0F172A] mb-2">버튼 상단 안내</label>
                    <input 
                      type="text" 
                      value={editTemplate.footer}
                      onChange={(e) => setEditTemplate({...editTemplate, footer: e.target.value})}
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1]" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#0F172A] mb-2">맺음말</label>
                    <textarea 
                      value={editTemplate.closing}
                      onChange={(e) => setEditTemplate({...editTemplate, closing: e.target.value})}
                      rows={2}
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1]" 
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="px-6 py-4 border-t border-[#E2E8F0] bg-white flex justify-between items-center">
              {!isEditMode ? (
                <>
                  <button 
                    onClick={() => setIsEditMode(true)}
                    className="px-6 py-2.5 bg-white border border-[#E2E8F0] text-[#0F172A] font-bold rounded-xl hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    <Edit2 size={18} /> 템플릿 수정
                  </button>
                  <button 
                    onClick={() => setIsPreviewModalOpen(false)}
                    className="px-6 py-2.5 bg-gray-100 text-[#475569] font-bold rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    닫기
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      setEditTemplate({ ...template });
                      setIsEditMode(false);
                    }}
                    className="px-6 py-2.5 bg-white border border-[#E2E8F0] text-[#475569] font-bold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    취소
                  </button>
                  <button 
                    onClick={handleSaveTemplate}
                    className="px-6 py-2.5 bg-[#0F172A] text-white font-bold rounded-xl hover:bg-[#1E293B] flex items-center gap-2 transition-colors"
                  >
                    <Save size={18} /> 저장하기
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
