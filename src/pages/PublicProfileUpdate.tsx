import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, Save, User, Briefcase, Plus, Trash2 } from "lucide-react";
import { SalesRep } from "../types";
import { UserService } from "../services/UserService";
import { encryptData, decryptData } from "../utils/encryption";

export default function PublicProfileUpdate() {
  const { email } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<SalesRep | null>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  
  // Form State
  const [birthDate, setBirthDate] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [workSkills, setWorkSkills] = useState<string[]>([]);
  const [languageSkills, setLanguageSkills] = useState<any[]>([]);
  const [careerHistory, setCareerHistory] = useState<any[]>([]);

  useEffect(() => {
    // 1) load master_employees
    const savedMaster = localStorage.getItem("master_employees");
    let foundEmp: SalesRep | null = null;
    let fallbackEmp: SalesRep | null = null;

    if (savedMaster) {
      try {
        const masterData = JSON.parse(savedMaster);
        foundEmp = masterData.find((e: any) => e.email === email);
      } catch (e) {}
    }

    if (foundEmp) {
      setEmployee(foundEmp);
      setBirthDate(foundEmp.birthDate || "");
      setJoinDate(foundEmp.joinDate || "");
      setWorkSkills(foundEmp.workSkills || []);
      setLanguageSkills(foundEmp.languageSkills || []);
      setCareerHistory(foundEmp.careerHistory || []);
    }
    
    setLoading(false);
  }, [email]);

  const handleSave = async () => {
    if (!employee) return;

    // Update master_employees
    const savedMaster = localStorage.getItem("master_employees");
    let updatedEmpData = null;
    if (savedMaster) {
      try {
        const masterData = JSON.parse(savedMaster);
        const index = masterData.findIndex((e: any) => e.email === email);
        if (index > -1) {
          masterData[index] = {
            ...masterData[index],
            birthDate,
            joinDate,
            workSkills,
            languageSkills,
            careerHistory,
          };
          updatedEmpData = masterData[index];
          localStorage.setItem("master_employees", JSON.stringify(masterData));
        }
      } catch (err) {}
    }

    // Also update team_roster_data to keep it sync UI-wise
    const savedRoster = localStorage.getItem("team_roster_data");
    if (savedRoster) {
      try {
        const rosterData = JSON.parse(savedRoster);
        const index = rosterData.findIndex((e: any) => e.email === email || e.id === employee.id);
        if (index > -1) {
          rosterData[index] = {
            ...rosterData[index],
            birthDate,
            joinDate,
            workSkills,
            languageSkills,
            careerHistory,
            // also update total career summary text ideally, but omitting for now
          };
          localStorage.setItem("team_roster_data", JSON.stringify(rosterData));
        }
      } catch (err) {}
    }

    if (updatedEmpData && updatedEmpData.id) {
       const encryptedData = {
          birthDate: encryptData(updatedEmpData.birthDate || ""),
          careerHistory: encryptData(JSON.stringify(updatedEmpData.careerHistory || [])),
          // Skills are less sensitive, but user asked for "개인 정보" to be encrypted
          workSkills: encryptData(JSON.stringify(updatedEmpData.workSkills || [])),
          languageSkills: encryptData(JSON.stringify(updatedEmpData.languageSkills || []))
       };
       await UserService.syncUser(updatedEmpData.id, {
          ...updatedEmpData,
          ...encryptedData
       });
    }

    setSuccess(true);
  };

  const handleAddCareer = () => {
    setCareerHistory([...careerHistory, { id: `ch_${Date.now()}`, companyName: "", teamName: "", role: "", startDate: "", endDate: "" }]);
  };

  const handleCareerChange = (idx: number, field: string, value: string) => {
    const newHistory = [...careerHistory];
    newHistory[idx] = { ...newHistory[idx], [field]: value };
    setCareerHistory(newHistory);
  };

  const handleRemoveCareer = (idx: number) => {
    const newHistory = careerHistory.filter((_, i) => i !== idx);
    setCareerHistory(newHistory);
  };

  const handleAddSkill = (type: 'work' | 'language') => {
    if (type === 'work') {
      setWorkSkills([...workSkills, ""]);
    } else {
      setLanguageSkills([...languageSkills, ""]);
    }
  };

  const handleSkillChange = (type: 'work' | 'language', idx: number, value: string) => {
    if (type === 'work') {
      const newSkills = [...workSkills];
      newSkills[idx] = value;
      setWorkSkills(newSkills);
    } else {
      const newLang = [...languageSkills];
      if (typeof newLang[idx] === 'string') {
        newLang[idx] = value;
      } else {
        newLang[idx] = { language: value, level: '' }; // simplified
      }
      setLanguageSkills(newLang);
    }
  };

  const handleRemoveSkill = (type: 'work' | 'language', idx: number) => {
    if (type === 'work') {
      const newSkills = workSkills.filter((_, i) => i !== idx);
      setWorkSkills(newSkills);
    } else {
      const newLang = languageSkills.filter((_, i) => i !== idx);
      setLanguageSkills(newLang);
    }
  };

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-gray-50"><div className="animate-pulse flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-blue-500"></div>로딩 중...</div></div>;
  }

  if (!employee && !success) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#E2E8F0] max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={32} />
          </div>
          <h2 className="text-xl font-bold text-[#0F172A] mb-2">대상자를 찾을 수 없습니다</h2>
          <p className="text-sm text-[#64748B] leading-relaxed">
            해당 이메일({email})로 등록된 임직원이 존재하지 않습니다.<br />
            링크를 다시 확인하시거나 관리자에게 문의하세요.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#E2E8F0] max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-bold text-[#0F172A] mb-2">기본 정보 업데이트 완료</h2>
          <p className="text-sm text-[#475569] mb-8">
            소중한 정보 제공에 감사드립니다. 업데이트된 내용은 내부 인사 시스템에 반영되었습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">개인 기본 정보 업데이트</h1>
            <p className="text-[14px] text-[#475569] mt-2">
              <span className="font-bold text-[#334155]">{employee?.name} {employee?.title}</span>님의 인사 정보 최신화를 위한 양식입니다.<br/>
              정확한 이력 관리를 위해 최신 내용으로 작성해 주시기 바랍니다.
            </p>
          </div>
          <div className="text-sm font-medium bg-blue-50 text-blue-700 px-4 py-2 rounded-lg border border-blue-100 flex items-center gap-2">
            <User size={16} />
            {email}
          </div>
        </div>

        {/* Info Edit Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] space-y-8">
          
          <section>
            <h2 className="text-lg font-bold text-[#0F172A] mb-4 flex items-center gap-2">
              <User size={18} className="text-[#3B82F6]" /> 기초 정보
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-[#334155] mb-2">생년월일</label>
                <input 
                  type="date" 
                  value={birthDate} 
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#CBD5E1] rounded-xl text-sm focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none transition-shadow"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#334155] mb-2">당사 입사일</label>
                <input 
                  type="date" 
                  value={joinDate} 
                  onChange={(e) => setJoinDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#CBD5E1] rounded-xl text-sm focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none transition-shadow"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F172A] mb-4 flex items-center gap-2 border-t border-[#E2E8F0] pt-8">
              <Briefcase size={18} className="text-[#3B82F6]" /> 강점 및 보유 스킬
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="flex justify-between items-center mb-4">
                   <label className="block text-sm font-bold text-[#334155]">직무 스킬 (Work Skills)</label>
                   <button onClick={() => handleAddSkill('work')} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors">
                     <Plus size={14} /> 추가
                   </button>
                </div>
                <div className="space-y-3">
                  {workSkills.map((sk, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input 
                        type="text" 
                        value={sk} 
                        onChange={(e) => handleSkillChange('work', idx, e.target.value)}
                        placeholder="예: 프로젝트 매니지먼트"
                        className="flex-1 px-3 py-2 border border-[#CBD5E1] rounded-lg text-sm focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none"
                      />
                      <button onClick={() => handleRemoveSkill('work', idx)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16} /></button>
                    </div>
                  ))}
                  {workSkills.length === 0 && <p className="text-sm text-gray-400">등록된 스킬이 없습니다.</p>}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                   <label className="block text-sm font-bold text-[#334155]">어학 및 기타 스킬 (Language Skills)</label>
                   <button onClick={() => handleAddSkill('language')} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors">
                     <Plus size={14} /> 추가
                   </button>
                </div>
                <div className="space-y-3">
                  {languageSkills.map((sk, idx) => {
                    const skStr = typeof sk === 'string' ? sk : sk?.language || '';
                    return (
                      <div key={idx} className="flex gap-2 items-center">
                        <input 
                          type="text" 
                          value={skStr} 
                          onChange={(e) => handleSkillChange('language', idx, e.target.value)}
                          placeholder="예: 비즈니스 영어 (High)"
                          className="flex-1 px-3 py-2 border border-[#CBD5E1] rounded-lg text-sm focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none"
                        />
                        <button onClick={() => handleRemoveSkill('language', idx)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16} /></button>
                      </div>
                    );
                  })}
                  {languageSkills.length === 0 && <p className="text-sm text-gray-400">등록된 스킬이 없습니다.</p>}
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex justify-between items-center mb-4 border-t border-[#E2E8F0] pt-8">
              <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <History size={18} className="text-[#3B82F6]" /> 이전 경력 사항 (Career History)
              </h2>
              <button 
                onClick={handleAddCareer}
                className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors"
              >
                <Plus size={16} /> 경력 추가
              </button>
            </div>
            
            <div className="space-y-4">
               {careerHistory.map((ch, idx) => (
                 <div key={ch.id || idx} className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl flex flex-col md:flex-row gap-4 relative">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                     <div>
                       <label className="block text-[11px] font-bold text-[#64748B] mb-1 uppercase tracking-wide">직장명</label>
                       <input 
                         type="text" value={ch.companyName} onChange={e => handleCareerChange(idx, 'companyName', e.target.value)}
                         placeholder="회사 이름"
                         className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-sm"
                       />
                     </div>
                     <div>
                       <label className="block text-[11px] font-bold text-[#64748B] mb-1 uppercase tracking-wide">부서 및 직무</label>
                       <input 
                         type="text" value={ch.teamName} onChange={e => handleCareerChange(idx, 'teamName', e.target.value)}
                         placeholder="부서 / 직무"
                         className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-sm"
                       />
                     </div>
                     <div className="flex gap-2">
                       <div className="flex-1">
                          <label className="block text-[11px] font-bold text-[#64748B] mb-1 uppercase tracking-wide">시작일</label>
                          <input 
                            type="text" value={ch.startDate} onChange={e => handleCareerChange(idx, 'startDate', e.target.value)}
                            placeholder="YYYY-MM-DD"
                            className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-sm"
                          />
                       </div>
                       <div className="flex-1">
                          <label className="block text-[11px] font-bold text-[#64748B] mb-1 uppercase tracking-wide">종료일</label>
                          <input 
                            type="text" value={ch.endDate} onChange={e => handleCareerChange(idx, 'endDate', e.target.value)}
                            placeholder="YYYY-MM-DD (또는 현재)"
                            className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-sm"
                          />
                       </div>
                     </div>
                   </div>
                   <button onClick={() => handleRemoveCareer(idx)} className="absolute top-4 right-4 md:static md:self-center text-red-400 hover:text-red-600 p-2">
                     <Trash2 size={18} />
                   </button>
                 </div>
               ))}
               {careerHistory.length === 0 && <p className="text-sm text-gray-400 text-center py-4">등록된 이전 경력이 없습니다. 당사 이전의 경력을 등록해 주세요.</p>}
            </div>
          </section>

          <div className="flex justify-end pt-8">
            <button 
              onClick={handleSave}
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-colors"
            >
              <Save size={18} />
              정보 최종 제출
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
