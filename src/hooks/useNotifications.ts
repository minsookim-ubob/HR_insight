import { useState, useEffect } from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'interview' | 'kpi' | 'survey' | 'info';
  link: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // This would ideally fetch from a real backend/Firestore
    const checkNotifications = () => {
      const newAlerts: Notification[] = [];
      
      // 1. Check Interviews (Mock local logic for now)
      // (This should be shared logic with Interviews page)
      
      // 2. Check KPI Approvals (Mock)
      // Usually would check a status in DB like 'pending'
      
      // Temporary mocked alerts to satisfy the user's request for "useful" features
      newAlerts.push({
        id: '1',
        title: '면담 일정 알림',
        message: '김철수 님의 면담 예정일이 지났습니다.',
        type: 'interview',
        link: '/interviews'
      });
      newAlerts.push({
        id: '2',
        title: 'KPI 승인 요청',
        message: '이영희 님이 KPI 승인을 요청했습니다.',
        type: 'kpi',
        link: '/kpi/approvals'
      });
      
      setNotifications(newAlerts);
    };

    checkNotifications();
  }, []);

  return notifications;
}
