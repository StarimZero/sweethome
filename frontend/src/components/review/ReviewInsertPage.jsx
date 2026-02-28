import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api';
import './Review.scss';

function ReviewInsertPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    restaurant_name: '', location: '',
    husband_rating: 0.0,
    wife_rating: 0.0,
    husbandcomment: '', wifecomment: '',
    visit_date: '', naver_url: '',
    category: '',
    image_urls: ['']
  });

  useEffect(() => {
    apiClient.get('/code/group/FOOD')
      .then(res => setCategories(res.data))
      .catch(err => console.error("코드 로딩 실패", err));
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addImageField = () => {
    setFormData({ ...formData, image_urls: [...formData.image_urls, ''] });
  };

  const handleImageChange = (index, value) => {
    const newImages = [...formData.image_urls];
    newImages[index] = value;
    setFormData({ ...formData, image_urls: newImages });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanData = {
      ...formData,
      image_urls: formData.image_urls.filter(url => url.trim() !== "")
    };

    try {
      await apiClient.post('/review', cleanData);
      alert("리뷰 등록 완료!");
      navigate('/review');
    } catch (err) {
      console.error(err);
      alert("오류 발생");
    }
  };

  return (
    <div className="content-box review-insert-page">
      <h1>📝 맛집 리뷰 작성</h1>
      <form onSubmit={handleSubmit} className="insert-form">

        {/* 기본 정보 */}
        <div className="form-row">
          <div className="form-col">
            <label className="form-label">음식 종류</label>
            <select name="category" value={formData.category} onChange={handleChange} className="form-select">
              <option value="">선택하세요</option>
              {categories.map(code => (
                <option key={code.code_id} value={code.code_id}>{code.code_name}</option>
              ))}
            </select>
          </div>
          <div className="form-col col-2">
            <label className="form-label">식당 이름 *</label>
            <input name="restaurant_name" value={formData.restaurant_name} onChange={handleChange} required className="form-input" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-col">
            <label className="form-label">위치 *</label>
            <input name="location" value={formData.location} onChange={handleChange} placeholder="예: 홍대" required className="form-input" />
          </div>
          <div className="form-col">
            <label className="form-label">방문 날짜</label>
            <input type="date" name="visit_date" value={formData.visit_date} onChange={handleChange} className="form-input" />
          </div>
        </div>

        <div>
          <label className="form-label">네이버 지도 링크</label>
          <input name="naver_url" value={formData.naver_url} onChange={handleChange} placeholder="https://map.naver.com/..." className="form-input" />
        </div>

        {/* 부부 평가 */}
        <div className="couple-section">
          <h3>💑 부부의 맛 평가</h3>

          <div className="person-block">
            <div className="person-header">
              <label className="person-label husband">👨‍💼 남편의 생각</label>
              <div className="rating-input-group">
                <span>별점:</span>
                <input type="number" name="husband_rating" step="0.1" min="0" max="5" value={formData.husband_rating} onChange={handleChange} />
              </div>
            </div>
            <textarea name="husbandcomment" value={formData.husbandcomment} onChange={handleChange} className="form-textarea" placeholder="남편의 한줄평을 적어주세요" />
          </div>

          <div className="person-block">
            <div className="person-header">
              <label className="person-label wife">👩‍💼 아내의 생각</label>
              <div className="rating-input-group">
                <span>별점:</span>
                <input type="number" name="wife_rating" step="0.1" min="0" max="5" value={formData.wife_rating} onChange={handleChange} />
              </div>
            </div>
            <textarea name="wifecomment" value={formData.wifecomment} onChange={handleChange} className="form-textarea" placeholder="아내의 한줄평을 적어주세요" />
          </div>
        </div>

        {/* 이미지 */}
        <div className="image-section">
          <label className="form-label">📸 음식 사진 URL (여러 장 가능)</label>
          {formData.image_urls.map((url, index) => (
            <div key={index} className="image-item">
              <input value={url} onChange={(e) => handleImageChange(index, e.target.value)} placeholder="https://..." className="form-input" />
            </div>
          ))}
          <button type="button" onClick={addImageField} className="btn-add-image">+ 사진 추가하기</button>
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/review')} className="btn cancel">취소</button>
          <button type="submit" className="btn submit">등록하기</button>
        </div>
      </form>
    </div>
  );
}

export default ReviewInsertPage;
