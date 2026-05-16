import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api';
import { useAuth } from '../../context/AuthContext';
import useBucketCodes from '../../hooks/useBucketCodes';
import './Bucket.scss';

const BucketDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAuthorName } = useAuth();
  const { categories, statuses, loading: codesLoading, getCategoryLabel, getStatusLabel } = useBucketCodes();
  const [bucket, setBucket] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});
  const [newComment, setNewComment] = useState('');

  const fetchBucket = async () => {
    try {
      const res = await apiClient.get(`/bucket/${id}`);
      setBucket(res.data);
      setForm(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBucket();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSave = async () => {
    try {
      await apiClient.put(`/bucket/${id}`, form);
      setIsEditing(false);
      fetchBucket();
    } catch (err) {
      alert('수정 실패');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await apiClient.delete(`/bucket/${id}`);
      navigate('/bucket');
    } catch (err) {
      alert('삭제 실패');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await apiClient.post(`/bucket/${id}/comments`, {
        content: newComment
      });
      setNewComment('');
      fetchBucket();
    } catch (err) {
      alert('코멘트 등록 실패');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('코멘트를 삭제하시겠습니까?')) return;
    try {
      await apiClient.delete(`/bucket/${id}/comments/${commentId}`);
      fetchBucket();
    } catch (err) {
      alert('삭제 실패');
    }
  };

  const getStatusIcon = (st) => {
    const map = { not_started: '⏸️', active: '▶️', completed: '✅' };
    return map[st] || '🎯';
  };

  if (!bucket || codesLoading) return <div>로딩중...</div>;

  return (
    <div className="bucket-detail-page">
      <div className="detail-header">
        <h1>{getStatusIcon(bucket.status)} {bucket.title}</h1>
        <div className="header-actions">
          {isEditing ? (
            <>
              <button className="save-btn" onClick={handleSave}>저장</button>
              <button className="cancel-btn" onClick={() => setIsEditing(false)}>취소</button>
            </>
          ) : (
            <>
              <button className="edit-btn" onClick={() => setIsEditing(true)}>수정</button>
              <button className="delete-btn" onClick={handleDelete}>삭제</button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="edit-form">
          <div className="form-group">
            <label>제목</label>
            <input name="title" value={form.title} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>설명</label>
            <textarea name="description" value={form.description || ''} onChange={handleChange} rows={3} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>카테고리</label>
              <select name="category" value={form.category} onChange={handleChange}>
                {categories.map(c => (
                  <option key={c.code_id} value={c.code_id}>{c.code_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>목표일</label>
              <input type="date" name="target_date" value={form.target_date || ''} onChange={handleChange} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>진행률 ({form.progress}%)</label>
              <input type="range" name="progress" min="0" max="100" value={form.progress} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>상태</label>
              <select name="status" value={form.status} onChange={handleChange}>
                {statuses.map(c => (
                  <option key={c.code_id} value={c.code_id}>{c.code_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>이미지 URL</label>
            <input type="text" name="image_url" value={form.image_url || ''} onChange={handleChange} placeholder="https://example.com/image.jpg" />
            {form.image_url && (
              <div className="image-preview">
                <img src={form.image_url} alt="미리보기" />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="detail-content">
          {bucket.image_url && (
            <div className="detail-image">
              <img src={bucket.image_url} alt={bucket.title} />
            </div>
          )}

          <div className="detail-row">
            <div className="detail-item">
              <span className="label">카테고리</span>
              <span className={`category-tag ${bucket.category}`}>{getCategoryLabel(bucket.category)}</span>
            </div>
            <div className="detail-item">
              <span className="label">작성자</span>
              <span>👤 {getAuthorName(bucket.created_by)}</span>
            </div>
            <div className="detail-item">
              <span className="label">목표일</span>
              <span>{bucket.target_date || '미정'}</span>
            </div>
            <div className="detail-item">
              <span className="label">상태</span>
              <span className={`status-badge ${bucket.status}`}>{getStatusIcon(bucket.status)} {getStatusLabel(bucket.status)}</span>
            </div>
          </div>

          {bucket.description && (
            <div className="description-section">
              <span className="label">설명</span>
              <p>{bucket.description}</p>
            </div>
          )}

          <div className="progress-section">
            <div className="progress-header">
              <span>진행률</span>
              <span><strong>{bucket.progress}%</strong></span>
            </div>
            <div className="progress-bar-large">
              <div className="progress-fill-large" style={{ width: `${bucket.progress}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {/* 코멘트 섹션 */}
      <div className="comments-section">
        <h3>💬 코멘트 ({bucket.comments?.length || 0})</h3>

        <div className="comment-list">
          {bucket.comments?.map((comment) => (
            <div key={comment.id} className="comment-item">
              <div className="comment-avatar">
                {getAuthorName(comment.created_by)}
              </div>
              <div className="comment-body">
                <div className="comment-header">
                  <span className="comment-author">👤 {getAuthorName(comment.created_by)}</span>
                  <span className="comment-date">{comment.created_at?.slice(0, 10)}</span>
                </div>
                <div className="comment-text">{comment.content}</div>
              </div>
              <button className="comment-delete" onClick={() => handleDeleteComment(comment.id)}>×</button>
            </div>
          ))}
        </div>

        <div className="comment-input-box">
          <textarea
            className="comment-input"
            rows={2}
            placeholder="코멘트를 입력하세요..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button className="comment-submit" onClick={handleAddComment}>등록</button>
        </div>
      </div>

      <button className="back-btn" onClick={() => navigate('/bucket')}>← 목록으로</button>
    </div>
  );
};

export default BucketDetailPage;
