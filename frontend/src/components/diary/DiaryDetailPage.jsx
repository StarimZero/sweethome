import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api';
import { useAuth } from '../../context/AuthContext';
import './Diary.scss';

const DiaryDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [diary, setDiary] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});
  const [newComment, setNewComment] = useState('');

  const moods = [
    { id: 'happy', emoji: '😊', label: '행복' },
    { id: 'sad', emoji: '😢', label: '슬픔' },
    { id: 'angry', emoji: '😡', label: '화남' },
    { id: 'tired', emoji: '😴', label: '피곤' },
    { id: 'excited', emoji: '🤩', label: '신남' },
    { id: 'love', emoji: '🥰', label: '사랑' },
    { id: 'normal', emoji: '😐', label: '보통' }
  ];

  const weathers = [
    { id: 'sunny', emoji: '☀️', label: '맑음' },
    { id: 'cloudy', emoji: '☁️', label: '흐림' },
    { id: 'rainy', emoji: '🌧️', label: '비' },
    { id: 'snowy', emoji: '❄️', label: '눈' }
  ];

  const fetchDiary = async () => {
    try {
      const res = await apiClient.get(`/diary/${id}`);
      setDiary(res.data);
      setForm(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDiary();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSave = async () => {
    try {
      await apiClient.put(`/diary/${id}`, form);
      setIsEditing(false);
      fetchDiary();
    } catch (err) {
      alert('수정 실패');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await apiClient.delete(`/diary/${id}`);
      navigate('/diary');
    } catch (err) {
      alert('삭제 실패');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const author = user?.username === 'wife' ? '아내' : '남편';
      await apiClient.post(`/diary/${id}/comments`, {
        author,
        content: newComment
      });
      setNewComment('');
      fetchDiary();
    } catch (err) {
      alert('코멘트 등록 실패');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('코멘트를 삭제하시겠습니까?')) return;
    try {
      await apiClient.delete(`/diary/${id}/comments/${commentId}`);
      fetchDiary();
    } catch (err) {
      alert('삭제 실패');
    }
  };

  const getAuthorLabel = (auth) => {
    const map = { husband: '🙋‍♂️ 남편', wife: '🙋‍♀️ 아내' };
    return map[auth] || auth;
  };

  const getMoodLabel = (mood) => {
    const found = moods.find(m => m.id === mood);
    return found ? `${found.emoji} ${found.label}` : '';
  };

  const getWeatherLabel = (weather) => {
    const found = weathers.find(w => w.id === weather);
    return found ? `${found.emoji} ${found.label}` : '';
  };

  if (!diary) return <div>로딩중...</div>;

  return (
    <div className="diary-detail-page">
      <div className="detail-header">
        <div className="header-info">
          <span className="diary-date">{diary.date || diary.created_at?.slice(0, 10)}</span>
          <span className={`author-tag ${diary.author}`}>{getAuthorLabel(diary.author)}</span>
        </div>
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
            <label>내용</label>
            <textarea name="content" value={form.content || ''} onChange={handleChange} rows={10} />
          </div>
          <div className="form-group">
            <label>이미지 URL</label>
            <input type="text" name="image_url" value={form.image_url || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>날짜</label>
            <input type="date" name="date" value={form.date || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>기분</label>
            <div className="mood-selector">
              {moods.map(m => (
                <button
                  type="button"
                  key={m.id}
                  className={`mood-btn ${form.mood === m.id ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, mood: m.id })}
                >
                  <span className="emoji">{m.emoji}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>날씨</label>
            <div className="weather-selector">
              {weathers.map(w => (
                <button
                  type="button"
                  key={w.id}
                  className={`weather-btn ${form.weather === w.id ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, weather: w.id })}
                >
                  <span className="emoji">{w.emoji}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="detail-content">
          {diary.image_url && (
            <div className="detail-image">
              <img src={diary.image_url} alt={diary.title} />
            </div>
          )}

          <h1 className="diary-title">{diary.title}</h1>

          <div className="diary-info">
            {diary.mood && <span className="info-item">{getMoodLabel(diary.mood)}</span>}
            {diary.weather && <span className="info-item">{getWeatherLabel(diary.weather)}</span>}
          </div>

          <div className="diary-body">
            {diary.content}
          </div>
        </div>
      )}

      {/* 코멘트 섹션 */}
      <div className="comments-section">
        <h3>💬 코멘트 ({diary.comments?.length || 0})</h3>

        <div className="comment-list">
          {diary.comments?.map((comment) => (
            <div key={comment.id} className="comment-item">
              <div className={`comment-avatar ${comment.author === '아내' ? 'wife' : ''}`}>
                {comment.author}
              </div>
              <div className="comment-body">
                <div className="comment-header">
                  <span className="comment-author">{comment.author}</span>
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

      <button className="back-btn" onClick={() => navigate('/diary')}>← 목록으로</button>
    </div>
  );
};

export default DiaryDetailPage;
