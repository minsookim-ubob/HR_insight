import React, { useState, useEffect, useRef } from 'react';
import { initialDepartments, salesReps as initialSalesReps } from '../data';
import { MessageSquare, Calendar as CalendarIcon, User, Search, Filter, Plus, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { growthColor } from '../utils';
import { initAuth, googleSignIn, getAccessToken, logout } from '../lib/workspaceAuth';
import { createCalendarEvent } from '../lib/calendarApi';
import { trashItem, getTrashItems } from '../utils/trashUtils';

export type InterviewCategory = '목표 관리 면담' | '성과 면담' | '관계 관리 면담' | '개인사 면담' | '기타 면담' | '미지정';


export default function Interviews() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<{type: 'dept' | 'team' | 'name', value: string} | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [sortConfig, setSortConfig] = useState<{key: 'date' | 'name', direction: 'asc' | 'desc'}>({key: 'date', direction: 'desc'});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [innerSortConfig, setInnerSortConfig] = useState<{key: 'date' | 'name', direction: 'asc' | 'desc'}>({key: 'date', direction: 'desc'});
  const [innerCurrentPage, setInnerCurrentPage] = useState(1);
  const innerItemsPerPage = 10;

  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  const [alerts, setAlerts] = useState<any[]>([]);

  // Inline Writing mode states
  const [isWritingMode, setIsWritingMode] = useState(false);
  const [writeDeptFilter, setWriteDeptFilter] = useState('');
  const [writeTeamFilter, setWriteTeamFilter] = useState('');
  const [writeNameSearch, setWriteNameSearch] = useState('');
  const [writeTodos, setWriteTodos] = useState<{id: number, text: string, done: boolean}[]>([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [modalNameSearch, setModalNameSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'schedule' | 'log'>('schedule');
  const [selectedRep, setSelectedRep] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('14:00');
  const [category, setCategory] = useState<InterviewCategory>('미지정');
  const [content, setContent] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  useEffect(() => {
    initAuth(
      (user, token) => {
        setNeedsAuth(false);
        setHasToken(true);
      },
      () => setNeedsAuth(true)
    );
    
    // Clear dummy data one-time
    if (!localStorage.getItem('dummy_data_cleared')) {
      localStorage.removeItem('master_interviews');
      localStorage.setItem('dummy_data_cleared', 'true');
      console.log('Dummy data cleared');
      loadInterviews(); // Reload after clearing
    }
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setNeedsAuth(false);
        setHasToken(true);
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const getEmployees = () => {
    try {
      const saved = localStorage.getItem('master_employees');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return initialSalesReps;
  };

  const loadInterviews = () => {
    const allEmployees = getEmployees();
    
    // Get trash items to filter out
    const trashItems = getTrashItems();
    const deletedIds = trashItems.map((i:any) => i.originalId);

    // Collect static interviews
    let allInterviews: any[] = [];
    
    allEmployees.forEach((rep: any) => {
      if (rep.interviews) {
        rep.interviews.forEach((intv: any) => {
          const id = `static_${rep.id}_${intv.date}`;
          if (deletedIds.includes(id)) return;

          allInterviews.push({
            id: id,
            pId: rep.id,
            name: rep.name,
            department: rep.department,
            team: rep.team,
            role: rep.role,
            avatar: rep.avatar || rep.name.substring(0,1),
            growthStage: rep.growthStage || 'Level 1',
            date: intv.date,
            content: intv.content,
            category: '미지정',
            status: 'Completed',
            source: '임직원 기본 데이터',
            todos: []
          });
        });
      }
    });

    // Merge from local storage (both master_interviews from self-surveys and new scheduled ones)
    try {
      const stored = localStorage.getItem('master_interviews');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.forEach((localIntv: any) => {
          if (deletedIds.includes(localIntv.id)) return;
          
          const rep = allEmployees.find((r: any) => r.id === localIntv.pId);
          if (rep) {
            allInterviews.push({
              id: localIntv.id || `local_${Math.random()}`,
              pId: rep.id,
              name: rep.name,
              department: rep.department,
              team: rep.team,
              role: rep.role,
              avatar: rep.avatar || rep.name.substring(0,1),
              growthStage: rep.growthStage || 'Level 1',
              date: localIntv.date,
              content: localIntv.content || '',
              category: localIntv.category || (localIntv.period ? '기타 면담' : '미지정'),
              status: localIntv.status || 'Completed',
              source: localIntv.source || (localIntv.period ? `다면진단 (${localIntv.period})` : '직접 등록'),
              eventId: localIntv.eventId,
              todos: localIntv.todos || []
            });
          }
        });
      }
    } catch(e) {}

    // ... (keep alert generation/sorting unchanged)
    // Generate alerts based on rule:
    // 1day before schedule -> alert
    // 3days past schedule without log -> alert
    const newAlerts: any[] = [];
    const now = new Date('2026-05-25T22:34:00+09:00'); // relative to prompt context time

    allInterviews.forEach(intv => {
        if (intv.status === 'Scheduled') {
            const intvDate = new Date(intv.date);
            const diffDays = (intvDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
            
            if (diffDays >= 0 && diffDays <= 1) {
                newAlerts.push({ type: 'upcoming', msg: `${intv.name}님과의 [${intv.category}] 면담 일정이 하루 남았습니다. (${intv.date.substring(0,10)})` });
            } else if (diffDays < -3) {
                newAlerts.push({ type: 'overdue', msg: `${intv.name}님과의 면담이 종료된 지 3일이 지났습니다. 기록을 등록해주세요. (${intv.date.substring(0,10)})`, recordId: intv.id, pId: intv.pId });
            }
        }
    });

    setAlerts(newAlerts);

    // Sort by date descending
    allInterviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setInterviews(allInterviews);
  };

  useEffect(() => {
    loadInterviews();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allDepts = Array.from(new Set(interviews.map(i => i.department).filter(Boolean))) as string[];
  const allTeams = Array.from(new Set(interviews.map(i => i.team).filter(Boolean))) as string[];
  const allNames = Array.from(new Set(interviews.map(i => i.name).filter(Boolean))) as string[];

  const matchedDepts = searchTerm ? allDepts.filter(d => d.toLowerCase().includes(searchTerm.toLowerCase())) : allDepts;
  const matchedTeams = searchTerm ? allTeams.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase())) : allTeams;
  const matchedNames = searchTerm ? allNames.filter(n => n.toLowerCase().includes(searchTerm.toLowerCase())) : allNames;

  const saveToSystem = (newIntv: any) => {
    try {
       const stored = localStorage.getItem('master_interviews');
       let parsed = stored ? JSON.parse(stored) : [];
       
       if (newIntv.id) {
           const existingIdx = parsed.findIndex((p:any) => p.id === newIntv.id);
           if (existingIdx >= 0) {
               parsed[existingIdx] = { ...parsed[existingIdx], ...newIntv };
           } else {
               parsed.push(newIntv);
           }
       } else {
           newIntv.id = `local_${Date.now()}`;
           parsed.push(newIntv);
       }
       
       localStorage.setItem('master_interviews', JSON.stringify(parsed));
       loadInterviews();
    } catch(e) {}
  };

  const deleteFromSystem = (id: string) => {
    if (!window.confirm('정말 삭제하시겠습니까? 휴지통으로 이동됩니다.')) return;
    try {
       console.log('Attempting to delete item with id:', id);
       const fullItem = interviews.find(i => i.id === id);
       
       if (fullItem) {
           console.log('Found item to trash:', fullItem);
           trashItem(fullItem, 'interview', `면담: ${fullItem.name || '알 수 없음'}`);
       } else {
           console.warn('Item not found in current interviews list for id:', id);
       }
       
       // Also remove from master_interviews if it was locally created
       const stored = localStorage.getItem('master_interviews');
       if (stored) {
           let parsed = JSON.parse(stored);
           console.log('Current master_interviews:', parsed);
           const filtered = parsed.filter((p:any) => p.id !== id);
           localStorage.setItem('master_interviews', JSON.stringify(filtered));
           console.log('Removed from master_interviews, remaining:', filtered);
       } else {
           console.log('master_interviews not found');
       }

       loadInterviews();
       alert('면담 기록이 휴지통으로 이동되었습니다.');
    } catch(e) {
       console.error('Delete failed:', e);
       alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleScheduleSubmit = async () => {
     if (!selectedRep || !scheduleDate || !scheduleTime) return alert('필수 값을 입력하세요');
     if (!hasToken) {
         alert('구글 캘린더 연동을 위해 먼저 로그인을 진행해주세요.');
         return;
     }

     try {
       const isoStart = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
       // Add 1 hour for end
       const endDate = new Date(new Date(isoStart).getTime() + 60 * 60 * 1000);
       const isoEnd = endDate.toISOString();

       const allEmployees = getEmployees();
       const summary = `[HR면담] ${allEmployees.find((r: any)=>r.id===selectedRep)?.name || '직원'} - ${category}`;
       const description = '매니저 면담 예약 건입니다.';

       // Call Calendar API
       const event = await createCalendarEvent(summary, description, isoStart, isoEnd);

       const newIntv = {
           pId: selectedRep,
           date: isoStart,
           category,
           status: 'Scheduled',
           eventId: event.id
       };

       saveToSystem(newIntv);
       setIsModalOpen(false);
       alert('구글 캘린더에 면담 일정이등록되었습니다.');
     } catch(e: any) {
        alert('구글 캘린더 등록 실패: ' + e.message);
     }
  };

  const handleLogSubmit = () => {
    if (!content) return alert('기록 내용을 입력하세요.');
    
    if (selectedRecordId) {
        // We are updating an existing scheduled one
        saveToSystem({ 
            id: selectedRecordId, 
            content, 
            category, 
            todos: writeTodos, 
            status: 'Completed',
            actualDate: new Date(`${scheduleDate}T${scheduleTime || '12:00'}:00`).toISOString()
        });
    } else {
        // Direct new log 
        if (!selectedRep || !scheduleDate) return alert('필수 값을 입력하세요');
        saveToSystem({
            pId: selectedRep,
            date: new Date(`${scheduleDate}T${scheduleTime || '12:00'}:00`).toISOString(),
            category,
            content,
            todos: writeTodos,
            status: 'Completed'
        });
    }

    setIsModalOpen(false);
    setIsWritingMode(false);
    alert('면담 기록이 저장되었습니다.');
  };

  const openLogModal = (recordId: string, pId: string, existingContent?: string, existingCategory?: string, existingTodos?: any[]) => {
      setSelectedRecordId(recordId);
      setSelectedRep(pId);
      setModalType('log');
      
      const intv = interviews.find(i => i.id === recordId);
      if (intv) {
          const targetDate = intv.actualDate || intv.date || new Date().toISOString();
          const dt = new Date(targetDate);
          setScheduleDate(dt.toISOString().substring(0,10));
          setScheduleTime(dt.toTimeString().substring(0,5));
      }
      
      setContent(existingContent || '');
      setCategory((existingCategory as any) || '성과 면담');
      setWriteTodos(existingTodos || []);
      
      const rep = getEmployees().find((r: any) => r.id === pId);
      if (rep) {
         setWriteDeptFilter(rep.department);
         setWriteTeamFilter(rep.team || '');
         setWriteNameSearch(rep.name);
      }
      
      setIsWritingMode(true);
      setIsModalOpen(false);
  };

  const filtered = interviews.filter(intv => {
    if (activeFilter) {
      if (activeFilter.type === 'dept' && intv.department !== activeFilter.value) return false;
      if (activeFilter.type === 'team' && intv.team !== activeFilter.value) return false;
      if (activeFilter.type === 'name' && intv.name !== activeFilter.value) return false;
    }
    
    if (searchTerm && !activeFilter) {
      const matchName = intv.name.includes(searchTerm);
      const matchDept = intv.department.includes(searchTerm);
      const matchTeam = intv.team && intv.team.includes(searchTerm);
      const matchContent = intv.content && intv.content.includes(searchTerm);
      if (!(matchName || matchDept || matchTeam || matchContent)) return false;
    }

    if (filterTeam !== 'all') {
      const deptTeam = `${intv.department} ${intv.team || ''}`.trim();
      if (deptTeam !== filterTeam) return false;
    }

    if (filterCategory !== 'all') {
      if (intv.category !== filterCategory) return false;
    }

    return true;
  });

  const sortedFiltered = [...filtered].sort((a, b) => {
    let order = 0;
    if (sortConfig.key === 'date') {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      order = dateA - dateB;
    } else if (sortConfig.key === 'name') {
      order = a.name.localeCompare(b.name);
    }
    return sortConfig.direction === 'asc' ? order : -order;
  });

  const totalPages = Math.ceil(sortedFiltered.length / itemsPerPage);
  const paginatedInterviews = sortedFiltered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (key: 'date' | 'name') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  const previousInterviews = interviews.filter(i => i.pId === selectedRep);
  const innerSortedFiltered = [...previousInterviews].sort((a, b) => {
    let order = 0;
    if (innerSortConfig.key === 'date') {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      order = dateA - dateB;
    } else if (innerSortConfig.key === 'name') {
      order = a.name.localeCompare(b.name);
    }
    return innerSortConfig.direction === 'asc' ? order : -order;
  });

  const innerTotalPages = Math.ceil(innerSortedFiltered.length / innerItemsPerPage);
  const innerPaginatedInterviews = innerSortedFiltered.slice((innerCurrentPage - 1) * innerItemsPerPage, innerCurrentPage * innerItemsPerPage);

  const handleInnerSort = (key: 'date' | 'name') => {
    setInnerSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setInnerCurrentPage(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">전사 면담 기록</h1>
          <p className="text-sm text-[#475569] mt-1">임직원들의 개인 면담 일정을 캘린더에 연동하고 면담 내용을 기록합니다.</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
           {!hasToken && (
               <button onClick={handleLogin} disabled={isLoggingIn} className="px-4 py-2 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200">
                  {isLoggingIn ? '연동 중...' : '구글 캘린더 연동하기'}
               </button>
           )}
           <button onClick={() => { 
                setIsWritingMode(!isWritingMode); 
                setSelectedRecordId(null); 
                setContent(''); 
                setCategory('성과 면담');
                setWriteTodos([]);
                setWriteDeptFilter('');
                setWriteTeamFilter('');
                setWriteNameSearch('');
                setSelectedRep('');
             }} className="px-4 py-2 bg-white border border-[#E2E8F0] text-gray-700 font-bold rounded-lg shadow-sm hover:bg-gray-50 flex items-center gap-1.5 focus:outline-none">
             <MessageSquare size={16}/> 즉시 기록 작성
           </button>
           <button onClick={() => { setModalType('schedule'); setSelectedRecordId(null); setIsModalOpen(true); setModalNameSearch(''); }} className="px-4 py-2 bg-[#6366F1] text-white font-bold rounded-lg shadow-sm hover:bg-[#4F46E5] flex items-center gap-1.5 focus:outline-none">
             <CalendarIcon size={16}/> 사전 일정 예약
           </button>
        </div>
      </div>

      {isWritingMode && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-md mb-6 p-6 animate-in slide-in-from-top-4 duration-300">
             <div className="flex justify-between items-center mb-6 border-b border-[#E2E8F0] pb-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-[#0F172A]">
                   <MessageSquare className="text-blue-600" size={24}/> 
                   {selectedRecordId ? '면담 기록 내용 수정' : '새로운 면담 기록'}
                </h2>
                <button onClick={() => setIsWritingMode(false)} className="text-sm font-bold text-gray-500 hover:text-gray-900 border px-3 py-1.5 rounded-lg border-gray-200">닫기</button>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                 {/* 1. 면담 대상자 검색 및 요약 */}
                 <div className="lg:col-span-4 space-y-5 lg:border-r border-[#E2E8F0] lg:pr-6">
                    <div>
                        <h3 className="font-bold text-sm text-gray-800 mb-3 block border-l-4 border-indigo-500 pl-2">면담 대상자 찾기</h3>
                        
                        <div className="space-y-3">
                           <div className="flex gap-2">
                               <select 
                                  value={writeDeptFilter} 
                                  onChange={e=> { setWriteDeptFilter(e.target.value); setWriteTeamFilter(''); }}
                                  className="w-1/2 p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-indigo-500"
                               >
                                  <option value="">본부 전체</option>
                                  {Array.from(new Set(getEmployees().map((e:any) => e.department).filter(Boolean))).map((d: any)=><option key={d} value={d}>{d}</option>)}
                               </select>
                               <select 
                                  value={writeTeamFilter} 
                                  onChange={e=> setWriteTeamFilter(e.target.value)}
                                  className="w-1/2 p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-indigo-500"
                                  disabled={!writeDeptFilter}
                               >
                                  <option value="">팀 전체</option>
                                  {writeDeptFilter && Array.from(new Set(getEmployees().filter((e:any) => e.department === writeDeptFilter).map((e:any) => e.team).filter(Boolean))).map((t: any)=><option key={t} value={t}>{t}</option>)}
                               </select>
                           </div>
                           <div className="relative">
                              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input 
                                 type="text" 
                                 placeholder="이름으로 찾기"
                                 value={writeNameSearch}
                                 onChange={e => setWriteNameSearch(e.target.value)}
                                 className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                              />
                           </div>
                           
                           {/* 검색된 직원 목록 (결과가 1명일때 자동선택 하거나 클릭으로 선택) */}
                           <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col h-40">
                              <div className="bg-gray-50 px-3 py-1.5 text-sm font-bold text-gray-500 border-b border-gray-200">검색 결과</div>
                              <div className="flex-1 overflow-y-auto w-full">
                                  {(() => {
                                      const matched = getEmployees().filter((r:any) => {
                                          if (writeDeptFilter && r.department !== writeDeptFilter) return false;
                                          if (writeTeamFilter && r.team !== writeTeamFilter) return false;
                                          if (writeNameSearch && !r.name.includes(writeNameSearch)) return false;
                                          return true; 
                                      });
                                      if (matched.length === 0) return <div className="text-center py-4 text-xs text-gray-400">결과가 없습니다.</div>;
                                      return matched.map((m:any) => (
                                          <div 
                                             key={m.id} 
                                             onClick={() => setSelectedRep(m.id)}
                                             className={`px-3 py-2 text-sm border-b border-gray-100 last:border-0 cursor-pointer hover:bg-indigo-50 transition-colors flex justify-between items-center ${selectedRep === m.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700'}`}
                                          >
                                              <div className="flex items-center gap-2">
                                                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">{m.avatar || m.name.substring(0,1)}</div>
                                                  {m.name}
                                              </div>
                                              <div className="text-xs bg-white border border-gray-200 px-1 py-0.5 rounded text-gray-500">{m.team || m.department}</div>
                                          </div>
                                      ));
                                  })()}
                              </div>
                           </div>
                        </div>
                    </div>
                 </div>
                 
                 {/* 2. 기록 정보 및 작성 (Leftover 8 columns) */}
                 <div className="lg:col-span-8 space-y-5">
                    {selectedRep ? (
                        <div className="animate-in fade-in duration-300">
                           <div>
                               <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-lg mb-4 shadow-sm">
                                   <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                       {getEmployees().find((r:any)=>r.id === selectedRep)?.avatar || getEmployees().find((r:any)=>r.id === selectedRep)?.name.substring(0,1)}
                                   </div>
                                   <div>
                                       <div className="font-bold text-slate-800">{getEmployees().find((r:any)=>r.id === selectedRep)?.name}</div>
                                       <div className="text-xs text-slate-500">{getEmployees().find((r:any)=>r.id === selectedRep)?.department} - {getEmployees().find((r:any)=>r.id === selectedRep)?.role}</div>
                                   </div>
                               </div>

                               <h3 className="font-bold text-sm text-gray-800 mb-3 block border-l-4 border-indigo-500 pl-2 mt-4">면담 정보 및 기록</h3>
                               <div className="flex flex-col sm:flex-row gap-4 mb-4">
                                   <div className="flex-[1.5]">
                                       <label className="block text-sm font-bold text-gray-500 mb-1">{selectedRecordId ? '실제 진행 날짜/시간' : '면담 날짜/시간'}</label>
                                       <div className="flex gap-2">
                                          <input type="date" value={scheduleDate} onChange={e=>setScheduleDate(e.target.value)} className="w-[60%] border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500"/>
                                          <input type="time" value={scheduleTime} onChange={e=>setScheduleTime(e.target.value)} className="w-[40%] border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500"/>
                                       </div>
                                   </div>
                                   <div className="flex-1">
                                       <label className="block text-sm font-bold text-gray-500 mb-1">면담 유형</label>
                                       <select value={category} onChange={e=>setCategory(e.target.value as any)} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-white">
                                           <option value="목표 관리 면담">목표 관리 면담</option>
                                           <option value="성과 면담">성과 면담</option>
                                           <option value="관계 관리 면담">관계 관리 면담</option>
                                           <option value="개인사 면담">개인사 면담</option>
                                           <option value="기타 면담">기타 면담</option>
                                           <option value="미지정">미지정</option>
                                       </select>
                                   </div>
                               </div>
                               
                               <div className="mb-4">
                                   <label className="block text-sm font-bold text-gray-500 mb-1">면담 기록 메모</label>
                                   <textarea 
                                      value={content} 
                                      onChange={e=>setContent(e.target.value)} 
                                      rows={6} 
                                      className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none shadow-inner bg-slate-50"
                                      placeholder="면담 내용과 논의된 핵심 사항을 자유롭게 기록하세요..."
                                   ></textarea>
                               </div>
                               
                               {/* Todo List Add */}
                               <div>
                                   <label className="block text-sm font-bold text-gray-500 mb-1">To Do / 추후 확인 리스트 (Action Item)</label>
                                   <div className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
                                       <div className="flex gap-2 mb-3">
                                           <input 
                                              type="text" 
                                              value={newTodoText}
                                              onChange={e => setNewTodoText(e.target.value)}
                                              onKeyDown={(e) => {
                                                  if (e.key === 'Enter' && newTodoText.trim()) {
                                                      setWriteTodos([...writeTodos, {id: Date.now(), text: newTodoText.trim(), done: false}]);
                                                      setNewTodoText('');
                                                  }
                                              }}
                                              placeholder="추후 챙겨야 할 일 입력 후 Enter..."
                                              className="flex-1 text-sm border border-gray-200 rounded bg-gray-50 px-3 py-2 focus:outline-none focus:border-indigo-500"
                                           />
                                           <button 
                                              onClick={() => {
                                                  if (newTodoText.trim()) {
                                                      setWriteTodos([...writeTodos, {id: Date.now(), text: newTodoText.trim(), done: false}]);
                                                      setNewTodoText('');
                                                  }
                                              }}
                                              className="px-4 bg-[#6366F1] text-white rounded font-bold text-xs hover:bg-[#4F46E5]"
                                           >
                                              항목 추가
                                           </button>
                                       </div>
                                       
                                       <div className="space-y-1">
                                           {writeTodos.length === 0 ? (
                                               <div className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded border border-dashed border-gray-200">등록된 항목이 없습니다.</div>
                                           ) : (
                                               writeTodos.map(todo => (
                                                   <div key={todo.id} className="flex flex-row items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 group px-2 rounded">
                                                      <div className="flex flex-row gap-2.5 items-center text-gray-700">
                                                          <div className="text-gray-400 cursor-pointer" onClick={() => {
                                                              const t = writeTodos.map(x => x.id === todo.id ? {...x, done: !x.done} : x);
                                                              setWriteTodos(t);
                                                          }}>
                                                              {todo.done ? <CheckCircle2 size={18} className="text-emerald-500" /> : <div className="w-[18px] h-[18px] border-2 border-gray-300 rounded-full" />}
                                                          </div>
                                                          <span className={todo.done ? 'line-through text-gray-400 flex-1' : 'flex-1'}>{todo.text}</span>
                                                      </div>
                                                      <button 
                                                         className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 font-bold hover:bg-red-100"
                                                         onClick={() => setWriteTodos(writeTodos.filter(x => x.id !== todo.id))}
                                                      >삭제</button>
                                                   </div>
                                               ))
                                           )}
                                       </div>
                                   </div>
                               </div>
                           </div>
                           
                           <div className="flex justify-end pt-4 mt-6 border-t border-gray-100 gap-3">
                              {selectedRecordId && (
                                <button onClick={() => deleteFromSystem(selectedRecordId)} className="px-5 py-2.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-bold transition mr-auto">삭제</button>
                              )}
                              <button onClick={() => setIsWritingMode(false)} className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-bold transition">취소</button>
                              <button onClick={handleLogSubmit} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-sm transition">저장</button>
                           </div>

                           <div className="mt-8 pt-6 border-t-2 border-dashed border-[#E2E8F0]">
                               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4 mb-4">
                                  <h3 className="font-bold text-sm text-[#0F172A] flex items-center gap-2">
                                     <CalendarIcon size={16} className="text-[#64748B]" />
                                     이전 면담 기록 
                                     <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold text-xs ml-2">{previousInterviews.length}건</span>
                                  </h3>
                                  {previousInterviews.length > 0 && (
                                     <div className="flex gap-1 text-xs">
                                       {['date', 'name'].map(key => (
                                         <button 
                                           key={key} 
                                           onClick={() => handleInnerSort(key as any)}
                                           className={`px-2 py-1 rounded border font-bold transition-colors ${innerSortConfig.key === key ? 'bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A]' : 'border-transparent text-[#64748B] hover:bg-gray-50'}`}
                                         >
                                           {key === 'date' ? '최신순' : '이름순'}
                                           {innerSortConfig.key === key && (innerSortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                                         </button>
                                       ))}
                                     </div>
                                  )}
                               </div>
                               {previousInterviews.length === 0 ? (
                                   <div className="text-xs text-[#94A3B8] text-center py-8 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">과거 면담 기록이 없습니다.</div>
                               ) : (
                                   <div className="space-y-4">
                                      {innerPaginatedInterviews.map(intv => (
                                          <div key={intv.id} className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm text-sm hover:border-[#CBD5E1] transition-colors relative cursor-pointer group" onClick={() => openLogModal(intv.id, intv.pId, intv.content, intv.category, intv.todos)}>
                                              <div className="flex justify-between items-start mb-3">
                                                  <div className="font-bold text-[#0F172A] flex items-center gap-2">
                                                      <span className={`px-2 py-0.5 rounded text-xs border ${intv.status === 'Scheduled' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>{intv.status === 'Scheduled' ? '일정 예약됨' : '면담 완료'}</span>
                                                      {intv.category || '미지정'}
                                                  </div>
                                                  <div className="flex items-center gap-3">
                                                      <div className="text-xs text-[#64748B] font-bold">
                                                          {intv.actualDate ? intv.actualDate.substring(0, 16).replace('T', ' ') : (intv.date ? intv.date.substring(0, 16).replace('T', ' ') : '')}
                                                      </div>
                                                      <button onClick={(e) => { e.stopPropagation(); deleteFromSystem(intv.id); }} className="text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors opacity-0 group-hover:opacity-100">삭제</button>
                                                  </div>
                                              </div>
                                              <div className="text-[#475569] whitespace-pre-wrap leading-relaxed mt-2 p-3 bg-[#F8FAFC] rounded-lg">
                                                  {intv.content || (intv.status === 'Scheduled' ? '아직 면담 기록이 작성되지 않았습니다.' : '내용 없음')}
                                              </div>
                                              {intv.todos && intv.todos.length > 0 && (
                                                  <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
                                                      <h4 className="text-xs font-bold text-[#64748B] mb-2 uppercase tracking-wider">To Do</h4>
                                                      <div className="space-y-1.5">
                                                          {intv.todos.map((todo: any) => (
                                                              <div key={todo.id} className="flex items-center gap-2 text-xs">
                                                                  <CheckCircle2 size={14} className={todo.done ? 'text-emerald-500' : 'text-gray-300'} />
                                                                  <span className={todo.done ? 'line-through text-gray-400' : 'text-[#475569]'}>{todo.text}</span>
                                                              </div>
                                                          ))}
                                                      </div>
                                                  </div>
                                              )}
                                              <div className="absolute top-2 left-0 bottom-2 w-1 bg-indigo-500 rounded-r opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </div>
                                      ))}
                                      {innerTotalPages > 1 && (
                                          <div className="pt-2 flex justify-center items-center gap-2">
                                            <button 
                                              onClick={() => setInnerCurrentPage(p => Math.max(1, p - 1))}
                                              disabled={innerCurrentPage === 1}
                                              className="px-2 py-1 border rounded text-xs bg-white disabled:opacity-50"
                                            >
                                              이전
                                            </button>
                                            <span className="text-xs font-bold text-[#475569] px-2">
                                               {innerCurrentPage} / {innerTotalPages}
                                            </span>
                                            <button 
                                              onClick={() => setInnerCurrentPage(p => Math.min(innerTotalPages, p + 1))}
                                              disabled={innerCurrentPage === innerTotalPages}
                                              className="px-2 py-1 border rounded text-xs bg-white disabled:opacity-50"
                                            >
                                              다음
                                            </button>
                                          </div>
                                      )}
                                   </div>
                               )}
                           </div>
                        </div>
                    ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200 py-20 animate-in fade-in">
                           <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
                               <Search size={28} className="text-blue-500" />
                           </div>
                           <h4 className="text-sm font-bold text-slate-700 mb-1">면담 대상자를 먼저 선택해주세요</h4>
                           <p className="text-xs text-slate-400 text-center leading-relaxed">
                               좌측에서 면담 대상자(직원)를 찾아 선택하면<br/>
                               해당 인원의 면담 기록 폼이 활성화됩니다.
                           </p>
                        </div>
                    )}
                 </div>
             </div>
          </div>
      )}

      {alerts.length > 0 && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((a, i) => (
                <div key={i} className={`p-4 rounded-xl border flex gap-3 ${a.type === 'upcoming' ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                    <AlertCircle size={20} className={`shrink-0 ${a.type === 'upcoming' ? 'text-indigo-600' : 'text-red-600'}`}/>
                    <div className="flex-1 text-sm pt-0.5">
                       {a.msg}
                       {a.type === 'overdue' && (
                           <div className="mt-2 text-right">
                              <button onClick={() => openLogModal(a.recordId, a.pId)} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded font-bold">면담 기록하기</button>
                           </div>
                       )}
                    </div>
                </div>
            ))}
         </div>
      )}


      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
        <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-4 text-sm w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80" ref={searchContainerRef}>
              <div className={`flex items-center border border-[#E2E8F0] rounded-lg bg-white shadow-sm focus-within:border-[#6366F1] focus-within:ring-1 focus-within:ring-[#6366F1] transition-shadow ${activeFilter ? 'pl-2' : 'pl-10'} pr-4 py-1.5`}>
                {!activeFilter && <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />}
                
                {activeFilter && (
                  <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold mr-2">
                    {activeFilter.type === 'dept' ? '본부' : activeFilter.type === 'team' ? '팀' : '이름'}: {activeFilter.value}
                    <button onClick={() => setActiveFilter(null)} className="hover:text-indigo-900 ml-1 opacity-70 hover:opacity-100">
                      <X size={12} />
                    </button>
                  </span>
                )}

                <input
                  type="text"
                  placeholder={activeFilter ? "" : "본부, 팀, 이름 또는 내용 검색..."}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  className="w-full bg-transparent focus:outline-none py-0.5 text-sm"
                />
              </div>

              {isSearchFocused && !activeFilter && (searchTerm || matchedDepts.length > 0 || matchedTeams.length > 0 || matchedNames.length > 0) && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-[#E2E8F0] rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                  {matchedDepts.length > 0 && (
                    <div className="py-2">
                      <div className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">본부</div>
                      {matchedDepts.map(d => (
                        <div 
                          key={d} 
                          onClick={() => { setActiveFilter({type: 'dept', value: d}); setSearchTerm(''); setIsSearchFocused(false); }}
                          className="px-4 py-1.5 hover:bg-gray-50 cursor-pointer text-sm font-medium text-gray-700"
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                  )}
                  {matchedTeams.length > 0 && (
                    <div className="py-2 border-t border-gray-100">
                      <div className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">팀</div>
                      {matchedTeams.map(t => (
                        <div 
                          key={t} 
                          onClick={() => { setActiveFilter({type: 'team', value: t}); setSearchTerm(''); setIsSearchFocused(false); }}
                          className="px-4 py-1.5 hover:bg-gray-50 cursor-pointer text-sm font-medium text-gray-700"
                        >
                          {t}
                        </div>
                      ))}
                    </div>
                  )}
                  {matchedNames.length > 0 && (
                    <div className="py-2 border-t border-gray-100">
                      <div className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">이름</div>
                      {matchedNames.map(n => (
                        <div 
                          key={n} 
                          onClick={() => { setActiveFilter({type: 'name', value: n}); setSearchTerm(''); setIsSearchFocused(false); }}
                          className="px-4 py-1.5 hover:bg-gray-50 cursor-pointer text-sm font-medium text-gray-700 flex items-center gap-2"
                        >
                          <User size={14} className="text-gray-400"/>
                          {n}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
            <div className="text-sm font-bold text-[#475569]">
              총 <span className="text-[#6366F1]">{filtered.length}건</span>의 기록
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterTeam}
                onChange={(e) => { setFilterTeam(e.target.value); setCurrentPage(1); }}
                className="text-xs px-2 py-1.5 border border-[#E2E8F0] rounded bg-white text-[#475569] focus:outline-none"
              >
                <option value="all">부서/팀 전체</option>
                {Array.from(new Set(interviews.map(i => `${i.department} ${i.team || ''}`.trim()))).sort().map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>

              <select
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                className="text-xs px-2 py-1.5 border border-[#E2E8F0] rounded bg-white text-[#475569] focus:outline-none"
              >
                <option value="all">유형 전체</option>
                {['목표 관리 면담', '성과 면담', '관계 관리 면담', '개인사 면담', '기타 면담', '미지정'].map(val => (
                   <option key={val} value={val}>{val}</option>
                ))}
              </select>

              {filtered.length > 0 && (
                <div className="flex gap-2 text-xs border-l border-[#E2E8F0] pl-2 ml-2">
                  {['date', 'name'].map(key => (
                    <button 
                      key={key} 
                      onClick={() => handleSort(key as any)}
                      className={`px-3 py-1.5 rounded-lg border font-bold transition-colors ${sortConfig.key === key ? 'bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A]' : 'border-transparent text-[#64748B] hover:bg-gray-50'}`}
                    >
                      {key === 'date' ? '최신순' : '이름순'}
                      {sortConfig.key === key && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="divide-y divide-[#E2E8F0]">
          {paginatedInterviews.length > 0 ? paginatedInterviews.map((intv, idx) => (
            <div key={idx} className="p-5 hover:bg-gray-50 transition-colors flex flex-col md:flex-row gap-6">
              <div className="md:w-[200px] shrink-0 border-r border-[#E2E8F0] pr-6 border-dashed">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${growthColor(intv.growthStage).bg} ${growthColor(intv.growthStage).text}`}>
                    {intv.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-[#0F172A]">{intv.name}</div>
                    <div className="text-sm text-[#475569]">
                        {intv.department} {intv.team ? `> ${intv.team}` : ''} / {intv.role}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  <div className="inline-flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded text-sm text-[#475569] font-medium">
                    <CalendarIcon size={12} /> {(intv.status === 'Completed' && intv.actualDate) ? intv.actualDate.substring(0, 16).replace('T', ' ') : (intv.date ? intv.date.substring(0, 16).replace('T', ' ') : '')}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-bold ${intv.status === 'Scheduled' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                     {intv.status === 'Scheduled' ? '일정 예약됨' : '면담 완료'}
                  </div>
                </div>
              </div>
              
              <div className="flex-1 space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-sm flex items-center gap-2 text-[#0F172A]">
                    <MessageSquare size={16} className="text-[#3B82F6]" /> 
                    {intv.category && intv.category !== '미지정' ? `[${intv.category}] 면담기록 요약` : '면담기록 요약'}
                  </h3>
                  <div className="flex items-center gap-2">
                     <span className="text-xs uppercase font-bold text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full tracking-wider">
                       출처: {intv.source}
                     </span>
                     {intv.status === 'Scheduled' && (
                         <button onClick={() => openLogModal(intv.id, intv.pId)} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded font-bold hover:bg-blue-700 transition">결과 기록하기</button>
                     )}
                     {intv.status === 'Completed' && (
                         <>
                           <button onClick={() => { openLogModal(intv.id, intv.pId, intv.content, intv.category, intv.todos); }} className="text-sm bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded font-bold hover:bg-gray-50 transition">수정</button>
                           <button onClick={() => deleteFromSystem(intv.id)} className="text-sm bg-white border border-gray-200 text-red-500 px-3 py-1.5 rounded font-bold hover:bg-red-50 transition">삭제</button>
                         </>
                     )}
                  </div>
                </div>
                <div className={`bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl text-sm leading-relaxed relative before:absolute before:left-0 before:top-4 before:bottom-4 before:w-1 before:rounded-r overflow-hidden shadow-sm ${intv.status === 'Scheduled' ? 'text-gray-400 italic before:bg-orange-400' : 'text-[#475569] before:bg-blue-500'}`}>
                  {intv.status === 'Scheduled' ? '아직 면담 기록이 작성되지 않았습니다.' : intv.content.split('\n').map((line: string, i: number) => (
                     <p key={i} className="mb-1">{line}</p>
                  ))}
                  
                  {intv.todos && intv.todos.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-200">
                          <h4 className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wider">To Do (Action Items)</h4>
                          <div className="space-y-1.5">
                              {intv.todos.map((todo: any) => (
                                  <div key={todo.id} className="flex items-center gap-2 text-xs">
                                      {todo.done ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> : <div className="w-3.5 h-3.5 border-2 border-gray-300 rounded-full shrink-0" />}
                                      <span className={todo.done ? 'line-through text-gray-400' : 'text-gray-700 font-medium'}>{todo.text}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
                </div>
              </div>
            </div>
          )) : (
            <div className="py-20 text-center text-gray-400 flex flex-col items-center justify-center">
              <MessageSquare size={40} className="mb-4 text-gray-200" />
              <p>해당 조건의 면담 기록이 없습니다.</p>
            </div>
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#E2E8F0] flex justify-center items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border rounded-lg text-sm bg-white disabled:opacity-50"
            >
              이전
            </button>
            <span className="text-sm font-bold text-[#475569] px-4">
               {currentPage} / {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border rounded-lg text-sm bg-white disabled:opacity-50"
            >
              다음
            </button>
          </div>
        )}
      </div>
      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mb-20 animate-in fade-in zoom-in duration-200">
               <h2 className="text-lg font-bold mb-4">
                 {modalType === 'schedule' ? '새로운 면담 사전 예약' : (selectedRecordId ? '예약된 면담 기록 추가' : '면담 즉시 기록 등록')}
               </h2>
               
               <div className="space-y-4 text-sm">
                  <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">면담 대상자</label>
                      {modalType === 'log' && selectedRecordId ? (
                         <div className="w-full border rounded-lg p-2 bg-gray-50 text-gray-700">{getEmployees().find((r:any) => r.id === selectedRep)?.name}</div>
                      ) : (
                         <div className="relative">
                            <input 
                               type="text" 
                               placeholder="이름으로 검색"
                               value={modalNameSearch}
                               onChange={e => { setModalNameSearch(e.target.value); setIsDropdownOpen(true); }}
                               onFocus={() => setIsDropdownOpen(true)}
                               onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                               className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {isDropdownOpen && modalNameSearch && (
                                <div className="absolute z-10 w-full bg-white border border-gray-200 mt-1 rounded-lg max-h-40 overflow-y-auto shadow-lg">
                                    {getEmployees().filter((r:any) => r.name.toLowerCase().includes(modalNameSearch.toLowerCase())).map((r:any) => (
                                        <div key={r.id} onClick={() => { setSelectedRep(r.id); setModalNameSearch(r.name); setIsDropdownOpen(false); }} className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm">
                                            {r.name} ({r.department} {r.team})
                                        </div>
                                    ))}
                                </div>
                            )}
                         </div>
                      )}
                      
                      {selectedRep && (
                          <div className="grid grid-cols-3 gap-2 mt-2">
                              <div>
                                  <label className="block text-xs text-gray-400 mb-0.5">본부</label>
                                  <div className="text-xs bg-gray-100 p-2 rounded border border-gray-200 text-gray-700 font-medium">{getEmployees().find((r: any) => r.id === selectedRep)?.department || '-'}</div>
                              </div>
                              <div>
                                  <label className="block text-xs text-gray-400 mb-0.5">팀</label>
                                  <div className="text-xs bg-gray-100 p-2 rounded border border-gray-200 text-gray-700 font-medium">{getEmployees().find((r: any) => r.id === selectedRep)?.team || '-'}</div>
                              </div>
                              <div>
                                  <label className="block text-xs text-gray-400 mb-0.5">이름</label>
                                  <div className="text-xs bg-gray-100 p-2 rounded border border-gray-200 text-gray-700 font-bold">{getEmployees().find((r: any) => r.id === selectedRep)?.name || '-'}</div>
                              </div>
                          </div>
                      )}
                  </div>

                  {modalType === 'schedule' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="block text-xs font-bold text-gray-600 mb-1">날짜</label>
                           <input type="date" value={scheduleDate} onChange={e=>setScheduleDate(e.target.value)} className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-600 mb-1">시간</label>
                           <input type="time" value={scheduleTime} onChange={e=>setScheduleTime(e.target.value)} className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        </div>
                      </div>
                  )}

                  <div>
                     <label className="block text-xs font-bold text-gray-600 mb-1">면담 유형</label>
                     <select value={category} onChange={e=>setCategory(e.target.value as any)} className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                         <option value="목표 관리 면담">목표 관리 면담</option>
                         <option value="성과 면담">성과 면담</option>
                         <option value="관계 관리 면담">관계 관리 면담</option>
                         <option value="개인사 면담">개인사 면담</option>
                         <option value="기타 면담">기타 면담</option>
                         <option value="미지정">미지정</option>
                     </select>
                  </div>

                  {modalType === 'log' && (
                     <div>
                         <label className="block text-xs font-bold text-gray-600 mb-1">면담 상세 기록</label>
                         <textarea value={content} onChange={e=>setContent(e.target.value)} rows={5} className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="면담 내용을 요약해서 작성해주세요..."></textarea>
                     </div>
                  )}
               </div>

               <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg font-bold text-gray-600 hover:bg-gray-50">취소</button>
                  {modalType === 'schedule' ? (
                      <button onClick={handleScheduleSubmit} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">캘린더 등록 (예약)</button>
                  ) : (
                      <button onClick={handleLogSubmit} className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">기록 완료</button>
                  )}
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
