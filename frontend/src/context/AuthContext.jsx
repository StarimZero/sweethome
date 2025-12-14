import { createContext, useState, useEffect, useContext } from 'react';
import apiClient from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 새로고침 시 로컬스토리지에서 토큰 확인
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('username');
    if (token && storedUser) {
      setUser({ username: storedUser });
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await apiClient.post('/auth/login', { username, password });
      const { access_token } = response.data;
      
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('username', username);
      
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser({ username });
      return true;
    } catch (error) {
      console.error("Login failed", error);
      alert("로그인 실패: 아이디/비번을 확인하세요.");
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('username');
    delete apiClient.defaults.headers.common['Authorization'];
    setUser(null);
    window.location.href = '/'; // 홈으로 이동
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
