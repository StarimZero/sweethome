import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api'
import './Liquor.scss'

function LiquorPage() {
  const [liquors, setLiquors] = useState([])
  const [categories, setCategories] = useState([])
  const [wineTypes, setWineTypes] = useState([])
  const navigate = useNavigate()

  const [filters, setFilters] = useState({
    name: '', category: '', wine_type: '', purchase_place: '', pairing_food: '', comment: '',
    min_price: '', max_price: '', start_date: '', end_date: '',
    min_rating_husband: '', max_rating_husband: '', min_rating_wife: '', max_rating_wife: ''
  })

  const [showFilter, setShowFilter] = useState(true)

  useEffect(() => {
    fetchCategories()
    fetchWineTypes()
    fetchLiquors()
  }, [])

  const fetchCategories = async () => {
    try { const res = await apiClient.get('/code/group/SUL'); setCategories(res.data) }
    catch (err) { console.error(err) }
  }

  const fetchWineTypes = async () => {
    try { const res = await apiClient.get('/code/group/WINE_C'); setWineTypes(res.data) }
    catch (err) { console.error(err) }
  }

  const fetchLiquors = async (overrideFilters = null) => {
    try {
      const current = overrideFilters || filters
      const params = {}
      Object.keys(current).forEach(key => {
        if (current[key] !== '' && current[key] !== null) params[key] = current[key]
      })
      const res = await apiClient.get('/liquor', { params })
      setLiquors(res.data)
    } catch (err) {
      console.error(err)
      setLiquors([])
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleSearch = () => fetchLiquors()

  const handleReset = () => {
    const empty = {
      name: '', category: '', wine_type: '', purchase_place: '', pairing_food: '', comment: '',
      min_price: '', max_price: '', start_date: '', end_date: '',
      min_rating_husband: '', max_rating_husband: '', min_rating_wife: '', max_rating_wife: ''
    }
    setFilters(empty)
    fetchLiquors(empty)
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch() }

  return (
    <div className="content-box liquor-page">
      <div className="header-area">
        <h1>🍷 주류 리뷰</h1>
        <div className="header-actions">
          <button className="btn-toggle" onClick={() => setShowFilter(!showFilter)}>
            {showFilter ? '필터 접기 ▲' : '상세 검색 ▼'}
          </button>
          <button className="btn-add" onClick={() => navigate('/liquor/new')}>+ 등록</button>
        </div>
      </div>

      {showFilter && (
        <div className="filter-box" onKeyDown={handleKeyDown}>
          <div className="filter-grid">
            <div className="filter-item">
              <span className="filter-label">주류명</span>
              <input name="name" value={filters.name} onChange={handleChange} className="filter-input" placeholder="이름 포함 검색" />
            </div>
            <div className="filter-item">
              <span className="filter-label">종류</span>
              <select name="category" value={filters.category} onChange={handleChange} className="filter-input">
                <option value="">전체</option>
                {categories.map(c => <option key={c.code_id} value={c.code_id}>{c.code_name}</option>)}
              </select>
            </div>
            <div className="filter-item">
              <span className="filter-label">와인 상세</span>
              <select name="wine_type" value={filters.wine_type} onChange={handleChange} className="filter-input">
                <option value="">전체</option>
                {wineTypes.map(c => <option key={c.code_id} value={c.code_id}>{c.code_name}</option>)}
              </select>
            </div>
            <div className="filter-item">
              <span className="filter-label">구매처</span>
              <input name="purchase_place" value={filters.purchase_place} onChange={handleChange} className="filter-input" placeholder="구매처" />
            </div>
            <div className="filter-item">
              <span className="filter-label">함께한 음식</span>
              <input name="pairing_food" value={filters.pairing_food} onChange={handleChange} className="filter-input" placeholder="치즈, 삼겹살..." />
            </div>
            <div className="filter-item">
              <span className="filter-label">가격 범위</span>
              <div className="range-group">
                <input type="number" name="min_price" value={filters.min_price} onChange={handleChange} className="range-input" placeholder="최소" />
                <span>~</span>
                <input type="number" name="max_price" value={filters.max_price} onChange={handleChange} className="range-input" placeholder="최대" />
              </div>
            </div>
            <div className="filter-item">
              <span className="filter-label">구매/시음 날짜</span>
              <div className="range-group">
                <input type="date" name="start_date" value={filters.start_date} onChange={handleChange} className="range-input" />
                <span>~</span>
                <input type="date" name="end_date" value={filters.end_date} onChange={handleChange} className="range-input" />
              </div>
            </div>
            <div className="filter-item">
              <span className="filter-label">👨 남편 평점</span>
              <div className="range-group">
                <input type="number" step="0.5" name="min_rating_husband" value={filters.min_rating_husband} onChange={handleChange} className="range-input" placeholder="0" />
                <span>~</span>
                <input type="number" step="0.5" name="max_rating_husband" value={filters.max_rating_husband} onChange={handleChange} className="range-input" placeholder="5" />
              </div>
            </div>
            <div className="filter-item">
              <span className="filter-label">👩 아내 평점</span>
              <div className="range-group">
                <input type="number" step="0.5" name="min_rating_wife" value={filters.min_rating_wife} onChange={handleChange} className="range-input" placeholder="0" />
                <span>~</span>
                <input type="number" step="0.5" name="max_rating_wife" value={filters.max_rating_wife} onChange={handleChange} className="range-input" placeholder="5" />
              </div>
            </div>
            <div className="filter-item full-width">
              <span className="filter-label">코멘트 내용</span>
              <input name="comment" value={filters.comment} onChange={handleChange} className="filter-input" placeholder="리뷰 내용 검색..." />
            </div>
          </div>

          <div className="btn-row">
            <button className="btn-reset" onClick={handleReset}>🔄 조건 초기화</button>
            <button className="btn-search" onClick={handleSearch}>🔍 검색하기</button>
          </div>
        </div>
      )}

      {/* 리스트 그리드 */}
      <div className="liquor-grid">
        {liquors.map(liq => {
          const categoryName = categories.find(c => c.code_id === liq.category)?.code_name || liq.category
          const displayImage = (liq.image_urls && liq.image_urls.length > 0) ? liq.image_urls[0] : liq.image_url
          return (
            <div key={liq._id} className="liquor-card" onClick={() => navigate(`/liquor/${liq._id}`)}>
              {displayImage ? (
                <img src={displayImage} className="card-image" alt={liq.name} />
              ) : <div className="card-image">🍷</div>}

              <div className="card-body">
                <div className="card-meta">
                  <span className="card-category">{categoryName}</span>
                  {liq.price > 0 && <span className="card-price">{liq.price.toLocaleString()}원</span>}
                </div>
                <h3 className="card-title">{liq.name}</h3>

                <div className="card-ratings">
                  <span>👨 <b>{liq.rating_husband?.toFixed(1) || 0}</b></span>
                  <span className="separator">|</span>
                  <span>👩 <b className="wife-score">{liq.rating_wife?.toFixed(1) || 0}</b></span>
                </div>

                {liq.pairing_foods && liq.pairing_foods.length > 0 && (
                  <div className="card-foods">
                    {liq.pairing_foods.slice(0, 3).map((f, i) => <span key={i} className="food-tag">#{f}</span>)}
                    {liq.pairing_foods.length > 3 && <span className="food-tag">...</span>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {liquors.length === 0 && <div className="empty-message">검색 결과가 없습니다.</div>}
      </div>
    </div>
  )
}

export default LiquorPage
