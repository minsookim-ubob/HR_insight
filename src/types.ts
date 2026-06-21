export type RiskStatus = 'Safe' | 'Watch' | 'Alert' | 'Critical';
export type WorkloadLevel = '정상' | '적정' | '주의' | '과부하' | '위험';
export type GrowthStage = '신입기' | '성장기' | '성숙기' | '전문가';
export type KpiTrack = 'On-Track' | '주의' | 'At-Risk' | 'Off-Track';

export type KpiApprovalStatus = 'Draft' | 'Submitted' | 'TeamLeader_Approved' | 'DivisionHead_Approved' | 'Rejected';

export interface KpiTemplateItem {
  id: string;
  category: string; // 구분 (e.g., 재무성과)
  itemDesc: string; // 평가항목 (e.g., 팀매출)
  detailGoal: string; // 상세목표내용 가이드
  weight: number; // 가중치
  targetValue?: number | string; // 연간목표 (마스터 템플릿 기본값)
  evalMethod: '정량' | '정성';
  unit: string;
  calcFormula: string; // 텍스트 형태의 산출식 표기용
  evalCriteria: { ex: number; vg: number; gd: number; ni: number; un: number; }; // % 기준
  notes: string; // 지표 정의 및 세부내용
}

export interface KpiTemplate {
  id: string;
  year: number;
  title: string;
  items: KpiTemplateItem[];
}

export interface UserKpiItem extends KpiTemplateItem {
  targetValue: number; // 연간목표
  actualValue: number; // 실적
  score: number; // 산출점수
  // Evaluation extensions
  selfComment?: string; // 자가 의견
  selfGrade?: 'S' | 'A' | 'B' | 'C' | 'D'; // 자가 평가 등급
  leaderComment?: string; // 1차 평가자(팀장) 의견
  leaderGrade?: 'S' | 'A' | 'B' | 'C' | 'D'; // 1차 평가자(팀장) 등급
  leaderScore?: number; // 1차 평가자(팀장) 점수 (0-100)
  directorComment?: string; // 2차 평가자(본부장) 의견
  directorGrade?: 'S' | 'A' | 'B' | 'C' | 'D'; // 2차 평가자(본부장) 등급
  directorScore?: number; // 2차 평가자(본부장) 점수 (0-100)
}

export interface UserKpi {
  id: string;
  userId: string;
  userName: string;
  department: string;
  year: number;
  items: UserKpiItem[];
  status: KpiApprovalStatus;
  totalScore: number;
  submittedAt?: string;
  approvedAt?: string;
  expiresAt?: number;
  rejectionReason?: string;
  lastRequestedAt?: string;
  lastRemindedAt?: string;
  modificationHistory?: { date: string; reason: string }[];
  // Evaluation status flow
  evalStatus?: 'None' | 'Self_Draft' | 'Self_Submitted' | 'Leader_Approved' | 'Director_Approved' | 'Eval_Revision_Requested';
  evalSubmittedAt?: string;
  evalLeaderApprovedAt?: string;
  evalDirectorApprovedAt?: string;
  evalRejectionReason?: string;
  finalGrade?: 'S' | 'A' | 'B' | 'C' | 'D';
  finalScore?: number;
  sessionId?: string;
  selfReflection?: string;
  leaderOverallComment?: string;
  directorOverallComment?: string;
  directorScoreAdjustment?: number;
}

export interface Team {
  id: string;
  name: string;
}

export interface Department {
  id: string;
  name: string;
  teams: Team[];
}

export interface SalesRep {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
  kpiScore: number;
  kpiTrack: KpiTrack;
  workload: WorkloadLevel;
  pendingTasks: number;
  growthStage: GrowthStage;
  coachingNote: string;
  lastInterviewDate: string | null;
  nextInterviewDate: string | null;
  hasConflictSignal: boolean;
  birthDate?: string;
  joinDate?: string;
  email?: string;
  employmentType?: '정규직' | '계약직';
  title?: string;
  career?: string;
  careerHistory?: { id: string; companyName: string; teamName: string; role: string; rank?: string; startDate: string; endDate: string; notes?: string; }[];
  salary?: string;
  salaryUpdatedAt?: string;
  languageSkills?: any[];
  workSkills?: any[];
  oaSkills?: any[];
  techSkills?: any[];
  status?: '재직중' | '휴직중' | '퇴직' | '퇴사';
  statusHistory?: any[];
  leaveStartDate?: string;
  leaveEndDate?: string;
  leaveReason?: string;
  resignationDate?: string;
  prevEvaluations?: { year: string; grade: string; summary: string }[];
  kpiHistory?: { year: string; goal: string; achievement: string; rating: string; progress?: number; }[];
  dataHistory?: { date: string; message: string; }[];
  interviews?: { id?: string; date: string; content: string; status?: 'active' | 'deleted' }[];
  specialNotes?: { date: string; content: string }[];
}

export interface ActionItem {
  id: string;
  trigger: 'KPI' | 'Workload' | 'Conflict' | 'Interview' | 'Self';
  title: string;
  description: string;
  targetEmployeeId?: string;
  dueDate: string;
  isCompleted: boolean;
}

export interface AIBriefing {
  date: string;
  summary: string;
  alertMembers: string[];
  recommendations: string[];
}
