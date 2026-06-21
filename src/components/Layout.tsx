import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Target, Activity, Settings, 
  MessageSquare, Search, Bell, Sparkles, Building2, Key,
  ClipboardList, ListTree, Combine, BarChart3, Mail, ChevronDown, ChevronRight, Contact, ShieldCheck, FileKey2, Menu, LogOut, User, Calendar, Network, Award, FileText, X, Trash2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';

// ... (NavItem, NavGroup remain the same)
// [I need to show the full file to properly edit, but I'll use multi_edit_file to minimize risk or do it simply]

// Actually, I'll use multi_edit_file to add the logic in Layout.tsx

function NavItem({ icon, label, to, badge, isSubItem }: { icon: React.ReactNode, label: string, to: string, badge?: string, isSubItem?: boolean }) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => 
        `flex items-center justify-between py-2.5 rounded-lg transition-colors group ${isSubItem ? 'pl-9 pr-3 text-[12px]' : 'px-3 text-[13px]'} ${isActive ? 'bg-[#EEF2FF] text-[#4F46E5] font-bold' : 'text-[#475569] font-medium hover:bg-gray-50 hover:text-[#0F172A]'}`
      }
    >
      {({ isActive }) => (
        <>
          <div className="flex items-center gap-3">
            {!isSubItem && <span className={`${isActive ? 'text-[#6366F1]' : 'text-[#94A3B8] group-hover:text-[#475569]'} transition-colors`}>{icon}</span>}
            {isSubItem && <span className={`${isActive ? 'text-[#6366F1]' : 'text-[#CBD5E1] group-hover:text-[#94A3B8]'} transition-colors`}>•</span>}
            <span>{label}</span>
          </div>
          {badge && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#6366F1] text-white tracking-wide">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function NavGroup({ icon, label, children, defaultOpen = false }: { icon: React.ReactNode, label: string, children: React.ReactNode, defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col mb-2 mt-1">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-[#1E293B] hover:bg-gray-50 hover:text-[#0F172A] w-full text-left"
      >
        <div className="flex items-center gap-3 font-bold text-[14px]">
          <span className="text-[#64748B] group-hover:text-[#475569] transition-colors">{icon}</span>
          <span>{label}</span>
        </div>
        {isOpen ? <ChevronDown size={14} className="text-[#94A3B8]" /> : <ChevronRight size={14} className="text-[#94A3B8]" />}
      </button>
      {isOpen && (
        <div className="flex flex-col mt-0.5 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  );
}export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notifications = useNotifications();

  const getPageTitle = (pathname: string) => {
    switch(pathname) {
      case '/team': return '팀원 현황 (Viewer)';
      case '/interviews': return '면담 기록';
      case '/kpi': return '조직 KPI 성과';
      case '/kpi/approvals': return '조직원의 KPI 승인 현황을 파악하고 상세 내역을 결재합니다.';
      case '/kpi/my': return '개별 KPI 수립/목표 관리 개인 창구';
      case '/kpi/evaluation': return 'KPI 업적 성과평가 통합 포털';
      case '/admin/kpi-sessions': return '개인 KPI 수립 마스터 (회차/템플릿/발송)';
      case '/survey-status': return '다면진단 현황';
      case '/workload': return '업무 현황';
      case '/ai-insights': return 'AI 분석';
      case '/settings': return '개인 설정';
      
      case '/admin/departments': return '본부/팀 마스터 관리';
      case '/admin/employees': return '임직원 데이터 관리';
      case '/admin/roles': return '역할/권한 마스터 관리';
      case '/admin/menus': return '메뉴 접근 관리';
      case '/admin/survey-sessions': return '진단/평가 마스터 관리';
      case '/admin/surveys': return '다면진단 문항 풀(Pool) 관리';
      case '/admin/survey-mappings': return '다면진단 매핑 관리';
      case '/admin/email-settings': return '다면진단 메일 템플릿 관리';
      case '/admin/hr-insight': return 'HR 인사이트 발송 설정';
      case '/admin/system-manager': return '시스템 코드 및 문서 관리';

      default: return 'SalesIQ HR';
    }
  };

  const getPageSubtitle = (pathname: string) => {
    if (pathname.startsWith('/admin')) {
      return '시스템 마스터 데이터 및 운영 설정';
    }
    switch(pathname) {
      case '/team': return '팀원의 역량과 성장 단계를 한눈에 확인하세요.';
      case '/interviews': return '1:1 면담 이력과 다음 행동 계획을 관리합니다.';
      case '/kpi': return '조직별 KPI 달성 현황입니다.';
      case '/kpi/my': return '본인의 목표와 실적을 관리하고 승인을 요청합니다.';
      case '/kpi/approvals': return '조직원의 KPI 목표 및 실적을 검토하고 다단계 승인을 진행합니다.';
      case '/kpi/evaluation': return '자가 실적 기재부터 팀장 1차 심사, 본부장 2차 최종 확정 등급 부여까지 하나의 화면에서 다단계 고과를 연동 수행합니다.';
      case '/admin/kpi-sessions': return '임직원 개인별 KPI 목표 수립 과정(기본 설정, 지표 설정, 대상자 메일 발송)을 통합하여 관리합니다.';
      case '/admin/hr-insight': return 'MASTER 권한자에게 데일리로 발송되는 AI HR 인사이트 발송 시간을 설정하고 테스트합니다.';
      case '/admin/system-manager': return '시스템 코드의 관리 및 업데이트와 필수 문서 관리를 수행합니다.';
      case '/survey-status': return '2026년 상반기 다면진단 진행 현황입니다.';
      case '/workload': return '업무 부하 상태를 파악하고 배분을 최적화하세요.';
      case '/ai-insights': return '퇴사 및 번아웃 리스크에 대한 AI의 예측입니다.';
      case '/settings': return '개인 환경 설정 및 서비스 연동 설정을 관리합니다.';
      default: return '';
    }
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#F8FAFC] font-sans text-[#475569]">
      {/* Header */}
      <header className="bg-white border-b border-[#E2E8F0] h-16 flex items-center justify-between px-6 shrink-0 z-10 relative">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors hidden md:block"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 font-bold text-lg text-[#0F172A] tracking-tight">
            <div className="w-8 h-8 bg-[#6366F1] rounded-lg flex items-center justify-center text-white shadow-sm">
              <Activity size={18} strokeWidth={2.5} />
            </div>
            <span>SalesIQ</span>
            <span className="text-[#94A3B8] font-normal text-sm ml-2 hidden sm:inline">HR Insight System</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-[#94A3B8] hover:text-[#475569] relative transition-colors" onClick={() => setIsNotificationOpen(!isNotificationOpen)}>
            <Bell size={20} />
            {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#DC2626] rounded-full border-2 border-white"></span>}
          </button>
          
          {isNotificationOpen && (
            <div className="absolute top-16 right-20 w-80 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="font-bold text-sm">알림 ({notifications.length})</h3>
                 <button onClick={() => setIsNotificationOpen(false)}><X size={16}/></button>
               </div>
               <div className="space-y-3">
                 {notifications.map(n => (
                   <NavLink key={n.id} to={n.link} className="block p-3 hover:bg-gray-50 rounded-lg text-sm" onClick={() => setIsNotificationOpen(false)}>
                     <div className="font-bold text-xs">{n.title}</div>
                     <div className="text-gray-500 text-xs mt-0.5">{n.message}</div>
                   </NavLink>
                 ))}
               </div>
            </div>
          )}
          
          <div className="flex items-center gap-3 border-l border-[#E2E8F0] pl-4 ml-1">
            <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm font-bold text-[#0F172A]">{user?.id || '사용자'}</span>
                {user?.isMaster && <span className="text-[10px] font-bold text-[#4F46E5] bg-indigo-50 px-1.5 py-0.5 rounded">Master</span>}
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#4F46E5] flex items-center justify-center text-white font-bold shadow-sm shrink-0">
              {user?.id?.charAt(0).toUpperCase() || 'U'}
            </div>
            <NavLink to="/settings" className="p-1.5 text-[#94A3B8] hover:text-[#4F46E5] hover:bg-indigo-50 rounded-lg transition-colors ml-1" title="개인 설정">
              <Settings size={18} />
            </NavLink>
            <button 
              onClick={logout}
              className="p-1.5 text-[#94A3B8] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1"
              title="로그아웃"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Body Wrap */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar */}
        <aside className={`bg-white border-r border-[#E2E8F0] flex-col hidden md:flex min-h-0 z-0 overflow-y-auto transition-all duration-300 w-64 ${isSidebarOpen ? 'translate-x-0 ml-0' : '-translate-x-full -ml-64'}`}>
          <nav className="p-4 space-y-1.5 flex-1 w-full box-border">
            <NavGroup icon={<LayoutDashboard size={18} />} label="영업본부 인사이트" defaultOpen={true}>
              <NavItem to="/team" icon={<Users size={18} />} label="팀원 현황" isSubItem={true} />
              <NavItem to="/interviews" icon={<MessageSquare size={18} />} label="면담 기록" isSubItem={true} />
              <NavItem to="/survey-status" icon={<BarChart3 size={18} />} label="다면진단 현황" isSubItem={true} />
            </NavGroup>

            <NavGroup icon={<Target size={18} />} label="KPI 평가 프로세스">
              <NavItem to="/admin/kpi-sessions" icon={<Calendar size={18} />} label="KPI 수립 프로세스" isSubItem={true} />
              <NavItem to="/kpi/approvals" icon={<ShieldCheck size={18} />} label="KPI 승인 현황" isSubItem={true} />
              <NavItem to="/kpi/evaluation" icon={<Award size={18} />} label="KPI 업적 성과평가" isSubItem={true} />
            </NavGroup>
            
            {/* 진단/평가 마스터 관리 */}
            <NavGroup icon={<ClipboardList size={18} />} label="진단/평가 마스터 관리">
              <NavItem to="/admin/survey-sessions" icon={<Calendar size={18} />} label="진단/평가 마스터 운영" isSubItem={true} />
              <NavItem to="/admin/question-pools" icon={<FileText size={18} />} label="진단 문항 풀(Pool) 관리" isSubItem={true} />
            </NavGroup>

            {/* 인원 관리 */}
            <NavGroup icon={<Contact size={18} />} label="인원 관리">
              <NavItem to="/admin/departments" icon={<Building2 size={18} />} label="본부/팀 (부서 관리)" isSubItem={true} />
              <NavItem to="/admin/employees" icon={<Users size={18} />} label="임직원 마스터" isSubItem={true} />
            </NavGroup>

            {/* 권한 관리 */}
            <NavGroup icon={<ShieldCheck size={18} />} label="권한 관리">
              <NavItem to="/admin/roles" icon={<Key size={18} />} label="역할 및 권한 관리" isSubItem={true} />
              <NavItem to="/admin/menus" icon={<ListTree size={18} />} label="메뉴 접근 관리" isSubItem={true} />
            </NavGroup>
            {/* 시스템 설정 */}
            <NavGroup icon={<Settings size={18} />} label="시스템 설정">
              <NavItem to="/admin/hr-insight" icon={<Sparkles size={18} />} label="HR 인사이트 메일 설정" isSubItem={true} />
              <NavItem to="/admin/smtp-settings" icon={<Mail size={18} />} label="SMTP 메일 서버 설정" isSubItem={true} />
              <NavItem to="/admin/system-manager" icon={<FileKey2 size={18} />} label="시스템 관리" isSubItem={true} />
              <NavItem to="/trash" icon={<Trash2 size={18} />} label="휴지통" isSubItem={true} />
            </NavGroup>

          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 relative bg-[#F8FAFC]">
          <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8">
            {/* Header Title */}
            <div>
              <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">{getPageTitle(location.pathname)}</h1>
              <p className="text-sm text-[#94A3B8] mt-1">{getPageSubtitle(location.pathname)}</p>
            </div>
            
            {/* Dynamic Content */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
