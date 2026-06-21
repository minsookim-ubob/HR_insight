import { differenceInDays, parseISO } from 'date-fns';
import { SalesRep } from './types';

export function dDay(dateStr: string | null) {
  if (!dateStr) return null;
  const today = new Date();
  const targetDate = parseISO(dateStr);
  const diff = differenceInDays(targetDate, today);
  
  const urgent = diff >= 0 && diff <= 3;
  const soon = diff > 3 && diff <= 7;
  const past = diff < 0;

  let color = 'text-gray-500 bg-gray-100';
  if (urgent) color = 'text-red-700 bg-red-100 border-red-200';
  else if (soon) color = 'text-orange-700 bg-orange-100 border-orange-200';
  else if (past) color = 'text-red-700 bg-red-100 border-red-200';

  return {
    label: past ? `D+${Math.abs(diff)}` : `D-${diff}`,
    color,
    urgent,
    soon,
    past,
    diff
  };
}

export function kpiTrack(score: number) {
  if (score >= 85) return { label: 'On-Track', cls: 'bg-green-100 text-green-700 border-green-200', color: '#15803d' };
  if (score >= 70) return { label: '주의', cls: 'bg-orange-100 text-orange-700 border-orange-200', color: '#c2410c' };
  return { label: 'At-Risk', cls: 'bg-red-100 text-red-700 border-red-200', color: '#b91c1c' };
}

export function growthColor(stage: SalesRep['growthStage']) {
  switch (stage) {
    case '신입기': return { bg: 'bg-purple-100', text: 'text-purple-700', hex: '#8B5CF6' };
    case '성장기': return { bg: 'bg-indigo-100', text: 'text-indigo-700', hex: '#6366F1' };
    case '성숙기': return { bg: 'bg-teal-100', text: 'text-teal-700', hex: '#0D9488' };
    case '전문가': return { bg: 'bg-amber-100', text: 'text-amber-700', hex: '#D97706' };
    default: return { bg: 'bg-gray-100', text: 'text-gray-700', hex: '#6B7280' };
  }
}

export function needsInterview(lastDate: string | null) {
  if (!lastDate) return true;
  const diff = differenceInDays(new Date(), parseISO(lastDate));
  return diff >= 60;
}
