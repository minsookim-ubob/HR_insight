import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  teamKpi: {
    avg: number;
    onTrack: number;
    watch: number;
    atRisk: number;
  };
  totalReps: number;
  workloadData: Array<{ name: string; tasks: number }>;
}

export function KpiWorkloadWidget({ teamKpi, totalReps, workloadData }: Props) {
  return (
    <div className="space-y-6">
      {/* KPI Summary Bar */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
         <h2 className="text-sm font-bold text-[#0F172A] mb-4">팀 KPI 요약</h2>
         <div className="flex items-end gap-2 mb-4">
           <span className="text-3xl font-bold tracking-tight text-[#0F172A]">{teamKpi.avg.toFixed(1)}</span>
           <span className="text-sm text-[#94A3B8] font-medium mb-1 border-b border-gray-300 pb-0.5">평균 점수</span>
         </div>
         
         <div className="space-y-3">
           <div className="flex items-center justify-between text-xs font-semibold">
             <span className="flex items-center gap-1.5 text-[#15803d]"><span className="w-2 h-2 rounded-full bg-[#15803d]"></span> On-Track</span>
             <span>{teamKpi.onTrack}명</span>
           </div>
           <div className="flex items-center justify-between text-xs font-semibold">
             <span className="flex items-center gap-1.5 text-[#c2410c]"><span className="w-2 h-2 rounded-full bg-[#c2410c]"></span> 주의</span>
             <span>{teamKpi.watch}명</span>
           </div>
           <div className="flex items-center justify-between text-xs font-semibold">
             <span className="flex items-center gap-1.5 text-[#b91c1c]"><span className="w-2 h-2 rounded-full bg-[#b91c1c]"></span> At-Risk</span>
             <span>{teamKpi.atRisk}명</span>
           </div>
         </div>

         <div className="mt-5 h-2 flex rounded-full overflow-hidden">
           <div style={{ width: `${(teamKpi.onTrack/totalReps)*100}%` }} className="bg-[#15803d]"></div>
           <div style={{ width: `${(teamKpi.watch/totalReps)*100}%` }} className="bg-[#c2410c]"></div>
           <div style={{ width: `${(teamKpi.atRisk/totalReps)*100}%` }} className="bg-[#b91c1c]"></div>
         </div>
      </section>

      {/* Workload Chart */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
         <div className="flex items-center justify-between mb-6">
           <h2 className="text-sm font-bold text-[#0F172A]">업무 부하 분포</h2>
           <span className="text-xs text-[#94A3B8] font-medium">미완료 건수</span>
         </div>
         <div className="h-56 w-full">
           <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData} margin={{ top: 0, right: 0, bottom: -10, left: -25 }} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11, fontWeight: 600}} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11}} />
                <Tooltip 
                  cursor={{fill: '#F1F5F9'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar dataKey="tasks" radius={[4, 4, 0, 0]}>
                  {workloadData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.tasks >= 20 ? '#DC2626' : entry.tasks >= 15 ? '#D97706' : '#6366F1'} />
                  ))}
                </Bar>
              </BarChart>
           </ResponsiveContainer>
         </div>
      </section>
    </div>
  );
}
