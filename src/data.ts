import { SalesRep, ActionItem, AIBriefing, Department } from './types';

export const initialDepartments: Department[] = [
  {
    id: 'd0',
    name: '대표이사',
    teams: []
  },
  {
    id: 'd1',
    name: '스마트러닝1사업본부',
    teams: [
      { id: 't1_1', name: '영업 1팀' },
      { id: 't1_2', name: '영업 2팀' },
    ]
  },
  {
    id: 'd2',
    name: '스마트러닝2사업본부',
    teams: [
      { id: 't2_1', name: '영업 3팀' },
      { id: 't2_2', name: '영업 4팀' },
    ]
  },
  {
    id: 'd3',
    name: '콘텐츠사업본부',
    teams: [
      { id: 't3_1', name: '제작 1팀' },
      { id: 't3_2', name: '제작 2팀' },
    ]
  },
  {
    id: 'd4',
    name: '디지털마케팅본부',
    teams: [
      { id: 't4_1', name: '마케팅 1팀' },
      { id: 't4_2', name: '마케팅 2팀' },
    ]
  },
  {
    id: 'd5',
    name: '경영지원팀',
    teams: []
  },
  {
    id: 'd6',
    name: '교육운영팀',
    teams: []
  },
  {
    id: 'd7',
    name: '기술개발팀',
    teams: []
  },
  {
    id: 'd8',
    name: '교육컨설팅본부',
    teams: [
      { id: 't8_1', name: '컨설팅 1팀' },
    ]
  }
];

export const salesReps: SalesRep[] = [
  {
    id: '1',
    name: '김사라',
    role: 'Enterprise AE',
    department: '스마트러닝1사업본부 영업 1팀',
    avatar: 'SJ',
    kpiScore: 92,
    kpiTrack: 'On-Track',
    workload: '주의',
    pendingTasks: 18,
    growthStage: '전문가',
    coachingNote: '대형 고객사 계정 확장 전략 코칭',
    lastInterviewDate: '2026-04-15',
    nextInterviewDate: '2026-05-30',
    hasConflictSignal: false,
    joinDate: '2021-03-02',
    career: '총력 8년 (해당 직무 5년)',
    careerHistory: [
      { id: 'c1', companyName: 'A 테크', teamName: '엔터프라이즈 영업팀', role: '주임', startDate: '2018-02-01', endDate: '2021-02-28' },
      { id: 'c2', companyName: '당사', teamName: '스마트러닝1사업본부 영업 1팀', role: '대리', startDate: '2021-03-02', endDate: '2025-12-31' },
      { id: 'c3', companyName: '당사', teamName: '스마트러닝1사업본부 영업 1팀', role: '과장', startDate: '2026-01-01', endDate: '현재' },
    ],
    salary: '계약연봉 8,500만원 / 인센티브 별도',
    languageSkills: ['영어 (비즈니스 회화 지원)', '일본어 (JLPT N2)'],
    workSkills: ['Enterprise Sales', 'B2B Negotiation', 'C-Level Pitching', 'Salesforce CRM'],
    prevEvaluations: [
      { year: '2025', grade: 'S', summary: '연간 영업목표 150% 초과 달성 및 핵심 어카운트 연속 수주' },
      { year: '2024', grade: 'A', summary: '목표 달성 및 팀 내 리드멘토 역할 수행 만족' },
    ],
    kpiHistory: [
      { year: '2026', goal: '신규 엔터프라이즈 레퍼런스 3개사 확보', achievement: '현재 1개사 계약 완료', rating: '진행중' },
      { year: '2025', goal: '계산연매출 15억 달성', achievement: '18.5억 달성', rating: '초과달성' },
    ],
    interviews: [
      { date: '2026-04-15', content: '하반기 대형 프로모션 기획안 및 보상 방안 논의' },
      { date: '2026-01-20', content: '2026년 KPI 설정 면담 및 성과급 지급 설명' },
    ],
    specialNotes: [
      { date: '2026-05-10', content: '핵심 인재군. 연말 승진 후보로 검토 필요.' },
      { date: '2026-04-01', content: '스트레스 관리를 위한 장기 리프레시 휴가 권장' }
    ]
  },
  {
    id: '2',
    name: '이민준',
    role: 'Mid-Market AE',
    department: '스마트러닝1사업본부 영업 1팀',
    avatar: 'MJ',
    kpiScore: 68,
    kpiTrack: 'At-Risk',
    workload: '과부하',
    pendingTasks: 25,
    growthStage: '성숙기',
    coachingNote: '파이프라인 관리 및 업무 우선순위 재배분',
    lastInterviewDate: '2026-03-20',
    nextInterviewDate: '2026-05-22',
    hasConflictSignal: true,
    joinDate: '2022-07-01',
    career: '총력 4년 (당사 4년차)',
    careerHistory: [
      { id: 'c4', companyName: '당사', teamName: '스마트러닝1사업본부 영업 2팀', role: '사원', startDate: '2022-07-01', endDate: '2024-12-31' },
      { id: 'c5', companyName: '당사', teamName: '스마트러닝1사업본부 영업 1팀', role: '대리', startDate: '2025-01-01', endDate: '현재', notes: '팀 이동' },
    ],
    salary: '계약연봉 5,200만원',
    languageSkills: ['TOEIC 850'],
    workSkills: ['Inside Sales', 'Pipeline Management', 'Cold Calling'],
    prevEvaluations: [
      { year: '2025', grade: 'B', summary: '개인 목표는 90% 수준이나 부서 협조 및 커뮤니케이션 측면 아쉬움' },
    ],
    kpiHistory: [
      { year: '2026', goal: 'Mid-market 신규 고객 20건', achievement: '현재 5건 확보', rating: '미달' },
    ],
    interviews: [
      { date: '2026-03-20', content: '업무 과부하에 따른 스트레스 호소. 일부 계정 타 팀원에게 이관하기로 합의' },
    ],
    specialNotes: [
      { date: '2026-05-15', content: '최근 다면평가에서 동료와의 갈등 징후 발견. 개별 조율 면담 추진 중.' }
    ]
  },
  {
    id: '3',
    name: '박다인',
    role: 'SMB AE',
    department: '스마트러닝2사업본부 영업 3팀',
    avatar: 'DI',
    kpiScore: 88,
    kpiTrack: 'On-Track',
    workload: '정상',
    pendingTasks: 12,
    growthStage: '성장기',
    coachingNote: '세일즈 주도권 확보를 위한 협상 스킬 강화',
    lastInterviewDate: '2026-05-02',
    nextInterviewDate: '2026-06-15',
    hasConflictSignal: false,
    joinDate: '2025-05-01',
    career: '신입 (1년차)',
    careerHistory: [
      { id: 'c6', companyName: '당사', teamName: '스마트러닝2사업본부 영업 3팀', role: '사원', startDate: '2025-05-01', endDate: '현재' },
    ],
    salary: '계약연봉 4,200만원',
    languageSkills: ['영어 (OPIc AL)'],
    workSkills: ['마케팅 자동화 툴 활용', '프레젠테이션', '데이터 분석'],
    prevEvaluations: [
      { year: '2025', grade: 'A', summary: '빠른 적응 및 기대 이상의 초기 매출 성과 도출' },
    ],
    kpiHistory: [
      { year: '2026', goal: 'SMB 시장 점유율 확대를 위한 신규 리드 100건', achievement: '현재 40건 달성', rating: '진행중' },
    ],
    interviews: [
      { date: '2026-05-02', content: '입사 1년차 온보딩 리뷰. 매우 긍정적인 직무 만족도 확인.' },
    ],
    specialNotes: [
      { date: '2026-05-03', content: '높은 성장 잠재력. 차년도 Mid-Market AE로 롤업 검토.' }
    ]
  },
  {
    id: '4',
    name: '최지훈',
    role: 'Enterprise AE',
    department: '스마트러닝2사업본부 영업 3팀',
    avatar: 'JH',
    kpiScore: 78,
    kpiTrack: '주의',
    workload: '정상',
    pendingTasks: 8,
    growthStage: '성숙기',
    coachingNote: '신규 솔루션 교차 판매 기회 발굴',
    lastInterviewDate: '2026-02-10', // Over 60 days
    nextInterviewDate: null,
    hasConflictSignal: false,
    joinDate: '2024-03-15',
    career: '경력 10년 (당사 2년차)',
    careerHistory: [
      { id: 'c7', companyName: 'B 솔루션', teamName: '전략영업팀', role: '과장', startDate: '2016-03-01', endDate: '2024-02-28' },
      { id: 'c8', companyName: '당사', teamName: '스마트러닝2사업본부 영업 3팀', role: '책임', startDate: '2024-03-15', endDate: '현재' },
    ],
    salary: '계약연봉 9,000만원',
    languageSkills: [],
    workSkills: ['Key Account Management', 'Solution Selling'],
    prevEvaluations: [
      { year: '2025', grade: 'B+', summary: '기존 Account 유지는 원활하나 신규 Cross-sell 부족' }
    ],
    kpiHistory: [
      { year: '2026', goal: 'A사, B사에 대한 신규 솔루션 업셀링', achievement: '제안 단계 진행 중', rating: '진행중' }
    ],
    interviews: [
      { date: '2026-02-10', content: '목표 설정 면담. 기존 고객 유지에 과도한 시간이 투입됨을 토로.' }
    ],
    specialNotes: [
      { date: '2026-05-18', content: '최근 60일 이상 면담 부재. 적극적인 개입과 파이프라인 리뷰가 시급함.' }
    ]
  },
];

export const actionItems: ActionItem[] = [
  {
    id: 'a1',
    trigger: 'Workload',
    title: '이민준 재배분 검토 필요',
    description: '현재 미완료 건수 25건으로 팀 평균(15.7건)의 1.5배 초과 상태',
    targetEmployeeId: '2',
    dueDate: '2026-05-22',
    isCompleted: false,
  },
  {
    id: 'a2',
    trigger: 'Interview',
    title: '최지훈 면담 일정 권장',
    description: '마지막 면담일(2026-02-10) 기준 60일 이상 경과. 파이프라인 리뷰 권고.',
    targetEmployeeId: '4',
    dueDate: '2026-05-25',
    isCompleted: false,
  },
  {
    id: 'a3',
    trigger: 'Conflict',
    title: '이민준 조율 면담 권고',
    description: '다면평가에서 부서 내 협업 관련 징후가 발견되었습니다.',
    targetEmployeeId: '2',
    dueDate: '2026-05-23',
    isCompleted: false,
  }
];

export const aiBriefing: AIBriefing = {
  date: '2026-05-18',
  summary: '본부 전체 KPI 평균은 81.5점으로 양호한 수준이나, 특정 인원에게 업무가 편중되는 경향이 식별되었습니다. 특히 Mid-Market 부문의 병목 현상 해소가 실적 달성의 관건입니다.',
  alertMembers: ['이민준(업무 과부하/KPI 주의)'],
  recommendations: [
    '이민준 대리의 SMB 영업 리드를 박다인 사원에게 3건 이관하여 부하 분산',
    '최지훈 책임의 장기 미면담 건에 대해 이번 주 내 1:1 일정 수립 권장'
  ]
};

export const workloadData = salesReps.map(rep => ({
  name: rep.name,
  tasks: rep.pendingTasks
}));
