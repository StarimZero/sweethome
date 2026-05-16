import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api';
import { useAuth } from '../../context/AuthContext';
import './Knitting.scss';

const STATUS_LABEL = { WAIT: '대기', CO: 'CO', WIP: 'WIP', FO: 'FO' };

function KnittingPage() {
  const navigate = useNavigate();
  const { getAuthorName } = useAuth();
  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ q: '', status: '', category: '', sort: 'recent' });

  useEffect(() => {
    apiClient.get('/code/group/KNITTING_CATEGORY')
      .then(res => setCategories(res.data))
      .catch(err => console.error('카테고리 코드 로딩 실패:', err));
    fetchRecords();
  }, []);

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.category, filters.sort]);

  const fetchRecords = async () => {
    try {
      const params = {};
      if (filters.q) params.q = filters.q;
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.sort) params.sort = filters.sort;

      const res = await apiClient.get('/knitting', { params });
      setRecords(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') fetchRecords();
  };

  return (
    <div className="content-box knitting-page">
      <div className="page-header">
        <h1>🧶 뜨개록</h1>
        <button onClick={() => navigate('/knitting/new')} className="btn-add">＋ 작품 등록</button>
      </div>

      <div className="filter-box">
        <input
          name="q"
          value={filters.q}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="🔍 작품 이름, 실, 태그로 검색..."
          className="filter-input"
        />
        <select name="status" value={filters.status} onChange={handleChange} className="filter-select">
          <option value="">전체 상태</option>
          <option value="WAIT">대기</option>
          <option value="CO">CO</option>
          <option value="WIP">WIP</option>
          <option value="FO">FO</option>
        </select>
        <select name="category" value={filters.category} onChange={handleChange} className="filter-select">
          <option value="">전체 카테고리</option>
          {categories.map(c => (
            <option key={c.code_id} value={c.code_id}>{c.code_name}</option>
          ))}
        </select>
        <select name="sort" value={filters.sort} onChange={handleChange} className="filter-select">
          <option value="recent">최신순</option>
          <option value="oldest">오래된순</option>
          <option value="name">이름순</option>
        </select>
        <button onClick={fetchRecords} className="btn-search">검색</button>
      </div>

      <div className="knitting-grid">
        {records.map(r => {
          const categoryName = categories.find(c => c.code_id === r.category)?.code_name;
          const period = r.start_date
            ? `${r.start_date} ~ ${r.end_date || '진행중'}`
            : '미시작';
          const thumb = r.image_urls && r.image_urls.length > 0 ? r.image_urls[0] : null;
          return (
            <div
              key={r._id}
              className="knitting-card"
              onClick={() => navigate(`/knitting/${r._id}`)}
            >
              <div className="card-image">
                {thumb ? <img src={thumb} alt={r.name} /> : '🧶'}
              </div>
              <div className="card-body">
                <h3>
                  {r.name}
                  <span className={`knitting-status-tag s-${r.status}`}>{STATUS_LABEL[r.status] || r.status}</span>
                </h3>
                <div className="meta">
                  {categoryName && <span className="category-badge">{categoryName}</span>}
                  {period}
                  {r.size ? ` · 사이즈 ${r.size}` : ''}
                </div>
                <div className="author">👤 {getAuthorName(r.created_by)}</div>
              </div>
            </div>
          );
        })}
        {records.length === 0 && (
          <div className="empty-message">검색 결과가 없습니다.</div>
        )}
      </div>
    </div>
  );
}

export default KnittingPage;
