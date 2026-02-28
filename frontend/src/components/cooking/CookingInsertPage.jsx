import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api';
import './Cooking.scss';

function CookingInsertPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    chef: 'husband',
    name: '',
    description: '',
    cooking_type: '',
    image_url: ''
  });

  const [cookingCodes, setCookingCodes] = useState([]);

  useEffect(() => {
    apiClient.get('/code/group/COOKING')
      .then(res => {
        setCookingCodes(res.data);
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
    <div className="content-box cooking-insert-page">
      <h1>🍳 요리 등록하기</h1>
      <form onSubmit={handleSubmit} className="insert-form">

        <label>누가?
          <select name="chef" value={formData.chef} onChange={handleChange} className="form-select">
            <option value="husband">남편</option>
            <option value="wife">아내</option>
          </select>
        </label>

        <label>이름
          <input name="name" value={formData.name} onChange={handleChange} required className="form-input" />
        </label>

        <label>요리 종류
          <select name="cooking_type" value={formData.cooking_type} onChange={handleChange} className="form-select">
            {cookingCodes.map((code) => (
              <option key={code.code_id} value={code.code_name}>{code.code_name}</option>
            ))}
          </select>
        </label>

        <label>설명
          <textarea name="description" value={formData.description} onChange={handleChange} required className="form-textarea" />
        </label>
        <label>이미지 URL
          <input name="image_url" value={formData.image_url} onChange={handleChange} className="form-input" />
        </label>

        <button type="submit" className="btn-submit">등록</button>
      </form>
    </div>
  );
}

export default CookingInsertPage;
