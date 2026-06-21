import { useMemo } from 'react';
import { salesReps, actionItems, aiBriefing, workloadData } from '../data';

// Data fetching abstraction (Mocking a real API or Store)
export function useDashboardData() {
  const activeActions = useMemo(() => actionItems.filter(i => !i.isCompleted), []);
  
  const teamKpi = useMemo(() => {
    const avg = salesReps.reduce((sum, rep) => sum + rep.kpiScore, 0) / salesReps.length;
    const onTrack = salesReps.filter(r => r.kpiScore >= 85).length;
    const watch = salesReps.filter(r => r.kpiScore >= 70 && r.kpiScore < 85).length;
    const atRisk = salesReps.filter(r => r.kpiScore < 70).length;
    return { avg, onTrack, watch, atRisk };
  }, []);

  return {
    activeActions,
    teamKpi,
    salesReps,
    aiBriefing,
    workloadData
  };
}
