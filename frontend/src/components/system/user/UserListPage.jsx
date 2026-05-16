import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../api';

function UserListPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ q: '', role: '' });

  const fetchUsers = async () => {
    try {
      const params = {};
      if (filters.q) params.q = filters.q;
      if (filters.role) params.role = filters.role;
      const res = await apiClient.get('/users', { params });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 403) {
        alert('관리자 권한이 필요합니다.');
        navigate('/');
      }
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.role]);

  const handleChange = (e) =>
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') fetchUsers();
  };

  const fmtDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toISOString().slice(0, 10); } catch { return '—'; }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>👥 사용자 관리</h2>
        <button onClick={() => navigate('/system/users/new')} style={btnPrimary}>+ 새 사용자</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, background: '#f8f9fa', padding: 16, borderRadius: 8, border: '1px solid #eee' }}>
        <input name="q" value={filters.q} onChange={handleChange} onKeyDown={handleKeyDown}
               placeholder="아이디 또는 닉네임 검색"
               style={inputStyle} />
        <select name="role" value={filters.role} onChange={handleChange} style={selectStyle}>
          <option value="">전체 권한</option>
          <option value="admin">admin</option>
          <option value="member">member</option>
        </select>
        <button onClick={fetchUsers} style={btnDark}>🔍 검색</button>
      </div>

      <div style={{ background: 'white', border: '1px solid #dee2e6', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={thStyle}>아이디</th>
              <th style={thStyle}>닉네임</th>
              <th style={thStyle}>권한</th>
              <th style={thStyle}>활성화</th>
              <th style={thStyle}>가입일</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id}
                  onClick={() => navigate(`/system/users/${u._id}`)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid #f1f3f5' }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                <td style={tdStyle}><strong>{u.username}</strong></td>
                <td style={tdStyle}>{u.nickname || <span style={{ color: '#adb5bd' }}>—</span>}</td>
                <td style={tdStyle}>
                  <span style={u.role === 'admin' ? badgeAdmin : badgeMember}>{u.role}</span>
                </td>
                <td style={tdStyle}>
                  <span style={u.is_active ? badgeActive : badgeInactive}>
                    {u.is_active ? '활성' : '비활성'}
                  </span>
                </td>
                <td style={tdStyle}>{fmtDate(u.created_at)}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40, color: '#adb5bd' }}>검색 결과가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputStyle = { flex: 1, padding: '10px 12px', border: '1px solid #ced4da', borderRadius: 5 };
const selectStyle = { padding: '10px 12px', border: '1px solid #ced4da', borderRadius: 5, minWidth: 120 };
const btnPrimary = { padding: '10px 20px', background: '#20c997', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' };
const btnDark = { padding: '10px 20px', background: '#343a40', color: 'white', border: 'none', borderRadius: 5, fontWeight: 'bold', cursor: 'pointer' };
const thStyle = { padding: 12, textAlign: 'left', fontSize: 14, color: '#495057' };
const tdStyle = { padding: 12, fontSize: 14, color: '#333' };
const badgeAdmin    = { padding: '4px 10px', borderRadius: 4, background: '#fff3bf', color: '#965d00', fontSize: 11, fontWeight: 'bold' };
const badgeMember   = { padding: '4px 10px', borderRadius: 4, background: '#e7f5ff', color: '#1971c2', fontSize: 11, fontWeight: 'bold' };
const badgeActive   = { padding: '4px 10px', borderRadius: 4, background: '#d3f9d8', color: '#2b8a3e', fontSize: 11, fontWeight: 'bold' };
const badgeInactive = { padding: '4px 10px', borderRadius: 4, background: '#ffe3e3', color: '#c92a2a', fontSize: 11, fontWeight: 'bold' };

export default UserListPage;
