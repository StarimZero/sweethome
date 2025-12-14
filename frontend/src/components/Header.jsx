import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/'); // 로그아웃 후 홈으로 이동
  };

  return (
    <header className="header-container">
      <div className="logo">
        <Link to="/">🏡 SweetHome</Link>
      </div>
      
      <nav className="nav-menu">
        {user ? (
          // [로그인 상태] 보여줄 메뉴
          <>
            <Link to="/cooking" className="nav-item">🍳 Cooking</Link>
            <Link to="/liquor" className="nav-item">🍷 Liquor</Link>
            <Link to="/travel" className="nav-item">✈️ Travel</Link>
            <Link to="/review" className="nav-item">📝 Review</Link>
            
            {/* 시스템 메뉴는 관리자만 보게 할 수도 있지만 일단 로그인 유저 전체에게 공개 */}
            <Link to="/system" className="nav-item">⚙️ System</Link>

            <div className="user-info">
              <span className="welcome-msg">Hi, <b>{user.username}</b>님</span>
              <button onClick={handleLogout} className="logout-btn">로그아웃</button>
            </div>
          </>
        ) : (
          // [비로그인 상태] 보여줄 메뉴
          <Link to="/login" className="login-btn">로그인</Link>
        )}
      </nav>
    </header>
  );
};

export default Header;
