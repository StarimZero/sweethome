import React from 'react';
import { Link, Outlet } from 'react-router-dom';

function SystemLayout() {
  return (
    <div className="content-box" style={{ display: 'flex', minHeight: '600px', padding: 0, overflow: 'hidden' }}>
      
      {/* 좌측 사이드바 */}
      <aside style={{ width: '220px', backgroundColor: '#f8f9fa', borderRight: '1px solid #dee2e6', padding: '20px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#495057' }}>⚙️ 관리자 모드</h3>
        
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '10px' }}>
            <Link to="/system/code" style={linkStyle}>🏷️ 공통 코드 관리</Link>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <Link to="/system/users" style={linkStyle}>👥 사용자 관리</Link>
          </li>
          <li style={{ marginTop: '30px', borderTop: '1px solid #ddd', paddingTop: '15px' }}>
             <Link to="/" style={{ ...linkStyle, color: '#868e96', fontSize: '14px' }}>← 메인으로 나가기</Link>
          </li>
        </ul>
      </aside>

      {/* 우측 본문 */}
      <main style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
        <Outlet /> 
      </main>
    </div>
  );
}

const linkStyle = { textDecoration: 'none', color: '#333', display: 'block', padding: '8px 10px', borderRadius: '5px', transition: '0.2s' };

export default SystemLayout;
