import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../api';

function UserInsertPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    nickname: '',
    password: '',
    passwordConfirm: '',
    role: 'member',
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim()) return alert('아이디는 필수입니다.');
    if (form.password.length < 4) return alert('비밀번호는 4자 이상이어야 합니다.');
    if (form.password !== form.passwordConfirm) return alert('비밀번호 확인이 일치하지 않습니다.');

    try {
      await apiClient.post('/users', {
        username: form.username,
        password: form.password,
        nickname: form.nickname,
        role: form.role,
      });
      alert('등록되었습니다.');
      navigate('/system/users');
    } catch (err) {
      const msg = err?.response?.data?.detail || '오류가 발생했습니다.';
      alert(msg);
    }
  };

  return (
    <div style={{ maxWidth: 600, background: 'white', padding: 40, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', margin: '0 auto' }}>
      <h2 style={{ marginTop: 0, marginBottom: 30 }}>👥 새 사용자 등록</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div>
          <label style={labelStyle}>아이디 (로그인 ID) <span style={{ color: '#d94e4e' }}>*</span></label>
          <input name="username" value={form.username} onChange={handleChange}
                 placeholder="예: husband01" required style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>닉네임 (화면 표시명)</label>
          <input name="nickname" value={form.nickname} onChange={handleChange}
                 placeholder="예: 보구치" style={inputStyle} />
          <div style={hintStyle}>비워두면 아이디가 표시됩니다.</div>
        </div>

        <div>
          <label style={labelStyle}>비밀번호 <span style={{ color: '#d94e4e' }}>*</span></label>
          <input type="password" name="password" value={form.password} onChange={handleChange}
                 placeholder="4자 이상" required style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>비밀번호 확인 <span style={{ color: '#d94e4e' }}>*</span></label>
          <input type="password" name="passwordConfirm" value={form.passwordConfirm} onChange={handleChange}
                 required style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>권한</label>
          <select name="role" value={form.role} onChange={handleChange} style={inputStyle}>
            <option value="member">member (일반)</option>
            <option value="admin">admin (관리자)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, paddingTop: 20, borderTop: '1px solid #eee' }}>
          <button type="button" onClick={() => navigate('/system/users')}
                  style={{ ...btnBase, background: '#f1f3f5', color: '#495057' }}>취소</button>
          <button type="submit"
                  style={{ ...btnBase, background: '#20c997', color: 'white', flex: 1 }}>등록하기</button>
        </div>
      </form>
    </div>
  );
}

const labelStyle = { display: 'block', marginBottom: 5, fontSize: 14, fontWeight: 'bold', color: '#343a40' };
const inputStyle = { width: '100%', padding: 12, border: '1px solid #dee2e6', borderRadius: 6, boxSizing: 'border-box', fontSize: 15 };
const hintStyle  = { fontSize: 12, color: '#868e96', marginTop: 4 };
const btnBase    = { padding: 15, border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: 16 };

export default UserInsertPage;
