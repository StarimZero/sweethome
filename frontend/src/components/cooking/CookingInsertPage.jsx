import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api';
import { useToast } from '../common/Toast';
import './Cooking.scss';

function CookingInsertPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cooking_type: '',
    image_url: ''
  });

  const [cookingCodes, setCookingCodes] = useState([]);
  const [submitting, setSubmitting] = useState(false);

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
    if (submitting) return; // 중복 제출 방지
    setSubmitting(true);
    try {
      await apiClient.post('/cooking', formData);
      toast.success('등록되었습니다!');
      navigate('/cooking');
    } catch (err) {
      console.error(err);
      toast.error('등록에 실패했습니다. 다시 시도해주세요.');
      setSubmitting(false);
    }
  };

  return (
    <div className="content-box cooking-insert-page">
      <div className="form-head">
        <h1>🍳 요리 등록</h1>
        <p>우리 식탁에 올린 요리를 기록해요.</p>
      </div>

      <form onSubmit={handleSubmit} className="insert-form">
        <div className="form-section">
          <label>이름 <span className="req">*</span>
            <input name="name" value={formData.name} onChange={handleChange} required className="form-input" placeholder="예: 김치찌개" />
          </label>

          <label>요리 종류
            <select name="cooking_type" value={formData.cooking_type} onChange={handleChange} className="form-select">
              {cookingCodes.map((code) => (
                <option key={code.code_id} value={code.code_name}>{code.code_name}</option>
              ))}
            </select>
          </label>

          <label>설명 <span className="req">*</span>
            <textarea name="description" value={formData.description} onChange={handleChange} required className="form-textarea" placeholder="레시피, 재료, 메모 등을 자유롭게 적어주세요." />
          </label>

          <label>이미지 URL
            <input name="image_url" value={formData.image_url} onChange={handleChange} className="form-input" placeholder="https://..." />
          </label>

          {formData.image_url && (
            <div className="image-preview">
              <img src={formData.image_url} alt="미리보기" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={() => navigate('/cooking')} disabled={submitting}>취소</button>
          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? '등록 중...' : '등록'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CookingInsertPage;
