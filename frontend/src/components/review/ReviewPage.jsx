import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../../api'; 

function ReviewPage() {
  const navigate = useNavigate();
  
  const [allReviews, setAllReviews] = useState([]); 
  const [categoryMap, setCategoryMap] = useState({}); 
  const [categoryList, setCategoryList] = useState([]); 

  // 초기값을 sessionStorage에서 불러오기 (없으면 기본값)
  const [filters, setFilters] = useState(() => {
    const saved = sessionStorage.getItem('reviewFilters');
    return saved ? JSON.parse(saved) : {
      keyword: '', location: '', category: '',
      husbandMin: 0, husbandMax: 5,
      wifeMin: 0, wifeMax: 5,
      startDate: '', endDate: ''
    };
  });

  // 페이지 번호도 기억하기
  const [currentPage, setCurrentPage] = useState(() => {
    return Number(sessionStorage.getItem('reviewPage')) || 1;
  });

  const itemsPerPage = 12;

  // 필터나 페이지가 바뀔 때마다 sessionStorage에 저장
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
    // 저장소도 클리어
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
  // [추가] 날짜 내림차순 정렬 (최신순)
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
    <div className="content-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
        <h1 style={{margin:0}}>⭐ 맛집 리뷰</h1>
        {/* 검색 결과 개수 표시 */}
            <p style={{margin:'5px 0 0', color:'#868e96', fontSize:'14px'}}>
            총 <strong style={{color:'#20c997'}}>{filteredReviews.length}</strong>개의 맛집
            {filteredReviews.length !== allReviews.length && (
                <span style={{color:'#adb5bd'}}> (전체 {allReviews.length}개 중)</span>
            )}
            </p>
        </div>
        <button onClick={() => navigate('/review/new')} style={btnStyle}>+ 리뷰 쓰기</button>
      </div>

      {/* 상세 검색 패널 */}
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e9ecef' }}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
            <h4 style={{ margin: '0', color: '#495057' }}>🔍 상세 검색</h4>
            <button onClick={handleReset} style={{ padding: '5px 10px', background: '#868e96', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize:'12px' }}>
                조건 초기화
            </button>
        </div>
        
        {/* 1행: 텍스트 검색 */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom:'15px' }}>
          <input name="keyword" value={filters.keyword} onChange={handleFilterChange} placeholder="식당 이름" style={inputStyle} />
          <input name="location" value={filters.location} onChange={handleFilterChange} placeholder="위치 (예: 홍대)" style={inputStyle} />
          <select name="category" value={filters.category} onChange={handleFilterChange} style={inputStyle}>
              <option value="">모든 음식 종류</option>
              {categoryList.map(code => (
                <option key={code.code_id} value={code.code_id}>{code.code_name}</option>
              ))}
          </select>
        </div>

        {/* 2행: 날짜 + 별점 검색 */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems:'center', background:'white', padding:'15px', borderRadius:'8px', border:'1px solid #dee2e6' }}>
            
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <span style={{fontWeight:'bold', color:'#495057'}}>📅 방문일:</span>
                <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} style={dateInput} />
                <span>~</span>
                <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} style={dateInput} />
            </div>
            <div style={{width:'1px', height:'20px', background:'#ddd'}}></div>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <span style={{fontWeight:'bold', color:'#1971c2'}}>👨 남편:</span>
                <input type="number" name="husbandMin" value={filters.husbandMin} onChange={handleFilterChange} min="0" max="5" step="0.1" style={miniInput} />
                <span>~</span>
                <input type="number" name="husbandMax" value={filters.husbandMax} onChange={handleFilterChange} min="0" max="5" step="0.1" style={miniInput} />
            </div>
            <div style={{width:'1px', height:'20px', background:'#ddd'}}></div>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <span style={{fontWeight:'bold', color:'#c2255c'}}>👩 아내:</span>
                <input type="number" name="wifeMin" value={filters.wifeMin} onChange={handleFilterChange} min="0" max="5" step="0.1" style={miniInput} />
                <span>~</span>
                <input type="number" name="wifeMax" value={filters.wifeMax} onChange={handleFilterChange} min="0" max="5" step="0.1" style={miniInput} />
            </div>
        </div>
      </div>

      {/* 리스트 영역 */}
      <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
          gap: '20px', 
          minHeight:'300px' 
      }}>
        {currentReviews.length > 0 ? (
          currentReviews.map((review) => (
            <Link 
              key={review._id} 
              to={`/review/${review._id}`}
              style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
            >
              <div 
                style={{ 
                    border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden', 
                    background: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', 
                    position: 'relative', transition: 'transform 0.2s', height: '100%'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {review.category && (
                    <span style={{
                        position: 'absolute', top: '10px', right: '10px',
                        background: 'rgba(0,0,0,0.7)', color: 'white',
                        padding: '3px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold'
                    }}>
                        {categoryMap[review.category] || review.category}
                    </span>
                )}

                <img 
                    src={(review.image_urls && review.image_urls.length > 0) ? review.image_urls[0] : "https://dummyimage.com/600x400/f1f3f5/868e96.png&text=No+Image"}
                    style={{ width: '100%', height: '150px', objectFit: 'cover' }} 
                    alt="음식" 
                    onError={(e) => { e.target.src = "https://dummyimage.com/600x400/f1f3f5/868e96.png&text=Error"; }} // [추가] 이미지 로드 에러 처리
                />
                
                <div style={{ padding: '12px' }}>
                  <h3 style={{ margin: '0 0 8px', fontSize:'16px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{review.restaurant_name}</h3>
                  
                  <div style={{ display:'flex', gap:'5px', fontSize:'12px', fontWeight:'bold', marginBottom:'8px', background:'#f8f9fa', padding:'5px', borderRadius:'5px' }}>
                      <span style={{color:'#1971c2'}}>👨{review.husband_rating || 0}</span>
                      <span style={{color:'#c2255c'}}>👩{review.wife_rating || 0}</span>
                      <span style={{color:'#868e96', fontWeight:'normal', marginLeft:'auto'}}>
                         avg {(((review.husband_rating||0) + (review.wife_rating||0)) / 2).toFixed(1)}
                      </span>
                  </div>
                  
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', color:'#888'}}>
                      <span style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'60%'}}>📍 {review.location}</span>
                      <span>{review.visit_date}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '50px', color: '#adb5bd' }}>
            조건에 맞는 맛집이 없어요. 😅
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginTop: '30px' }}>
          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={{...pageBtnStyle, opacity: currentPage === 1 ? 0.5 : 1}}>«</button>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 5))} disabled={currentPage <= 5} style={{...pageBtnStyle, opacity: currentPage <= 5 ? 0.5 : 1}}>&lt;</button>
          
          {getPageNumbers().map(number => (
            <button key={number} onClick={() => setCurrentPage(number)} 
              style={{
                ...pageBtnStyle,
                background: currentPage === number ? '#20c997' : 'white',
                color: currentPage === number ? 'white' : '#333',
                borderColor: currentPage === number ? '#20c997' : '#ddd'
              }}>
              {number}
            </button>
          ))}

          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 5))} disabled={currentPage > totalPages - 5} style={{...pageBtnStyle, opacity: currentPage > totalPages - 5 ? 0.5 : 1}}>&gt;</button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} style={{...pageBtnStyle, opacity: currentPage === totalPages ? 0.5 : 1}}>»</button>
        </div>
      )}
    </div>
  );
}

const btnStyle = { padding: '10px 20px', background: '#20c997', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const inputStyle = { flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '5px', boxSizing: 'border-box', fontSize: '14px', minWidth:'150px' };
const miniInput = { width: '50px', padding: '5px', border: '1px solid #ddd', borderRadius: '4px', textAlign:'center' };
const dateInput = { padding: '5px', border: '1px solid #ddd', borderRadius: '4px' };
const pageBtnStyle = { width: '35px', height: '35px', border: '1px solid #ddd', borderRadius: '5px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight:'bold' };

export default ReviewPage;
