import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { AIBriefing } from '../../types';

interface Props {
  briefing: AIBriefing;
}

export function AiBriefingWidget({ briefing }: Props) {
  if (!briefing) return null;
  
  return (
    <section className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-2xl p-6 shadow-lg relative overflow-hidden">
      <div className="absolute -right-10 -top-10 opacity-10">
        <Sparkles size={160} />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 text-[#EEF2FF] mb-4">
          <Sparkles size={20} className="text-[#6366F1]" />
          <h2 className="text-base font-bold tracking-tight">AI 주간 브리핑</h2>
          <span className="text-[10px] bg-[#6366F1]/20 text-[#EEF2FF] px-2 py-0.5 rounded-full ml-auto font-mono">
            {briefing.date}
          </span>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed max-w-2xl mb-6">
          {briefing.summary}
        </p>
        <div className="space-y-3">
          {briefing.recommendations.map((rec, idx) => (
            <div key={idx} className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
              <CheckCircle2 size={16} className="text-[#14B8A6] mt-0.5 shrink-0" />
              <span className="text-sm text-gray-200">{rec}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
