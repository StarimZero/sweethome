import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import apiClient from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userMap, setUserMap] = useState({});  // { "userId": { username, nickname, role } }

  // 사용자 목록 fetch + 매핑 캐시 만들기
  const refreshUserMap = useCallback(async () => {
    try {
      const res = await apiClient.get('/users');
      const map = {};
      res.data.forEach(u => {
        map[u._id] = {
          username: u.username,
          nickname: u.nickname || u.username,
          role: u.role,
        };
      });
      setUserMap(map);
    } catch {
      // 권한 등 — 무시
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      if (storedUser) {
        try { setUser(JSON.parse(storedUser)); } catch { /* ignore */ }
      }
      apiClient.get('/auth/me')
        .then(res => {
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
          return refreshUserMap();
        })
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          delete apiClient.defaults.headers.common['Authorization'];
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUserMap]);

  const login = async (username, password) => {
    try {
      const response = await apiClient.post('/auth/login', { username, password });
      const { access_token, user: userInfo } = response.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user', JSON.stringify(userInfo));

      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(userInfo);
      refreshUserMap();
      return true;
    } catch (error) {
      console.error("Login failed", error);
      const msg = error?.response?.data?.detail || "아이디/비번을 확인하세요.";
      alert("로그인 실패: " + msg);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    delete apiClient.defaults.headers.common['Authorization'];
    setUser(null);
    setUserMap({});
    window.location.href = '/';
  };

  // 작성자 닉네임 빠르게 가져오는 헬퍼
  const getAuthorName = (userId) => {
    if (!userId) return '—';
    return userMap[userId]?.nickname || '—';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, userMap, refreshUserMap, getAuthorName }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
