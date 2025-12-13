import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../../../api'; 

function CodeInsertPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // URL 파라미터로 전달된 그룹코드가 있으면 초기값으로 세팅 (예: ?group=FOOD)
  const initialGroupCode = searchParams.get('group') || '';
  
  // 그룹명을 알아오기 위해 코드를 한 번 조회할 수도 있지만, 
  // 여기서는 간단히 빈 값으로 두고 사용자가 입력하게 하거나, 생략합니다.
  
  const [form, setForm] = useState({ 
    group_code: initialGroupCode, 
    group_name: '', 
    code_id: '', 
    code_name: '', 
    sort_order: 0, 
    use_yn: 'Y' 
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/code', form);
      alert("등록되었습니다!");
      navigate('/system/code');
    } catch (err) {
      alert("오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ maxWidth: '600px', background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', margin:'0 auto' }}>
      <h2 style={{ marginTop: 0, marginBottom:'30px' }}>📝 새 코드 등록</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{background:'#f8f9fa', padding:'20px', borderRadius:'8px', border:'1px solid #e9ecef'}}>
            <h4 style={{margin:'0 0 10px 0', color:'#495057'}}>1. 그룹 정보</h4>
            <div style={{display:'flex', gap:'15px'}}>
                <div style={{flex:1}}>
                    <label style={labelStyle}>그룹코드 (KEY)</label>
                    {/* 이미 그룹이 정해져 있으면 수정 불가능하게 읽기 전용으로 설정하면 편함 */}
                    <input 
                        name="group_code" 
                        value={form.group_code} 
                        onChange={handleChange} 
                        placeholder="예: FOOD" 
                        required 
                        style={inputStyle} 
                        readOnly={!!initialGroupCode} 
                        title={initialGroupCode ? "그룹 상세 추가 모드입니다" : ""}
                    />
                </div>
                <div style={{flex:1}}>
                    <label style={labelStyle}>그룹명 (설명)</label>
                    <input name="group_name" value={form.group_name} onChange={handleChange} placeholder="예: 음식 구분" required style={inputStyle} />
                </div>
            </div>
        </div>

        <div>
            <h4 style={{margin:'0 0 10px 0', color:'#495057'}}>2. 상세 코드 정보</h4>
            <div style={{display:'flex', gap:'15px', marginBottom:'15px'}}>
                <div style={{flex:1}}>
                    <label style={labelStyle}>코드 ID (KEY)</label>
                    <input name="code_id" value={form.code_id} onChange={handleChange} placeholder="예: KOREAN" required style={inputStyle} />
                </div>
                <div style={{flex:1}}>
                    <label style={labelStyle}>코드명 (화면표시)</label>
                    <input name="code_name" value={form.code_name} onChange={handleChange} placeholder="예: 한식" required style={inputStyle} />
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
            <button type="button" onClick={() => navigate('/system/code')} style={{...btnBase, background: '#f1f3f5', color: '#495057'}}>취소</button>
            <button type="submit" style={{...btnBase, background: '#20c997', color: 'white', flex: 1}}>등록하기</button>
        </div>
      </form>
    </div>
  );
}

const labelStyle = { display:'block', marginBottom:'5px', fontSize:'14px', fontWeight:'bold', color:'#343a40' };
const inputStyle = { width: '100%', padding: '12px', border: '1px solid #dee2e6', borderRadius: '6px', boxSizing:'border-box', fontSize:'15px' };
const btnBase = { padding: '15px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize:'16px' };

export default CodeInsertPage;
