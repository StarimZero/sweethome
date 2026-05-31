import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import './Login.scss';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true); // 기본: 로그인 상태 유지
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // 중복 제출 방지
    setError('');
    setLoading(true);
    try {
      await login(username, password, remember);
      // 원래 가려던 곳이 있으면 거기로, 없으면 홈으로
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.detail || '아이디 또는 비밀번호를 확인해주세요.';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <img src="/LOGO.png" alt="SweetHome" className="login-logo" />
          <h1>SweetHome</h1>
          <p>우리의 기록, 다시 만나기</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div className="field">
            <label htmlFor="username">아이디</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디를 입력하세요"
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="password">비밀번호</label>
            <div className="password-wrap">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
              />
              <button
                type="button"
                className="toggle-pw"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <label className="remember-row">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span>로그인 상태 유지 (30일)</span>
          </label>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={loading || !username || !password}
          >
            {loading ? <span className="spinner" aria-label="로그인 중" /> : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
