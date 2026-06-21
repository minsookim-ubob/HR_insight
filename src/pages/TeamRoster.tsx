import React, { useState, useMemo } from "react";
import { salesReps as initialSalesReps, initialDepartments } from "../data";
import { growthColor } from "../utils";
import {
  User,
  Briefcase,
  DollarSign,
  Award,
  Target,
  MessageSquare,
  StickyNote,
  Languages,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Edit2,
  Plus,
  Filter,
  Trash2,
  Search,
  History,
  BarChart2,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { SalesRep, Department } from "../types";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import SkillsEditModal from "../components/SkillsEditModal";
import CareerEditModal from "../components/CareerEditModal";
import { UserService } from "../services/UserService";
import { decryptData } from "../utils/encryption";
import {
  ComposedChart,

  Bar,
  Legend,
  LabelList,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function calculateTotalCareer(history?: { startDate: string; endDate: string }[]): string {
  if (!history || history.length === 0) return "0년 0개월";
  let totalMonths = 0;
  history.forEach(h => {
    if (!h.startDate) return;
    const start = new Date(h.startDate);
    const end = h.endDate ? new Date(h.endDate) : new Date();
    if (!isNaN(end.getTime()) && !isNaN(start.getTime()) && end > start) {
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      totalMonths += months;
    }
  });
  
  if (totalMonths === 0) return "0년 0개월";
  const years = Math.floor(totalMonths / 12);
  const remainingMonths = totalMonths % 12;
  return `${years > 0 ? years + "년 " : ""}${remainingMonths}개월`;
}

function calculateTenure(joinDate?: string): string {
  if (!joinDate) return "-";
  const start = new Date(joinDate);
  const end = new Date();
  if (isNaN(start.getTime()) || start > end) return "-";
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (months === 0) return "1개월 미만";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return `${years > 0 ? years + "년 " : ""}${remainingMonths}개월`;
}

export default function TeamRoster() {
  const { user } = useAuth();
  const ORDERED_DEPTS = [
    "대표이사",
    "스마트러닝1사업본부",
    "스마트러닝2사업본부",
    "콘텐츠사업본부",
    "디지털마케팅본부",
    "경영지원팀",
    "교육운영팀",
    "기술개발팀",
    "교육컨설팅본부",
    "기타",
  ];

  const getBaseDept = (department: string) => {
    const parts = department.split(" ");
    const base = parts[0] || "기타";
    if (ORDERED_DEPTS.includes(base)) return base;

    if (base.includes("영업본부")) return "스마트러닝1사업본부";
    if (base.includes("마케팅본부")) return "디지털마케팅본부";
    if (base.includes("경영지원본부") || base.includes("경영지원"))
      return "경영지원팀";

    return "기타";
  };

  const [repsData, setRepsData] = useState<SalesRep[]>(() => {
    try {
      const savedMaster = localStorage.getItem("master_employees");
      const savedRoster = localStorage.getItem("team_roster_data");
      let rosterList: SalesRep[] = [];
      if (savedRoster) {
        try {
          rosterList = JSON.parse(savedRoster);
        } catch (e) {
          console.error(e);
        }
      }

      if (savedMaster) {
        const masterEmployees = JSON.parse(savedMaster);
        return masterEmployees.map((emp: any) => {
          const rawDept = emp.team
            ? `${emp.department} ${emp.team}`
            : emp.department;
          const mappedBase = getBaseDept(rawDept);
          const team = rawDept.replace(rawDept.split(" ")[0], "").trim();
          const normalizedDept = [mappedBase, team].filter(Boolean).join(" ");

          // Find rich details by ID or Name match
          const existingRoster = rosterList.find((r: SalesRep) => r.id === emp.id || r.name === emp.name);
          const existingInitial = initialSalesReps.find((r: SalesRep) => r.id === emp.id || r.name === emp.name);

          return {
            id: emp.id,
            name: emp.name,
            department: normalizedDept,
            role: emp.role || existingRoster?.role || existingInitial?.role || "직급없음",
            title: emp.rank || existingRoster?.title || existingInitial?.title || "선임",
            email: emp.email || existingRoster?.email || existingInitial?.email || "",
            employmentType: emp.employmentType || existingRoster?.employmentType || existingInitial?.employmentType || "정규직",
            avatar: emp.name ? emp.name.charAt(0) : "👤",
            kpiScore: existingRoster?.kpiScore ?? existingInitial?.kpiScore ?? 85,
            kpiTrack: existingRoster?.kpiTrack ?? existingInitial?.kpiTrack ?? "On-Track",
            workload: existingRoster?.workload ?? existingInitial?.workload ?? "정상",
            pendingTasks: existingRoster?.pendingTasks ?? existingInitial?.pendingTasks ?? 5,
            growthStage: existingRoster?.growthStage ?? existingInitial?.growthStage ?? "성장기",
            coachingNote: existingRoster?.coachingNote ?? existingInitial?.coachingNote ?? "",
            lastInterviewDate: existingRoster?.lastInterviewDate ?? existingInitial?.lastInterviewDate ?? null,
            nextInterviewDate: existingRoster?.nextInterviewDate ?? existingInitial?.nextInterviewDate ?? null,
            hasConflictSignal: existingRoster?.hasConflictSignal ?? existingInitial?.hasConflictSignal ?? false,
            
            // Rich biographical and historical details
            birthDate: emp.birthDate || existingRoster?.birthDate || existingInitial?.birthDate || "1990-01-01",
            joinDate: emp.joinDate || existingRoster?.joinDate || existingInitial?.joinDate || "2024-01-01",
            career: emp.career || existingRoster?.career || existingInitial?.career || "경력형 팀원",
            salary: emp.salary || existingRoster?.salary || existingInitial?.salary || "계약연봉 5,000만원",
            careerHistory: existingRoster?.careerHistory ?? existingInitial?.careerHistory ?? [
              { id: `ch_${Date.now()}`, companyName: "당사", teamName: normalizedDept, role: emp.role || "팀원", startDate: "2024-01-01", endDate: "현재" }
            ],
            languageSkills: existingRoster?.languageSkills ?? existingInitial?.languageSkills ?? ["영어 회화 기본"],
            workSkills: existingRoster?.workSkills ?? existingInitial?.workSkills ?? ["문서 작성", "협업 툴 활용"],
            prevEvaluations: existingRoster?.prevEvaluations ?? existingInitial?.prevEvaluations ?? [
              { year: "2025", grade: "A", summary: "성실성이 강조되며 소속 부서 내 기여도가 높음." }
            ],
            kpiHistory: existingRoster?.kpiHistory ?? existingInitial?.kpiHistory ?? [
              { year: "2026", goal: "부서 목표 달성 지원", achievement: "정상 추진 중", rating: "진행중", progress: 75 }
            ],
            interviews: existingRoster?.interviews ?? existingInitial?.interviews ?? [
              { date: "2026-04-10", content: "최근 직무 만족도 체크. 양호함" }
            ],
            specialNotes: existingRoster?.specialNotes ?? existingInitial?.specialNotes ?? [],
            dataHistory: existingRoster?.dataHistory ?? existingInitial?.dataHistory ?? [],
            
            // Status info directly from the master registry
            status: emp.status || "재직중",
            statusHistory: emp.statusHistory || [],
          };
        });
      }
      return initialSalesReps;
    } catch (e) {
      return initialSalesReps;
    }
  });

  React.useEffect(() => {
    localStorage.setItem("team_roster_data", JSON.stringify(repsData));
  }, [repsData]);

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  React.useEffect(() => {
    async function loadFromDB() {
      try {
        setIsSyncing(true);
        const fbUsersRaw = await UserService.getAllUsers();
        const fbUsers = fbUsersRaw.map(u => ({
           ...u,
           birthDate: u.birthDate ? decryptData(u.birthDate) || u.birthDate : u.birthDate,
           careerHistory: u.careerHistory ? JSON.parse(decryptData(u.careerHistory) || '[]') : u.careerHistory,
           workSkills: u.workSkills ? JSON.parse(decryptData(u.workSkills) || '[]') : u.workSkills,
           languageSkills: u.languageSkills ? JSON.parse(decryptData(u.languageSkills) || '[]') : u.languageSkills,
        }));
        
        if (fbUsers.length > 0) {
          localStorage.setItem("master_employees", JSON.stringify(fbUsers));
          
          setRepsData(prev => {
             const updated = fbUsers.map(u => {
               const emp = u as any;
               const rawDept = emp.team ? `${emp.department} ${emp.team}` : emp.department;
               const mappedBase = getBaseDept(rawDept);
               const teamStr = rawDept.replace(rawDept.split(" ")[0], "").trim();
               const normalizedDept = [mappedBase, teamStr].filter(Boolean).join(" ");
               
               const existing = prev.find(p => p.id === emp.id || p.name === emp.name) || {};
               
               return {
                 ...existing,
                 id: emp.id,
                 name: emp.name,
                 department: normalizedDept,
                 role: emp.role || existing.role || "직급없음",
                 title: emp.rank || existing.title || "선임",
                 email: emp.email || existing.email || "",
                 employmentType: emp.employmentType || existing.employmentType || "정규직",
                 status: emp.status || "재직중",
                 statusHistory: emp.statusHistory || [],
                 birthDate: (emp as any).birthDate || existing.birthDate || "1990-01-01",
                 joinDate: (emp as any).joinDate || existing.joinDate || "2024-01-01",
                 career: (emp as any).career || existing.career || "경력형 팀원",
                 salary: (emp as any).salary || existing.salary || "계약연봉 5,000만원"
               } as SalesRep;
             });
             localStorage.setItem("team_roster_data", JSON.stringify(updated));
             return updated;
          });
        }
      } catch (err) {
        console.error("DB Sync error", err);
      } finally {
        setIsSyncing(false);
      }
    }
    loadFromDB();
  }, []);
  const [selectedRepId, setSelectedRepId] = useState<string>("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
  const [isCareerModalOpen, setIsCareerModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<SalesRep>>({});
  const navigate = useNavigate();
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  const handleSearch = () => {
    if (filteredReps.length > 0 && searchQuery) {
      setSelectedRepId(filteredReps[0].id);
      setSearchQuery(filteredReps[0].name);
      setShowDropdown(false);
    }
  };

  const uniqueDepartments = useMemo(() => {
    return ORDERED_DEPTS;
  }, []);

  const trendData = useMemo(() => {
    const now = new Date();
    const result = [];

    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = `${d.getMonth() + 1}월`;

      const monthData: any = { month: monthLabel, total: 0 };

      uniqueDepartments.forEach((deptName) => {
        const currentCount = repsData.filter(
          (r) => getBaseDept(r.department) === deptName,
        ).length;
        const variance = i === 0 ? 0 : -((deptName.length + i) % 2);
        const count = Math.max(0, currentCount + variance);
        monthData[deptName] = count;
        monthData.total += count;
      });

      result.push(monthData);
    }
    return result;
  }, [repsData, uniqueDepartments]);

  const masterDepts = useMemo(() => {
    const savedDepts = localStorage.getItem("master_departments");
    if (savedDepts) {
      try {
        const parsed = JSON.parse(savedDepts);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return initialDepartments;
  }, []);

  const availableDepartmentOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    masterDepts.forEach((d: Department) => {
      if (d.teams && d.teams.length > 0) {
        d.teams.forEach(t => {
          const combo = `${d.name} ${t.name}`.trim();
          options.push({ value: combo, label: combo });
        });
      } else {
        options.push({ value: d.name, label: d.name });
      }
    });
    return options;
  }, [masterDepts]);

  const headcountStats = useMemo(() => {

    const savedDepts = localStorage.getItem("master_departments");
    let masterDepts: Department[] = [];
    if (savedDepts) {
      try {
        masterDepts = JSON.parse(savedDepts);
      } catch (e) {
        console.error(e);
      }
    }
    if (!masterDepts || masterDepts.length === 0) {
      masterDepts = initialDepartments;
    }

    const savedEmps = localStorage.getItem("master_employees");
    let employeesList: any[] = [];
    if (savedEmps) {
      try {
        employeesList = JSON.parse(savedEmps);
      } catch (e) {
        console.error(e);
      }
    } else {
      employeesList = repsData.map((rep) => {
        const mappedBase = getBaseDept(rep.department);
        const team = rep.department.replace(mappedBase, "").trim();
        return {
          name: rep.name,
          department: mappedBase,
          team: team === "-" ? "" : team,
          status: rep.status || "재직중",
        };
      });
    }

    // Filter out '퇴직' (Terminated) from active headcounts
    const activeEmployees = employeesList.filter((e) => {
      const status = e.status || "재직중";
      return status !== "퇴직";
    });

    const stats: any[] = [];

    masterDepts.forEach((dept) => {
      // Employees mapped to this department
      const deptEmployees = activeEmployees.filter(
        (e) => e.department === dept.name,
      );

      if (dept.teams && dept.teams.length > 0) {
        const teamRows: any[] = [];
        dept.teams.forEach((team) => {
          // Count active employees strictly matching this department AND this team
          const matchedEmps = deptEmployees.filter((e) => e.team === team.name);
          const currentCount = matchedEmps.length;

          const departmentLabel = `${dept.name} ${team.name}`.trim();
          const charCodeSum = departmentLabel
            .split("")
            .reduce((sum: number, c: string) => sum + c.charCodeAt(0), 0);
          const variance = (charCodeSum % 3) - 1; // -1, 0, 1
          const startOfYear = Math.max(0, currentCount + variance);
          const average = ((startOfYear + currentCount) / 2).toFixed(1);

          teamRows.push({
            department: departmentLabel,
            baseDept: dept.name,
            teamName: team.name,
            startOfYear,
            current: currentCount,
            average,
            isSubtotal: false,
          });
        });

        // Add subtotal (부분합) for this department
        const subtotalStartOfYear = teamRows.reduce(
          (sum, r) => sum + r.startOfYear,
          0,
        );
        const subtotalCurrent = teamRows.reduce((sum, r) => sum + r.current, 0);
        const subtotalAverage = (
          (subtotalStartOfYear + subtotalCurrent) /
          2
        ).toFixed(1);

        stats.push({
          department: `${dept.name} 소계`,
          baseDept: dept.name,
          teamName: "소계",
          startOfYear: subtotalStartOfYear,
          current: subtotalCurrent,
          average: subtotalAverage,
          isSubtotal: true,
        });

        stats.push(...teamRows);
      } else {
        // No sub-teams defined (e.g. 경영지원팀 has [] teams in configuration)
        // Only count if they match department and have no team assigned
        const matchedEmps = deptEmployees.filter(
          (e) => !e.team || e.team.trim() === "",
        );
        const currentCount = matchedEmps.length;

        const departmentLabel = dept.name;
        const charCodeSum = departmentLabel
          .split("")
          .reduce((sum: number, c: string) => sum + c.charCodeAt(0), 0);
        const variance = (charCodeSum % 3) - 1; // -1, 0, 1
        const startOfYear = Math.max(0, currentCount + variance);
        const average = ((startOfYear + currentCount) / 2).toFixed(1);

        stats.push({
          department: departmentLabel,
          baseDept: dept.name,
          teamName: "-",
          startOfYear,
          current: currentCount,
          average,
          isSubtotal: false,
        });
      }
    });

    return stats;
  }, [repsData]);

  const selectedRep = useMemo(() => {
    const rawRep = repsData.find((r) => r.id === selectedRepId) || null;
    if (!rawRep) return null;

    // Merge master interviews from local storage
    try {
      const existingInterviewsStr = localStorage.getItem("master_interviews");
      if (existingInterviewsStr) {
        const parsed = JSON.parse(existingInterviewsStr);
        const myInterviews = parsed
          .filter((i: any) => i.pId === rawRep.id)
          .map((i: any) => ({
            date: i.date,
            content: i.content,
          }));

        // combine static interviews with local storage
        const combined = [...myInterviews, ...(rawRep.interviews || [])];

        // sort by date descending
        combined.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

        return { ...rawRep, interviews: combined };
      }
    } catch (e) {}

    return rawRep;
  }, [repsData, selectedRepId]);

  const updateCurrentRep = (
    updater: (rep: SalesRep) => SalesRep,
    logMessage?: string,
  ) => {
    if (!selectedRep) return;
    setRepsData((prev) =>
      prev.map((r) => {
        if (r.id === selectedRep.id) {
          const updated = updater(r);
          if (logMessage) {
            const newHistory = [
              {
                date: new Date().toISOString().split("T")[0],
                message: logMessage,
              },
              ...(updated.dataHistory || []),
            ];
            return { ...updated, dataHistory: newHistory };
          }
          return updated;
        }
        return r;
      }),
    );
  };

  const handleEditBasic = () => {
    if (!selectedRep) return;
    setEditFormData({ ...selectedRep });
    setIsEditModalOpen(true);
  };

  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleAddPerson = () => {
    const defaultDept = selectedDivision 
      ? (selectedTeam ? `${selectedDivision} ${selectedTeam}` : selectedDivision) 
      : initialDepartments[0].name;
    setEditFormData({
      name: "",
      department: defaultDept,
      role: "팀원",
      title: "매니저",
      employmentType: "정규직",
      email: "",
      status: "재직중",
      birthDate: "",
      joinDate: "",
      career: "",
      salary: "",
    });
    setIsAddingNew(true);
    setIsEditModalOpen(true);
  };

  const handleSavePerson = () => {
    if (!editFormData.name) return;

    let savedRepId = "";
    if (isAddingNew) {
      const newRep: SalesRep = {
        id: `user-${Date.now()}`,
        name: editFormData.name || "",
        department: editFormData.department || initialDepartments[0].name,
        role: editFormData.role || "팀원",
        title: editFormData.title || "매니저",
        employmentType: editFormData.employmentType || "정규직",
        email: editFormData.email || "",
        status: editFormData.status || "재직중",
        leaveStartDate: editFormData.leaveStartDate,
        leaveEndDate: editFormData.leaveEndDate,
        leaveReason: editFormData.leaveReason,
        resignationDate: editFormData.resignationDate,
        birthDate: editFormData.birthDate || "",
        joinDate: editFormData.joinDate || "",
        career: editFormData.career || "",
        salary: editFormData.salary || "",
        salaryUpdatedAt: new Date().toISOString(),
        avatar: (editFormData.name || "").charAt(0) || "👤",
        kpiScore: 0,
        kpiTrack: "On-Track",
        workload: "정상",
        pendingTasks: 0,
        growthStage: "신입기",
        coachingNote: "",
        lastInterviewDate: null,
        nextInterviewDate: null,
        hasConflictSignal: false,
        dataHistory: [
          {
            date: new Date().toISOString().split("T")[0],
            message: "직원 정보 최초 등록",
          },
        ],
      };
      setRepsData((prev) => [newRep, ...prev]);
      setSelectedRepId(newRep.id);
      savedRepId = newRep.id;
    } else {
      updateCurrentRep(
        (r) => ({
          ...r,
          name: editFormData.name || r.name,
          department: editFormData.department || r.department,
          role: editFormData.role || r.role,
          title: editFormData.title !== undefined ? editFormData.title : r.title,
          email: editFormData.email !== undefined ? editFormData.email : r.email,
          employmentType: editFormData.employmentType !== undefined ? editFormData.employmentType : r.employmentType,
          status: editFormData.status !== undefined ? editFormData.status : r.status,
          leaveStartDate: editFormData.leaveStartDate !== undefined ? editFormData.leaveStartDate : r.leaveStartDate,
          leaveEndDate: editFormData.leaveEndDate !== undefined ? editFormData.leaveEndDate : r.leaveEndDate,
          leaveReason: editFormData.leaveReason !== undefined ? editFormData.leaveReason : r.leaveReason,
          resignationDate: editFormData.resignationDate !== undefined ? editFormData.resignationDate : r.resignationDate,
          birthDate:
            editFormData.birthDate !== undefined
              ? editFormData.birthDate
              : r.birthDate,
          joinDate:
            editFormData.joinDate !== undefined
              ? editFormData.joinDate
              : r.joinDate,
          career:
            r.careerHistory ? calculateTotalCareer(r.careerHistory) : (editFormData.career !== undefined ? editFormData.career : r.career),
          salary:
            editFormData.salary !== undefined ? editFormData.salary : r.salary,
          salaryUpdatedAt:
            (editFormData.salary !== undefined && editFormData.salary !== r.salary)
              ? new Date().toISOString()
              : r.salaryUpdatedAt,
        }),
        "기본 정보 수정",
      );
      if (selectedRep) savedRepId = selectedRep.id;
    }

    // Sync to master_employees
    if (savedRepId) {
      const savedMaster = localStorage.getItem("master_employees");
      let masterEmployees: any[] = [];
      if (savedMaster) {
        try {
          masterEmployees = JSON.parse(savedMaster);
        } catch (e) {}
      }

      const matchDept = editFormData.department || "";
      let parsedDept = matchDept;
      let parsedTeam = "";
      if (matchDept.includes(" ")) {
        const parts = matchDept.split(" ");
        parsedDept = parts[0];
        parsedTeam = parts.slice(1).join(" ");
      }

      const objIndex = masterEmployees.findIndex((e) => e.id === savedRepId);
      if (objIndex >= 0) {
        masterEmployees[objIndex] = {
          ...masterEmployees[objIndex],
          name: editFormData.name !== undefined ? editFormData.name : masterEmployees[objIndex].name,
          department: parsedDept,
          team: parsedTeam,
          role: editFormData.role !== undefined ? editFormData.role : masterEmployees[objIndex].role,
          rank: editFormData.title !== undefined ? editFormData.title : masterEmployees[objIndex].rank,
          email: editFormData.email !== undefined ? editFormData.email : masterEmployees[objIndex].email,
          employmentType: editFormData.employmentType !== undefined ? editFormData.employmentType : masterEmployees[objIndex].employmentType,
          status: editFormData.status !== undefined ? editFormData.status : masterEmployees[objIndex].status,
          leaveStartDate: editFormData.leaveStartDate !== undefined ? editFormData.leaveStartDate : masterEmployees[objIndex].leaveStartDate,
          leaveEndDate: editFormData.leaveEndDate !== undefined ? editFormData.leaveEndDate : masterEmployees[objIndex].leaveEndDate,
          leaveReason: editFormData.leaveReason !== undefined ? editFormData.leaveReason : masterEmployees[objIndex].leaveReason,
          resignationDate: editFormData.resignationDate !== undefined ? editFormData.resignationDate : masterEmployees[objIndex].resignationDate,
          birthDate: editFormData.birthDate !== undefined ? editFormData.birthDate : masterEmployees[objIndex].birthDate,
          joinDate: editFormData.joinDate !== undefined ? editFormData.joinDate : masterEmployees[objIndex].joinDate,
          career: editFormData.career !== undefined ? editFormData.career : masterEmployees[objIndex].career,
          salary: editFormData.salary !== undefined ? editFormData.salary : masterEmployees[objIndex].salary,
        };
      } else if (isAddingNew) {
        masterEmployees.push({
          id: savedRepId,
          name: editFormData.name || "",
          department: parsedDept,
          team: parsedTeam,
          role: editFormData.role || "팀원",
          rank: editFormData.title || "매니저",
          email: editFormData.email || "",
          employmentType: editFormData.employmentType || "정규직",
          status: editFormData.status || "재직중",
          leaveStartDate: editFormData.leaveStartDate,
          leaveEndDate: editFormData.leaveEndDate,
          leaveReason: editFormData.leaveReason,
          resignationDate: editFormData.resignationDate,
          birthDate: editFormData.birthDate || "",
          joinDate: editFormData.joinDate || "",
          career: editFormData.career || "",
          salary: editFormData.salary || "",
          statusHistory: []
        });
      }
      localStorage.setItem("master_employees", JSON.stringify(masterEmployees));
    }

    setIsEditModalOpen(false);
    setIsAddingNew(false);
  };

  const handleEditSkills = () => {
    if (!selectedRep) return;
    setIsSkillsModalOpen(true);
  };

  const handleSaveSkills = (data: any) => {
    updateCurrentRep(
      (r) => ({
        ...r,
        workSkills: data.workSkills,
        languageSkills: data.languageSkills,
        oaSkills: data.oaSkills,
        techSkills: data.techSkills,
      }),
      "보유 스킬 업데이트",
    );
    setIsSkillsModalOpen(false);
  };

  const handleEditCareers = () => {
    if (!selectedRep) return;
    setIsCareerModalOpen(true);
  };

  const handleSaveCareers = (data: any[]) => {
    updateCurrentRep(
      (r) => ({ ...r, careerHistory: data }),
      "경력 사항 업데이트",
    );
    setIsCareerModalOpen(false);
  };

  const handleAddKpi = () => {
    const year = prompt("연도:");
    if (!year) return;
    const goal = prompt("목표:") || "";
    const achievement = prompt("달성 내용:") || "";
    const rating = prompt("평가상태 (예: 진행중, 초과달성, 미달):") || "진행중";
    const progressRaw = prompt("진척률 (0~100):") || "0";
    const progress = Math.max(0, Math.min(100, parseInt(progressRaw) || 0));

    updateCurrentRep(
      (r) => ({
        ...r,
        kpiHistory: [
          { year, goal, achievement, rating, progress },
          ...(r.kpiHistory || []),
        ],
      }),
      "KPI 인력 데이터 추가",
    );
  };

  const handleAddNote = () => {
    const content = prompt("새 특이사항 내용:");
    if (content) {
      const date = new Date().toISOString().split("T")[0];
      updateCurrentRep((r) => ({
        ...r,
        specialNotes: [{ date, content }, ...(r.specialNotes || [])],
      }));
    }
  };

  const handleEditNote = (index: number) => {
    const note = selectedRep?.specialNotes?.[index];
    if (!note) return;
    const content = prompt("특이사항 내용 수정:", note.content);
    if (content !== null) {
      updateCurrentRep((r) => {
        const newNotes = [...(r.specialNotes || [])];
        newNotes[index] = { ...note, content };
        return { ...r, specialNotes: newNotes };
      });
    }
  };

  const handleDeleteNote = (index: number) => {
    if (confirm("특이사항을 삭제하시겠습니까?")) {
      updateCurrentRep((r) => {
        const newNotes = [...(r.specialNotes || [])];
        newNotes.splice(index, 1);
        return { ...r, specialNotes: newNotes };
      });
    }
  };

  const handleWrite = (type: string) => {
    if (type === "interview") {
      navigate("/interviews");
    }
  };

  const handleDeletePerson = () => {
    if (!selectedRep) return;
    if (!user?.isMaster) {
      alert("삭제 권한이 없습니다. 마스터 계정만 삭제할 수 있습니다.");
      return;
    }
    if (confirm(`${selectedRep.name} 인원 정보를 삭제하시겠습니까?`)) {
      if (confirm("데이터를 삭제하시겠습니까?")) {
        setRepsData((prev) => prev.filter((r) => r.id !== selectedRep.id));
        setSelectedRepId("");
      }
    }
  };

  const filteredReps = useMemo(() => {
    let result = repsData;
    if (selectedDivision) {
      result = result.filter((rep) => rep.department.includes(selectedDivision));
    }
    if (selectedTeam) {
      result = result.filter((rep) => rep.department.includes(selectedTeam));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (rep) =>
          rep.name.toLowerCase().includes(q) ||
          rep.department.toLowerCase().includes(q) ||
          rep.role.toLowerCase().includes(q),
      );
    }
    return result;
  }, [selectedDivision, selectedTeam, searchQuery, repsData]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Controls: Autocomplete Search & Add Button */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm z-40 relative">
        <select
          value={selectedDivision}
          onChange={(e) => {
            setSelectedDivision(e.target.value);
            setSelectedTeam(""); // Reset team when division changes
            if (e.target.value) {
              setSearchQuery("");
              setShowDropdown(true);
            } else {
              setShowDropdown(false);
            }
          }}
          className="px-4 py-3 bg-gray-50 border border-[#E2E8F0] rounded-xl text-[15px] font-medium text-gray-700 outline-none focus:border-indigo-500 transition-colors cursor-pointer min-w-[120px]"
        >
          <option value="">전체 본부</option>
          {masterDepts.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={selectedTeam}
          onChange={(e) => {
            setSelectedTeam(e.target.value);
            if (e.target.value) {
              setSearchQuery("");
              setShowDropdown(true);
              setTimeout(() => {
                searchInputRef.current?.focus();
              }, 0);
            } else if (!selectedDivision) {
              setShowDropdown(false);
            }
          }}
          className="px-4 py-3 bg-gray-50 border border-[#E2E8F0] rounded-xl text-[15px] font-medium text-gray-700 outline-none focus:border-indigo-500 transition-colors cursor-pointer min-w-[120px]"
        >
          <option value="">전체 팀</option>
          {masterDepts
            .find((d) => d.name === selectedDivision)
            ?.teams?.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
        </select>
        <div className="relative flex-1">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="본부, 팀, 이름 자동채움 검색 (예: 영업 1팀, 이민호)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
              if (e.target.value.trim() === "") {
                setSelectedRepId("");
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-[#E2E8F0] rounded-xl text-[15px] focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1] focus:ring-opacity-20 shadow-sm transition"
          />

          {/* Autocomplete Dropdown */}
          {showDropdown && (searchQuery || selectedDivision || selectedTeam) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E2E8F0] rounded-xl shadow-lg max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 z-50">
              {filteredReps.length > 0 ? (
                filteredReps.map((rep) => {
                  const growth = growthColor(rep.growthStage);
                  return (
                    <button
                      key={rep.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedRepId(rep.id);
                        setSearchQuery(rep.name);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${growth.bg} ${growth.text}`}
                      >
                        {rep.avatar}
                      </div>
                      <div>
                        <p className="font-bold text-[#0F172A] text-sm">
                          {rep.name}
                        </p>
                        <p className="text-[11px] text-[#475569]">
                          {rep.department} / {rep.role}
                        </p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center text-sm text-gray-500">
                  검색 결과가 없습니다.
                </div>
              )}
            </div>
          )}
        </div>
        <button
          onClick={handleSearch}
          className="px-6 py-3 bg-[#0F172A] text-white rounded-xl shadow-sm hover:bg-[#1E293B] transition flex items-center gap-2 whitespace-nowrap font-bold text-sm"
        >
          검색
        </button>
      </div>

      {/* Selected Rep Detail */}
      {selectedRep && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 z-10 relative">
          {/* Detail Header */}
          <div className="px-6 py-6 border-b border-[#E2E8F0] bg-gradient-to-r from-gray-50 to-white flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-sm ${growthColor(selectedRep.growthStage).bg} ${growthColor(selectedRep.growthStage).text}`}
              >
                {selectedRep.avatar}
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
                  {selectedRep.name}{" "}
                  <span className="text-[#94A3B8] font-normal text-sm ml-2">
                    {selectedRep.id}
                  </span>
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm text-[#475569] font-medium">
                    {selectedRep.department} · {selectedRep.role}
                  </p>
                  {selectedRep.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">|</span>
                      <p className="text-sm text-gray-500 font-mono">{selectedRep.email}</p>
                      <button 
                        onClick={async () => {
                          const url = `${window.location.origin}/profile-update/${encodeURIComponent(selectedRep.email!)}`;
                          try {
                            const res = await fetch('/api/send-update-email', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({ to: selectedRep.email, url })
                            });
                            if (res.ok) alert("개인정보 업데이트 요청 이메일(HTML)이 성공적으로 발송되었습니다.");
                            else alert("이메일 발송에 실패했습니다. 관리자에게 문의하세요.");
                          } catch (e) {
                              alert("이메일 발송 중 오류가 발생했습니다.");
                          }
                        }}
                        className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 hover:bg-blue-100 font-bold transition-colors"
                        title="개인정보 업데이트 이메일 발송"
                      >
                        이메일 발송
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-[11px] px-2.5 py-1 rounded font-bold shadow-sm ${growthColor(selectedRep.growthStage).bg} ${growthColor(selectedRep.growthStage).text}`}
              >
                {selectedRep.growthStage}
              </span>
              <button
                onClick={handleDeletePerson}
                className="text-gray-400 hover:text-red-500 transition"
                title="인원 삭제"
              >
                <UserMinus size={18} />
              </button>
            </div>
          </div>

          {/* Detail Content - Bento Grid */}
          <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm space-y-4">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                  <h3 className="font-bold text-[#0F172A] flex items-center gap-2">
                    <User size={16} className="text-[#6366F1]" /> 기본 정보 및
                    급여
                  </h3>
                  <button
                    onClick={handleEditBasic}
                    className="text-[#94A3B8] hover:text-[#0F172A] transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex gap-2 mb-2">
                    <User
                      size={16}
                      className="text-[#94A3B8] mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="text-[#94A3B8] text-xs font-bold">
                        생년월일
                      </p>
                      <p className="font-bold text-[#334155]">
                        {selectedRep.birthDate || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Briefcase
                      size={16}
                      className="text-[#94A3B8] mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="text-[#94A3B8] text-xs font-bold">
                        입사일 / 근속연수 / 총 경력
                      </p>
                      <p className="font-bold text-[#334155]">
                        {selectedRep.joinDate
                          ? `${selectedRep.joinDate} 입사 / 근속 ${calculateTenure(selectedRep.joinDate)} / `
                          : ""}
                        {selectedRep.career || "-"}
                      </p>
                    </div>
                  </div>
                  {/* Removed salary info from normal view for security purposes */}

                  {/* Employment Status */}
                  <div className="flex gap-2 pt-1">
                    <History
                      size={16}
                      className="text-[#94A3B8] mt-1 shrink-0"
                    />
                    <div className="w-full">
                      <p className="text-[#94A3B8] text-xs font-bold">
                        재직 직무 상태
                      </p>
                      <div className="mt-1">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold border ${
                          selectedRep.status === '휴직중'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : (selectedRep.status === '퇴직' || selectedRep.status === '퇴사')
                            ? 'bg-rose-50 text-rose-700 border-rose-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            selectedRep.status === '휴직중'
                              ? 'bg-amber-500'
                              : (selectedRep.status === '퇴직' || selectedRep.status === '퇴사')
                              ? 'bg-rose-500'
                              : 'bg-emerald-500'
                          }`} />
                          {selectedRep.status || '재직중'}
                        </span>
                        
                        {selectedRep.status === '휴직중' && (
                          <div className="text-[11px] text-[#475569] mt-2 space-y-0.5">
                            <p><strong>기간: </strong> {selectedRep.leaveStartDate || '-'} ~ {selectedRep.leaveEndDate || '-'}</p>
                            <p><strong>사유: </strong> {selectedRep.leaveReason || '-'}</p>
                          </div>
                        )}
                        {(selectedRep.status === '퇴사' || selectedRep.status === '퇴직') && selectedRep.resignationDate && (
                          <div className="text-[11px] text-[#475569] mt-2">
                            <p><strong>퇴사일: </strong> {selectedRep.resignationDate}</p>
                          </div>
                        )}
                      </div>

                      {/* Timeline entries of Status changes */}
                      {selectedRep.statusHistory && selectedRep.statusHistory.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-dashed border-[#E2E8F0] space-y-1.5">
                          <p className="text-[#475569] text-[11px] font-bold">
                            인사 기준 상태 변동 이력
                          </p>
                          <div className="space-y-1">
                            {selectedRep.statusHistory.map((hist, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[11px] bg-gray-50 border border-[#F1F5F9] p-1.5 rounded-md leading-none">
                                <span className="font-mono text-gray-455 font-semibold">{hist.changeDate}</span>
                                <span className="font-bold text-gray-500 flex items-center gap-1">
                                  <span className="font-normal text-[10px] text-gray-400">{hist.prevStatus}</span>
                                  <span className="text-gray-300">→</span>
                                  <span className={`font-extrabold ${
                                    hist.newStatus === '휴직중' ? 'text-amber-600' :
                                    hist.newStatus === '퇴직' ? 'text-rose-600' : 'text-emerald-600'
                                  }`}>{hist.newStatus}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm space-y-4">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                  <h3 className="font-bold text-[#0F172A] flex items-center gap-2">
                    <Award size={16} className="text-[#10B981]" /> 보유 스킬
                  </h3>
                  <button
                    onClick={handleEditSkills}
                    className="text-[#94A3B8] hover:text-[#0F172A] transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  <div>
                    <p className="text-[#94A3B8] text-xs font-bold mb-2 flex items-center gap-1">
                      <Briefcase size={14} /> 주요 업무 스킬 (자격 사항)
                    </p>
                    <div className="flex flex-col gap-2">
                      {selectedRep.workSkills?.length ? (
                        selectedRep.workSkills.map((sk: any, i: number) => (
                          typeof sk === 'string' ? (
                             <span key={i} className="px-2 py-1.5 bg-gray-100 text-[#475569] text-sm font-medium rounded border border-gray-200 w-fit mb-1">{sk}</span>
                          ) : (
                             <div key={i} className="bg-gray-50 border border-gray-200 p-2 rounded text-sm text-[#475569] flex justify-between items-center shadow-sm">
                               <div><span className="font-bold text-gray-800">{sk.name || '미입력'}</span> {sk.institution && <span className="text-[11px] ml-1.5 text-gray-500 font-medium">| {sk.institution}</span>}</div>
                               {sk.year && <span className="bg-white border text-[11px] text-gray-600 px-1.5 py-0.5 rounded shadow-sm">{sk.year}</span>}
                             </div>
                          )
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">데이터 없음</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[#94A3B8] text-xs font-bold mb-2 mt-4 flex items-center gap-1">
                      <Languages size={14} /> 어학 역량
                    </p>
                    <div className="flex flex-col gap-2">
                      {selectedRep.languageSkills?.length ? (
                        selectedRep.languageSkills.map((sk: any, i: number) => (
                           typeof sk === 'string' ? (
                             <span key={i} className="px-2 py-1.5 bg-green-50 text-green-700 text-sm font-bold rounded border border-green-100 w-fit mb-1">{sk}</span>
                           ) : (
                             <div key={i} className="bg-green-50/50 border border-green-100 p-2 rounded text-sm text-green-800 flex justify-between items-center shadow-sm">
                               <div><span className="font-bold text-green-900">{sk.language}</span> <span className="text-[11px] ml-1.5 opacity-80">{sk.level}</span></div>
                               {sk.testName && <span className="bg-white border-green-200 border text-[11px] px-1.5 py-0.5 rounded shadow-sm text-green-700 font-bold">{sk.testName} {sk.score}</span>}
                             </div>
                           )
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">데이터 없음</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dashed border-gray-200">
                    <div>
                      <p className="text-[#94A3B8] text-xs font-bold mb-2 flex items-center gap-1">OA 역량</p>
                      <div className="flex flex-wrap gap-1.5">
                         {selectedRep.oaSkills && selectedRep.oaSkills.length > 0 ? selectedRep.oaSkills.map((sk: any, i: number) => (
                            <span key={i} className="text-[11px] font-bold bg-orange-50 text-orange-700 px-2.5 py-1 rounded border border-orange-100 shadow-sm">{sk.category} ({sk.level})</span>
                         )) : <span className="text-xs text-gray-400">없음</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-[#94A3B8] text-xs font-bold mb-2 flex items-center gap-1">기타 (직무/Tech)</p>
                      <div className="flex flex-wrap gap-1.5">
                         {selectedRep.techSkills && selectedRep.techSkills.length > 0 ? selectedRep.techSkills.map((sk: any, i: number) => (
                            <span key={i} className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded border border-indigo-100 shadow-sm">{sk.skillName} ({sk.proficiency})</span>
                         )) : <span className="text-xs text-gray-400">없음</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Career History */}
              <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm space-y-4 md:col-span-2">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                  <h3 className="font-bold text-[#0F172A] flex items-center gap-2">
                    <Briefcase size={16} className="text-[#3B82F6]" /> 경력 사항
                  </h3>
                  <button
                    onClick={handleEditCareers}
                    className="flex items-center gap-1 text-[#3B82F6] text-xs font-bold bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                  >
                    <Edit2 size={12} /> 관리 및 추가
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-[#475569]">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] font-bold text-[#94A3B8]">
                      <tr>
                        <th className="px-4 py-3">회사명</th>
                        <th className="px-4 py-3">부서/팀명</th>
                        <th className="px-4 py-3">직무/직급</th>
                        <th className="px-4 py-3">근무기간</th>
                        <th className="px-4 py-3">비고</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {selectedRep.careerHistory?.length ? (
                        selectedRep.careerHistory.map((history) => (
                          <tr
                            key={history.id}
                            className="hover:bg-gray-50 transition-colors relative group"
                          >
                            <td className="px-4 py-3 font-medium text-[#0F172A]">
                              {history.companyName}
                            </td>
                            <td className="px-4 py-3">{history.teamName}</td>
                            <td className="px-4 py-3">{history.role} {history.rank ? `/ ${history.rank}` : ''}</td>
                            <td className="px-4 py-3 text-xs w-48">
                              {history.startDate} ~ {history.endDate}
                              <div className="text-[10px] text-blue-500 mt-1">
                                {history.startDate ? `(경력: ${
                                  (() => {
                                    const st = new Date(history.startDate);
                                    const ed = history.endDate ? new Date(history.endDate) : new Date();
                                    if(isNaN(st.getTime()) || isNaN(ed.getTime())) return '-';
                                    let m = (ed.getFullYear() - st.getFullYear()) * 12 + (ed.getMonth() - st.getMonth());
                                    if(ed.getDate() < st.getDate()) m--;
                                    if(m < 0) return '-';
                                    const y = Math.floor(m / 12);
                                    const rm = m % 12;
                                    return y === 0 ? `${rm}개월` : rm === 0 ? `${y}년` : `${y}년 ${rm}개월`;
                                  })()
                                })` : ''}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs w-1/3">
                              {history.notes || "-"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-6 text-center text-gray-400"
                          >
                            데이터가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

               {/* KPI History */}
              <div className="md:col-span-2 bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                  <h3 className="font-bold text-[#0F172A] flex items-center gap-2">
                    <Target size={16} className="text-[#F59E0B]" /> 연도별 KPI
                    목표 및 진척률
                  </h3>
                  <button
                    onClick={handleAddKpi}
                    className="flex items-center gap-1 text-[#6366F1] text-xs font-bold bg-[#EEF2FF] px-2 py-1 rounded hover:bg-[#E0E7FF] transition-colors"
                  >
                    <Plus size={14} /> 업데이트
                  </button>
                </div>
                <div className="space-y-3">
                  {selectedRep.kpiHistory?.length ? (
                    selectedRep.kpiHistory.map((kpi, i) => (
                      <div
                        key={i}
                        className="flex flex-col gap-3 p-4 bg-orange-50/30 rounded-lg border border-orange-100"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-orange-600 text-sm whitespace-nowrap mr-2">
                              {kpi.year}년
                            </span>
                            <span className="px-2.5 py-1 bg-white border border-orange-200 text-orange-700 font-bold text-xs rounded-full shadow-sm whitespace-nowrap">
                              {kpi.rating}
                            </span>
                          </div>
                          {kpi.progress !== undefined && (
                            <div className="text-right">
                              <span className="text-[11px] font-bold text-[#94A3B8]">
                                진척률
                              </span>
                              <p className="text-sm font-bold text-orange-600">
                                {kpi.progress}%
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-[#475569]">
                          <span className="font-medium text-[#0F172A]">
                            목표:
                          </span>{" "}
                          {kpi.goal}
                          <br />
                          <span className="font-medium text-[#0F172A]">
                            달성:
                          </span>{" "}
                          {kpi.achievement}
                        </div>
                        {kpi.progress !== undefined && (
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className="bg-orange-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${kpi.progress}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">
                      KPI 이력 데이터가 없습니다.
                    </p>
                  )}
                </div>
              </div>

              {/* Evaluations */}
              <div className="md:col-span-2 bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                  <h3 className="font-bold text-[#0F172A] flex items-center gap-2">
                    <TrendingUp size={16} className="text-[#8B5CF6]" /> 자가진단
                    및 다면진단 결과
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedRep.prevEvaluations?.length ? (
                    selectedRep.prevEvaluations.map((ev, i) => (
                      <div
                        key={i}
                        className="flex gap-4 p-4 rounded-xl border border-purple-100 bg-purple-50/20 relative group hover:bg-purple-50/50 transition-colors"
                      >
                        <div className="shrink-0 flex flex-col items-center justify-center w-12 h-12 bg-white rounded-lg shadow-sm border border-purple-100 text-purple-600 font-black text-xl tracking-tighter">
                          {ev.grade}
                        </div>
                        <div className="flex-1 pr-6">
                          <p className="font-bold text-[#0F172A] text-sm mb-1">
                            {ev.year}년 자가/다면진단 요약
                          </p>
                          <p className="text-[12px] text-[#475569] leading-snug">
                            {ev.summary}
                          </p>
                        </div>
                        <button
                          onClick={() => navigate('/survey-status', { state: { pId: selectedRep.id } })}
                          className="absolute right-4 top-4 text-[#8B5CF6] opacity-0 group-hover:opacity-100 transition-opacity hover:underline text-xs flex items-center gap-1"
                          title="상세 보기"
                        >
                          상세 보기 
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">
                      자가진단 및 다면진단 기록이 없습니다.
                    </p>
                  )}
                </div>
              </div>

              {/* Interview logs */}
              <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                  <h3 className="font-bold text-[#0F172A] flex items-center gap-2">
                    <MessageSquare size={16} className="text-[#3B82F6]" /> 면담
                    일시 및 내용
                  </h3>
                  <button
                    onClick={() => handleWrite("interview")}
                    className="flex items-center gap-1 text-[#3B82F6] text-xs font-bold bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                  >
                    <Plus size={14} /> 작성 페이지로
                  </button>
                </div>
                <div className="space-y-3 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-blue-100 before:to-transparent">
                  {selectedRep.interviews?.length ? (
                    selectedRep.interviews.map((log, i) => (
                      <div
                        key={i}
                        className="relative flex items-start gap-3 text-sm"
                      >
                        <div className="w-[22px] h-[22px] rounded-full bg-white border-4 border-blue-100 shrink-0 mt-0.5 relative z-10" />
                        <div className="flex-1 bg-white p-3 rounded-xl border border-blue-50 shadow-sm shadow-blue-50/50">
                          <p className="font-bold text-blue-600 text-xs mb-1">
                            {log.date}
                          </p>
                          <p className="text-[#475569] leading-relaxed text-sm">
                            {log.content}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">
                      면담 기록이 없습니다.
                    </p>
                  )}
                </div>
              </div>

              {/* Special Notes */}
              <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                  <h3 className="font-bold text-[#0F172A] flex items-center gap-2">
                    <StickyNote size={16} className="text-gray-600" /> 특이사항
                  </h3>
                  <button
                    onClick={handleAddNote}
                    className="flex items-center gap-1 text-gray-600 text-xs font-bold bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                  >
                    <Plus size={14} /> 추가
                  </button>
                </div>
                <div className="space-y-3">
                  {selectedRep.specialNotes &&
                  Array.isArray(selectedRep.specialNotes) ? (
                    selectedRep.specialNotes.map((note, i) => (
                      <div
                        key={i}
                        className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-4 relative group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-[#92400E] text-xs font-bold">
                            {note.date}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditNote(i)}
                              className="text-[#B45309] opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(i)}
                              className="text-[#B45309] hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <p className="text-[#92400E] text-sm font-medium leading-relaxed">
                          {note.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">
                      등록된 특이사항이 없습니다.
                    </p>
                  )}
                </div>
              </div>

              {/* Data History */}
              <div className="md:col-span-2 bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                  <h3 className="font-bold text-[#0F172A] flex items-center gap-2">
                    <History size={16} className="text-[#64748B]" /> 데이터 변경
                    이력
                  </h3>
                </div>
                <div className="space-y-3 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-px before:bg-[#E2E8F0]">
                  {selectedRep.dataHistory?.length ? (
                    selectedRep.dataHistory.map((log, i) => (
                      <div
                        key={i}
                        className="relative flex items-center justify-between gap-3 text-sm"
                      >
                        <div className="md:w-1/2 flex justify-end md:pr-8 relative">
                          <div className="hidden md:block text-[#94A3B8] text-[11px] font-bold mt-0.5">
                            {log.date}
                          </div>
                        </div>
                        <div className="w-[11px] h-[11px] rounded-full bg-[#E2E8F0] border-2 border-white shrink-0 relative z-10 md:absolute md:left-1/2 md:-ml-[5.5px]" />
                        <div className="flex-1 md:w-1/2 md:pl-8 bg-gray-50 p-3 rounded-lg border border-[#E2E8F0]">
                          <span className="md:hidden text-[#94A3B8] text-[11px] font-bold mb-1 block">
                            {log.date}
                          </span>
                          <p className="text-[#0F172A] font-medium text-[13px]">
                            {log.message}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">
                      변경 이력이 없습니다.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Headcount Dashboard: Trend Chart & Stats Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Headcount Trend Chart */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="text-[#6366F1]" size={18} />
            <h3 className="text-base font-bold text-[#0F172A] tracking-tight">
              본부별 월별 인원 추이 (최근 3개월)
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={trendData}
                margin={{ top: 30, right: 30, bottom: 5, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E2E8F0"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  dx={-10}
                />
                <Tooltip
                  itemSorter={(item) =>
                    uniqueDepartments.indexOf(item.dataKey as string)
                  }
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow:
                      "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                  }}
                  itemStyle={{ color: "#0F172A", fontWeight: "bold" }}
                />
                <Legend
                  payload={[
                    ...uniqueDepartments.map((deptName, idx) => {
                      const c = [
                        "#6366F1",
                        "#10B981",
                        "#F59E0B",
                        "#8B5CF6",
                        "#3B82F6",
                        "#EC4899",
                        "#14B8A6",
                        "#F43F5E",
                        "#06B6D4",
                        "#64748B",
                      ];
                      return {
                        id: deptName,
                        type: "square",
                        value: deptName,
                        color: c[idx % c.length],
                      };
                    }),
                    {
                      id: "total",
                      type: "line",
                      value: "총 인원 (명)",
                      color: "#334155",
                    },
                  ]}
                  wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                />
                {uniqueDepartments.map((deptName, idx) => {
                  const colors = [
                    "#6366F1",
                    "#10B981",
                    "#F59E0B",
                    "#8B5CF6",
                    "#3B82F6",
                    "#EC4899",
                    "#14B8A6",
                    "#F43F5E",
                    "#06B6D4",
                    "#64748B",
                  ];
                  return (
                    <Bar
                      stackId="a"
                      key={deptName}
                      dataKey={deptName}
                      name={deptName}
                      fill={colors[idx % colors.length]}
                      maxBarSize={40}
                    />
                  );
                })}
                <Line
                  type="monotone"
                  dataKey="total"
                  name="총 인원 (명)"
                  stroke="#334155"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 6, stroke: "#334155", strokeWidth: 2 }}
                >
                  <LabelList
                    dataKey="total"
                    position="right"
                    offset={10}
                    style={{
                      fill: "#334155",
                      fontSize: "11px",
                      fontWeight: "bold",
                    }}
                  />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Headcount Stats Table */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="text-[#10B981]" size={18} />
            <h3 className="text-base font-bold text-[#0F172A] tracking-tight">
              조직별 인원 현황 요약
            </h3>
          </div>
          <div className="flex-1 overflow-auto max-h-64 border border-[#E2E8F0] rounded-xl">
            <table className="w-full text-left text-sm text-[#0F172A]">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] sticky top-0 z-10 font-bold text-[#475569]">
                <tr>
                  <th className="px-4 py-3">사업부 / 본부</th>
                  <th className="px-4 py-3">팀명</th>
                  <th className="px-3 py-3 text-center w-20">연초 인원</th>
                  <th className="px-3 py-3 text-center w-20">
                    최근 인원
                    <br />
                    <span className="text-[10px] text-gray-400 leading-tight">
                      (현재)
                    </span>
                  </th>
                  <th className="px-3 py-3 text-center w-20 text-[#6366F1]">
                    연평균
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {headcountStats.map((stat, idx) => {
                  const isDeptExpanded = !!expandedDepts[stat.baseDept];
                  const deptHasSubtotal = headcountStats.some(s => s.baseDept === stat.baseDept && s.isSubtotal);

                  if (stat.isSubtotal) {
                    return (
                      <tr
                        key={idx}
                        className="bg-indigo-50/10 font-bold border-y border-slate-200 text-[#4F46E5] hover:bg-indigo-50/20 cursor-pointer select-none transition-colors"
                        onClick={() => {
                          setExpandedDepts((prev) => ({
                            ...prev,
                            [stat.baseDept]: !prev[stat.baseDept],
                          }));
                        }}
                      >
                        <td className="px-4 py-2.5 font-bold text-slate-700">
                          <span className="flex items-center gap-1.5">
                            {isDeptExpanded ? (
                              <ChevronDown size={14} className="text-indigo-500 shrink-0" />
                            ) : (
                              <ChevronRight size={14} className="text-indigo-400 shrink-0" />
                            )}
                            {stat.baseDept}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 font-medium">
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-[#4F46E5]">
                          {stat.startOfYear}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="inline-flex items-center justify-center bg-indigo-100 border border-indigo-200 text-indigo-800 font-bold rounded-lg px-2.5 py-1 min-w-[2rem] text-xs">
                            {stat.current}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-black text-[#6366F1]">
                          {stat.average}
                        </td>
                      </tr>
                    );
                  }

                  // If this department has a subtotal, hide the individual team rows unless expanded
                  if (deptHasSubtotal && !isDeptExpanded) {
                    return null;
                  }

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50 transition-colors ${deptHasSubtotal ? "bg-[#FAFBFD]" : ""}`}
                    >
                      <td className={`px-4 py-3 font-medium text-[#0F172A] ${deptHasSubtotal ? "pl-8 text-slate-400 text-xs" : ""}`}>
                        {deptHasSubtotal ? `└─ ${stat.baseDept}` : stat.baseDept}
                      </td>
                      <td className={`px-4 py-3 text-[#475569] ${deptHasSubtotal ? "pl-2 font-bold text-[13px]" : ""}`}>
                        {stat.teamName}
                      </td>
                      <td className="px-3 py-3 text-center text-gray-500 font-medium">
                        {stat.startOfYear}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center justify-center bg-indigo-50 text-indigo-700 font-bold rounded-lg px-2 py-1 min-w-[2rem]">
                          {stat.current}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-[#6366F1]">
                        {stat.average}
                      </td>
                    </tr>
                  );
                })}
                {headcountStats.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      직원 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  <tr className="bg-indigo-55/40 font-bold border-t-2 border-indigo-200">
                    <td
                      colSpan={2}
                      className="px-4 py-3.5 text-center text-indigo-950 font-black"
                    >
                      총합계
                    </td>
                    <td className="px-4 py-3.5 text-center text-indigo-900 font-bold">
                      {headcountStats
                        .filter((s) => !s.isSubtotal)
                        .reduce((acc, s) => acc + s.startOfYear, 0)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-indigo-900 font-bold">
                      {headcountStats
                        .filter((s) => !s.isSubtotal)
                        .reduce((acc, s) => acc + s.current, 0)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-indigo-900 font-bold">
                      {(
                        (headcountStats
                          .filter((s) => !s.isSubtotal)
                          .reduce((acc, s) => acc + s.startOfYear, 0) +
                          headcountStats
                            .filter((s) => !s.isSubtotal)
                            .reduce((acc, s) => acc + s.current, 0)) /
                        2
                      ).toFixed(1)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900">
                {isAddingNew ? "새 팀원 추가" : "기본 정보 수정"}
              </h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setIsAddingNew(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editFormData.name || ""}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="이름"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    본부/팀 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editFormData.department || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        department: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">선택</option>
                    {availableDepartmentOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    직책
                  </label>
                  <input
                    type="text"
                    value={editFormData.role || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, role: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="예: 파트장, 직급없음"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    직급
                  </label>
                  <input
                    type="text"
                    value={editFormData.title || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="예: 선임, 책임, 수석"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    고용형태
                  </label>
                  <select
                    value={editFormData.employmentType || "정규직"}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, employmentType: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="정규직">정규직</option>
                    <option value="계약직">계약직</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    상태
                  </label>
                  <select
                    value={editFormData.status || "재직중"}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, status: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="재직중">재직중</option>
                    <option value="휴직중">휴직중</option>
                    <option value="퇴사">퇴사</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={editFormData.email || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="예: hong@example.com"
                  />
                </div>
              </div>
              
              {editFormData.status === "휴직중" && (
                <div className="grid grid-cols-2 gap-4 bg-orange-50 p-3 rounded-lg border border-orange-100">
                  <div>
                    <label className="block text-[11px] font-bold text-orange-800 mb-1">휴직 시작일</label>
                    <input
                      type="date"
                      value={editFormData.leaveStartDate || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, leaveStartDate: e.target.value })}
                      className="w-full px-2 py-1.5 border border-orange-200 bg-white rounded text-sm text-orange-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-orange-800 mb-1">휴직 종료일</label>
                    <input
                      type="date"
                      value={editFormData.leaveEndDate || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, leaveEndDate: e.target.value })}
                      className="w-full px-2 py-1.5 border border-orange-200 bg-white rounded text-sm text-orange-900 outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-orange-800 mb-1">휴직 사유/내용</label>
                    <input
                      type="text"
                      value={editFormData.leaveReason || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, leaveReason: e.target.value })}
                      className="w-full px-2 py-1.5 border border-orange-200 bg-white rounded text-sm text-orange-900 outline-none"
                      placeholder="휴직 사유를 입력하세요 (예: 육아휴직)"
                    />
                  </div>
                </div>
              )}
              
              {(editFormData.status === "퇴사" || editFormData.status === "퇴직") && (
                <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                  <label className="block text-[11px] font-bold text-red-800 mb-1">퇴사일</label>
                  <input
                    type="date"
                    value={editFormData.resignationDate || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, resignationDate: e.target.value })}
                    className="w-full px-2 py-1.5 border border-red-200 bg-white rounded text-sm text-red-900 outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    생년월일
                  </label>
                  <input
                    type="date"
                    value={editFormData.birthDate || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        birthDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    입사일
                  </label>
                  <input
                    type="date"
                    value={editFormData.joinDate || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        joinDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    총 경력 (자동 계산)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={selectedRep?.careerHistory ? calculateTotalCareer(selectedRep.careerHistory) : ""}
                    className="w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-lg text-sm outline-none text-gray-500"
                    placeholder="경력사항 자동합산"
                  />
                </div>
              </div>
              {user?.isMaster && (
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-red-700 flex items-center gap-1">
                      <DollarSign size={14} /> [마스터 전용] 연봉/계약 정보
                    </label>
                    {selectedRep?.salaryUpdatedAt && (
                      <span className="text-[10px] text-red-500 font-medium">최종 수정: {new Date(selectedRep.salaryUpdatedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={editFormData.salary || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, salary: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-red-200 bg-white rounded-lg text-sm text-red-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none placeholder-red-300"
                    placeholder="예: 연봉 6,000만원"
                  />
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setIsAddingNew(false);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSavePerson}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skills Edit Modal */}
      <SkillsEditModal
        isOpen={isSkillsModalOpen}
        onClose={() => setIsSkillsModalOpen(false)}
        initialData={selectedRep}
        onSave={handleSaveSkills}
      />

      {/* Career Edit Modal */}
      <CareerEditModal
        isOpen={isCareerModalOpen}
        onClose={() => setIsCareerModalOpen(false)}
        initialData={selectedRep?.careerHistory || []}
        onSave={handleSaveCareers}
      />
    </div>
  );
}
