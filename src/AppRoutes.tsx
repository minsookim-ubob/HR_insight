import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Trash from './pages/Trash';
import MySettings from './pages/MySettings';
import TeamRoster from './pages/TeamRoster';
import PlaceholderPage from './pages/PlaceholderPage';
import SurveyQuestionPools from './pages/admin/SurveyQuestionPools';
import SurveyMappings from './pages/admin/SurveyMappings';
import SurveySessions from './pages/admin/SurveySessions';
import SurveyStatus from './pages/insights/SurveyStatus';
import SurveyExecute from './pages/survey/SurveyExecute';
import SelfSurveyExecute from './pages/survey/SelfSurveyExecute';
import Employees from './pages/admin/Employees';
import Departments from './pages/admin/Departments';
import Roles from './pages/admin/Roles';
import MenuPermissions from './pages/admin/MenuPermissions';
import SelfSurveys from './pages/admin/SelfSurveys';
import HrInsightSettings from './pages/admin/HrInsightSettings';
import SmtpSettings from './pages/admin/SmtpSettings';
import KpiDebugger from './pages/admin/KpiDebugger';
import SystemManager from './pages/admin/SystemManager';
import KpiSessions from './pages/admin/KpiSessions';
import Login from './pages/Login';
import ForcePasswordChange from './pages/ForcePasswordChange';
import Interviews from './pages/Interviews';
import Workload from './pages/insights/Workload';
import AiInsights from './pages/insights/AiInsights';
import { useAuth } from './contexts/AuthContext';

import KpiApprovals from './pages/kpi/KpiApprovals';
import PerformanceEvaluation from './pages/kpi/PerformanceEvaluation';
import PublicMyKpi from './pages/kpi/PublicMyKpi';
import PublicProfileUpdate from './pages/PublicProfileUpdate';

export default function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/evaluate/:mappingId" element={<SurveyExecute />} />
        <Route path="/self-evaluate/:userId" element={<SelfSurveyExecute />} />
        <Route path="/kpi/public/:token" element={<PublicMyKpi />} />
        <Route path="/profile-update/:email" element={<PublicProfileUpdate />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (user.mustChangePassword) {
    return <ForcePasswordChange />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* VIEWER 섹션 */}
        <Route index element={<Navigate to="/team" replace />} />
        <Route path="team" element={<TeamRoster />} />
        <Route path="interviews" element={<Interviews />} />
        <Route path="trash" element={<Trash />} />
        
        {/* KPI 프로세스 */}
        <Route path="kpi">
           <Route path="approvals" element={<KpiApprovals />} />
           <Route path="evaluation" element={<PerformanceEvaluation />} />
        </Route>
        
        {/* Insight 섹션 */}
        <Route path="workload" element={<Workload />} />
        <Route path="ai-insights" element={<AiInsights />} />
        <Route path="survey-status" element={<SurveyStatus />} />
        <Route path="settings" element={<MySettings />} />
        
        {/* DATA MANAGEMENT 섹션 */}
        <Route path="admin" >
          <Route path="departments" element={<Departments />} />
          <Route path="employees" element={<Employees />} />
          <Route path="roles" element={<Roles />} />
          <Route path="menus" element={<MenuPermissions />} />
          <Route path="kpi-sessions" element={<KpiSessions />} />
          <Route path="question-pools" element={<SurveyQuestionPools />} />
          <Route path="self-surveys" element={<SelfSurveys />} />
          <Route path="survey-mappings" element={<SurveyMappings />} />
          <Route path="survey-sessions" element={<SurveySessions />} />
          <Route path="hr-insight" element={<HrInsightSettings />} />
          <Route path="smtp-settings" element={<SmtpSettings />} />
          <Route path="kpi-debugger" element={<KpiDebugger />} />
          <Route path="system-manager" element={<SystemManager />} />
        </Route>

        <Route path="*" element={<PlaceholderPage title="준비 중인 기능입니다" />} />
      </Route>

      {/* 독립된 다면진단 실행 페이지 */}
      <Route path="/evaluate/:mappingId" element={<SurveyExecute />} />
      
      {/* 독립된 자가진단 실행 페이지 */}
      <Route path="/self-evaluate/:userId" element={<SelfSurveyExecute />} />
      
      {/* 외부용 KPI 제출 페이지 */}
      <Route path="/kpi/public/:token" element={<PublicMyKpi />} />
      
      {/* 외부용 프로필 수정 페이지 */}
      <Route path="/profile-update/:email" element={<PublicProfileUpdate />} />

      {/* Fallback to Home if logged in and trying to access login */}
      <Route path="/login" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
