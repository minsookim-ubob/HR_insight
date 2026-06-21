import React, { useState, useMemo, useEffect } from 'react';
import { Search, UserPlus, X, CheckCircle2, AlertCircle, Mail, Filter, Users, Save, Check, Plus } from 'lucide-react';
import { sendEmailViaGmail } from '../../lib/gmailApi';
import { getAccessToken, googleSignIn } from '../../lib/workspaceAuth';
import { SurveyService } from '../../services/SurveyService';

interface Employee {
  id: string;
  name: string;
  team: string;
  email: string;
}

const formatHtmlEmail = (body: string, linksHtml: string) => {
  const formattedContent = body.replace(/\n/g, '<br />');

  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; color: #333; line-height: 1.6;">
      <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-bottom: 2px solid #e2e8f0;">
        <h2 style="margin: 0; color: #0f172a; font-size: 24px;">다면진단 참여 안내</h2>
      </div>
      <div style="padding: 30px; background-color: #ffffff; border: 1px solid #e2e8f0; border-top: none;">
        ${formattedContent}
        <div style="text-align: center; margin: 30px 0; display: flex; flex-direction: column; gap: 10px;">
          ${linksHtml}
        </div>
        <br />
        <p style="color: #64748b; font-size: 14px;">감사합니다.</p>
      </div>
    </div>
  `;
};

export default function SurveyMappings() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('master_employees');
    if (saved) {
      setEmployees(JSON.parse(saved));
    }
  }, []);

  const [mappings, setMappings] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('master_survey_mappings');
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedRateeId, setSelectedRateeId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'zero' | 'incomplete'>('all');
  const [rateeTeamFilter, setRateeTeamFilter] = useState<string>('all');
  const [raterSearch, setRaterSearch] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  const teams = useMemo(() => Array.from(new Set(employees.map(e => e.team))), [employees]);

  // Mappings helper
  const getRaters = (rateeId: string) => mappings[rateeId] || [];
  
  // Filtered Ratees
  const filteredRatees = useMemo(() => {
    return employees.filter(emp => {
      if (rateeTeamFilter !== 'all' && emp.team !== rateeTeamFilter) return false;

      const ratersCount = getRaters(emp.id).length;
      if (filterMode === 'zero') return ratersCount === 0;
      if (filterMode === 'incomplete') return ratersCount > 0 && ratersCount < 5;
      return true;
    });
  }, [filterMode, mappings, rateeTeamFilter]);

  const selectedRatee = employees.find(e => e.id === selectedRateeId);

  // Filtered available Raters (Right panel)
  const availableRaters = useMemo(() => {
    if (!selectedRateeId) return [];
    
    // Raters can be anyone except the ratee themselves
    let list = employees.filter(e => e.id !== selectedRateeId);
    
    if (raterSearch.trim()) {
      const search = raterSearch.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(search) || e.team.toLowerCase().includes(search));
    }
    
    // Sort so assigned raters are at the top
    const assigned = getRaters(selectedRateeId);
    return list.sort((a, b) => {
      const aSelected = assigned.includes(a.id) ? -1 : 1;
      const bSelected = assigned.includes(b.id) ? -1 : 1;
      return aSelected - bSelected;
    });
  }, [selectedRateeId, raterSearch, mappings]);

  // Actions
  const handleToggleRater = (raterId: string) => {
    if (!selectedRateeId) return;
    
    setMappings(prev => {
      const currentRaters = prev[selectedRateeId] || [];
      const isAssigned = currentRaters.includes(raterId);
      
      let nextRaters;
      if (isAssigned) {
        // Remove
        nextRaters = currentRaters.filter(id => id !== raterId);
      } else {
        // Add (max 5 limit check)
        if (currentRaters.length >= 5) {
          alert('평가자는 최대 5명까지만 지정할 수 있습니다.');
          return prev;
        }

        // 제약조건: 같은 팀(부서) 3명 제한 체크
        const raterToAdd = employees.find(e => e.id === raterId);
        const ratee = employees.find(e => e.id === selectedRateeId);
        
        if (raterToAdd && ratee && raterToAdd.team === ratee.team) {
          const sameTeamCount = currentRaters.filter(id => {
            const r = employees.find(emp => emp.id === id);
            return r && r.team === ratee.team;
          }).length;

          if (sameTeamCount >= 3) {
            alert('동일한 부서(팀)의 평가자는 최대 3명까지만 지정할 수 있습니다. (타 부서 인원 최소 2명 필요)');
            return prev;
          }
        }

        nextRaters = [...currentRaters, raterId];
      }
      
      setIsCompleted(false); // Map changed, unset completed status
      return { ...prev, [selectedRateeId]: nextRaters };
    });
  };

  const handleTempSave = () => {
    localStorage.setItem('master_survey_mappings', JSON.stringify(mappings));
    alert('현재 매핑 상태가 임시저장되었습니다.');
  };

  const handleCompleteMapping = () => {
    // Validation
    const incompleteUsers = employees.filter(e => {
      const raters = getRaters(e.id);
      if (raters.length < 5) return true;

      const sameTeamCount = raters.filter(rId => {
        const r = employees.find(emp => emp.id === rId);
        return r && r.team === e.team;
      }).length;
      
      if (sameTeamCount > 3) return true;

      return false;
    });
    
    if (incompleteUsers.length > 0) {
      alert('평가자 조건(총 5명 지정, 타 부서 최소 2명 포함)을 만족하지 않는 피평가자가 존재합니다.');
      // Automatically switch filter to help user
      setFilterMode('incomplete');
      setIsCompleted(false);
    } else {
      localStorage.setItem('master_survey_mappings', JSON.stringify(mappings));
      alert('모든 다면진단 평가자 매핑이 완료되었습니다.');
      setIsCompleted(true);
      setFilterMode('all');
    }
  };

  const handleSendEmail = async () => {
    if (!isCompleted) return;
    if (confirm('모든 평가자들에게 다면진단 실행 요청 메일을 발송하시겠습니까? (발송자: hskim@ubob.com)')) {
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

      const allRaters = new Set<string>();
      Object.values(mappings).forEach((raters: keyof any | any) => {
        if (Array.isArray(raters)) {
          raters.forEach(r => allRaters.add(r));
        }
      });

      let successCount = 0;
      let failCount = 0;
      
      const sessionStr = localStorage.getItem('master_survey_sessions');
      const sessions = sessionStr ? JSON.parse(sessionStr) : [];
      let activeMultiSession = sessions.find((s: any) => s.type === 'multi');
      if (!activeMultiSession) {
         // Create a default session if there isn't one
         activeMultiSession = { id: 's_multi_default' };
      }

      for (const raterId of Array.from(allRaters)) {
        const rater = employees.find(e => e.id === raterId);
        if (rater && rater.email) {
          try {
            const subject = '[K-CUBE] 다면평가 평가자 참여 안내';
            const appUrl = window.location.origin;
            const bodyText = `안녕하세요, ${rater.name}님.\n\n다면평가 프로세스의 일환으로 귀하에게 동료 다면평가 권한이 배정되었습니다.\n아래 대상자별 링크를 클릭하여 접속 후 분리하여 진단 평가(다면진단)를 수행해 주시기 바랍니다.`;

            const rateesToEvaluateIds = Object.keys(mappings).filter(rateeId => mappings[rateeId].includes(raterId));
            const ratees = rateesToEvaluateIds.map(id => employees.find(e => e.id === id)).filter(Boolean) as Employee[];

            // Firestore Draft Creation
            for (const r of ratees) {
               const mappingId = `${rater.id}_${r.id}_${activeMultiSession.id}`;
               try {
                 await SurveyService.saveResult(mappingId, {
                   sessionId: activeMultiSession.id,
                   raterId: rater.id,
                   rateeId: r.id,
                   status: 'Draft',
                   sentAt: new Date().toISOString()
                 });
               } catch (err) {
                 console.error("Firestore draft save error:", err);
               }
            }

            const linksHtml = ratees.map(r => `
                <a href="${appUrl}/evaluate/${rater.id}_${r.id}_${activeMultiSession.id}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">${r.name} (${r.team}) 평가하기</a>
            `).join('');

            const emailBody = formatHtmlEmail(bodyText, linksHtml);
            await sendEmailViaGmail(rater.email, subject, emailBody, token);
            successCount++;
          } catch (e) {
            failCount++;
            console.error('Failed to send mail to', rater.email, e);
          }
        }
      }
      alert(`성공적으로 메일이 전송되었습니다. (성공: ${successCount}건, 실패: ${failCount}건)`);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">다면진단 평가자 맵핑</h2>
          <p className="text-sm text-[#94A3B8] mt-1">
            임직원별로 자신을 평가할 동료 5명을 지정하세요. (본인 제외, 동일 부서 최대 3명, 타 부서 최소 2명 / 진행 상태: {isCompleted ? <span className="text-[#14B8A6] font-bold">완료</span> : <span className="text-[#D97706] font-bold">진행중</span>})
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleTempSave} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#E2E8F0] text-[#475569] text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors">
            <Save size={16} /> 임시저장
          </button>
          <button onClick={handleCompleteMapping} className="flex items-center gap-1.5 px-4 py-2 bg-[#0F172A] text-white text-sm font-bold rounded-lg hover:bg-[#1E293B] transition-colors">
            <CheckCircle2 size={16} /> 맵핑 완료
          </button>
        </div>
      </div>

      {/* Main Content: Split Screen */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[600px]">
        
        {/* Left Panel: Ratees List */}
        <div className="flex-[2] bg-white border border-[#E2E8F0] rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-[#475569]" />
              <h3 className="font-bold text-[#0F172A] whitespace-nowrap">피평가자 목록</h3>
              <span className="text-xs bg-[#E2E8F0] text-[#475569] px-2 py-0.5 rounded font-bold whitespace-nowrap">{filteredRatees.length}명</span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full sm:w-auto">
              <select
                value={rateeTeamFilter}
                onChange={e => setRateeTeamFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#475569] focus:outline-none focus:border-[#6366F1] bg-white shadow-sm"
              >
                <option value="all">부서 전체</option>
                {teams.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>

              <div className="flex flex-wrap items-center gap-1 bg-white rounded-lg border border-[#E2E8F0] p-1">
                <button 
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap ${filterMode === 'all' ? 'bg-[#EEF2FF] text-[#6366F1]' : 'text-[#94A3B8] hover:text-[#475569]'}`}
                >
                  전체
                </button>
                <button 
                  onClick={() => setFilterMode('incomplete')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap ${filterMode === 'incomplete' ? 'bg-[#FEF2F2] text-[#DC2626]' : 'text-[#94A3B8] hover:text-[#475569]'}`}
                >
                  1~4명 부족
                </button>
                <button 
                  onClick={() => setFilterMode('zero')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap ${filterMode === 'zero' ? 'bg-[#FFFBEB] text-[#D97706]' : 'text-[#94A3B8] hover:text-[#475569]'}`}
                >
                  0명 (미지정)
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto w-full">
            <table className="w-full text-left text-sm text-[#475569]">
              <thead className="bg-white border-b border-[#E2E8F0] font-bold text-[#94A3B8] sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-4 w-1/4">피평가자 (소속)</th>
                  <th className="px-6 py-4 w-24 text-center">할당</th>
                  <th className="px-6 py-4">지정된 평가자 목록</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredRatees.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-[#94A3B8]">
                      해당 조건의 인원이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRatees.map(ratee => {
                    const raters = getRaters(ratee.id);
                    const isSelected = selectedRateeId === ratee.id;
                    
                    let badgeClass = 'bg-green-50 text-green-700 border-green-200';
                    if (raters.length === 0) badgeClass = 'bg-orange-50 text-orange-700 border-orange-200';
                    else if (raters.length < 5) badgeClass = 'bg-red-50 text-red-700 border-red-200';

                    return (
                      <tr 
                        key={ratee.id} 
                        onClick={() => setSelectedRateeId(ratee.id)}
                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-[#EEF2FF]' : 'hover:bg-[#F8FAFC]'}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className={`font-bold ${isSelected ? 'text-[#4F46E5]' : 'text-[#0F172A]'}`}>{ratee.name}</span>
                            <span className="text-[11px] text-[#94A3B8]">{ratee.team}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeClass}`}>
                             {raters.length} / 5
                           </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {raters.length === 0 && <span className="text-xs text-[#94A3B8] italic">지정된 평가자가 없습니다.</span>}
                            {raters.map(rId => {
                              const rater = employees.find(e => e.id === rId);
                              if (!rater) return null;
                              return (
                                <span key={rId} className="inline-flex items-center text-[11px] font-medium bg-white border border-[#E2E8F0] px-2 py-1 rounded text-[#0F172A] shadow-sm">
                                  <span className="text-[#94A3B8] mr-1">({rater.team})</span> {rater.name}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel: Rater Selection */}
        <div className="flex-1 w-full lg:max-w-md xl:max-w-lg bg-white border border-[#E2E8F0] rounded-xl shadow-sm flex flex-col overflow-hidden relative">
          {!selectedRateeId && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-20 flex flex-col items-center justify-center text-center p-6">
               <div className="w-16 h-16 bg-[#F8FAFC] rounded-full flex items-center justify-center text-[#94A3B8] mb-4">
                 <UserPlus size={24} />
               </div>
               <h3 className="text-base font-bold text-[#0F172A] mb-2">피평가자를 선택해주세요</h3>
               <p className="text-sm text-[#94A3B8]">좌측 목록에서 인원을 선택하면<br/>해당 인원을 평가할 동료를 지정할 수 있습니다.</p>
            </div>
          )}

          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            {selectedRatee ? (
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#6366F1] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {selectedRatee.name.substring(0, 1)}
                </div>
                <div>
                  <div className="text-[11px] text-[#6366F1] font-bold uppercase tracking-wider">Target Ratee</div>
                  <h3 className="font-bold text-[#0F172A] flex items-center gap-2">
                    {selectedRatee.name} <span className="font-normal text-sm text-[#94A3B8]">{selectedRatee.team}</span>
                  </h3>
                </div>
              </div>
            ) : (
              <div className="h-[56px] mb-4"></div>
            )}
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
              <input 
                type="text" 
                placeholder="평가자 (이름, 팀명) 검색..." 
                value={raterSearch}
                onChange={e => setRaterSearch(e.target.value)}
                disabled={!selectedRateeId}
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#6366F1] disabled:bg-gray-50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
             {availableRaters.map(rater => {
               const assignedRaters = selectedRateeId ? getRaters(selectedRateeId) : [];
               const isAssigned = assignedRaters.includes(rater.id);

               return (
                 <div 
                   key={rater.id} 
                   onClick={() => handleToggleRater(rater.id)}
                   className={`flex justify-between items-center p-3 rounded-lg border transition-colors ${
                     isAssigned 
                       ? 'bg-[#EEF2FF] border-[#C7D2FE] cursor-pointer' 
                       : 'bg-white border-transparent hover:border-[#E2E8F0] hover:bg-[#F8FAFC] cursor-pointer'
                   }`}
                 >
                   <div>
                     <p className={`font-bold text-sm ${isAssigned ? 'text-[#4F46E5]' : 'text-[#0F172A]'}`}>{rater.name}</p>
                     <p className="text-[11px] text-[#94A3B8]">{rater.team} &middot; {rater.email}</p>
                   </div>
                   
                   <div>
                     {isAssigned ? (
                       <button className="w-8 h-8 flex items-center justify-center bg-white text-[#4F46E5] rounded-full shadow-sm hover:!bg-[#FEE2E2] hover:text-[#DC2626] transition-colors group" title="제거">
                         <Check size={16} className="group-hover:hidden" />
                         <X size={16} className="hidden group-hover:block" />
                       </button>
                     ) : (
                       <button 
                         className="w-8 h-8 flex items-center justify-center text-[#94A3B8] border border-[#E2E8F0] rounded-full hover:bg-[#6366F1] hover:text-white hover:border-[#6366F1] transition-colors"
                       >
                         <Plus size={16} />
                       </button>
                     )}
                   </div>
                 </div>
               )
             })}

             {availableRaters.length === 0 && selectedRateeId && (
               <div className="py-12 text-center text-[#94A3B8] text-sm">검색 결과가 없습니다.</div>
             )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-6 border-t border-[#E2E8F0] flex justify-end">
        <button 
          onClick={handleSendEmail}
          disabled={!isCompleted}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${
            isCompleted 
              ? 'bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white hover:shadow-md hover:-translate-y-0.5' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Mail size={18} />
          {isCompleted ? '다면진단 요청 메일 일괄 발송' : '맵핑 완료 후 진단 실행 가능'}
        </button>
      </div>

    </div>
  );
}
