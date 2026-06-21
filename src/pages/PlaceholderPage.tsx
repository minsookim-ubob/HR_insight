import React from 'react';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center shadow-sm">
      <div className="w-16 h-16 bg-[#EEF2FF] rounded-2xl flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">🚧</span>
      </div>
      <h2 className="text-lg font-bold text-[#0F172A] mb-2">{title}</h2>
      <p className="text-[#94A3B8] text-sm">해당 기능은 현재 개발 중입니다.</p>
    </div>
  );
}
