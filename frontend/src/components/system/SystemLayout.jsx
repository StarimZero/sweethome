import React from 'react';
import { Link, Outlet } from 'react-router-dom';

function SystemLayout() {
  return (
    <div className="content-box system-layout">
      <style>{`
        .system-layout { display: flex; min-height: 600px; padding: 0; overflow: hidden; }
        .system-sidebar { width: 220px; min-width: 220px; background-color: #f8f9fa; border-right: 1px solid #dee2e6; padding: 20px; }
        .system-sidebar h3 { margin: 0 0 20px; color: #495057; }
        .system-sidebar ul { list-style: none; padding: 0; margin: 0; }
        .system-sidebar li { margin-bottom: 10px; }
        .system-sidebar .nav-back { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px; }
        .system-main { flex: 1; padding: 30px; overflow-y: auto; }

        @media (max-width: 768px) {
          .system-layout { flex-direction: column; min-height: auto; }
          .system-sidebar { width: auto; min-width: unset; border-right: none; border-bottom: 1px solid #dee2e6; padding: 16px; }
          .system-sidebar h3 { margin-bottom: 12px; font-size: 16px; }
          .system-sidebar ul { display: flex; flex-wrap: wrap; gap: 8px; }
          .system-sidebar li { margin-bottom: 0; }
          .system-sidebar .nav-back { margin-top: 0; border-top: none; padding-top: 0; }
          .system-main { padding: 16px; }
        }
      `}</style>

      {/* 좌측 사이드바 (모바일: 상단 네비) */}
      <aside className="system-sidebar">
        <h3>⚙️ 관리자 모드</h3>
        <ul>
          <li><Link to="/system/code" style={linkStyle}>🏷️ 공통 코드 관리</Link></li>
          <li><Link to="/system/users" style={linkStyle}>👥 사용자 관리</Link></li>
          <li className="nav-back">
            <Link to="/" style={{ ...linkStyle, color: '#868e96', fontSize: '14px' }}>← 홈으로</Link>
          </li>
        </ul>
      </aside>

      {/* 우측 본문 */}
      <main className="system-main">
        <Outlet />
      </main>
    </div>
  );
}

const linkStyle = { textDecoration: 'none', color: '#333', display: 'block', padding: '8px 10px', borderRadius: '5px', transition: '0.2s' };

export default SystemLayout;
