import React from 'react';
import { CheckCircle2, Zap } from 'lucide-react';
import { ActionItem } from '../../types';

interface Props {
  items: ActionItem[];
}

export function ActionInboxWidget({ items }: Props) {
  if (!items || items.length === 0) return null;
  
  return (
    <section>
      <h2 className="text-sm font-bold text-[#0F172A] mb-4 flex items-center gap-2">
        <Zap size={16} className="text-[#D97706]" />
        Action Inbox <span className="text-[#94A3B8] font-normal">({items.length})</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#D97706]"></div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-[#D97706] tracking-wide">
                {item.trigger}
              </span>
              <span className="text-xs text-[#94A3B8] font-medium">{item.dueDate}</span>
            </div>
            <h3 className="text-[15px] font-bold text-[#0F172A] mb-1 leading-tight">{item.title}</h3>
            <p className="text-xs text-[#475569] leading-relaxed mb-4 line-clamp-2">{item.description}</p>
            <button className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-gray-50 hover:bg-orange-50 hover:text-[#D97706] text-[#475569] text-xs font-semibold rounded-lg transition-colors border border-gray-100 hover:border-orange-200">
              <CheckCircle2 size={14} /> 바로 실행하기
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
