import React, { useState, useMemo, useEffect } from 'react';
import { Upload, Download, Plus, Search, FileSpreadsheet, X, CheckCircle2, AlertCircle, Save, ArrowUpDown, Filter, Edit2, Trash2, Calendar, History, Loader2, RefreshCw } from 'lucide-react';
import { initialDepartments } from '../../data';
import { UserService } from '../../services/UserService';

interface StatusHistoryItem {
  changeDate: string; // YYYY-MM-DD
  prevStatus: '재직중' | '휴직중' | '퇴사' | '-';
  newStatus: '재직중' | '휴직중' | '퇴사';
}

interface Employee {
  id: string;
  department: string;
  team: string;
  role: string; // 직책
  rank: string; // 직급
  name: string;
  email: string;
  employmentType?: '정규직' | '계약직';
  status: '재직중' | '휴직중' | '퇴사' | '퇴직';
  statusHistory?: StatusHistoryItem[];
  leaveStartDate?: string;
  leaveEndDate?: string;
  leaveReason?: string;
  resignationDate?: string;
}

const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', department: '스마트러닝1사업본부', team: '영업 1팀', role: 'Enterprise AE', rank: '책임', name: '김사라', email: 'sara@ubob.com', status: '재직중', statusHistory: [] },
  { id: '2', department: '스마트러닝1사업본부', team: '영업 1팀', role: 'Mid-Market AE', rank: '선임', name: '이민준', email: 'minjun@ubob.com', status: '재직중', statusHistory: [] },
  { id: '3', department: '스마트러닝2사업본부', team: '영업 3팀', role: 'SMB AE', rank: '주임', name: '박다인', email: 'dain@ubob.com', status: '재직중', statusHistory: [] },
  { id: '4', department: '스마트러닝2사업본부', team: '영업 3팀', role: 'Enterprise AE', rank: '책임', name: '최지훈', email: 'jihoon@ubob.com', status: '재직중', statusHistory: [] },
  { id: 'emp_taehyung', department: '스마트러닝1사업본부', team: '영업 1팀', role: '팀장', rank: '수석', name: '김태형', email: 'taehyung@ubob.com', status: '재직중', statusHistory: [] },
  { id: 'emp_minho', department: '스마트러닝1사업본부', team: '영업 1팀', role: '팀원', rank: '책임', name: '이민호', email: 'minho@ubob.com', status: '재직중', statusHistory: [] },
  { id: 'emp_hskim', department: '경영지원팀', team: '', role: '팀장', rank: '수석', name: '김인사(hskim) (나)', email: 'hskim@ubob.com', status: '재직중', statusHistory: [] },
];

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('master_employees');
    let parsed: Employee[] = [];
    if (saved) {
      try {
        parsed = JSON.parse(saved);
        // Ensure status field exists and defaults properly
        parsed = parsed.map((e: any) => ({
          ...e,
          status: e.status || '재직중',
          statusHistory: e.statusHistory || [],
        }));
      } catch (e) {
        console.error(e);
      }
    }
    
    if (parsed && parsed.length > 0) {
      if (!parsed.find((e: Employee) => e.email === 'hskim@ubob.com')) {
         parsed.push({ 
           id: 'emp_hskim', 
           department: '경영지원팀', 
           team: '', 
           role: '팀장', 
           rank: '수석', 
           name: '김인사(hskim) (나)', 
           email: 'hskim@ubob.com',
           status: '재직중',
           statusHistory: [] 
         });
         localStorage.setItem('master_employees', JSON.stringify(parsed));
      }
      return parsed;
    }
    return INITIAL_EMPLOYEES;
  });

  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    localStorage.setItem('master_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    async function loadFromDB() {
      try {
         setIsSyncing(true);
         const fromDb = await UserService.getAllUsers();
         if (fromDb.length > 0) {
            setEmployees(fromDb as any);
            localStorage.setItem('master_employees', JSON.stringify(fromDb));
         } else {
            // Seed DB from local
            for (const e of employees) {
               await UserService.syncUser(e.id, e);
            }
         }
      } catch (err) {
         console.error('Failed to sync employees with DB', err);
      } finally {
         setIsSyncing(false);
      }
    }
    loadFromDB();
  }, []);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [pasteData, setPasteData] = useState('');
  const [parsedData, setParsedData] = useState<Partial<Employee>[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [sortField, setSortField] = useState<'department' | 'team'>('department');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 단건 등록 및 수정 모달 상태
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // 입력 폼 상태들
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDept, setFormDept] = useState('');
  const [formTeam, setFormTeam] = useState('');
  const [formRole, setFormRole] = useState('팀원');
  const [formRank, setFormRank] = useState('사원');
  const [formStatus, setFormStatus] = useState<'재직중' | '휴직중' | '퇴사'>('재직중');
  const [formStatusDate, setFormStatusDate] = useState(() => new Date().toISOString().split('T')[0]);

  const handleOpenRegister = () => {
    setSelectedEmployee(null);
    setFormName('');
    setFormEmail('');
    setFormDept('');
    setFormTeam('');
    setFormRole('팀원');
    setFormRank('책임');
    setFormStatus('재직중');
    setFormStatusDate(new Date().toISOString().split('T')[0]);
    setIsEmployeeModalOpen(true);
  };

  const handleEditEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormName(emp.name);
    setFormEmail(emp.email);
    setFormDept(emp.department);
    setFormTeam(emp.team || '');
    setFormRole(emp.role);
    setFormRank(emp.rank);
    setFormStatus(emp.status || '재직중');
    setFormStatusDate(new Date().toISOString().split('T')[0]);
    setIsEmployeeModalOpen(true);
  };

  const handleDeleteEmployee = async (id: string) => {
    if (window.confirm('이 임직원 정보를 마스터 목록에서 완전히 삭제하시겠습니까?')) {
      setEmployees(prev => prev.filter(e => e.id !== id));
      await UserService.deleteUser(id);
    }
  };

  const handleSaveEmployee = async () => {
    if (!formName.trim()) {
      alert('성명을 입력해주세요.');
      return;
    }
    if (!formEmail.trim()) {
      alert('이메일을 입력해주세요.');
      return;
    }
    if (!formDept) {
      alert('본부를 선택해주세요.');
      return;
    }

    if (selectedEmployee) {
      // 수정 모드
      const prevStatus = selectedEmployee.status || '재직중';
      let updatedHistory = [...(selectedEmployee.statusHistory || [])];

      if (prevStatus !== formStatus) {
        updatedHistory = [
          {
            changeDate: formStatusDate || new Date().toISOString().split('T')[0],
            prevStatus,
            newStatus: formStatus
          },
          ...updatedHistory
        ];
      }

      const updatedEmp = {
        ...selectedEmployee,
        name: formName,
        email: formEmail,
        department: formDept,
        team: formTeam,
        role: formRole,
        rank: formRank,
        status: formStatus,
        statusHistory: updatedHistory
      };

      setEmployees(prev => prev.map(e => e.id === selectedEmployee.id ? updatedEmp : e));
      await UserService.syncUser(updatedEmp.id, updatedEmp);
    } else {
      // 신규 등록 모드
      const newEmp: Employee = {
        id: `emp_${Date.now()}`,
        name: formName,
        email: formEmail,
        department: formDept,
        team: formTeam,
        role: formRole,
        rank: formRank,
        status: formStatus,
        statusHistory: []
      };
      setEmployees(prev => [...prev, newEmp]);
      await UserService.syncUser(newEmp.id, newEmp);
    }

    setIsEmployeeModalOpen(false);
  };

  const currentDept = initialDepartments.find(d => d.name === selectedDept);
  const teamsInDept = currentDept ? currentDept.teams : [];

  const handleSort = (field: 'department' | 'team') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedEmployees = useMemo(() => {
    let result = employees;

    if (selectedDept) {
      result = result.filter(e => e.department === selectedDept);
    }
    
    if (selectedTeam) {
      result = result.filter(e => e.team === selectedTeam);
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(e => 
        e.name.toLowerCase().includes(lowerSearch) || 
        e.department.toLowerCase().includes(lowerSearch) || 
        e.team.toLowerCase().includes(lowerSearch) || 
        e.email.toLowerCase().includes(lowerSearch)
      );
    }

    result = [...result].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'department') {
        comparison = a.department.localeCompare(b.department);
      } else if (sortField === 'team') {
        comparison = a.team.localeCompare(b.team);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [employees, searchTerm, selectedDept, selectedTeam, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredAndSortedEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 엑셀 붙여넣기 파싱 로직
  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setPasteData(value);
    
    if (!value.trim()) {
      setParsedData([]);
      return;
    }

    const rows = value.trim().split('\n');
    const newParsedData: Partial<Employee>[] = rows.map((row) => {
      // 탭(Tab)으로 분리 (엑셀 붙여넣기 기본 형식)
      const cols = row.split('\t').map(c => c.trim());
      return {
        department: cols[0] || '',
        team: cols[1] || '',
        role: cols[2] || '',
        rank: cols[3] || '',
        name: cols[4] || '',
        email: cols[5] || '',
      };
    });

    setParsedData(newParsedData);
  };

  const handleSaveUpload = async () => {
    // 빈 이름이나 이메일은 제외
    const validData = parsedData.filter(d => d.name && d.email);
    
    const newEmployees = validData.map((data, index) => ({
      id: `new-${Date.now()}-${index}`,
      department: data.department || '',
      team: data.team || '',
      role: data.role || '',
      rank: data.rank || '',
      name: data.name || '',
      email: data.email || '',
      status: '재직중' as const,
      statusHistory: []
    }));

    setEmployees(prev => [...prev, ...newEmployees]);
    
    try {
      setIsSyncing(true);
      for (const emp of newEmployees) {
        await UserService.syncUser(emp.id, emp);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }

    setIsUploadModalOpen(false);
    setPasteData('');
    setParsedData([]);
    alert(`${newEmployees.length}명의 직원이 추가되었습니다.`);
  };

  const downloadTemplate = () => {
    // 탭으로 구분된 텍스트 생성 (엑셀에서 열 수 있도록 CSV 또는 복사용 형태)
    const header = ['본부', '팀', '직책', '직급', '이름', '이메일'];
    const example1 = ['영업본부', '영업 1팀', '팀장', '수석', '홍길동', 'hong@ubob.com'];
    const example2 = ['개발본부', '백엔드팀', '팀원', '선임', '김철수', 'kim@ubob.com'];
    
    // CSV 형태로 다운로드
    const csvContent = "\uFEFF" + [
      header.join(','),
      example1.join(','),
      example2.join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "임직원_업로드_템플릿.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="이름, 소속, 이메일 검색..." 
              className="pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm w-64 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] bg-gray-50"
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setSelectedTeam(''); // 부서 변경 시 팀 초기화
              }}
              className="py-2 px-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1] bg-gray-50 text-[#475569]"
            >
              <option value="">본부 전체</option>
              {initialDepartments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
            <select 
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              disabled={!selectedDept}
              className="py-2 px-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1] bg-gray-50 text-[#475569] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">팀 전체</option>
              {teamsInDept.map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm font-bold rounded-lg hover:bg-gray-100 transition-colors shadow-sm whitespace-nowrap"
          >
            <Upload size={16} className="text-[#6366F1]" />
            엑셀 업로드 (붙여넣기)
          </button>
          <button 
            onClick={handleOpenRegister}
            className="flex items-center gap-2 px-4 py-2 bg-[#0F172A] text-white text-sm font-bold rounded-lg hover:bg-[#1E293B] transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus size={16} />
            단건 등록
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-[#475569]">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] font-bold text-[#64748B]">
            <tr>
              <th className="px-6 py-4 w-12 text-center">
                <input type="checkbox" className="rounded border-gray-300" />
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('department')}>
                <div className="flex items-center gap-1">본부 <ArrowUpDown size={14} className={sortField === 'department' ? 'text-[#0F172A]' : ''} /></div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('team')}>
                <div className="flex items-center gap-1">팀 <ArrowUpDown size={14} className={sortField === 'team' ? 'text-[#0F172A]' : ''} /></div>
              </th>
              <th className="px-6 py-4">직책</th>
              <th className="px-6 py-4">직급</th>
              <th className="px-6 py-4">성명</th>
              <th className="px-6 py-4">이메일</th>
              <th className="px-6 py-4 text-center w-28">직무상태</th>
              <th className="px-6 py-4 text-center w-40">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {paginatedEmployees.length === 0 ? (
              <tr>
                 <td colSpan={9} className="px-6 py-12 text-center text-gray-400">데이터가 없습니다.</td>
              </tr>
            ) : (
              paginatedEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-center">
                    <input type="checkbox" className="rounded border-gray-300" />
                  </td>
                  <td className="px-6 py-4 text-[#475569]">{emp.department}</td>
                  <td className="px-6 py-4 text-[#475569]">{emp.team || '-'}</td>
                  <td className="px-6 py-4 text-[#475569]">{emp.role}</td>
                  <td className="px-6 py-4 text-[#475569]">{emp.rank}</td>
                  <td className="px-6 py-4 font-bold text-[#0F172A]">{emp.name}</td>
                  <td className="px-6 py-4 text-[#6366F1]">{emp.email}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-sm font-bold ${
                      emp.status === '재직중' 
                        ? 'text-emerald-600'
                        : emp.status === '휴직중'
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }`}>
                      {emp.status || '재직중'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button 
                        onClick={() => handleEditEmployee(emp)}
                        className="flex items-center gap-1 text-sm font-bold text-[#4F46E5] hover:underline"
                        title="수정"
                      >
                        <Edit2 size={14} />
                        수정
                      </button>
                      <button 
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="flex items-center gap-1 text-sm font-bold text-rose-600 hover:underline"
                        title="삭제"
                      >
                        <Trash2 size={14} />
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {filteredAndSortedEmployees.length > 0 && (
          <div className="px-6 py-4 border-t border-[#E2E8F0] bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">총 <span className="font-bold text-[#0F172A]">{filteredAndSortedEmployees.length}</span>명의 임직원</span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-200 rounded text-sm bg-white hover:bg-gray-50 text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button 
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 border rounded text-sm font-bold ${
                    currentPage === page 
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                      : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-200 rounded text-sm bg-white hover:bg-gray-50 text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 엑셀 업로드 모달 */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
              <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <FileSpreadsheet className="text-[#10B981]" size={20} />
                엑셀 데이터 붙여넣기 (일괄 등록)
              </h2>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* 안내 및 템플릿 다운로드 */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-[#4F46E5] flex items-center gap-2 mb-1">
                    <AlertCircle size={16} /> 
                    붙여넣기 방법 안내
                  </h4>
                  <ul className="text-sm text-indigo-900/70 list-disc list-inside space-y-1 ml-1 mt-2">
                    <li>엑셀(Excel) 또는 구글 스프레드시트에서 데이터를 선택하고 <kbd className="px-1.5 py-0.5 bg-white border border-indigo-200 rounded text-xs mx-1">Ctrl+C</kbd> 후 아래 텍스트 박스에 <kbd className="px-1.5 py-0.5 bg-white border border-indigo-200 rounded text-xs mx-1">Ctrl+V</kbd> 하세요.</li>
                    <li>컬럼 순서: <strong className="font-bold">본부, 팀, 직책, 직급, 이름, 이메일</strong> 순이어야 합니다.</li>
                    <li>이름과 이메일은 필수 항목입니다.</li>
                  </ul>
                </div>
                <button 
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-indigo-200 text-indigo-600 text-sm font-bold rounded-lg hover:bg-indigo-50 transition-colors shadow-sm shrink-0"
                >
                  <Download size={16} /> 업로드 템플릿 다운로드
                </button>
              </div>

              {/* 입력 영역 */}
              <div>
                <label className="block text-sm font-bold text-[#475569] mb-2">데이터 붙여넣기 영역</label>
                <textarea
                  value={pasteData}
                  onChange={handlePasteChange}
                  placeholder={`영업본부\t영업 1팀\t팀장\t수석\t홍길동\thong@ubob.com\n기획본부\t전략기획팀\t팀원\t책임\t김철수\tcs@ubob.com`}
                  className="w-full h-32 border border-[#E2E8F0] rounded-xl p-4 text-sm font-mono text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#6366F1] resize-y placeholder-gray-300"
                />
              </div>

              {/* 파싱 결과 미리보기 */}
              {parsedData.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#0F172A] flex items-center gap-2">
                      <CheckCircle2 className="text-green-500" size={18} />
                      파싱 결과 미리보기
                    </h3>
                    <span className="text-sm text-gray-500 font-medium">인식된 데이터: <span className="font-bold text-[#0F172A]">{parsedData.length}</span>건</span>
                  </div>
                  <div className="border border-[#E2E8F0] rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs bg-white relative">
                      <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] font-bold text-[#64748B] sticky top-0 shadow-sm z-10">
                        <tr>
                          <th className="px-4 py-3 whitespace-nowrap">본부</th>
                          <th className="px-4 py-3 whitespace-nowrap">팀</th>
                          <th className="px-4 py-3 whitespace-nowrap">직책</th>
                          <th className="px-4 py-3 whitespace-nowrap">직급</th>
                          <th className="px-4 py-3 whitespace-nowrap">이름 (필수)</th>
                          <th className="px-4 py-3 whitespace-nowrap">이메일 (필수)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsedData.map((data, idx) => {
                          const hasError = !data.name || !data.email;
                          return (
                            <tr key={idx} className={hasError ? "bg-red-50 text-red-600" : ""}>
                              <td className="px-4 py-2">{data.department}</td>
                              <td className="px-4 py-2">{data.team}</td>
                              <td className="px-4 py-2">{data.role}</td>
                              <td className="px-4 py-2">{data.rank}</td>
                              <td className={`px-4 py-2 font-bold ${!data.name && 'text-red-500'}`}>{data.name || '(누락)'}</td>
                              <td className={`px-4 py-2 ${!data.email && 'text-red-500'}`}>{data.email || '(누락)'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#E2E8F0] bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="px-6 py-2 bg-white border border-[#E2E8F0] text-[#475569] text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                닫기
              </button>
              <button 
                onClick={handleSaveUpload}
                disabled={parsedData.length === 0}
                className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-lg transition-colors shadow-sm
                  ${parsedData.length > 0 
                    ? 'bg-[#0F172A] text-white hover:bg-[#1E293B]' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                <Save size={16} className={parsedData.length > 0 ? '' : 'hidden'} />
                {parsedData.length > 0 ? `${parsedData.filter(d => d.name && d.email).length}건 반영하기` : '업로드 반영하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 임직원 등록/수정 모달 */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
              <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <History className="text-[#6366F1]" size={20} />
                {selectedEmployee ? '임직원 정보 수정 및 인사상태 관리' : '신규 임직원 등록'}
              </h2>
              <button 
                onClick={() => setIsEmployeeModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1.5">성명 (필수)</label>
                  <input 
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="예: 홍길동"
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1] bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1.5">이메일 (필수)</label>
                  <input 
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="예: email@ubob.com"
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1] bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1.5">소속本부 (본부)</label>
                  <select 
                    value={formDept}
                    onChange={(e) => {
                      setFormDept(e.target.value);
                      setFormTeam('');
                    }}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1] bg-gray-50 text-[#475569]"
                  >
                    <option value="">본부 선택</option>
                    {initialDepartments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1.5">소속 부서 (팀)</label>
                  <select 
                    value={formTeam}
                    onChange={(e) => setFormTeam(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1] bg-gray-50 text-[#475569] disabled:opacity-50"
                    disabled={!formDept}
                  >
                    <option value="">팀 선택 (선택 사항)</option>
                    {initialDepartments.find(d => d.name === formDept)?.teams.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1.5">직책</label>
                  <input 
                    type="text"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    placeholder="예: 팀원, 팀장"
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1] bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1.5">직급</label>
                  <input 
                    type="text"
                    value={formRank}
                    onChange={(e) => setFormRank(e.target.value)}
                    placeholder="예: 사원, 책임, 수석"
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1] bg-gray-50"
                  />
                </div>
              </div>

              {/* 인사상태 변경 구역 */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                  <span className="text-xs font-extrabold text-[#0F172A] flex items-center gap-1.5">
                    <History size={14} className="text-[#6366F1]" />
                    인사 직무 상태 관리
                  </span>
                  {selectedEmployee && (
                    <span className="text-[11px] font-bold text-gray-400">
                      현재 상태: <strong className="text-indigo-600 underline">{selectedEmployee.status || '재직중'}</strong>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#475569] mb-1.5">직무 상태</label>
                    <select 
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm font-bold focus:outline-none focus:border-[#6366F1] bg-white text-[#475569]"
                    >
                      <option value="재직중">재직중</option>
                      <option value="휴직중">휴직중</option>
                      <option value="퇴사">퇴사</option>
                    </select>
                  </div>
                  
                  {/* 상태 변경 날짜 입력 */}
                  <div>
                    <label className="block text-xs font-bold text-[#475569] mb-1.5">
                      상태 변경일 (적용 기준일)
                    </label>
                    <input 
                      type="date"
                      value={formStatusDate}
                      onChange={(e) => setFormStatusDate(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#6366F1] bg-white text-[#475569]"
                    />
                  </div>
                </div>

                {selectedEmployee && selectedEmployee.status !== formStatus && (
                  <div className="text-[11px] text-amber-600 bg-amber-50 rounded-lg p-2.5 border border-amber-200 font-medium flex items-center gap-1.5 leading-relaxed shrink-0">
                    <AlertCircle size={14} className="shrink-0" />
                    <div>
                      인사 상태를 <strong>{selectedEmployee.status || '재직중'} → {formStatus}</strong>(으)로 변경합니다. <br />
                      반영 및 저장 시 변경 이력이 누적되어 관리됩니다.
                    </div>
                  </div>
                )}
              </div>

              {/* 상태 변동 누적 이력 타임라인 */}
              {selectedEmployee && selectedEmployee.statusHistory && selectedEmployee.statusHistory.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-xs font-extrabold text-[#475569] block">
                    상태 변동 이력 ({selectedEmployee.statusHistory.length}건)
                  </span>
                  <div className="border border-[#E2E8F0] rounded-xl max-h-36 overflow-y-auto divide-y divide-[#F1F5F9] bg-gray-50/50">
                    {selectedEmployee.statusHistory.map((hist, idx) => (
                      <div key={idx} className="p-3 text-xs flex justify-between items-center hover:bg-white transition-colors duration-150">
                        <div className="flex items-center gap-2">
                          <Calendar size={13} className="text-slate-400" />
                          <span className="font-mono text-gray-500">{hist.changeDate}</span>
                        </div>
                        <div className="font-bold">
                          <span className="text-slate-300 font-medium">{hist.prevStatus}</span>
                          <span className="mx-1.5 text-indigo-400">→</span>
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] ${
                            hist.newStatus === '재직중' ? 'bg-emerald-50 text-emerald-700' :
                            hist.newStatus === '휴직중' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {hist.newStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedEmployee ? (
                <div className="text-[11px] text-gray-400 text-center py-4 bg-gray-50/30 rounded-xl border border-dashed border-[#E2E8F0]">
                  상태 변동 이력이 존재하지 않습니다.
                </div>
              ) : null}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#E2E8F0] bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setIsEmployeeModalOpen(false)}
                className="px-6 py-2 bg-white border border-[#E2E8F0] text-[#475569] text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                취소
              </button>
              <button 
                onClick={handleSaveEmployee}
                className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-[#0F172A] rounded-lg hover:bg-[#1E293B] transition-colors shadow-sm"
              >
                <Save size={16} />
                반영 및 저장하기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
