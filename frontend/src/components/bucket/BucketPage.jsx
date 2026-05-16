import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api';
import useBucketCodes from '../../hooks/useBucketCodes';
import { useAuth } from '../../context/AuthContext';
import './Bucket.scss';

const BucketPage = () => {
  const navigate = useNavigate();
  const { getAuthorName } = useAuth();
  const { categories, statuses, loading: codesLoading, getCategoryLabel } = useBucketCodes();
  const [buckets, setBuckets] = useState([]);
  const [stats, setStats] = useState({ total: 0, not_started: 0, active: 0, completed: 0, rate: 0 });
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('all');

  const fetchData = async () => {
    try {
      const params = {};
      if (keyword) params.keyword = keyword;
      if (category) params.category = category;
      if (status !== 'all') params.status = status;

      const [bucketsRes, statsRes] = await Promise.all([
        apiClient.get('/bucket', { params }),
        apiClient.get('/bucket/stats')
      ]);
      setBuckets(bucketsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [category, status]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  const getStatusIcon = (st) => {
    const map = { not_started: '⏸️', active: '▶️', completed: '✅' };
    return map[st] || '';
  };

  if (codesLoading) return <div>로딩중...</div>;

  return (
    <div className="bucket-page">
      <h1>🎯 버킷리스트</h1>
      <p className="subtitle">우리 부부의 꿈 목록</p>

      {/* 통계 */}
      <div className="stats">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">전체</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.not_started}</div>
          <div className="stat-label">미진행</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.active}</div>
          <div className="stat-label">진행중</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.completed}</div>
          <div className="stat-label">완료</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.rate}%</div>
          <div className="stat-label">달성률</div>
        </div>
      </div>

      {/* 검색 */}
      <form className="search-box" onSubmit={handleSearch}>
        <input
          type="text"
          className="search-input"
          placeholder="버킷리스트 검색..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <select
          className="category-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">전체 카테고리</option>
          {categories.map(c => (
            <option key={c.code_id} value={c.code_id}>{c.code_name}</option>
          ))}
        </select>
        <button type="submit" className="search-btn">검색</button>
      </form>

      {/* 필터/추가 */}
      <div className="toolbar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${status === 'all' ? 'active' : ''}`}
            onClick={() => setStatus('all')}
          >전체</button>
          {statuses.map(s => (
            <button
              key={s.code_id}
              className={`filter-tab ${status === s.code_id ? 'active' : ''}`}
              onClick={() => setStatus(s.code_id)}
            >{s.code_name}</button>
          ))}
        </div>
        <button className="add-btn" onClick={() => navigate('/bucket/new')}>
          + 새 버킷 추가
        </button>
      </div>

      {/* 목록 */}
      <div className="bucket-list">
        {buckets.map((bucket) => (
          <div
            key={bucket._id}
            className={`bucket-card ${bucket.status}`}
            onClick={() => navigate(`/bucket/${bucket._id}`)}
          >
            {bucket.image_url && (
              <div className="bucket-thumbnail">
                <img src={bucket.image_url} alt={bucket.title} />
              </div>
            )}
            <div className={`checkbox ${bucket.status}`}>
              {getStatusIcon(bucket.status)}
            </div>
            <div className="bucket-content">
              <div className="bucket-title">{bucket.title}</div>
              <div className="bucket-meta">
                <span className={`category-tag ${bucket.category}`}>
                  {getCategoryLabel(bucket.category)}
                </span>
                {bucket.status === 'completed' ? (
                  <span>✅ {bucket.completed_at?.slice(0, 10)} 완료</span>
                ) : (
                  <span>📅 {bucket.target_date || '미정'}</span>
                )}
                <span>👤 {getAuthorName(bucket.created_by)}</span>
                <span>💬 {bucket.comments?.length || 0}</span>
              </div>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${bucket.progress}%` }}></div>
            </div>
          </div>
        ))}
        {buckets.length === 0 && (
          <div className="empty-message">버킷리스트가 없습니다. 새로 추가해보세요!</div>
        )}
      </div>
    </div>
  );
};

export default BucketPage;
