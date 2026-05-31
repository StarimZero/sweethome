import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
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
        <Link to="/" onClick={closeMenu}>
          <img src="/LOGO.png" alt="SweetHome" className="logo-img" />
          <span className="logo-text">SweetHome</span>
        </Link>
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
            <NavLink to="/cooking" className="nav-item" onClick={closeMenu}>🍳 Cooking</NavLink>
            <NavLink to="/liquor" className="nav-item" onClick={closeMenu}>🍷 Liquor</NavLink>
            <NavLink to="/travel" className="nav-item" onClick={closeMenu}>✈️ Travel</NavLink>
            <NavLink to="/review" className="nav-item" onClick={closeMenu}>📝 Review</NavLink>
            <NavLink to="/bucket" className="nav-item" onClick={closeMenu}>🎯 Bucket</NavLink>
            <NavLink to="/diary" className="nav-item" onClick={closeMenu}>💬 소곤소곤</NavLink>
            <NavLink to="/calendar" className="nav-item" onClick={closeMenu}>📅 Calendar</NavLink>
            <NavLink to="/culture" className="nav-item" onClick={closeMenu}>🎨 Culture</NavLink>
            <NavLink to="/knitting" className="nav-item" onClick={closeMenu}>🧶 뜨개록</NavLink>
            <NavLink to="/family" className="nav-item" onClick={closeMenu}>👨‍👩‍👧‍👦 가계도</NavLink>

            {/* 시스템 메뉴는 admin만 표시 */}
            {user.role === 'admin' && (
              <NavLink to="/system" className="nav-item" onClick={closeMenu}>⚙️ System</NavLink>
            )}

            <div className="user-info">
              <span className="welcome-msg">Hi, <b>{user.nickname || user.username}</b>님</span>
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
