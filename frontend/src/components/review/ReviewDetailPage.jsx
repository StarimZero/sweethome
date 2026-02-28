import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api';
import './Review.scss';

function ReviewDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [review, setReview] = useState(null);
  const [editData, setEditData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    apiClient.get(`/review/${id}`)
      .then(res => {
        setReview(res.data);
        setEditData(res.data);
      })
      .catch(err => console.error(err));

    apiClient.get('/code/group/FOOD')
      .then(res => setCategories(res.data))
      .catch(err => console.error(err));
  }, [id]);

  const getCategoryName = (codeId) => {
    const found = categories.find(c => c.code_id === codeId);
    return found ? found.code_name : codeId;
  };

  const handleChange = (e) => setEditData({...editData, [e.target.name]: e.target.value});

  const handleImageChange = (index, value) => {
    const newImages = [...(editData.image_urls || [])];
    newImages[index] = value;
    setEditData({ ...editData, image_urls: newImages });
  };

  const addImageField = () => setEditData({ ...editData, image_urls: [...(editData.image_urls || []), ''] });

  const handleUpdate = async () => {
    const cleanData = {
      ...editData,
      image_urls: (editData.image_urls || []).filter(url => url.trim() !== "")
    };
    await apiClient.put(`/review/${id}`, cleanData);
    setReview(cleanData);
    setIsEditing(false);
    alert("수정되었습니다.");
  };

  const handleDelete = async () => {
    if (window.confirm("정말 삭제하시겠습니까? 🗑️")) {
      await apiClient.delete(`/review/${id}`);
      alert("삭제되었습니다.");
      navigate('/review');
    }
  };

  if (!review) return <div>Loading...</div>;

  return (
    <div className="content-box review-detail-page">
      {isEditing ? (
        <div className="edit-form">
          <h2>✏️ 리뷰 수정</h2>

          <div className="form-row">
            <div className="form-col">
              <label className="form-label">음식 종류</label>
              <select name="category" value={editData.category || ''} onChange={handleChange} className="form-select">
                <option value="">선택하세요</option>
                {categories.map(code => (
                  <option key={code.code_id} value={code.code_id}>{code.code_name}</option>
                ))}
              </select>
            </div>
            <div className="form-col col-2">
              <label className="form-label">식당 이름</label>
              <input name="restaurant_name" value={editData.restaurant_name} onChange={handleChange} className="form-input" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-col">
              <input name="location" value={editData.location} onChange={handleChange} placeholder="위치" className="form-input" />
            </div>
            <div className="form-col">
              <input type="date" name="visit_date" value={editData.visit_date} onChange={handleChange} className="form-input" />
            </div>
          </div>
          <input name="naver_url" value={editData.naver_url} onChange={handleChange} placeholder="네이버 지도 URL" className="form-input" />

          {/* 별점 수정 */}
          <div className="rating-edit-row">
            <label>👨‍💼 남편 점수 <input type="number" name="husband_rating" step="0.1" value={editData.husband_rating} onChange={handleChange} className="form-input" /></label>
            <label>👩‍💼 아내 점수 <input type="number" name="wife_rating" step="0.1" value={editData.wife_rating} onChange={handleChange} className="form-input" /></label>
          </div>

          <textarea name="husbandcomment" value={editData.husbandcomment} onChange={handleChange} placeholder="남편 코멘트" className="form-textarea" />
          <textarea name="wifecomment" value={editData.wifecomment} onChange={handleChange} placeholder="아내 코멘트" className="form-textarea" />

          <label className="form-label">사진 편집</label>
          {(editData.image_urls || []).map((url, index) => (
            <input key={index} value={url} onChange={(e)=>handleImageChange(index, e.target.value)} className="form-input" style={{marginBottom:'5px'}} />
          ))}
          <button onClick={addImageField} className="btn add-photo">+ 사진 추가</button>

          <div className="edit-actions">
            <button onClick={handleUpdate} className="btn save">저장</button>
            <button onClick={()=>setIsEditing(false)} className="btn cancel">취소</button>
          </div>
        </div>
      ) : (
        <div>
          <div className="detail-top">
            <div className="detail-info">
              {review.category && (
                <span className="category-tag">{getCategoryName(review.category)}</span>
              )}
              <h1>{review.restaurant_name}</h1>
              <div className="meta">📍 {review.location} | 📅 {review.visit_date}</div>
            </div>
            {review.naver_url && (
              <a href={review.naver_url} target="_blank" rel="noreferrer" className="naver-link">N 네이버 지도</a>
            )}
          </div>

          <hr className="divider" />

          <div className="couple-comments">
            <div className="comment-card husband">
              <h3>
                👨‍💼 남편의 한마디
                <span className="rating">★ {review.husband_rating}</span>
              </h3>
              <p>{review.husbandcomment || "코멘트가 없습니다."}</p>
            </div>
            <div className="comment-card wife">
              <h3>
                👩‍💼 아내의 한마디
                <span className="rating">★ {review.wife_rating}</span>
              </h3>
              <p>{review.wifecomment || "코멘트가 없습니다."}</p>
            </div>
          </div>

          <h3 className="gallery-title">📸 사진 갤러리</h3>
          <div className="gallery-grid">
            {(review.image_urls || []).map((url, index) => (
              <img key={index} src={url} alt="음식" />
            ))}
          </div>

          <div className="detail-actions">
            <button onClick={() => setIsEditing(true)} className="btn edit">수정</button>
            <button onClick={handleDelete} className="btn delete">삭제</button>
            <button onClick={() => navigate('/review')} className="btn back">목록으로</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewDetailPage;
