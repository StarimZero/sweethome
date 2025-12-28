import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api'; 

function CookingInsertPage() {
  const navigate = useNavigate();
  
  // 1. 폼 데이터 초기값 변경 (difficulty -> cooking_type)
  const [formData, setFormData] = useState({
    chef: 'husband', 
    name: '', 
    description: '', 
    cooking_type: '', // 초기값 빈 문자열
    image_url: ''
  });

  // 2. 공통 코드 목록을 담을 상태 추가
  const [cookingCodes, setCookingCodes] = useState([]);

  // 3. 컴포넌트 로드 시 공통 코드(COOKING) 가져오기 [web:1][code_file:1]
  useEffect(() => {
    apiClient.get('/code/group/COOKING')
      .then(res => {
        setCookingCodes(res.data);
        // 코드가 있다면 첫 번째 값을 기본값으로 설정 (선택사항)
        if (res.data.length > 0) {
          setFormData(prev => ({ ...prev, cooking_type: res.data[0].code_name }));
        }
      })
      .catch(err => console.error("코드 로딩 실패:", err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/cooking', formData);
      alert("등록 완료!");
      navigate('/cooking');
    } catch (err) {
      alert("오류 발생");
      console.error(err);
    }
  };

  return (
    <div className="content-box" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1>🍳 요리 등록하기</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <label>누가? 
          <select name="chef" value={formData.chef} onChange={handleChange} style={inputStyle}>
            <option value="husband">남편</option>
            <option value="wife">아내</option>
          </select>
        </label>
        
        <label>이름 <input name="name" value={formData.name} onChange={handleChange} required style={inputStyle} /></label>
        
        {/* [수정] 난이도 -> 요리 종류 선택 (공통 코드 활용) */}
        <label>요리 종류
          <select name="cooking_type" value={formData.cooking_type} onChange={handleChange} style={inputStyle}>
            {cookingCodes.map((code) => (
              <option key={code.code_id} value={code.code_name}>
                {code.code_name}
              </option>
            ))}
          </select>
        </label>

        <label>설명 <textarea name="description" value={formData.description} onChange={handleChange} required style={textareaStyle} /></label>
        <label>이미지 URL <input name="image_url" value={formData.image_url} onChange={handleChange} style={inputStyle} /></label>
        
        <button type="submit" style={btnStyle}>등록</button>
      </form>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '5px' };
const textareaStyle = { ...inputStyle, minHeight: '80px' };
const btnStyle = { padding: '15px', background: '#20c997', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' };

export default CookingInsertPage;
