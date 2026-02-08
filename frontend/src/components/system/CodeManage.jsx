import React, { useState, useEffect } from 'react';
import axios from 'axios';
import apiClient from '../../api';

function CodeManage() {
  const [codes, setCodes] = useState([]);
  const [form, setForm] = useState({ group_code: '', group_name: '', code_id: '', code_name: '', sort_order: 0, use_yn: 'Y' });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // 1. 목록 불러오기
  const fetchCodes = async () => {
    try {
      const res = await apiClient.get('/code');
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
        await apiClient.put(`/code/${editId}`, form);
        alert("수정되었습니다.");
      } else {
        await apiClient.post('i/code', form);
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
      await apiClient.delete(`/code/${id}`);
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
    <div className="code-manage">
      <style>{`
        .code-manage h2 { margin-top: 0; }
        .code-form-box { background: #f1f3f5; padding: 20px; border-radius: 10px; margin-bottom: 30px; }
        .code-form-box h4 { margin: 0 0 15px; }
        .code-form { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        .code-form input, .code-form select { padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; width: 100%; }
        .code-form-actions { grid-column: 1 / -1; display: flex; gap: 10px; }
        .btn-submit { padding: 8px 15px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; background: #20c997; color: white; }
        .btn-cancel { padding: 8px 15px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; background: #ccc; }
        .code-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .code-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 600px; }
        .code-table thead tr { background: #eee; text-align: left; }
        .code-table th { padding: 10px; border-bottom: 2px solid #ddd; white-space: nowrap; }
        .code-table td { padding: 10px; }
        .code-table tbody tr { border-bottom: 1px solid #f0f0f0; }
        .badge-yn { padding: 2px 6px; border-radius: 4px; font-size: 11px; }
        .badge-y { background: #d3f9d8; color: #2b8a3e; }
        .badge-n { background: #ffe3e3; color: #c92a2a; }
        .btn-edit { margin-right: 5px; cursor: pointer; border: 1px solid #ccc; background: white; border-radius: 4px; }
        .btn-del { cursor: pointer; border: 1px solid #ffc9c9; background: #fff5f5; color: #fa5252; border-radius: 4px; }

        @media (max-width: 768px) {
          .code-form-box { padding: 16px; margin-bottom: 20px; }
          .code-form { grid-template-columns: 1fr; }
          .code-table { font-size: 13px; }
          .code-table th, .code-table td { padding: 8px 6px; }
        }
      `}</style>

      <h2>🏷️ 공통 코드 관리</h2>

      {/* 입력 폼 */}
      <div className="code-form-box">
        <h4>{isEditing ? '코드 수정' : '새 코드 등록'}</h4>
        <form onSubmit={handleSubmit} className="code-form">
          <input name="group_code" value={form.group_code} onChange={handleChange} placeholder="그룹코드 (예: FOOD)" required />
          <input name="group_name" value={form.group_name} onChange={handleChange} placeholder="그룹명 (예: 음식종류)" required />
          <input name="code_id" value={form.code_id} onChange={handleChange} placeholder="코드ID (예: KOREAN)" required />
          <input name="code_name" value={form.code_name} onChange={handleChange} placeholder="코드명 (예: 한식)" required />
          <input type="number" name="sort_order" value={form.sort_order} onChange={handleChange} placeholder="정렬순서" />
          <select name="use_yn" value={form.use_yn} onChange={handleChange}>
            <option value="Y">사용(Y)</option>
            <option value="N">미사용(N)</option>
          </select>

          <div className="code-form-actions">
            <button type="submit" className="btn-submit">
              {isEditing ? '수정 완료' : '등록'}
            </button>
            {isEditing && <button type="button" onClick={resetForm} className="btn-cancel">취소</button>}
          </div>
        </form>
      </div>

      {/* 리스트 테이블 */}
      <div className="code-table-wrap">
        <table className="code-table">
          <thead>
            <tr>
              <th>그룹코드</th>
              <th>그룹명</th>
              <th>코드ID</th>
              <th>코드명</th>
              <th>정렬</th>
              <th>사용</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((code) => (
              <tr key={code._id}>
                <td>{code.group_code}</td>
                <td>{code.group_name}</td>
                <td>{code.code_id}</td>
                <td><strong>{code.code_name}</strong></td>
                <td>{code.sort_order}</td>
                <td>
                  <span className={`badge-yn ${code.use_yn === 'Y' ? 'badge-y' : 'badge-n'}`}>
                    {code.use_yn}
                  </span>
                </td>
                <td style={{whiteSpace:'nowrap'}}>
                  <button className="btn-edit" onClick={() => handleEdit(code)}>수정</button>
                  <button className="btn-del" onClick={() => handleDelete(code._id)}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CodeManage;
