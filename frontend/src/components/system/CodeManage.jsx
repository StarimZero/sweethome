import React, { useState, useEffect } from 'react';
import axios from 'axios';

function CodeManage() {
  const [codes, setCodes] = useState([]);
  const [form, setForm] = useState({ group_code: '', group_name: '', code_id: '', code_name: '', sort_order: 0, use_yn: 'Y' });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // 1. 목록 불러오기
  const fetchCodes = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/code');
      setCodes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchCodes(); }, []);

  // 2. 입력값 핸들러
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 3. 등록/수정 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await axios.put(`http://localhost:8000/api/code/${editId}`, form);
        alert("수정되었습니다.");
      } else {
        await axios.post('http://localhost:8000/api/code', form);
        alert("등록되었습니다.");
      }
      fetchCodes();
      resetForm();
    } catch (err) {
      alert("오류가 발생했습니다.");
    }
  };

  // 4. 삭제 처리
  const handleDelete = async (id) => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      await axios.delete(`http://localhost:8000/api/code/${id}`);
      fetchCodes();
    }
  };

  // 5. 수정 모드 전환
  const handleEdit = (code) => {
    setIsEditing(true);
    setEditId(code._id); // MongoDB ID
    setForm({
      group_code: code.group_code,
      group_name: code.group_name,
      code_id: code.code_id,
      code_name: code.code_name,
      sort_order: code.sort_order,
      use_yn: code.use_yn
    });
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setForm({ group_code: '', group_name: '', code_id: '', code_name: '', sort_order: 0, use_yn: 'Y' });
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>🏷️ 공통 코드 관리</h2>
      
      {/* 입력 폼 */}
      <div style={{ background: '#f1f3f5', padding: '20px', borderRadius: '10px', marginBottom: '30px' }}>
        <h4 style={{ margin: '0 0 15px' }}>{isEditing ? '코드 수정' : '새 코드 등록'}</h4>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <input name="group_code" value={form.group_code} onChange={handleChange} placeholder="그룹코드 (예: FOOD)" required style={inputStyle} />
          <input name="group_name" value={form.group_name} onChange={handleChange} placeholder="그룹명 (예: 음식종류)" required style={inputStyle} />
          <input name="code_id" value={form.code_id} onChange={handleChange} placeholder="코드ID (예: KOREAN)" required style={inputStyle} />
          <input name="code_name" value={form.code_name} onChange={handleChange} placeholder="코드명 (예: 한식)" required style={inputStyle} />
          <input type="number" name="sort_order" value={form.sort_order} onChange={handleChange} placeholder="정렬순서" style={inputStyle} />
          <select name="use_yn" value={form.use_yn} onChange={handleChange} style={inputStyle}>
            <option value="Y">사용(Y)</option>
            <option value="N">미사용(N)</option>
          </select>
          
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px' }}>
            <button type="submit" style={{ ...btnBase, background: '#20c997', color: 'white' }}>
              {isEditing ? '수정 완료' : '등록'}
            </button>
            {isEditing && <button type="button" onClick={resetForm} style={{ ...btnBase, background: '#ccc' }}>취소</button>}
          </div>
        </form>
      </div>

      {/* 리스트 테이블 */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead>
          <tr style={{ background: '#eee', textAlign: 'left' }}>
            <th style={thStyle}>그룹코드</th>
            <th style={thStyle}>그룹명</th>
            <th style={thStyle}>코드ID</th>
            <th style={thStyle}>코드명</th>
            <th style={thStyle}>정렬</th>
            <th style={thStyle}>사용</th>
            <th style={thStyle}>관리</th>
          </tr>
        </thead>
        <tbody>
          {codes.map((code) => (
            <tr key={code._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={tdStyle}>{code.group_code}</td>
              <td style={tdStyle}>{code.group_name}</td>
              <td style={tdStyle}>{code.code_id}</td>
              <td style={tdStyle}><strong>{code.code_name}</strong></td>
              <td style={tdStyle}>{code.sort_order}</td>
              <td style={tdStyle}>
                <span style={{ padding: '2px 6px', borderRadius: '4px', background: code.use_yn === 'Y' ? '#d3f9d8' : '#ffe3e3', color: code.use_yn === 'Y' ? '#2b8a3e' : '#c92a2a', fontSize: '11px' }}>
                  {code.use_yn}
                </span>
              </td>
              <td style={tdStyle}>
                <button onClick={() => handleEdit(code)} style={{ marginRight: '5px', cursor: 'pointer', border: '1px solid #ccc', background: 'white', borderRadius: '4px' }}>수정</button>
                <button onClick={() => handleDelete(code._id)} style={{ cursor: 'pointer', border: '1px solid #ffc9c9', background: '#fff5f5', color: '#fa5252', borderRadius: '4px' }}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const inputStyle = { padding: '8px', border: '1px solid #ddd', borderRadius: '4px' };
const btnBase = { padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const thStyle = { padding: '10px', borderBottom: '2px solid #ddd' };
const tdStyle = { padding: '10px' };

export default CodeManage;
