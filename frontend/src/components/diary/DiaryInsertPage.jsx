import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api';
import './Diary.scss';

const DiaryInsertPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    title: '',
    content: '',
    author: user?.username === 'wife' ? 'wife' : 'husband',
    date: today,
    mood: '',
    weather: '',
    image_url: ''
  });

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('제목을 입력하세요.');
      return;
    }
    if (!form.content.trim()) {
      alert('내용을 입력하세요.');
      return;
    }
    try {
      await apiClient.post('/diary', form);
      navigate('/diary');
    } catch (err) {
      console.error(err);
      alert('등록 실패');
    }
  };

  return (
    <div className="diary-insert-page">
      <h1>💬 하고 싶은 말</h1>

      <form onSubmit={handleSubmit} className="diary-form">
        <div className="form-group">
          <label>제목 *</label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="제목을 입력하세요"
          />
        </div>

        <div className="form-group">
          <label>내용 *</label>
          <textarea
            name="content"
            value={form.content}
            onChange={handleChange}
            placeholder="하고 싶은 말을 적어주세요"
            rows={10}
          />
        </div>

        <div className="form-group">
          <label>이미지 URL</label>
          <input
            type="text"
            name="image_url"
            value={form.image_url}
            onChange={handleChange}
            placeholder="https://example.com/image.jpg"
          />
          {form.image_url && (
            <div className="image-preview">
              <img src={form.image_url} alt="미리보기" />
            </div>
          )}
        </div>

        <div className="form-group half-width">
          <label>날짜</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
          />
        </div>

        <div className="form-group half-width">
          <label>작성자</label>
          <select name="author" value={form.author} onChange={handleChange}>
            <option value="husband">🙋‍♂️ 남편</option>
            <option value="wife">🙋‍♀️ 아내</option>
          </select>
        </div>

        <div className="form-group">
          <label>오늘의 기분</label>
          <div className="mood-selector">
            {moods.map(m => (
              <button
                type="button"
                key={m.id}
                className={`mood-btn ${form.mood === m.id ? 'active' : ''}`}
                onClick={() => setForm({ ...form, mood: m.id })}
              >
                <span className="emoji">{m.emoji}</span>
                <span className="label">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>오늘의 날씨</label>
          <div className="weather-selector">
            {weathers.map(w => (
              <button
                type="button"
                key={w.id}
                className={`weather-btn ${form.weather === w.id ? 'active' : ''}`}
                onClick={() => setForm({ ...form, weather: w.id })}
              >
                <span className="emoji">{w.emoji}</span>
                <span className="label">{w.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={() => navigate('/diary')}>
            취소
          </button>
          <button type="submit" className="submit-btn">저장</button>
        </div>
      </form>
    </div>
  );
};

export default DiaryInsertPage;
