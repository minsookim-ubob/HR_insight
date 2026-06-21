import React, { useState, useEffect } from 'react';
import { Target, Save, Calculator, AlertCircle, ArrowRight, Network } from 'lucide-react';
import { initialDepartments } from '../../data';
import { useAuth } from '../../contexts/AuthContext';

export default function TeamKpi() {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<number[]>([2026, 2025, 2024]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [teamGoals, setTeamGoals] = useState<any[]>([]);

  useEffect(() => {
    let templatesStr = localStorage.getItem('kpi_master_templates');
    let years = [2026, 2025, 2024, new Date().getFullYear()];
    if (templatesStr) {
      let templates = JSON.parse(templatesStr);
      years = [...years, ...templates.map((t: any) => t.year)];
    }
    setAvailableYears(Array.from(new Set(years)).sort((a,b) => b - a));

    const savedDepts = localStorage.getItem('master_departments');
    let loaded = [];
    if (savedDepts) {
      loaded = JSON.parse(savedDepts);
    }
    if (!loaded || loaded.length === 0) {
      loaded = initialDepartments;
    }
    setDepartments(loaded);

    if (loaded.length > 0) {
      setSelectedDept(loaded[0].name);
      if (loaded[0].teams && loaded[0].teams.length > 0) {
        setSelectedTeam(loaded[0].teams[0].name);
      }
    }
  }, []);

  useEffect(() => {
    if (!selectedDept || !selectedTeam) return;

    const stored = localStorage.getItem('team_kpis');
    const parsed = stored ? JSON.parse(stored) : [];
    
    // Find goals for this year/dept/team
    const existing = parsed.find((k: any) => k.year === selectedYear && k.department === selectedDept && k.team === selectedTeam);
    
    if (existing) {
      setTeamGoals(existing.items || []);
    } else {
      // Default empty goals
      setTeamGoals([
        { id: `t_kpi_1`, category: '재무', desc: '팀 매출 달성', target: '10억', weight: 40 },
        { id: `t_kpi_2`, category: '비재무', desc: '신규 고객사 발굴', target: '10건', weight: 30 },
        { id: `t_kpi_3`, category: '역량', desc: '팀원 직무역량 교육 수료', target: '100%', weight: 30 }
      ]);
    }
  }, [selectedYear, selectedDept, selectedTeam]);

  const handleGoalChange = (id: string, field: string, value: string | number) => {
    setTeamGoals(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const handleAddGoal = () => {
    setTeamGoals([...teamGoals, { id: `t_kpi_${Date.now()}`, category: '기타', desc: '', target: '', weight: 0 }]);
  };

  const handleRemoveGoal = (id: string) => {
    setTeamGoals(teamGoals.filter(g => g.id !== id));
  };

  const handleSave = () => {
    const totalWeight = teamGoals.reduce((acc, curr) => acc + Number(curr.weight), 0);
    if (totalWeight !== 100) {
      alert(`가중치 합이 100이 아닙니다 (현재 ${totalWeight}). 100으로 맞춰주세요.`);
      return;
    }

    const stored = localStorage.getItem('team_kpis');
    const parsed = stored ? JSON.parse(stored) : [];
    
    const existingIdx = parsed.findIndex((k: any) => k.year === selectedYear && k.department === selectedDept && k.team === selectedTeam);
    
    const newKpi = {
      id: `tkpi_${selectedYear}_${selectedDept}_${selectedTeam}`,
      year: selectedYear,
      department: selectedDept,
      team: selectedTeam,
      items: teamGoals,
      updatedAt: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      parsed[existingIdx] = newKpi;
    } else {
      parsed.push(newKpi);
    }
    
    localStorage.setItem('team_kpis', JSON.stringify(parsed));
    alert('팀/본부 조직 KPI가 안전하게 저장/하달되었습니다.');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
                <Network className="text-indigo-600" size={26} />
                조직 (팀/본부) KPI 목표 하달 및 배분
             </h1>
          </div>
          <p className="text-sm text-[#475569] mt-2">상위 조직의 KPI 목표를 설정하여, 팀원들이 개인 목표 수립 시 참조(Align)할 수 있도록 하달합니다.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={handleAddGoal} className="px-4 py-2 bg-white border border-[#E2E8F0] shadow-sm font-bold text-sm rounded-lg hover:bg-gray-50 flex items-center gap-1.5 focus:outline-none transition">
             항목 추가
          </button>
          <button onClick={handleSave} className="px-5 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg shadow-sm hover:bg-indigo-700 flex items-center gap-1.5 focus:outline-none transition">
            <Save size={16}/> 목록 저장 및 팀원 대상 하달 (배포)
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
         <div className="flex flex-wrap gap-4 items-center">
            <div className="flex flex-col gap-1 w-full sm:w-auto">
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">대상 연도</label>
               <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm font-bold text-[#0F172A] focus:outline-none focus:border-indigo-500"
               >
                  {availableYears.map(y => <option key={y} value={y}>{y}년</option>)}
               </select>
            </div>
            
            <div className="flex flex-col gap-1 w-full sm:w-auto">
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">본부 선택</label>
               <select 
                  value={selectedDept} 
                  onChange={(e) => {
                     setSelectedDept(e.target.value);
                     const d = departments.find(dp => dp.name === e.target.value);
                     if (d && d.teams.length > 0) {
                        setSelectedTeam(d.teams[0].name);
                     } else {
                        setSelectedTeam('');
                     }
                  }}
                  className="px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm font-bold text-[#0F172A] focus:outline-none focus:border-indigo-500 min-w-[150px]"
               >
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
               </select>
            </div>

            <div className="flex flex-col gap-1 w-full sm:w-auto">
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">팀 선택</label>
               <select 
                  value={selectedTeam} 
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm font-bold text-[#0F172A] focus:outline-none focus:border-indigo-500 min-w-[150px]"
               >
                  {departments.find(d => d.name === selectedDept)?.teams.map((t: any) => <option key={t.id} value={t.name}>{t.name}</option>)}
               </select>
            </div>
         </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
         <div className="p-4 border-b border-[#E2E8F0] bg-slate-50 flx items-center">
            <h3 className="font-bold text-[#0F172A]">{selectedDept} {selectedTeam ? `> ${selectedTeam}` : ''} 조직 KPI</h3>
         </div>
         <table className="w-full text-left text-sm text-[#0F172A]">
            <thead className="bg-[#F1F5F9] border-b border-[#E2E8F0] font-bold text-[#475569] uppercase tracking-wider text-xs">
               <tr>
                  <th className="px-4 py-3 w-40">분류 (카테고리)</th>
                  <th className="px-4 py-3">조직 목표 상세 내용</th>
                  <th className="px-4 py-3 w-40">목표 수치/상태</th>
                  <th className="px-4 py-3 w-24 text-center">가중치(%)</th>
                  <th className="px-4 py-3 w-20 text-center text-red-500">삭제</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
               {teamGoals.map(goal => (
                  <tr key={goal.id} className="hover:bg-slate-50 transition-colors">
                     <td className="px-4 py-3">
                        <select 
                           value={goal.category} 
                           onChange={e => handleGoalChange(goal.id, 'category', e.target.value)}
                           className="w-full px-2 py-1.5 border border-[#E2E8F0] bg-white rounded text-sm focus:outline-none focus:border-indigo-500"
                        >
                           <option value="재무">재무</option>
                           <option value="비재무">비재무</option>
                           <option value="역량">역량</option>
                           <option value="기여">기여/문화</option>
                           <option value="기타">기타</option>
                        </select>
                     </td>
                     <td className="px-4 py-3">
                        <input 
                           type="text" 
                           value={goal.desc} 
                           onChange={e => handleGoalChange(goal.id, 'desc', e.target.value)}
                           placeholder="예) 신규 매출액 50억 달성 창출"
                           className="w-full px-3 py-1.5 border border-[#E2E8F0] bg-white rounded text-sm focus:outline-none focus:border-indigo-500"
                        />
                     </td>
                     <td className="px-4 py-3">
                        <input 
                           type="text" 
                           value={goal.target} 
                           onChange={e => handleGoalChange(goal.id, 'target', e.target.value)}
                           placeholder="예) 50억"
                           className="w-full px-3 py-1.5 border border-[#E2E8F0] bg-white rounded text-sm focus:outline-none focus:border-indigo-500 font-bold text-center"
                        />
                     </td>
                     <td className="px-4 py-3">
                        <input 
                           type="number" 
                           value={goal.weight} 
                           onChange={e => handleGoalChange(goal.id, 'weight', Number(e.target.value))}
                           className="w-full px-2 py-1.5 border border-[#E2E8F0] bg-white rounded text-sm focus:outline-none focus:border-indigo-500 text-center font-bold text-indigo-600"
                        />
                     </td>
                     <td className="px-4 py-3 text-center">
                        <button onClick={() => handleRemoveGoal(goal.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded transition">삭제</button>
                     </td>
                  </tr>
               ))}
               {teamGoals.length === 0 && (
                  <tr>
                     <td colSpan={5} className="p-8 text-center text-slate-400">설정된 부서(팀) KPI가 없습니다. 항목을 추가해주세요.</td>
                  </tr>
               )}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t border-[#E2E8F0]">
               <tr>
                  <td colSpan={3} className="px-4 py-4 text-right text-slate-500">가중치 합계:</td>
                  <td className={`px-4 py-4 text-center text-lg ${teamGoals.reduce((a,c) => a + Number(c.weight), 0) === 100 ? 'text-emerald-500' : 'text-red-500'}`}>
                     {teamGoals.reduce((a,c) => a + Number(c.weight), 0)}%
                  </td>
                  <td></td>
               </tr>
            </tfoot>
         </table>
      </div>
      
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-sm text-emerald-800 flex items-start gap-3">
         <AlertCircle size={20} className="shrink-0 mt-0.5" />
         <div>
            <h4 className="font-bold mb-1">조직 KPI 하달 가이드</h4>
            <p className="text-sm leading-relaxed opacity-90">
               이 화면에서 설정된 <strong>{selectedDept} {selectedTeam ? `> ${selectedTeam}` : ''}</strong> 조직의 KPI 목표는 소속 인원들이 <strong>`[KPI 목표관리(개인)]`</strong> 화면 접속 시 상단에 가이드로 표시되며, 전사 사업 목표와 개인의 업무 목표간의 얼라인먼트 (Alignment) 를 제고하는데 사용됩니다.
            </p>
         </div>
      </div>
    </div>
  );
}
