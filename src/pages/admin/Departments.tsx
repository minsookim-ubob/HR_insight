import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Building2, Users, Upload, FileSpreadsheet, AlertCircle, Download, CheckCircle2, Save, X } from 'lucide-react';
import { initialDepartments } from '../../data';
import { Department, Team } from '../../types';

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>(() => {
    const savedDepts = localStorage.getItem('master_departments');
    if (savedDepts) return JSON.parse(savedDepts);

    // If no master_departments yet, try to build from master_employees
    const savedEmps = localStorage.getItem('master_employees');
    const baseDepts = [...initialDepartments];
    
    if (savedEmps) {
      try {
        const emps = JSON.parse(savedEmps);
        emps.forEach((emp: any) => {
          const deptName = emp.department?.trim();
          const teamName = emp.team?.trim();

          if (!deptName) return;

          let targetDept = baseDepts.find(d => d.name === deptName);
          if (!targetDept) {
            targetDept = {
              id: `d${Date.now()}-${Math.random()}`,
              name: deptName,
              teams: []
            };
            baseDepts.push(targetDept);
          }

          if (teamName && !targetDept.teams.some(t => t.name === teamName)) {
            targetDept.teams.push({
              id: `t${Date.now()}-${Math.random()}`,
              name: teamName
            });
          }
        });
      } catch (e) {
        console.error(e);
      }
    }
    
    return baseDepts;
  });

  useEffect(() => {
    localStorage.setItem('master_departments', JSON.stringify(departments));
  }, [departments]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [pasteData, setPasteData] = useState('');
  const [parsedData, setParsedData] = useState<{deptName: string, teamName: string}[]>([]);

  const filteredDepartments = useMemo(() => {
    if (!searchTerm) return departments;
    const lowerSearch = searchTerm.toLowerCase();
    return departments.filter(dept => 
      dept.name.toLowerCase().includes(lowerSearch) || 
      dept.teams.some(team => team.name.toLowerCase().includes(lowerSearch))
    );
  }, [departments, searchTerm]);

  const [promptConfig, setPromptConfig] = useState<{ title: string; onConfirm: (val: string) => void; } | null>(null);
  const [promptValue, setPromptValue] = useState('');
  const [confirmConfig, setConfirmConfig] = useState<{ message: string; onConfirm: () => void; } | null>(null);

  const openPrompt = (title: string, defaultValue: string, onConfirm: (val: string) => void) => {
    setPromptValue(defaultValue);
    setPromptConfig({ title, onConfirm });
  };

  const handleAddDepartment = () => {
    openPrompt('새로운 본부명을 입력하세요', '', (name) => {
      const newDept: Department = {
        id: `d${Date.now()}`,
        name: name,
        teams: []
      };
      setDepartments(prev => [...prev, newDept]);
    });
  };

  const handleEditDepartment = (deptId: string, currentName: string) => {
    openPrompt('본부명을 수정하세요', currentName, (newName) => {
      if (newName !== currentName) {
        setDepartments(prev => prev.map(dept => 
          dept.id === deptId ? { ...dept, name: newName } : dept
        ));
      }
    });
  };

  const handleDeleteDepartment = (deptId: string) => {
    setConfirmConfig({
      message: '이 본부를 삭제하시겠습니까? 소속된 모든 팀이 함께 삭제됩니다.',
      onConfirm: () => {
        setDepartments(prev => prev.filter(dept => dept.id !== deptId));
      }
    });
  };

  const handleAddTeam = (deptId: string) => {
    openPrompt('새로운 팀명을 입력하세요', '', (name) => {
      setDepartments(prev => prev.map(dept => {
        if (dept.id === deptId) {
          const newTeam: Team = {
            id: `t${Date.now()}`,
            name: name
          };
          return { ...dept, teams: [...dept.teams, newTeam] };
        }
        return dept;
      }));
    });
  };

  const handleEditTeam = (deptId: string, teamId: string, currentName: string) => {
    openPrompt('팀명을 수정하세요', currentName, (newName) => {
      if (newName !== currentName) {
        setDepartments(prev => prev.map(dept => {
          if (dept.id === deptId) {
            return { 
              ...dept, 
              teams: dept.teams.map(team => 
                team.id === teamId ? { ...team, name: newName } : team
              )
            };
          }
          return dept;
        }));
      }
    });
  };

  const handleDeleteTeam = (deptId: string, teamId: string) => {
    setConfirmConfig({
      message: '이 팀을 삭제하시겠습니까?',
      onConfirm: () => {
        setDepartments(prev => prev.map(dept => {
          if (dept.id === deptId) {
            return { ...dept, teams: dept.teams.filter(team => team.id !== teamId) };
          }
          return dept;
        }));
      }
    });
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setPasteData(value);
    
    if (!value.trim()) {
      setParsedData([]);
      return;
    }

    const rows = value.trim().split('\n');
    const newParsedData: {deptName: string, teamName: string}[] = [];
    
    rows.forEach((row) => {
      const cols = row.split('\t').map(c => c.trim());
      if (cols[0]) {
        newParsedData.push({
          deptName: cols[0],
          teamName: cols[1] || '' // 팀명은 없을 수도 있음
        });
      }
    });

    setParsedData(newParsedData);
  };

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const handleSyncFromEmployeesClick = () => {
    setIsSyncModalOpen(true);
  };

  const handleSyncFromEmployees = () => {
    setIsSyncModalOpen(false);
    
    let emps = [];
    const savedEmps = localStorage.getItem('master_employees');
    if (savedEmps) {
      try {
        emps = JSON.parse(savedEmps);
      } catch (e) {
        console.error(e);
      }
    } else {
      emps = [
        { id: '1', department: '영업본부', team: '영업 1팀' },
        { id: '2', department: '영업본부', team: '영업 1팀' }
      ];
    }
    
    if (emps.length === 0) {
      alert('동기화할 임직원 데이터가 없습니다.');
      return;
    }

    try {
      const newDepts: Department[] = [];
      let nextDeptId = 1;

      emps.forEach((emp: any) => {
        const deptName = emp.department?.trim();
        const teamName = emp.team?.trim();

        if (!deptName) return;

        let targetDept = newDepts.find(d => d.name === deptName);
        if (!targetDept) {
          targetDept = {
            id: `d_sync_${Date.now()}_${nextDeptId++}`,
            name: deptName,
            teams: []
          };
          newDepts.push(targetDept);
        }

        if (teamName && !targetDept.teams.some((t: any) => t.name === teamName)) {
          targetDept.teams.push({
            id: `t_sync_${Date.now()}_${Math.random()}`,
            name: teamName
          });
        }
      });

      setDepartments(newDepts);
      alert(`조직도 업데이트 완료: 본부 ${newDepts.length}개로 초기화 및 동기화 되었습니다.`);
    } catch (e) {
      alert('데이터 동기화 중 오류가 발생했습니다.');
    }
  };

  const handleSaveUpload = () => {
    if (parsedData.length === 0) return;
    
    const newDepts = [...departments];
    
    parsedData.forEach(row => {
      const deptName = row.deptName.trim();
      const teamName = row.teamName.trim();
      
      if (!deptName) return;
      
      let targetDept = newDepts.find(d => d.name === deptName);
      
      if (!targetDept) {
        targetDept = {
          id: `d${Date.now()}-${Math.random()}`,
          name: deptName,
          teams: []
        };
        newDepts.push(targetDept);
      }
      
      if (teamName && !targetDept.teams.some(t => t.name === teamName)) {
        targetDept.teams.push({
          id: `t${Date.now()}-${Math.random()}`,
          name: teamName
        });
      }
    });

    setDepartments(newDepts);
    setIsUploadModalOpen(false);
    setPasteData('');
    setParsedData([]);
    alert(`조직도 데이터가 성공적으로 반영되었습니다.`);
  };

  const downloadTemplate = () => {
    const header = ['본부명', '팀명(선택)'];
    const example1 = ['영업본부', '영업 1팀'];
    const example2 = ['영업본부', '영업 2팀'];
    const example3 = ['기획본부', '전략팀'];
    
    const csvContent = "\uFEFF" + [
      header.join(','),
      example1.join(','),
      example2.join(','),
      example3.join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "조직도_추가_템플릿.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
        <button 
          onClick={handleAddDepartment}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0F172A] text-white text-sm font-bold rounded-lg hover:bg-[#1E293B] transition-colors shadow-sm shrink-0"
        >
          <Plus size={16} /> 본부(상위) 추가
        </button>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="본부명 또는 팀명 검색..." 
              className="pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] bg-gray-50"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={handleSyncFromEmployeesClick}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-bold rounded-lg hover:bg-indigo-100 transition-colors shadow-sm whitespace-nowrap"
            >
              <Users size={16} />
              임직원 데이터에서 가져오기
            </button>
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E2E8F0] text-[#0F172A] text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap"
            >
              <Upload size={16} className="text-[#6366F1]" />
              조직도 일괄 등록 (붙여넣기)
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 bg-gray-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDepartments.map(dept => (
              <div key={dept.id} className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
                {/* Dept Header */}
                <div className="px-5 py-4 border-b border-[#E2E8F0] bg-gradient-to-r from-indigo-50/50 to-white flex justify-between items-center group">
                  <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-[#6366F1]" />
                    <h2 className="font-bold text-[#0F172A] text-lg tracking-tight">{dept.name}</h2>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEditDepartment(dept.id, dept.name)}
                      className="p-1.5 text-gray-400 hover:text-[#6366F1] hover:bg-indigo-50 rounded transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteDepartment(dept.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Teams List */}
                <div className="p-2 flex-1">
                  {dept.teams.length > 0 ? (
                    <ul className="space-y-1">
                      {dept.teams.map(team => (
                        <li key={team.id} className="flex justify-between items-center px-3 py-2 hover:bg-gray-50 rounded-lg group transition-colors">
                          <div className="flex items-center gap-2 text-[#475569]">
                            <Users size={14} className="text-gray-400" />
                            <span className="text-sm font-medium">{team.name}</span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEditTeam(dept.id, team.id, team.name)}
                              className="p-1.5 text-gray-400 hover:text-[#6366F1] hover:bg-white rounded transition-colors"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button 
                              onClick={() => handleDeleteTeam(dept.id, team.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="py-6 text-center text-sm text-gray-400 italic">
                      등록된 팀이 없습니다
                    </div>
                  )}
                </div>

                {/* Add Team Footer */}
                <div className="p-3 border-t border-[#E2E8F0] bg-gray-50">
                  <button 
                    onClick={() => handleAddTeam(dept.id)}
                    className="w-full py-2 flex items-center justify-center gap-1.5 text-sm font-bold text-[#6366F1] hover:text-[#4F46E5] hover:bg-[#EEF2FF] rounded-lg transition-colors border border-dashed border-[#C7D2FE]"
                  >
                    <Plus size={14} /> 팀 추가하기
                  </button>
                </div>
              </div>
            ))}

            {filteredDepartments.length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-400 flex flex-col items-center">
                <Building2 size={48} className="mb-4 text-gray-200" />
                <p>표시할 부서 데이터가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isSyncModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
              <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <Users className="text-[#6366F1]" size={20} />
                조직도 동기화
              </h2>
              <button 
                onClick={() => setIsSyncModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center">
                  <AlertCircle size={32} />
                </div>
                <h4 className="text-lg font-bold text-[#0F172A]">임직원 데이터에서 불러오기</h4>
                <p className="text-sm text-[#475569] leading-relaxed">
                  임직원 마스터에 등록된 부서/팀 정보로 조직도를 <span className="font-bold text-red-500">전면 업데이트</span> 하시겠습니까?
                  <br/><br/>
                  기존에 수동으로 입력된 임직원이 없는 부서나 팀 데이터는 <strong>삭제되고 덮어쓰기</strong> 됩니다.
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-[#E2E8F0] bg-gray-50 flex justify-end gap-2">
              <button 
                onClick={() => setIsSyncModalOpen(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#0F172A] rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleSyncFromEmployees}
                className="px-4 py-2 bg-[#6366F1] text-white rounded-lg text-sm font-bold hover:bg-[#4F46E5] transition-colors"
              >
                초기화 및 동기화 진행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 엑셀 업로드 모달 */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
              <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <FileSpreadsheet className="text-[#10B981]" size={20} />
                조직도 데이터 일괄 등록
              </h2>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-[#4F46E5] flex items-center gap-2 mb-1">
                    <AlertCircle size={16} /> 
                    붙여넣기 방법 안내
                  </h4>
                  <ul className="text-sm text-indigo-900/70 list-disc list-inside space-y-1 ml-1 mt-2">
                    <li><strong className="font-bold">본부명, 팀명</strong> 2개 컬럼을 복사하여 아래에 붙여넣으세요.</li>
                    <li>동일한 본부명에 여러 팀을 묶어서 추가할 수 있습니다.</li>
                  </ul>
                </div>
                <button 
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-indigo-200 text-indigo-600 text-sm font-bold rounded-lg hover:bg-indigo-50 transition-colors shadow-sm shrink-0"
                >
                  <Download size={16} /> 템플릿 다운로드
                </button>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#475569] mb-2">데이터 붙여넣기 영역</label>
                <textarea
                  value={pasteData}
                  onChange={handlePasteChange}
                  placeholder={`영업본부\t영업 1팀\n영업본부\t영업 2팀\n기획본부\n`}
                  className="w-full h-32 border border-[#E2E8F0] rounded-xl p-4 text-sm font-mono text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#6366F1] resize-y placeholder-gray-300"
                />
              </div>

              {parsedData.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#0F172A] flex items-center gap-2">
                      <CheckCircle2 className="text-green-500" size={18} />
                      파싱 결과 미리보기
                    </h3>
                    <span className="text-sm text-gray-500 font-medium">인식된 데이터: <span className="font-bold text-[#0F172A]">{parsedData.length}</span>건</span>
                  </div>
                  <div className="border border-[#E2E8F0] rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-sm bg-white relative">
                      <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] font-bold text-[#64748B] sticky top-0 shadow-sm z-10">
                        <tr>
                          <th className="px-4 py-2 w-1/2">본부명 (필수)</th>
                          <th className="px-4 py-2 w-1/2">팀명 (선택)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsedData.map((data, idx) => (
                          <tr key={idx} className={!data.deptName ? "bg-red-50 text-red-600" : ""}>
                            <td className="px-4 py-2 font-bold">{data.deptName || '(누락)'}</td>
                            <td className="px-4 py-2 text-gray-600">{data.teamName || '(소속팀 없음)'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
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
                {parsedData.length > 0 ? "업로드 반영하기" : "반영하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Modal */}
      {promptConfig && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <h2 className="text-lg font-bold text-[#0F172A]">{promptConfig.title}</h2>
            </div>
            <div className="p-6">
              <input 
                type="text" 
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (promptValue.trim()) {
                      promptConfig.onConfirm(promptValue.trim());
                      setPromptConfig(null);
                    }
                  } else if (e.key === 'Escape') {
                    setPromptConfig(null);
                  }
                }}
                className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
              />
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] bg-gray-50 flex justify-end gap-2">
              <button 
                onClick={() => setPromptConfig(null)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#0F172A] rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button 
                onClick={() => {
                  if (promptValue.trim()) {
                    promptConfig.onConfirm(promptValue.trim());
                    setPromptConfig(null);
                  }
                }}
                disabled={!promptValue.trim()}
                className="px-4 py-2 bg-[#6366F1] text-white rounded-lg text-sm font-bold hover:bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmConfig && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                  <AlertCircle size={32} />
                </div>
                <h4 className="text-lg font-bold text-[#0F172A]">삭제 확인</h4>
                <p className="text-sm text-[#475569] leading-relaxed">
                  {confirmConfig.message}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] bg-gray-50 flex justify-end gap-2">
              <button 
                onClick={() => setConfirmConfig(null)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#0F172A] rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button 
                onClick={() => {
                  confirmConfig.onConfirm();
                  setConfirmConfig(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
