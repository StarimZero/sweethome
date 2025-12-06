import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function CodeListPage() {
  const navigate = useNavigate();
  const [codes, setCodes] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/code');
      setCodes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // 그룹 목록 추출 (중복 제거 및 그룹명 매핑)
  const groups = [...new Set(codes.map(c => c.group_code))].map(gCode => {
    const firstItem = codes.find(c => c.group_code === gCode);
    return { code: gCode, name: firstItem.group_name };
  });

  // 선택된 그룹의 상세 코드들 필터링
  const filteredCodes = selectedGroup 
    ? codes.filter(c => c.group_code === selectedGroup).sort((a,b) => a.sort_order - b.sort_order)
    : [];

  return (
    <div style={{ display: 'flex', height: '100%', gap: '20px', minHeight: '500px' }}>
      
      {/* [왼쪽] 그룹 목록 패널 */}
      <div style={{ width: '280px', background: 'white', border: '1px solid #dee2e6', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ marginTop: 0, fontSize: '18px', borderBottom: '2px solid #333', paddingBottom: '15px', marginBottom: '15px' }}>📂 코드 그룹</h3>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {groups.map(group => (
                <li 
                key={group.code}
                onClick={() => setSelectedGroup(group.code)}
                style={{ 
                    padding: '12px', 
                    cursor: 'pointer', 
                    background: selectedGroup === group.code ? '#e7f5ff' : 'transparent',
                    color: selectedGroup === group.code ? '#1971c2' : '#333',
                    fontWeight: selectedGroup === group.code ? 'bold' : 'normal',
                    borderRadius: '6px',
                    marginBottom: '5px',
                    transition: 'all 0.2s'
                }}
                >
                <div style={{fontSize: '15px'}}>{group.name}</div>
                <div style={{fontSize:'12px', color: selectedGroup === group.code ? '#74c0fc' : '#adb5bd'}}>{group.code}</div>
                </li>
            ))}
            </ul>
        </div>
        
        <button onClick={() => navigate('/system/code/new')} style={{width:'100%', padding:'12px', marginTop:'15px', border:'1px dashed #ced4da', borderRadius:'6px', background:'white', color:'#495057', cursor:'pointer', fontWeight:'bold'}}>
            + 새 그룹 만들기
        </button>
      </div>

      {/* [오른쪽] 상세 코드 목록 패널 */}
      <div style={{ flex: 1, background: 'white', border: '1px solid #dee2e6', borderRadius: '8px', padding: '30px', display: 'flex', flexDirection: 'column' }}>
        {selectedGroup ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                  <h2 style={{ margin: '0 0 5px 0' }}>{groups.find(g => g.code === selectedGroup)?.name}</h2>
                  <span style={{ background: '#f1f3f5', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', color: '#868e96' }}>{selectedGroup}</span>
              </div>
              <button onClick={() => navigate(`/system/code/new?group=${selectedGroup}`)} style={btnStyle}>+ 상세 코드 추가</button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={thStyle}>코드ID</th>
                  <th style={thStyle}>코드명</th>
                  <th style={thStyle}>정렬</th>
                  <th style={thStyle}>사용</th>
                </tr>
              </thead>
              <tbody>
                {filteredCodes.map((code) => (
                  <tr 
                    key={code._id} 
                    onClick={() => navigate(`/system/code/${code._id}`)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid #f1f3f5' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <td style={tdStyle}>{code.code_id}</td>
                    <td style={tdStyle}><strong>{code.code_name}</strong></td>
                    <td style={tdStyle}>{code.sort_order}</td>
                    <td style={tdStyle}>
                        <span style={{ padding: '4px 8px', borderRadius: '4px', background: code.use_yn === 'Y' ? '#d3f9d8' : '#ffe3e3', color: code.use_yn === 'Y' ? '#2b8a3e' : '#c92a2a', fontSize: '11px', fontWeight:'bold' }}>
                        {code.use_yn}
                        </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection:'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#adb5bd' }}>
            <div style={{fontSize:'40px', marginBottom:'10px'}}>👈</div>
            <div>왼쪽에서 관리할 그룹을 선택해주세요.</div>
          </div>
        )}
      </div>

    </div>
  );
}

const btnStyle = { padding: '10px 20px', background: '#20c997', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' };
const thStyle = { padding: '12px', textAlign: 'left', fontSize: '14px', color: '#495057' };
const tdStyle = { padding: '12px', fontSize: '14px', color: '#333' };

export default CodeListPage;
