import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api';
import { useToast } from '../common/Toast';
import { useConfirm } from '../common/ConfirmDialog';
import './Review.scss';

function ReviewDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const [review, setReview] = useState(null);
  const [editData, setEditData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError(false);

    apiClient.get(`/review/${id}`)
      .then(res => { if (!alive) return; setReview(res.data); setEditData(res.data); })
      .catch(err => { console.error(err); if (alive) setLoadError(true); })
      .finally(() => { if (alive) setLoading(false); });

    apiClient.get('/code/group/FOOD')
      .then(res => { if (alive) setCategories(res.data); })
      .catch(err => console.error(err));

    return () => { alive = false; };
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
    if (submitting) return;
    if (!editData.restaurant_name?.trim()) { toast.error('식당 이름을 입력해주세요.'); return; }

    const cleanData = {
      ...editData,
      image_urls: (editData.image_urls || []).filter(url => url.trim() !== "")
    };
    setSubmitting(true);
    try {
      await apiClient.put(`/review/${id}`, cleanData);
      setReview(cleanData);
      setIsEditing(false);
      toast.success('수정되었습니다.');
    } catch (err) {
      console.error(err);
      toast.error('수정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: '리뷰 삭제',
      message: '이 맛집 리뷰를 정말 삭제할까요?\n삭제하면 되돌릴 수 없습니다.',
      confirmText: '삭제',
      danger: true,
    });
    if (!ok || submitting) return;

    setSubmitting(true);
    try {
      await apiClient.delete(`/review/${id}`);
      toast.success('삭제되었습니다.');
      navigate('/review');
    } catch (err) {
      console.error(err);
      toast.error('삭제에 실패했습니다.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="content-box review-detail-page">
        <div className="detail-loading"><span className="spinner" /><span>불러오는 중...</span></div>
      </div>
    );
  }

  if (loadError || !review) {
    return (
      <div className="content-box review-detail-page">
        <div className="detail-error">
          <p>리뷰 정보를 불러오지 못했습니다.</p>
          <button className="btn back" onClick={() => navigate('/review')}>목록으로</button>
        </div>
      </div>
    );
  }

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
            <button onClick={handleUpdate} className="btn save" disabled={submitting}>
              {submitting ? '저장 중...' : '저장'}
            </button>
            <button onClick={() => { setEditData(review); setIsEditing(false); }} className="btn cancel" disabled={submitting}>취소</button>
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
            <button onClick={handleDelete} className="btn delete" disabled={submitting}>삭제</button>
            <button onClick={() => navigate('/review')} className="btn back">목록으로</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewDetailPage;
