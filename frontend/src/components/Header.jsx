import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/'); // 로그아웃 후 홈으로 이동
    setMenuOpen(false);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <header className="header-container">
      <div className="logo">
        <Link to="/" onClick={closeMenu}>🏡 SweetHome</Link>
      </div>

      {/* 햄버거 메뉴 버튼 (모바일용) */}
      <button
        className={`hamburger ${menuOpen ? 'open' : ''}`}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="메뉴 열기"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <nav className={`nav-menu ${menuOpen ? 'open' : ''}`}>
        {user ? (
          // [로그인 상태] 보여줄 메뉴
          <>
            <Link to="/cooking" className="nav-item" onClick={closeMenu}>🍳 Cooking</Link>
            <Link to="/liquor" className="nav-item" onClick={closeMenu}>🍷 Liquor</Link>
            <Link to="/travel" className="nav-item" onClick={closeMenu}>✈️ Travel</Link>
            <Link to="/review" className="nav-item" onClick={closeMenu}>📝 Review</Link>
            <Link to="/bucket" className="nav-item" onClick={closeMenu}>🎯 Bucket</Link>
            <Link to="/diary" className="nav-item" onClick={closeMenu}>💬 소곤소곤</Link>
            <Link to="/calendar" className="nav-item" onClick={closeMenu}>📅 Calendar</Link>

            {/* 시스템 메뉴는 관리자만 보게 할 수도 있지만 일단 로그인 유저 전체에게 공개 */}
            <Link to="/system" className="nav-item" onClick={closeMenu}>⚙️ System</Link>

            <div className="user-info">
              <span className="welcome-msg">Hi, <b>{user.username}</b>님</span>
              <button onClick={handleLogout} className="logout-btn">로그아웃</button>
            </div>
          </>
        ) : (
          // [비로그인 상태] 보여줄 메뉴
          <Link to="/login" className="login-btn" onClick={closeMenu}>로그인</Link>
        )}
      </nav>
    </header>
  );
};

export default Header;
