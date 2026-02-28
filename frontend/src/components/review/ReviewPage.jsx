import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../../api';
import './Review.scss';

function ReviewPage() {
  const navigate = useNavigate();

  const [allReviews, setAllReviews] = useState([]);
  const [categoryMap, setCategoryMap] = useState({});
  const [categoryList, setCategoryList] = useState([]);

  const [filters, setFilters] = useState(() => {
    const saved = sessionStorage.getItem('reviewFilters');
    return saved ? JSON.parse(saved) : {
      keyword: '', location: '', category: '',
      husbandMin: 0, husbandMax: 5,
      wifeMin: 0, wifeMax: 5,
      startDate: '', endDate: ''
    };
  });

  const [currentPage, setCurrentPage] = useState(() => {
    return Number(sessionStorage.getItem('reviewPage')) || 1;
  });

  const itemsPerPage = 12;

  useEffect(() => {
    sessionStorage.setItem('reviewFilters', JSON.stringify(filters));
    sessionStorage.setItem('reviewPage', currentPage);
  }, [filters, currentPage]);

  useEffect(() => {
    apiClient.get('/review')
      .then(res => setAllReviews(res.data))
      .catch(err => console.error(err));

    apiClient.get('/code/group/FOOD')
      .then(res => {
        setCategoryList(res.data);
        const map = {};
        res.data.forEach(c => { map[c.code_id] = c.code_name; });
        setCategoryMap(map);
      })
      .catch(err => console.error(err));
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const handleReset = () => {
    const resetFilters = {
      keyword: '', location: '', category: '',
      husbandMin: 0, husbandMax: 5, wifeMin: 0, wifeMax: 5,
      startDate: '', endDate: ''
    };
    setFilters(resetFilters);
    setCurrentPage(1);
    sessionStorage.setItem('reviewFilters', JSON.stringify(resetFilters));
    sessionStorage.setItem('reviewPage', 1);
  };

  const filteredReviews = allReviews.filter(review => {
    const matchKeyword = review.restaurant_name.toLowerCase().includes(filters.keyword.toLowerCase());
    const matchLocation = review.location.toLowerCase().includes(filters.location.toLowerCase());
    const matchCategory = filters.category === '' || review.category === filters.category;

    const hScore = review.husband_rating || 0;
    const matchHusband = hScore >= Number(filters.husbandMin) && hScore <= Number(filters.husbandMax);

    const wScore = review.wife_rating || 0;
    const matchWife = wScore >= Number(filters.wifeMin) && wScore <= Number(filters.wifeMax);

    let matchDate = true;
    if (review.visit_date) {
      if (filters.startDate && review.visit_date < filters.startDate) matchDate = false;
      if (filters.endDate && review.visit_date > filters.endDate) matchDate = false;
    } else {
      if (filters.startDate || filters.endDate) matchDate = false;
    }

    return matchKeyword && matchLocation && matchCategory && matchHusband && matchWife && matchDate;
  })
  .sort((a, b) => {
    if (!a.visit_date) return 1;
    if (!b.visit_date) return -1;
    return b.visit_date.localeCompare(a.visit_date);
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentReviews = filteredReviews.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);

  const getPageNumbers = () => {
    const maxButtons = 5;
    const currentGroup = Math.ceil(currentPage / maxButtons);
    const startPage = (currentGroup - 1) * maxButtons + 1;
    const endPage = Math.min(startPage + maxButtons - 1, totalPages);

    const pages = [];
    for (let i = startPage; i <= endPage; i++) { pages.push(i); }
    return pages;
  };

  return (
    <div className="content-box review-page">
      <div className="page-header">
        <div className="header-info">
          <h1>⭐ 맛집 리뷰</h1>
          <p className="count-text">
            총 <strong>{filteredReviews.length}</strong>개의 맛집
            {filteredReviews.length !== allReviews.length && (
              <span style={{color:'#adb5bd'}}> (전체 {allReviews.length}개 중)</span>
            )}
          </p>
        </div>
        <button onClick={() => navigate('/review/new')} className="btn-add">+ 리뷰 쓰기</button>
      </div>

      {/* 상세 검색 패널 */}
      <div className="search-panel">
        <div className="search-header">
          <h4>🔍 상세 검색</h4>
          <button onClick={handleReset} className="btn-reset">조건 초기화</button>
        </div>

        {/* 1행: 텍스트 검색 */}
        <div className="search-row">
          <input name="keyword" value={filters.keyword} onChange={handleFilterChange} placeholder="식당 이름" className="search-input" />
          <input name="location" value={filters.location} onChange={handleFilterChange} placeholder="위치 (예: 홍대)" className="search-input" />
          <select name="category" value={filters.category} onChange={handleFilterChange} className="search-select">
            <option value="">모든 음식 종류</option>
            {categoryList.map(code => (
              <option key={code.code_id} value={code.code_id}>{code.code_name}</option>
            ))}
          </select>
        </div>

        {/* 2행: 날짜 + 별점 */}
        <div className="filter-detail-row">
          <div className="filter-group">
            <span className="group-label">📅 방문일:</span>
            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="date-input" />
            <span>~</span>
            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="date-input" />
          </div>
          <div className="divider"></div>
          <div className="filter-group husband">
            <span className="group-label">👨 남편:</span>
            <input type="number" name="husbandMin" value={filters.husbandMin} onChange={handleFilterChange} min="0" max="5" step="0.1" className="mini-input" />
            <span>~</span>
            <input type="number" name="husbandMax" value={filters.husbandMax} onChange={handleFilterChange} min="0" max="5" step="0.1" className="mini-input" />
          </div>
          <div className="divider"></div>
          <div className="filter-group wife">
            <span className="group-label">👩 아내:</span>
            <input type="number" name="wifeMin" value={filters.wifeMin} onChange={handleFilterChange} min="0" max="5" step="0.1" className="mini-input" />
            <span>~</span>
            <input type="number" name="wifeMax" value={filters.wifeMax} onChange={handleFilterChange} min="0" max="5" step="0.1" className="mini-input" />
          </div>
        </div>
      </div>

      {/* 리스트 */}
      <div className="review-grid">
        {currentReviews.length > 0 ? (
          currentReviews.map((review) => (
            <Link key={review._id} to={`/review/${review._id}`} className="review-card-link">
              <div className="review-card">
                {review.category && (
                  <span className="category-badge">
                    {categoryMap[review.category] || review.category}
                  </span>
                )}

                <img
                  src={(review.image_urls && review.image_urls.length > 0) ? review.image_urls[0] : "https://dummyimage.com/600x400/f1f3f5/868e96.png&text=No+Image"}
                  alt="음식"
                  onError={(e) => { e.target.src = "https://dummyimage.com/600x400/f1f3f5/868e96.png&text=Error"; }}
                />

                <div className="card-body">
                  <h3>{review.restaurant_name}</h3>

                  <div className="card-ratings">
                    <span className="husband">👨{review.husband_rating || 0}</span>
                    <span className="wife">👩{review.wife_rating || 0}</span>
                    <span className="avg">
                      avg {(((review.husband_rating||0) + (review.wife_rating||0)) / 2).toFixed(1)}
                    </span>
                  </div>

                  <div className="card-footer">
                    <span className="location">📍 {review.location}</span>
                    <span>{review.visit_date}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="empty-message">조건에 맞는 맛집이 없어요. 😅</div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="page-btn">«</button>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 5))} disabled={currentPage <= 5} className="page-btn">&lt;</button>

          {getPageNumbers().map(number => (
            <button
              key={number}
              onClick={() => setCurrentPage(number)}
              className={`page-btn ${currentPage === number ? 'active' : ''}`}
            >
              {number}
            </button>
          ))}

          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 5))} disabled={currentPage > totalPages - 5} className="page-btn">&gt;</button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="page-btn">»</button>
        </div>
      )}
    </div>
  );
}

export default ReviewPage;
