import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../../api'; 

function CodeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);

  useEffect(() => {
    // 상세 조회 API 호출
    apiClient.get(`/code/${id}`)
      .then(res => setForm(res.data))
      .catch(err => console.error(err));
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleUpdate = async () => {
    try {
      await apiClient.put(`/code/${id}`, form);
      alert("수정되었습니다.");
      navigate('/system/code');
    } catch (err) {
      alert("오류가 발생했습니다.");
    }
  };

  const handleDelete = async () => {
    if(window.confirm("정말 삭제하시겠습니까?")) {
      await apiClient.delete(`/code/${id}`);
      navigate('/system/code');
    }
  };

  if (!form) return <div>불러오는 중...</div>;

  return (
    <div style={{ maxWidth: '600px', background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', margin:'0 auto' }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px'}}>
          <h2 style={{ margin: 0 }}>🛠️ 코드 수정</h2>
          <button onClick={handleDelete} style={{padding:'8px 15px', background:'#ffe3e3', color:'#e03131', border:'none', borderRadius:'5px', cursor:'pointer', fontWeight:'bold', fontSize:'14px'}}>🗑️ 삭제</button>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{background:'#f8f9fa', padding:'20px', borderRadius:'8px', border:'1px solid #e9ecef'}}>
            <h4 style={{margin:'0 0 10px 0', color:'#495057'}}>1. 그룹 정보</h4>
            <div style={{display:'flex', gap:'15px'}}>
                <div style={{flex:1}}>
                    <label style={labelStyle}>그룹코드</label>
                    <input name="group_code" value={form.group_code} onChange={handleChange} style={inputStyle} />
                </div>
                <div style={{flex:1}}>
                    <label style={labelStyle}>그룹명</label>
                    <input name="group_name" value={form.group_name} onChange={handleChange} style={inputStyle} />
                </div>
            </div>
        </div>

        <div>
            <h4 style={{margin:'0 0 10px 0', color:'#495057'}}>2. 상세 코드 정보</h4>
            <div style={{display:'flex', gap:'15px', marginBottom:'15px'}}>
                <div style={{flex:1}}>
                    <label style={labelStyle}>코드 ID</label>
                    <input name="code_id" value={form.code_id} onChange={handleChange} style={inputStyle} />
                </div>
                <div style={{flex:1}}>
                    <label style={labelStyle}>코드명</label>
                    <input name="code_name" value={form.code_name} onChange={handleChange} style={inputStyle} />
                </div>
            </div>

            <div style={{display:'flex', gap:'15px'}}>
                <div style={{flex:1}}>
                    <label style={labelStyle}>정렬 순서</label>
                    <input type="number" name="sort_order" value={form.sort_order} onChange={handleChange} style={inputStyle} />
                </div>
                <div style={{flex:1}}>
                    <label style={labelStyle}>사용 여부</label>
                    <select name="use_yn" value={form.use_yn} onChange={handleChange} style={inputStyle}>
                        <option value="Y">사용 (Y)</option>
                        <option value="N">미사용 (N)</option>
                    </select>
                </div>
            </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '30px', paddingTop:'20px', borderTop:'1px solid #eee' }}>
            <button onClick={() => navigate('/system/code')} style={{...btnBase, background: '#f1f3f5', color: '#495057'}}>목록으로</button>
            <button onClick={handleUpdate} style={{...btnBase, background: '#4dabf7', color: 'white', flex: 1}}>저장하기</button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { display:'block', marginBottom:'5px', fontSize:'14px', fontWeight:'bold', color:'#343a40' };
const inputStyle = { width: '100%', padding: '12px', border: '1px solid #dee2e6', borderRadius: '6px', boxSizing:'border-box', fontSize:'15px' };
const btnBase = { padding: '15px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize:'16px' };

export default CodeDetailPage;
