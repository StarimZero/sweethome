import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

const Login = () => {
    
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) {
        // 원래 가려던 곳이 있으면 거기로, 없으면 홈으로
        const from = location.state?.from?.pathname || "/";
        navigate(from, { replace: true });
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center' }}>
      <h2>🔐 SweetHome 로그인</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input 
          type="text" 
          placeholder="아이디" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)}
          style={{ padding: '10px' }}
        />
        <input 
          type="password" 
          placeholder="비밀번호" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '10px' }}
        />
        <button type="submit" style={{ padding: '10px', background: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}>
          로그인
        </button>
      </form>
    </div>
  );
};

export default Login;
