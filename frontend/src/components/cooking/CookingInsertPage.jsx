import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function CookingInsertPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    chef: 'husband', name: '', description: '', difficulty: '중', image_url: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/api/cooking', formData);
      alert("등록 완료!");
      navigate('/cooking');
    } catch (err) {
      alert("오류 발생");
    }
  };

  return (
    <div className="content-box" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1>🍳 요리 등록하기</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {/* 입력 필드들은 아까와 동일하므로 생략하거나 간단히 작성 */}
        <label>누가? <select name="chef" value={formData.chef} onChange={handleChange} style={inputStyle}><option value="husband">남편</option><option value="wife">아내</option></select></label>
        <label>이름 <input name="name" value={formData.name} onChange={handleChange} required style={inputStyle} /></label>
        <label>설명 <textarea name="description" value={formData.description} onChange={handleChange} required style={textareaStyle} /></label>
        <label>난이도 <select name="difficulty" value={formData.difficulty} onChange={handleChange} style={inputStyle}><option value="상">상</option><option value="중">중</option><option value="하">하</option></select></label>
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
