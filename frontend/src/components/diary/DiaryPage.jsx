import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api';
import './Diary.scss';

const DiaryPage = () => {
  const navigate = useNavigate();
  const [diaries, setDiaries] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [author, setAuthor] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = async () => {
    try {
      const params = {};
      if (keyword) params.keyword = keyword;
      if (author) params.author = author;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await apiClient.get('/diary', { params });
      setDiaries(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [author]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  const getAuthorLabel = (auth) => {
    const map = { husband: '🙋‍♂️ 남편', wife: '🙋‍♀️ 아내' };
    return map[auth] || auth;
  };

  const getMoodEmoji = (mood) => {
    const map = {
      happy: '😊',
      sad: '😢',
      angry: '😡',
      tired: '😴',
      excited: '🤩',
      love: '🥰',
      normal: '😐'
    };
    return map[mood] || '';
  };

  const getWeatherEmoji = (weather) => {
    const map = {
      sunny: '☀️',
      cloudy: '☁️',
      rainy: '🌧️',
      snowy: '❄️'
    };
    return map[weather] || '';
  };

  return (
    <div className="diary-page">
      <h1>💬 소곤소곤</h1>
      <p className="subtitle">서로에게 하고 싶은 말</p>

      {/* 검색 */}
      <form className="search-box" onSubmit={handleSearch}>
        <input
          type="text"
          className="search-input"
          placeholder="검색..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <select
          className="author-select"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        >
          <option value="">전체</option>
          <option value="husband">남편</option>
          <option value="wife">아내</option>
        </select>
        <button type="submit" className="search-btn">검색</button>
      </form>

      <div className="date-filter">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <span className="date-separator">~</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        <button type="button" className="date-search-btn" onClick={fetchData}>적용</button>
        <button type="button" className="date-reset-btn" onClick={() => { setDateFrom(''); setDateTo(''); }}>초기화</button>
      </div>

      {/* 글쓰기 버튼 */}
      <div className="toolbar">
        <button className="add-btn" onClick={() => navigate('/diary/new')}>
          + 글쓰기
        </button>
      </div>

      {/* 목록 */}
      <div className="diary-list">
        {diaries.map((diary) => (
          <div
            key={diary._id}
            className={`diary-card ${diary.author}`}
            onClick={() => navigate(`/diary/${diary._id}`)}
          >
            {diary.image_url && (
              <div className="diary-thumbnail">
                <img src={diary.image_url} alt={diary.title} />
              </div>
            )}
            <div className="diary-content">
              <div className="diary-header">
                <span className="diary-date">{diary.date || diary.created_at?.slice(0, 10)}</span>
                <span className="diary-mood">{getMoodEmoji(diary.mood)} {getWeatherEmoji(diary.weather)}</span>
              </div>
              <div className="diary-title">{diary.title}</div>
              <div className="diary-preview">{diary.content?.slice(0, 100)}...</div>
              <div className="diary-meta">
                <span className={`author-tag ${diary.author}`}>{getAuthorLabel(diary.author)}</span>
                <span>💬 {diary.comments?.length || 0}</span>
              </div>
            </div>
          </div>
        ))}
        {diaries.length === 0 && (
          <div className="empty-message">아직 작성된 글이 없어요. 먼저 한마디 남겨보세요!</div>
        )}
      </div>
    </div>
  );
};

export default DiaryPage;
