import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserAuth {
  id: string;
  passwordHash: string; // Plain password for simple mock
  isMaster: boolean;
  status: 'active' | 'blocked' | 'pending' | 'deleted';
  failedAttempts: number;
  mustChangePassword: boolean;
  resetRequestedAt: string | null;
  createdAt: string;
  history?: { date: string; action: string }[];
}

const INITIAL_USERS: UserAuth[] = [
  {
    id: 'hskim@ubob.com',
    passwordHash: '1234!', 
    isMaster: true,
    status: 'active',
    failedAttempts: 0,
    mustChangePassword: true,
    resetRequestedAt: null,
    createdAt: new Date().toISOString(),
    history: [{ date: new Date().toISOString(), action: 'Master account created' }]
  },
  {
    id: 'minsookim@ubob.com',
    passwordHash: '1234',
    isMaster: true,
    status: 'active',
    failedAttempts: 0,
    mustChangePassword: true,
    resetRequestedAt: null,
    createdAt: new Date().toISOString(),
    history: [{ date: new Date().toISOString(), action: 'Master account created' }]
  }
];

const PROTECTED_MASTER_ACCOUNTS: Record<string, string> = {
  'minsookim@ubob.com': '1234',
};

function ensureProtectedMasterAccounts(users: UserAuth[]): UserAuth[] {
  return users.map((u) => {
    const defaultPassword = PROTECTED_MASTER_ACCOUNTS[u.id];
    if (!defaultPassword) return u;

    const needsRepair =
      !u.isMaster ||
      u.status !== 'active' ||
      u.failedAttempts > 0 ||
      u.passwordHash === '1234!';

    if (!needsRepair) return u;

    return {
      ...u,
      passwordHash: defaultPassword,
      isMaster: true,
      status: 'active',
      failedAttempts: 0,
      resetRequestedAt: null,
    };
  });
}

interface AuthContextType {
  user: UserAuth | null;
  users: UserAuth[];
  login: (id: string, pw: string) => { success: boolean; error?: string; requirePwChange?: boolean };
  logout: () => void;
  changePassword: (newPw: string) => boolean;
  requestPasswordReset: (id: string) => { success: boolean; error?: string };
  // Admin methods
  addUser: (id: string) => boolean;
  resetUserPassword: (id: string) => void;
  approveUser: (id: string) => void;
  blockUser: (id: string) => void;
  unblockUser: (id: string) => void;
  deleteUser: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserAuth[]>(() => {
    const saved = localStorage.getItem('system_users');
    let initial = INITIAL_USERS;
    if (saved) {
      initial = JSON.parse(saved);
    }
    
    // 마스터 계정이 없을 경우만 기본 설정으로 추가
    const masterIdx = initial.findIndex((u: UserAuth) => u.id === 'hskim@ubob.com');
    if (masterIdx === -1) {
      initial.push({
        id: 'hskim@ubob.com',
        passwordHash: '1234!',
        isMaster: true,
        status: 'active',
        failedAttempts: 0,
        mustChangePassword: true,
        resetRequestedAt: null,
        createdAt: new Date().toISOString(),
        history: [{ date: new Date().toISOString(), action: 'Master fallback created' }]
      });
    }

    const minsooIdx = initial.findIndex((u: UserAuth) => u.id === 'minsookim@ubob.com');
    if (minsooIdx === -1) {
      initial.push({
        id: 'minsookim@ubob.com',
        passwordHash: '1234',
        isMaster: true,
        status: 'active',
        failedAttempts: 0,
        mustChangePassword: true,
        resetRequestedAt: null,
        createdAt: new Date().toISOString(),
        history: [{ date: new Date().toISOString(), action: 'Master fallback created' }]
      });
    }

    initial = ensureProtectedMasterAccounts(initial);
    
    localStorage.setItem('system_users', JSON.stringify(initial));
    
    return initial;
  });

  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(() => {
    const sessionStr = localStorage.getItem('login_session');
    if (!sessionStr) return null;
    
    try {
      const session = JSON.parse(sessionStr);
      if (Date.now() > session.expiresAt) {
        localStorage.removeItem('login_session');
        return null;
      }
      
      const targetUser = users.find(u => u.id === session.id);
      // 강제 로그아웃 (비밀번호 변경 대기상태에서 새로고침/재진입 시 로그인 화면으로 가도록)
      if (targetUser && targetUser.mustChangePassword) {
        localStorage.removeItem('login_session');
        return null;
      }
      return session.id;
    } catch(e) {
      return null;
    }
  });

  useEffect(() => {
    localStorage.setItem('system_users', JSON.stringify(users));
  }, [users]);

  const user = users.find(u => u.id === loggedInUserId) || null;

  const login = (id: string, pw: string) => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return { success: false, error: '본 시스템 접근 권한이 없습니다.' };

    if (targetUser.status === 'blocked') {
      return { success: false, error: '비밀번호 오류 3회 초과로 계정이 차단되었습니다. 마스터에게 문의하세요.' };
    }
    
    if (targetUser.status === 'pending') {
      return { success: false, error: '마스터의 승인 대기 중인 계정입니다.' };
    }

    if (targetUser.passwordHash !== pw) {
      const updatedUsers = users.map(u => {
        if (u.id === id) {
          const newFails = u.failedAttempts + 1;
          if (newFails >= 3) {
            alert(`[메일발송 알림] 마스터에게 알림: ${id} 계정이 비밀번호 3회 오입력으로 차단되었습니다.`);
            return { ...u, failedAttempts: newFails, status: 'blocked' as const };
          }
          return { ...u, failedAttempts: newFails };
        }
        return u;
      });
      setUsers(updatedUsers);
      return { success: false, error: '비밀번호가 일치하지 않습니다.' };
    }

    // Success
    const updatedUsers = users.map(u => u.id === id ? { ...u, failedAttempts: 0 } : u);
    setUsers(updatedUsers);
    
    // 1 hour expiry
    const sessionData = { id, expiresAt: Date.now() + 60 * 60 * 1000 };

    if (targetUser.mustChangePassword) {
      setLoggedInUserId(id);
      localStorage.setItem('login_session', JSON.stringify(sessionData));
      return { success: true, requirePwChange: true };
    }

    setLoggedInUserId(id);
    localStorage.setItem('login_session', JSON.stringify(sessionData));
    return { success: true };
  };

  const logout = () => {
    setLoggedInUserId(null);
    localStorage.removeItem('login_session');
  };

  const changePassword = (newPw: string) => {
    if (!user) return false;
    setUsers(users.map(u => u.id === user.id ? { ...u, passwordHash: newPw, mustChangePassword: false } : u));
    return true;
  };

  const requestPasswordReset = (id: string) => {
    const target = users.find(u => u.id === id);
    if (!target) return { success: false, error: '존재하지 않는 계정입니다.' };
    
    setUsers(users.map(u => u.id === id ? { ...u, resetRequestedAt: new Date().toISOString() } : u));
    alert(`[메일발송 알림] 마스터님, ${id} 사용자가 비밀번호 초기화를 요청하고 있습니다. 조치 바랍니다.`);
    return { success: true };
  };

  const addUser = (id: string) => {
    if (users.find(u => u.id === id)) return false;
    setUsers([...users, {
      id,
      passwordHash: '1234!',
      isMaster: false,
      status: 'pending',
      failedAttempts: 0,
      mustChangePassword: true,
      resetRequestedAt: null,
      createdAt: new Date().toISOString(),
      history: [{ date: new Date().toISOString(), action: 'Account created and pending approval' }]
    }]);
    return true;
  };

  const resetUserPassword = (id: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, passwordHash: '1234!', mustChangePassword: true, resetRequestedAt: null, failedAttempts: 0, status: 'active' } : u));
  };

  const appendHistory = (user: UserAuth, action: string) => {
    const history = user.history || [];
    return { ...user, history: [...history, { date: new Date().toISOString(), action }] };
  };

  const approveUser = (id: string) => {
    setUsers(users.map(u => u.id === id ? appendHistory({ ...u, status: 'active' }, 'Master approved access') : u));
  };
  
  const blockUser = (id: string) => {
    setUsers(users.map(u => u.id === id ? appendHistory({ ...u, status: 'blocked' }, 'Access revoked (blocked)') : u));
  };

  const unblockUser = (id: string) => {
    setUsers(users.map(u => u.id === id ? appendHistory({ ...u, status: 'active', failedAttempts: 0 }, 'Access restored') : u));
  };

  const deleteUser = (id: string) => {
    setUsers(users.map(u => u.id === id ? appendHistory({ ...u, status: 'deleted' as any }, 'Account deleted') : u));
  };

  return (
    <AuthContext.Provider value={{
      user, users, login, logout, changePassword, requestPasswordReset,
      addUser, resetUserPassword, approveUser, blockUser, unblockUser, deleteUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
