import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api'
import './Culture.scss'

function CulturePage() {
  const [cultures, setCultures] = useState([])
  const [categories, setCategories] = useState([])
  const navigate = useNavigate()

  const [filters, setFilters] = useState({
    title: '', category: '', location: '', comment: '',
    start_date: '', end_date: '', min_rating: '', max_rating: ''
  })

  const [showFilter, setShowFilter] = useState(true)

  useEffect(() => {
    fetchCategories()
    fetchCultures()
  }, [])

  const fetchCategories = async () => {
    try { const res = await apiClient.get('/code/group/CULTURE'); setCategories(res.data) }
    catch (err) { console.error(err) }
  }

  const fetchCultures = async (overrideFilters = null) => {
    try {
      const current = overrideFilters || filters
      const params = {}
      Object.keys(current).forEach(key => {
        if (current[key] !== '' && current[key] !== null) params[key] = current[key]
      })
      const res = await apiClient.get('/culture', { params })
      setCultures(res.data)
    } catch (err) {
      console.error(err)
      setCultures([])
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleSearch = () => fetchCultures()

  const handleReset = () => {
    const empty = {
      title: '', category: '', location: '', comment: '',
      start_date: '', end_date: '', min_rating: '', max_rating: ''
    }
    setFilters(empty)
    fetchCultures(empty)
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch() }

  const categoryIcon = (cat) => {
    const icons = { MOVIE: '🎬', THEATER: '🎭', MUSICAL: '🎵', EXHIBITION: '🖼️' }
    return icons[cat] || '🎨'
  }

  return (
    <div className="content-box culture-page">
      <div className="header-area">
        <h1>🎨 문화생활</h1>
        <div className="header-actions">
          <button className="btn-toggle" onClick={() => setShowFilter(!showFilter)}>
            {showFilter ? '필터 접기 ▲' : '상세 검색 ▼'}
          </button>
          <button className="btn-add" onClick={() => navigate('/culture/new')}>+ 등록</button>
        </div>
      </div>

      {showFilter && (
        <div className="filter-box" onKeyDown={handleKeyDown}>
          <div className="filter-grid">
            <div className="filter-item">
              <span className="filter-label">제목</span>
              <input name="title" value={filters.title} onChange={handleChange} className="filter-input" placeholder="제목 검색" />
            </div>
            <div className="filter-item">
              <span className="filter-label">카테고리</span>
              <select name="category" value={filters.category} onChange={handleChange} className="filter-input">
                <option value="">전체</option>
                {categories.map(c => <option key={c.code_id} value={c.code_id}>{c.code_name}</option>)}
              </select>
            </div>
            <div className="filter-item">
              <span className="filter-label">장소</span>
              <input name="location" value={filters.location} onChange={handleChange} className="filter-input" placeholder="장소 검색" />
            </div>
            <div className="filter-item">
              <span className="filter-label">관람일</span>
              <div className="range-group">
                <input type="date" name="start_date" value={filters.start_date} onChange={handleChange} className="range-input" />
                <span>~</span>
                <input type="date" name="end_date" value={filters.end_date} onChange={handleChange} className="range-input" />
              </div>
            </div>
            <div className="filter-item">
              <span className="filter-label">평점 범위</span>
              <div className="range-group">
                <input type="number" step="0.5" name="min_rating" value={filters.min_rating} onChange={handleChange} className="range-input" placeholder="0" />
                <span>~</span>
                <input type="number" step="0.5" name="max_rating" value={filters.max_rating} onChange={handleChange} className="range-input" placeholder="5" />
              </div>
            </div>
            <div className="filter-item full-width">
              <span className="filter-label">코멘트 내용</span>
              <input name="comment" value={filters.comment} onChange={handleChange} className="filter-input" placeholder="리뷰 내용 검색..." />
            </div>
          </div>

          <div className="btn-row">
            <button className="btn-reset" onClick={handleReset}>초기화</button>
            <button className="btn-search" onClick={handleSearch}>검색하기</button>
          </div>
        </div>
      )}

      <div className="culture-grid">
        {cultures.map(item => {
          const categoryName = categories.find(c => c.code_id === item.category)?.code_name || item.category
          const displayImage = (item.image_urls && item.image_urls.length > 0) ? item.image_urls[0] : null
          return (
            <div key={item._id} className="culture-card" onClick={() => navigate(`/culture/${item._id}`)}>
              {displayImage ? (
                <img src={displayImage} className="card-image" alt={item.title} />
              ) : <div className="card-image">{categoryIcon(item.category)}</div>}

              <div className="card-body">
                <div className="card-meta">
                  <span className="card-category">{categoryIcon(item.category)} {categoryName}</span>
                  {item.visit_date && <span className="card-date">{item.visit_date}</span>}
                </div>
                <h3 className="card-title">{item.title}</h3>

                <div className="card-ratings">
                  <span>👨 <b>{item.rating_husband?.toFixed(1) || 0}</b></span>
                  <span className="separator">|</span>
                  <span>👩 <b className="wife-score">{item.rating_wife?.toFixed(1) || 0}</b></span>
                </div>

                {item.location && (
                  <div className="card-location">📍 {item.location}</div>
                )}
              </div>
            </div>
          )
        })}
        {cultures.length === 0 && <div className="empty-message">검색 결과가 없습니다.</div>}
      </div>
    </div>
  )
}

export default CulturePage
