import React, { useState } from 'react';
import { Activity, Clock, Briefcase, Filter, Search, TrendingUp, AlertTriangle } from 'lucide-react';
import { salesReps } from '../../data';
import { initialDepartments } from '../../data';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function Workload() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');

  const filteredReps = salesReps.filter(rep => {
    if (filterDept && !rep.department.includes(filterDept)) return false;
    if (searchTerm && !(rep.name.includes(searchTerm) || rep.role.includes(searchTerm))) return false;
    return true;
  });

  const avgPendingTasks = filteredReps.length > 0 ? (filteredReps.reduce((acc, curr) => acc + curr.pendingTasks, 0) / filteredReps.length).toFixed(1) : 0;
  const criticalCount = filteredReps.filter(r => r.workload === '위험').length;
  const warningCount = filteredReps.filter(r => r.workload === '주의').length;
  const optimalCount = filteredReps.filter(r => r.workload === '적정').length;

  // Chart Data: Workload distribution
  const workloadDist = [
    { name: '위험 (Overload)', count: criticalCount, fill: '#EF4444' },
    { name: '주의 (Warning)', count: warningCount, fill: '#F59E0B' },
    { name: '적정 (Optimal)', count: optimalCount, fill: '#10B981' },
  ];

  const getWorkloadBadge = (status: string) => {
    switch(status) {
      case '위험': return <span className="px-2 py-1 bg-red-50 text-red-700 font-bold rounded-md text-[11px] shadow-sm flex items-center gap-1 w-fit"><AlertTriangle size={12}/> 위험</span>;
      case '주의': return <span className="px-2 py-1 bg-orange-50 text-orange-700 font-bold rounded-md text-[11px] shadow-sm flex items-center gap-1 w-fit"><Activity size={12}/> 주의</span>;
      case '적정': return <span className="px-2 py-1 bg-green-50 text-green-700 font-bold rounded-md text-[11px] shadow-sm flex items-center gap-1 w-fit"><TrendingUp size={12}/> 적정</span>;
      default: return null;
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">업무 부하 현황</h1>
          <p className="text-sm text-[#475569] mt-1">세일즈 파이프라인 볼륨과 개별 임직원의 업무 소화량을 대비하여 분석합니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center"><Briefcase size={16}/></div>
              <h3 className="font-bold text-[#475569] text-sm">인당 평균 진행 과제/Deals</h3>
            </div>
            <div className="text-3xl font-bold text-[#0F172A] mt-2">{avgPendingTasks}건</div>
         </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center"><AlertTriangle size={16}/></div>
              <h3 className="font-bold text-[#475569] text-sm">부하 위험 (Critical)</h3>
            </div>
            <div className="text-3xl font-bold text-red-600 mt-2">{criticalCount}명</div>
         </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center"><Activity size={16}/></div>
              <h3 className="font-bold text-[#475569] text-sm">부하 주의 (Warning)</h3>
            </div>
            <div className="text-3xl font-bold text-orange-600 mt-2">{warningCount}명</div>
         </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><TrendingUp size={16}/></div>
              <h3 className="font-bold text-[#475569] text-sm">적정 업무량 (Optimal)</h3>
            </div>
            <div className="text-3xl font-bold text-green-600 mt-2">{optimalCount}명</div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E2E8F0]">
          <h3 className="font-bold text-[#0F172A] mb-4">현재 부하율 요약 (팀 전체)</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={workloadDist} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 500, fill: '#64748B' }} width={120}/>
                <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontWeight: 'bold' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden mt-8">
        <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row gap-4 items-center justify-between">
           <h3 className="font-bold text-[#0F172A] flex items-center gap-2"><Clock size={16} className="text-[#6366F1]"/> 개별 업무 점유율 목록</h3>
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
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/50 border-b border-[#E2E8F0] text-[#64748B] font-bold">
            <tr>
              <th className="px-6 py-4">이름 / 조직</th>
              <th className="px-6 py-4">직무</th>
              <th className="px-6 py-4">진행 중인 과제/Deals</th>
              <th className="px-6 py-4">부하율 진단</th>
              <th className="px-6 py-4">권장 조치</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {filteredReps.map(rep => (
              <tr key={rep.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-[#0F172A] flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">{rep.avatar}</div>
                    <div>
                      {rep.name}
                      <div className="text-[11px] text-[#64748B] font-medium">{rep.department}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-[#475569] font-medium">{rep.role}</td>
                <td className="px-6 py-4 font-bold text-[#0F172A]">
                  {rep.pendingTasks} 건
                </td>
                <td className="px-6 py-4">
                   {getWorkloadBadge(rep.workload)}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-[#475569]">
                   {rep.workload === '위험' && '팀 내 업무 재배치 및 지원 인력 투입 요망'}
                   {rep.workload === '주의' && '파이프라인 우선순위 조정 면담 권고'}
                   {rep.workload === '적정' && '정상 진행중 (추가 과제 수용 가능성 확인)'}
                </td>
              </tr>
            ))}
            {filteredReps.length === 0 && (
              <tr><td colSpan={5} className="py-10 text-center text-gray-400">조회된 인원이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
