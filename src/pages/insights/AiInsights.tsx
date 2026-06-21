import React, { useState, useMemo } from 'react';
import { BrainCircuit, AlertTriangle, UserMinus, ShieldAlert, Sparkles, Filter, Search, ChevronRight } from 'lucide-react';
import { salesReps } from '../../data';
import { initialDepartments } from '../../data';

export default function AiInsights() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');

  const filteredReps = salesReps.filter(rep => {
    if (filterDept && !rep.department.includes(filterDept)) return false;
    if (searchTerm && !(rep.name.includes(searchTerm) || rep.role.includes(searchTerm))) return false;
    return true;
  });

  // Calculate AI Risk Metrics
  const riskAnalysis = useMemo(() => {
    return filteredReps.map(rep => {
      let riskScore = 0;
      let riskFactors = [];
      let suggestion = '';

      // Rule 1: KPI drop (Off-track)
      if (rep.kpiTrack === 'Off-Track') {
        riskScore += 40;
        riskFactors.push('최근 성과 목표 미달 (Off-Track)');
      } else if (rep.kpiTrack === 'At-Risk') {
        riskScore += 20;
        riskFactors.push('최근 성과 목표 주의 (At-Risk)');
      }

      // Rule 2: Workload imbalance
      if (rep.workload === '위험') {
        riskScore += 30;
        riskFactors.push('만성적 업무 과부하 (위험)');
      }

      // Rule 3: Coaching/Conflict signals
      if (rep.hasConflictSignal) {
        riskScore += 35;
        riskFactors.push('다면평가 내 관계 갈등 시그널 감지됨');
      }

      // Rule 4: Interview Neglect
      const lastInt = new Date(rep.lastInterviewDate);
      const now = new Date('2026-05-25'); // relative current context date
      const daysSinceInt = (now.getTime() - lastInt.getTime()) / (1000 * 3600 * 24);
      if (daysSinceInt > 45) {
         riskScore += 15;
         riskFactors.push('장기 미면담 (45일 경과)');
      }

      let riskLevel: 'high' | 'medium' | 'low' = 'low';
      if (riskScore >= 70) {
        riskLevel = 'high';
        suggestion = '즉각적인 1:1 케어 면담 및 업무 재배치를 통해 번아웃/퇴사 방지 필요';
      } else if (riskScore >= 40) {
        riskLevel = 'medium';
        suggestion = '리더의 관심 관찰 및 동기부여 코칭 권장';
      } else {
        suggestion = '정상 궤도 유지중, 현재의 성장 페이스 유지 격려';
      }

      return {
        ...rep,
        aiRiskScore: riskScore,
        aiRiskLevel: riskLevel,
        riskFactors,
        suggestion
      };
    }).sort((a, b) => b.aiRiskScore - a.aiRiskScore); // Sort by highest risk
  }, [filteredReps]);

  const highRiskCount = riskAnalysis.filter(r => r.aiRiskLevel === 'high').length;
  const mediumRiskCount = riskAnalysis.filter(r => r.aiRiskLevel === 'medium').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="text-[#6366F1]" size={24} />
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">AI 번아웃 & 퇴사 리스크 분석</h1>
          </div>
          <p className="text-sm text-[#475569] mt-1">HR 평가 데이터(다면/자가)와 영업 성과(KPI/Workload)를 종합하여 고위험군을 사전 예측합니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E2E8F0] flex items-center justify-between">
           <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert size={18} className="text-red-500"/>
                <h3 className="font-bold text-[#475569] text-sm">퇴사/번아웃 [고위험군]</h3>
              </div>
              <div className="text-3xl font-bold text-red-600 mt-2">{highRiskCount}명</div>
           </div>
         </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E2E8F0] flex items-center justify-between">
           <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={18} className="text-orange-500"/>
                <h3 className="font-bold text-[#475569] text-sm">관심 필요 [주의군]</h3>
              </div>
              <div className="text-3xl font-bold text-orange-600 mt-2">{mediumRiskCount}명</div>
           </div>
         </div>
         <div className="bg-gradient-to-br from-[#6366F1] to-[#4F46E5] p-6 rounded-xl shadow-sm flex items-center justify-between text-white">
           <div>
              <div className="flex items-center gap-2 mb-2 opacity-90">
                <Sparkles size={18} />
                <h3 className="font-bold text-sm">AI 종합 인사이트</h3>
              </div>
              <p className="text-sm leading-relaxed mt-2 font-medium">단기 성과 미달과 업무 과부하가 동시에 오는 인원의 퇴사율이 가장 높습니다. 과부하된 파이프라인의 분배가 시급합니다.</p>
           </div>
         </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden mt-8">
        <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row gap-4 items-center justify-between">
           <h3 className="font-bold text-[#0F172A] flex items-center gap-2">리스크 프로파일 목록</h3>
           <div className="flex items-center gap-4 text-sm w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="이름 또는 직무 검색..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6366F1] shadow-sm"
              />
            </div>
            <div className="relative">
              <select
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
                className="pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6366F1] shadow-sm appearance-none bg-white font-medium"
              >
                <option value="">본부 전체</option>
                {initialDepartments[0].teams.map(d => (
                   <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-[#E2E8F0]">
          {riskAnalysis.map((rep) => (
             <div key={rep.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row gap-6">
                <div className="md:w-[250px] shrink-0 border-r border-dashed border-[#E2E8F0] pr-6">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                       <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">{rep.avatar}</div>
                       <div>
                         <div className="font-bold text-[#0F172A] text-base">{rep.name}</div>
                         <div className="text-[11px] text-[#64748B] font-medium">{rep.department} / {rep.role}</div>
                       </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#64748B]">AI 위험지수</span>
                      <span className={`font-bold ${rep.aiRiskLevel === 'high' ? 'text-red-600' : rep.aiRiskLevel === 'medium' ? 'text-orange-600' : 'text-green-600'}`}>
                         {rep.aiRiskScore}점
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                       <div className={`h-1.5 rounded-full ${rep.aiRiskLevel === 'high' ? 'bg-red-500' : rep.aiRiskLevel === 'medium' ? 'bg-orange-400' : 'bg-green-400'}`} style={{ width: `${Math.min(rep.aiRiskScore, 100)}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                   <div>
                     <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2 flex items-center gap-1.5"><AlertTriangle size={14}/> 위험 감지 인자 (Triggers)</h4>
                     <div className="flex flex-wrap gap-2">
                       {rep.riskFactors.length > 0 ? rep.riskFactors.map((factor, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-red-50 text-red-700 font-medium rounded text-[11px] border border-red-100">
                             {factor}
                          </span>
                       )) : (
                          <span className="text-sm text-green-600 font-bold bg-green-50 px-2.5 py-1 rounded">특이사항 없음 (안정적)</span>
                       )}
                     </div>
                   </div>

                   <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-lg relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#6366F1]"></div>
                      <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1 flex items-center gap-1.5"><Sparkles size={14} className="text-[#6366F1]"/> AI 코칭 권고안</h4>
                      <p className="text-sm text-[#0F172A] font-medium leading-relaxed mt-2">{rep.suggestion}</p>
                   </div>
                </div>
             </div>
          ))}
          {riskAnalysis.length === 0 && (
             <div className="py-20 text-center text-gray-400">조회된 인원이 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}
