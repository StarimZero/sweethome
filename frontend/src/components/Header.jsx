import React from 'react';
import { Link } from 'react-router-dom';

function Header() {
    const headerStyle = { display: 'flex', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid #ddd', backgroundColor: '#fff', alignItems: 'center' };
    const menuStyle = { display: 'flex', gap: '20px', listStyle: 'none', margin: 0, padding: 0 };

  return (
    <header style={headerStyle}>
      <div style={{ fontWeight: 'bold', fontSize: '20px' }}>
        <Link to="/" style={{textDecoration:'none', color:'black'}}>💑 우리집 Dashboard</Link>
      </div>

      <ul style={menuStyle}>
        <li><Link to="/">🏠 홈</Link></li>
        <li><Link to="/cooking">👨‍🍳 요리 도감</Link></li>
        <li><Link to="/review">⭐ 맛집 리뷰</Link></li>
        <li><Link to="/travel">✈️ 여행</Link></li>
        <li><Link to="/calendar" style={{color:'#ccc'}}>📅 캘린더</Link></li>
        <li><Link to="/system">⚙️ 시스템 관리</Link></li>
        
      </ul>

      <div>로그인: 홍길동님</div>
    </header>
  );
}

export default Header;
