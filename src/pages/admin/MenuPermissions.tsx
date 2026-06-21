import React, { useState, useEffect } from 'react';
import { Save, ShieldCheck, ListTree } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export interface RoleMenuPermission {
  id: string;
  role: string;
  menuId: string;
  menuName: string;
  category: string;
  canAccess: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

const ROLES = ['MASTER', 'ADMIN', 'HR(인사담당자)', 'TEAM_LEADER', 'USER'];

const MENUS = [
  { id: 'admin_roles', name: '역할/권한 마스터 관리', category: 'HR 마스터 데이터' },
  { id: 'admin_menus', name: '메뉴 접근 관리', category: 'HR 마스터 데이터' },
  { id: 'admin_depts', name: '조직/부서 관리', category: 'HR 마스터 데이터' },
  { id: 'admin_emps', name: '임직원 관리', category: 'HR 마스터 데이터' },
  
  { id: 'kpi_master', name: 'KPI 마스터 템플릿', category: '업적/평가' },
  { id: 'kpi_sessions', name: 'KPI 수립 회차 관리', category: '업적/평가' },
  { id: 'kpi_mail', name: 'KPI 수립 대상자 요청', category: '업적/평가' },
  { id: 'kpi_approvals', name: '팀원 KPI 목표 합의/결재', category: '업적/평가' },
  { id: 'kpi_my', name: 'KPI 목표관리(개인)', category: '업적/평가' },
  
  { id: 'survey_master', name: '다면진단 마스터 관리', category: '역량/진단' },
  { id: 'survey_sessions', name: '다면진단 회차 관리', category: '역량/진단' },
  { id: 'survey_status', name: '다면진단 진행 현황', category: '역량/진단' },
  
  { id: 'dashboard', name: 'Dashboard', category: '조직 현황' },
  { id: 'team', name: '팀원 현황', category: '조직 현황' },
  { id: 'interviews', name: '면담 관리', category: '조직 현황' },
];

export default function MenuPermissions() {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [permissions, setPermissions] = useState<RoleMenuPermission[]>([]);

  // Initialize permissions
  useEffect(() => {
    const saved = localStorage.getItem('system_menu_permissions');
    if (saved) {
      setPermissions(JSON.parse(saved));
    } else {
      const initial: RoleMenuPermission[] = [];
      ROLES.forEach(r => {
        MENUS.forEach(m => {
          initial.push({
            id: `${r}_${m.id}`,
            role: r,
            menuId: m.id,
            menuName: m.name,
            category: m.category,
            canAccess: r === 'MASTER' || r === 'ADMIN', // default open for MASTER/ADMIN
            canCreate: r === 'MASTER',
            canUpdate: r === 'MASTER',
            canDelete: r === 'MASTER',
          });
        });
      });
      setPermissions(initial);
      localStorage.setItem('system_menu_permissions', JSON.stringify(initial));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('system_menu_permissions', JSON.stringify(permissions));
    alert('권한 설정이 저장되었습니다.');
  };

  const togglePermission = (permId: string, field: 'canAccess' | 'canCreate' | 'canUpdate' | 'canDelete') => {
    setPermissions(prev => prev.map(p => {
      if (p.id === permId) {
        const next = { ...p, [field]: !p[field] };
        // if access is revoked, revoke all
        if (field === 'canAccess' && !next.canAccess) {
          next.canCreate = false;
          next.canUpdate = false;
          next.canDelete = false;
        }
        // if anything else is granted, access must be granted
        if (field !== 'canAccess' && next[field]) {
          next.canAccess = true;
        }
        return next;
      }
      return p;
    }));
  };

  if (!user?.isMaster) {
    return <div className="p-10 text-center font-bold text-red-500">MASTER 권한만 접근 가능합니다.</div>;
  }

  const currentRolePerms = permissions.filter(p => p.role === selectedRole);
  
  // Group by category
  const grouped: Record<string, RoleMenuPermission[]> = {};
  currentRolePerms.forEach(p => {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">메뉴 접근 관리</h1>
          <p className="text-sm text-[#475569] mt-1">역할(Role)에 따른 메뉴 접근 및 기능(조회/작성/수정/삭제) 권한을 관리합니다.</p>
        </div>
        <button 
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#6366F1] text-white text-sm font-bold rounded-lg hover:bg-[#4F46E5] transition-colors shadow-sm shrink-0"
        >
          <Save size={16} /> 변경사항 저장
        </button>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Sidebar Roles */}
        <div className="w-full md:w-64 bg-[#F8FAFC] border-b md:border-b-0 md:border-r border-[#E2E8F0] p-4 flex flex-col gap-2">
           <div className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
              <ShieldCheck size={14} /> 권한 그룹 (Roles)
           </div>
           {ROLES.map(r => (
              <button 
                key={r}
                onClick={() => setSelectedRole(r)}
                className={`text-left px-4 py-3 rounded-lg font-bold text-sm transition-colors ${selectedRole === r ? 'bg-[#0F172A] text-white shadow-md' : 'text-[#475569] hover:bg-gray-100'}`}
              >
                 {r}
              </button>
           ))}
        </div>
        
        {/* Content Permissions */}
        <div className="flex-1 p-6 overflow-y-auto">
           <div className="mb-6 pb-4 border-b border-[#E2E8F0]">
              <h2 className="text-xl font-extrabold text-[#0F172A] flex items-center gap-2">
                 <ListTree size={20} className="text-[#6366F1]" />
                 [{selectedRole}] 권한 상세 설정
              </h2>
           </div>
           
           <div className="space-y-8">
              {Object.keys(grouped).map(cat => (
                 <div key={cat} className="space-y-3">
                    <h3 className="font-bold text-[#475569] bg-slate-50 px-3 py-1.5 rounded text-sm inline-block">{cat}</h3>
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left text-sm text-[#0F172A]">
                         <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] font-bold text-[#64748B]">
                            <tr>
                               <th className="px-5 py-3 w-1/3">메뉴명</th>
                               <th className="px-5 py-3 text-center">접근(Read)</th>
                               <th className="px-5 py-3 text-center">작성(Create)</th>
                               <th className="px-5 py-3 text-center">수정(Update)</th>
                               <th className="px-5 py-3 text-center border-r-0">삭제(Delete)</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-[#E2E8F0]">
                            {grouped[cat].map(p => (
                               <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-5 py-3 font-medium text-gray-700">{p.menuName}</td>
                                  <td className="px-5 py-3 text-center">
                                     <input type="checkbox" checked={p.canAccess} onChange={() => togglePermission(p.id, 'canAccess')} className="w-4 h-4 text-[#6366F1] rounded cursor-pointer" />
                                  </td>
                                  <td className="px-5 py-3 text-center">
                                     <input type="checkbox" checked={p.canCreate} onChange={() => togglePermission(p.id, 'canCreate')} className="w-4 h-4 text-[#6366F1] rounded cursor-pointer" />
                                  </td>
                                  <td className="px-5 py-3 text-center">
                                     <input type="checkbox" checked={p.canUpdate} onChange={() => togglePermission(p.id, 'canUpdate')} className="w-4 h-4 text-[#6366F1] rounded cursor-pointer" />
                                  </td>
                                  <td className="px-5 py-3 text-center">
                                     <input type="checkbox" checked={p.canDelete} onChange={() => togglePermission(p.id, 'canDelete')} className="w-4 h-4 text-red-500 border-gray-300 rounded cursor-pointer" />
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
