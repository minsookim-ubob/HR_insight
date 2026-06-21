import React from 'react';
import { AlertTriangle, Calendar, AlertCircle, Target } from 'lucide-react';
import { SalesRep } from '../../types';
import { dDay, kpiTrack, growthColor, needsInterview } from '../../utils';

interface Props {
  reps: SalesRep[];
}

export function TeamStatusGrid({ reps }: Props) {
  if (!reps || reps.length === 0) return null;
  
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
           팀원 현황
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reps.map(rep => {
          const track = kpiTrack(rep.kpiScore);
          const growth = growthColor(rep.growthStage);
          const intv = dDay(rep.nextInterviewDate);
          const overMng = needsInterview(rep.lastInterviewDate);
          
          return (
            <div key={rep.id} className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm hover:border-[#6366F1]/30 transition-colors group">
              {/* Top Row: Avatar & Name */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${growth.bg} ${growth.text} ring-2 ring-white`}>
                      {rep.avatar}
                    </div>
                    {rep.hasConflictSignal && (
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm" title="갈등/긴장 신호 감지">
                        <AlertTriangle size={12} className="text-[#DC2626]" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#0F172A]">{rep.name}</h3>
                      <span className="text-[10px] text-[#94A3B8] font-medium">{rep.role}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold mt-1 inline-block ${growth.bg} ${growth.text}`}>
                      {rep.growthStage}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-[#94A3B8] font-medium">KPI</span>
                    <span className="text-lg font-bold text-[#0F172A] tracking-tight">{rep.kpiScore}<span className="text-xs text-gray-400 font-normal">점</span></span>
                  </div>
                </div>
              </div>

              {/* Middle row: Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${track.cls}`}>
                  {track.label}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  rep.workload === '과부하' ? 'bg-red-50 text-[#DC2626] border-red-200' : 
                  rep.workload === '주의' ? 'bg-orange-50 text-[#D97706] border-orange-200' : 
                  'bg-gray-50 text-[#475569] border-gray-200'
                }`}>
                  업무 {rep.workload} ({rep.pendingTasks}건)
                </span>
                {intv && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${intv.color} flex items-center gap-1`}>
                    <Calendar size={10} /> 면담 {intv.label}
                  </span>
                )}
                {overMng && !intv && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-50 text-[#DC2626] border-red-200 flex items-center gap-1">
                    <AlertCircle size={10} /> 장기 미면담
                  </span>
                )}
              </div>
              
              {/* Bottom Row: Coaching Note */}
              <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                <div className="flex gap-2">
                  <Target size={14} className="text-[#14B8A6] shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#475569] font-medium leading-relaxed">
                    {rep.coachingNote}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
