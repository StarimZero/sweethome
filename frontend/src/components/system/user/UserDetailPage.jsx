import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../../api';
import { useAuth } from '../../../context/AuthContext';

function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ nickname: '', role: 'member', is_active: true });
  const [pw, setPw] = useState({ open: false, value: '', confirm: '' });

  useEffect(() => {
    apiClient.get(`/users/${id}`)
      .then(res => {
        setUser(res.data);
        setForm({
          nickname: res.data.nickname || '',
          role: res.data.role || 'member',
          is_active: res.data.is_active !== false,
        });
      })
      .catch(err => {
        console.error(err);
        alert('사용자 정보 조회 실패');
      });
  }, [id]);

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSave = async () => {
    try {
      await apiClient.put(`/users/${id}`, form);
      alert('수정되었습니다.');
      navigate('/system/users');
    } catch (err) {
      alert(err?.response?.data?.detail || '오류가 발생했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`정말 [${user.username}] 사용자를 삭제하시겠습니까?\n복구 불가능합니다.`)) return;
    try {
      await apiClient.delete(`/users/${id}`);
      alert('삭제되었습니다.');
      navigate('/system/users');
    } catch (err) {
      alert(err?.response?.data?.detail || '오류가 발생했습니다.');
    }
  };

  const handlePasswordReset = async () => {
    if (pw.value.length < 4) return alert('비밀번호는 4자 이상이어야 합니다.');
    if (pw.value !== pw.confirm) return alert('비밀번호 확인이 일치하지 않습니다.');
    try {
      await apiClient.post(`/users/${id}/password`, { new_password: pw.value });
      alert('비밀번호가 재설정되었습니다.');
      setPw({ open: false, value: '', confirm: '' });
    } catch (err) {
      alert(err?.response?.data?.detail || '오류가 발생했습니다.');
    }
  };

  if (!user) return <div>로딩 중...</div>;

  const isSelf = me && me.username === user.username;

  return (
    <div style={{ maxWidth: 600, background: 'white', padding: 40, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', margin: '0 auto' }}>
      <h2 style={{ marginTop: 0, marginBottom: 8 }}>👥 사용자 수정</h2>
      <div style={{ color: '#868e96', fontSize: 13, marginBottom: 30 }}>
        아이디 <strong>{user.username}</strong> {isSelf && <span style={{ color: '#1971c2' }}>(본인)</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={labelStyle}>닉네임 (화면 표시명)</label>
          <input name="nickname" value={form.nickname} onChange={handleChange} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>권한</label>
          <select name="role" value={form.role} onChange={handleChange}
                  style={inputStyle}
                  disabled={isSelf}>
            <option value="member">member (일반)</option>
            <option value="admin">admin (관리자)</option>
          </select>
          {isSelf && <div style={hintStyle}>본인의 권한은 스스로 변경할 수 없습니다.</div>}
        </div>

        <div>
          <label style={labelStyle}>활성화</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange}
                   disabled={isSelf} />
            <span>{form.is_active ? '활성' : '비활성 (로그인 차단)'}</span>
          </label>
          {isSelf && <div style={hintStyle}>본인 계정은 비활성화할 수 없습니다.</div>}
        </div>

        <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6, padding: 16 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>🔑 비밀번호 재설정</div>
          {!pw.open ? (
            <button type="button" onClick={() => setPw({ ...pw, open: true })}
                    style={{ ...btnBase, background: '#fab005', color: 'white', padding: '8px 16px', fontSize: 14 }}>
              비밀번호 재설정
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input type="password" placeholder="새 비밀번호 (4자 이상)"
                     value={pw.value}
                     onChange={(e) => setPw({ ...pw, value: e.target.value })}
                     style={inputStyle} />
              <input type="password" placeholder="새 비밀번호 확인"
                     value={pw.confirm}
                     onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                     style={inputStyle} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={handlePasswordReset}
                        style={{ ...btnBase, background: '#fab005', color: 'white', padding: '8px 16px', fontSize: 14 }}>
                  적용
                </button>
                <button type="button" onClick={() => setPw({ open: false, value: '', confirm: '' })}
                        style={{ ...btnBase, background: '#f1f3f5', color: '#495057', padding: '8px 16px', fontSize: 14 }}>
                  취소
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, paddingTop: 20, borderTop: '1px solid #eee' }}>
          <button type="button" onClick={() => navigate('/system/users')}
                  style={{ ...btnBase, background: '#f1f3f5', color: '#495057' }}>목록</button>
          <button type="button" onClick={handleDelete}
                  disabled={isSelf}
                  style={{ ...btnBase, background: isSelf ? '#ccc' : '#ff6b6b', color: 'white' }}>
            삭제
          </button>
          <button type="button" onClick={handleSave}
                  style={{ ...btnBase, background: '#20c997', color: 'white', flex: 1 }}>저장</button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', marginBottom: 5, fontSize: 14, fontWeight: 'bold', color: '#343a40' };
const inputStyle = { width: '100%', padding: 12, border: '1px solid #dee2e6', borderRadius: 6, boxSizing: 'border-box', fontSize: 15 };
const hintStyle  = { fontSize: 12, color: '#868e96', marginTop: 4 };
const btnBase    = { padding: 15, border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: 16 };

export default UserDetailPage;
