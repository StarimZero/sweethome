import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api'; 

function LiquorPage() {
  const [liquors, setLiquors] = useState([])
  const [categories, setCategories] = useState([])
  const [wineTypes, setWineTypes] = useState([])
  const navigate = useNavigate()
  
  // ★ 상세 필터 State
  const [filters, setFilters] = useState({
    name: '',
    category: '',
    wine_type: '', // 기존에 선언되어 있음
    purchase_place: '',
    pairing_food: '',
    comment: '',
    min_price: '',
    max_price: '',
    start_date: '',
    end_date: '',
    min_rating_husband: '',
    max_rating_husband: '',
    min_rating_wife: '',
    max_rating_wife: ''
  })

  // 필터 영역 접기/펼치기 기능 (옵션)
  const [showFilter, setShowFilter] = useState(true)

  useEffect(() => {
    fetchCategories()
    fetchWineTypes()
    fetchLiquors()
  }, [])

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/code/group/SUL')
      setCategories(res.data)
    } catch (err) { console.error(err) }
  }

  // [기존 코드에 있던 함수 활용] 와인 상세 코드 가져오기
  const fetchWineTypes = async () => {
    try {
      const res = await apiClient.get('/code/group/WINE_C')
      setWineTypes(res.data)
    } catch (err) { console.error(err) }
  }

  const fetchLiquors = async (overrideFilters = null) => {
    try {
      const current = overrideFilters || filters
      // 빈 값은 전송하지 않음 (깔끔한 URL)
      const params = {}
      Object.keys(current).forEach(key => {
        if (current[key] !== '' && current[key] !== null) {
          params[key] = current[key]
        }
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
    <div className="content-box">
      <style>{`
        .header-area { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        
        /* 필터 박스 스타일 */
        .filter-box { background: #f8f9fa; border: 1px solid #eee; border-radius: 12px; padding: 20px; margin-bottom: 30px; }
        .filter-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; row-gap: 16px; }
        @media (max-width: 1024px) { .filter-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .filter-grid { grid-template-columns: 1fr; } }

        .filter-item { display: flex; flex-direction: column; gap: 6px; }
        .filter-label { font-size: 13px; font-weight: 600; color: #555; }
        .filter-input { padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
        .range-group { display: flex; align-items: center; gap: 6px; }
        .range-input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; text-align: center; }
        
        .btn-row { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
        .btn-search { background: #333; color: white; padding: 10px 30px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; }
        .btn-reset { background: white; border: 1px solid #ccc; padding: 10px 20px; border-radius: 6px; cursor: pointer; color: #555; }
        .btn-add { background: #26DCD6; color: white; padding: 10px 24px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .btn-toggle { background: none; border: none; color: #26DCD6; font-weight: 600; cursor: pointer; }

        /* 카드 그리드 스타일 (기존 유지) */
        .liquor-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 24px; }
        .liquor-card { background: white; border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden; cursor: pointer; transition: all 0.3s; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .liquor-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.1); }
        .card-image { width: 100%; height: 200px; object-fit: cover; background: #f9f9f9; display: flex; align-items: center; justify-content: center; font-size: 48px; }
        .card-body { padding: 16px; }
        .card-title { font-size: 18px; font-weight: 700; margin: 0 0 8px; color: #222; }
        .card-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .card-category { background: #f0f7ff; color: #0066cc; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; }
        .card-ratings { display: flex; gap: 12px; font-size: 14px; background: #f9f9f9; padding: 8px 12px; border-radius: 8px; justify-content: center; }
        .card-foods { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 10px; }
        .food-tag { font-size: 11px; background: #fff0f0; color: #d6336c; padding: 2px 6px; border-radius: 4px; }
      `}</style>

      <div className="header-area">
        <h1>🍷 주류 리뷰</h1>
        <div style={{display:'flex', gap:'16px', alignItems:'center'}}>
          <button className="btn-toggle" onClick={() => setShowFilter(!showFilter)}>
            {showFilter ? '필터 접기 ▲' : '상세 검색 ▼'}
          </button>
          <button className="btn-add" onClick={() => navigate('/liquor/new')}>+ 등록</button>
        </div>
      </div>

      {showFilter && (
        <div className="filter-box" onKeyDown={handleKeyDown}>
          <div className="filter-grid">
            {/* 1열: 기본 텍스트 정보 */}
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
            
            {/* [추가된 부분] 와인 상세 종류 */}
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
            
            {/* 순서가 밀림에 따라 배치 */}
            <div className="filter-item">
              <span className="filter-label">함께한 음식</span>
              <input name="pairing_food" value={filters.pairing_food} onChange={handleChange} className="filter-input" placeholder="치즈, 삼겹살..." />
            </div>

            {/* 2열: 가격 & 날짜 */}
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

            {/* 3열: 평점 & 코멘트 */}
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
            
            {/* 4열: 코멘트 검색 (전체 너비) */}
            <div className="filter-item" style={{gridColumn: '1 / -1'}}>
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
                  {liq.price > 0 && <span style={{fontSize:'13px', color:'#777'}}>{liq.price.toLocaleString()}원</span>}
                </div>
                <h3 className="card-title">{liq.name}</h3>
                
                <div className="card-ratings">
                  <span>👨 <b>{liq.rating_husband?.toFixed(1) || 0}</b></span>
                  <span style={{color:'#ddd'}}>|</span>
                  <span>👩 <b style={{color:'#ff6b9d'}}>{liq.rating_wife?.toFixed(1) || 0}</b></span>
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
        {liquors.length === 0 && <div style={{gridColumn:'1/-1', textAlign:'center', padding:'40px', color:'#888'}}>검색 결과가 없습니다.</div>}
      </div>
    </div>
  )
}

export default LiquorPage
