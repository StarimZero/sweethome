import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../../../api';

function CodeInsertPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialGroupCode = searchParams.get('group') || '';
  const isDetailMode = !!initialGroupCode; // 기존 그룹에 상세코드 추가 모드

  const [form, setForm] = useState({
    group_code: initialGroupCode,
    group_name: '',
    code_id: '',
    code_name: '',
    sort_order: 0,
    use_yn: 'Y'
  });
  const [existingGroups, setExistingGroups] = useState({}); // { group_code: group_name }

  // 기존 그룹 목록 조회 → 그룹명 자동 세팅
  useEffect(() => {
    apiClient.get('/code').then(res => {
      const groupMap = {};
      res.data.forEach(c => {
        if (!groupMap[c.group_code]) groupMap[c.group_code] = c.group_name;
      });
      setExistingGroups(groupMap);
      if (initialGroupCode && groupMap[initialGroupCode]) {
        setForm(prev => ({ ...prev, group_name: groupMap[initialGroupCode] }));
      }
    }).catch(console.error);
  }, [initialGroupCode]);

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
            {isDetailMode ? (
              <div style={{display:'flex', gap:'15px'}}>
                <div style={{flex:1}}>
                  <label style={labelStyle}>그룹코드</label>
                  <input value={form.group_code} readOnly style={{...inputStyle, background:'#e9ecef', color:'#868e96'}} />
                </div>
                <div style={{flex:1}}>
                  <label style={labelStyle}>그룹명</label>
                  <input value={form.group_name} readOnly style={{...inputStyle, background:'#e9ecef', color:'#868e96'}} />
                </div>
              </div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                <div>
                  <label style={labelStyle}>기존 그룹 선택</label>
                  <select
                    value={form.group_code && existingGroups[form.group_code] ? form.group_code : ''}
                    onChange={(e) => {
                      const gc = e.target.value;
                      if (gc) {
                        setForm({ ...form, group_code: gc, group_name: existingGroups[gc] });
                      } else {
                        setForm({ ...form, group_code: '', group_name: '' });
                      }
                    }}
                    style={inputStyle}
                  >
                    <option value="">새 그룹 직접 입력</option>
                    {Object.entries(existingGroups).map(([gc, gn]) => (
                      <option key={gc} value={gc}>{gn} ({gc})</option>
                    ))}
                  </select>
                </div>
                <div style={{display:'flex', gap:'15px'}}>
                  <div style={{flex:1}}>
                    <label style={labelStyle}>그룹코드 (KEY)</label>
                    <input
                      name="group_code"
                      value={form.group_code}
                      onChange={handleChange}
                      placeholder="예: FOOD"
                      required
                      style={{...inputStyle, ...(existingGroups[form.group_code] ? {background:'#e9ecef', color:'#868e96'} : {})}}
                      readOnly={!!existingGroups[form.group_code]}
                    />
                  </div>
                  <div style={{flex:1}}>
                    <label style={labelStyle}>그룹명 (설명)</label>
                    <input
                      name="group_name"
                      value={form.group_name}
                      onChange={handleChange}
                      placeholder="예: 음식 구분"
                      required
                      style={{...inputStyle, ...(existingGroups[form.group_code] ? {background:'#e9ecef', color:'#868e96'} : {})}}
                      readOnly={!!existingGroups[form.group_code]}
                    />
                  </div>
                </div>
              </div>
            )}
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
