import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import apiClient from '../../api'; 

function LiquorDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [liquor, setLiquor] = useState(null)
  const [categories, setCategories] = useState([])
  
  // ★ 슬라이더 현재 인덱스
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // 수정 모드 상태
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({})

  useEffect(() => {
    fetchCategories()
    fetchLiquor()
  }, [id])

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/code/group/SUL')
      setCategories(res.data)
    } catch (err) { console.error(err) }
  }

  const fetchLiquor = async () => {
    try {
      const res = await apiClient.get(`/liquor/${id}`)
      let data = res.data
      
      // 데이터 정규화 (구버전 호환)
      if (!data.image_urls) data.image_urls = []
      if (data.image_urls.length === 0 && data.image_url) data.image_urls = [data.image_url]
      
      if (!data.pairing_foods) data.pairing_foods = []
      if (data.pairing_foods.length === 0 && data.pairing_food) data.pairing_foods = [data.pairing_food]

      setLiquor(data)
      setEditData(data)
    } catch (err) { console.error(err) }
  }

  // --- 버튼 핸들러 ---
  const handleEdit = () => setIsEditing(true)
  const handleCancel = () => {
    setEditData(liquor)
    setIsEditing(false)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setEditData({ ...editData, [name]: value })
  }

  // --- 이미지 추가/삭제 핸들러 (수정 모드용) ---
  const handleImageChange = (index, value) => {
    const newImages = [...editData.image_urls]
    newImages[index] = value
    setEditData({ ...editData, image_urls: newImages })
  }
  const addImageField = () => setEditData({ ...editData, image_urls: [...editData.image_urls, ''] })
  const removeImageField = (index) => {
    const newImages = editData.image_urls.filter((_, i) => i !== index)
    setEditData({ ...editData, image_urls: newImages })
  }

  // --- 음식 추가/삭제 핸들러 ---
  const handleFoodChange = (index, value) => {
    const newFoods = [...editData.pairing_foods]
    newFoods[index] = value
    setEditData({ ...editData, pairing_foods: newFoods })
  }
  const addFoodField = () => setEditData({ ...editData, pairing_foods: [...editData.pairing_foods, ''] })
  const removeFoodField = (index) => {
    const newFoods = editData.pairing_foods.filter((_, i) => i !== index)
    setEditData({ ...editData, pairing_foods: newFoods })
  }

  // --- 저장 & 삭제 ---
  const handleSave = async () => {
    const cleanData = {
      ...editData,
      image_urls: editData.image_urls.filter(s => s.trim() !== ''),
      pairing_foods: editData.pairing_foods.filter(s => s.trim() !== '')
    }
    try {
      await apiClient.put(`/liquor/${id}`, cleanData)
      alert('수정되었습니다')
      setLiquor(cleanData)
      setEditData(cleanData)
      setIsEditing(false)
      setCurrentImageIndex(0) // 저장 후 첫 이미지로 초기화
    } catch (err) { console.error(err) }
  }

  const handleDelete = async () => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await apiClient.delete(`/liquor/${id}`)
        navigate('/liquor')
      } catch (err) { console.error(err) }
    }
  }

  // --- ★ 슬라이더 이동 함수 ---
  const nextImage = () => {
    if (liquor.image_urls.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % liquor.image_urls.length)
    }
  }
  const prevImage = () => {
    if (liquor.image_urls.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + liquor.image_urls.length) % liquor.image_urls.length)
    }
  }

  if (!liquor) return <div>Loading...</div>
  const categoryName = categories.find(c => c.code_id === liquor.category)?.code_name || liquor.category

  return (
    <div className="content-box">
      <style>{`
        .detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .btn { padding: 8px 16px; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; background:white; font-weight: 600; margin-left: 8px; }
        .btn-primary { background: #26DCD6; color: white; border: none; }
        .btn-danger { background: #ff4d4f; color: white; border: none; }
        
        .layout { display: flex; gap: 30px; flex-wrap: wrap; }
        .left-col { flex: 1; min-width: 320px; }
        .right-col { flex: 1.5; min-width: 320px; }
        
        /* ★ 슬라이더 스타일 */
        .slider-container { position: relative; width: 100%; aspect-ratio: 1; background: #000; border-radius: 12px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .main-image { width: 100%; height: 100%; object-fit: contain; }
        
        .slider-btn { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.4); color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 20px; transition: background 0.2s; user-select: none; }
        .slider-btn:hover { background: rgba(0,0,0,0.7); }
        .prev-btn { left: 10px; }
        .next-btn { right: 10px; }
        
        .thumbnail-list { display: flex; gap: 8px; margin-top: 10px; overflow-x: auto; padding-bottom: 5px; }
        .thumb { width: 60px; height: 60px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 2px solid transparent; opacity: 0.5; transition: all 0.2s; }
        .thumb.active { border-color: #26DCD6; opacity: 1; transform: scale(1.05); }
        
        /* 정보 영역 스타일 */
        .info-row { margin-bottom: 16px; }
        .label { display: block; font-size: 13px; color: #888; font-weight: 600; margin-bottom: 6px; }
        .value { font-size: 16px; color: #333; }
        .value input, .value select, .value textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
        
        .rating-box { background: #f9f9f9; padding: 20px; border-radius: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
        .rating-score { font-size: 28px; font-weight: 800; color: #26DCD6; }
        
        .input-row { display: flex; gap: 8px; margin-bottom: 6px; }
        .food-tag { display: inline-block; background: #fff0f0; color: #d6336c; padding: 6px 12px; border-radius: 20px; margin-right: 8px; margin-bottom: 8px; font-weight: 600; }
      `}</style>

      <div className="detail-header">
        <button className="btn" onClick={() => navigate('/liquor')}>← 목록</button>
        <div>
          {isEditing ? (
            <>
              <button className="btn btn-primary" onClick={handleSave}>저장</button>
              <button className="btn" onClick={handleCancel}>취소</button>
            </>
          ) : (
            <>
              <button className="btn" onClick={handleEdit}>수정</button>
              <button className="btn btn-danger" onClick={handleDelete}>삭제</button>
            </>
          )}
        </div>
      </div>

      <div className="layout">
        <div className="left-col">
          {/* ★ 이미지 슬라이더 */}
          {liquor.image_urls.length > 0 ? (
            <div>
              <div className="slider-container">
                <img 
                  src={liquor.image_urls[currentImageIndex]} 
                  className="main-image" 
                  alt="상세 이미지" 
                />
                {liquor.image_urls.length > 1 && (
                  <>
                    <button className="slider-btn prev-btn" onClick={prevImage}>❮</button>
                    <button className="slider-btn next-btn" onClick={nextImage}>❯</button>
                  </>
                )}
              </div>
              {liquor.image_urls.length > 1 && (
                <div className="thumbnail-list">
                  {liquor.image_urls.map((url, idx) => (
                    <img 
                      key={idx} 
                      src={url} 
                      className={`thumb ${idx === currentImageIndex ? 'active' : ''}`} 
                      onClick={() => setCurrentImageIndex(idx)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="slider-container" style={{background:'#eee', color:'#ccc', fontSize:'60px'}}>🍷</div>
          )}
        </div>

        <div className="right-col">
          <div className="info-row">
            <span className="label">주류명</span>
            {isEditing ? <div className="value"><input name="name" value={editData.name} onChange={handleChange} /></div> : <h1 style={{margin:0, fontSize:'26px'}}>{liquor.name}</h1>}
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
            <div className="info-row">
              <span className="label">종류</span>
              {isEditing ? (
                <div className="value"><select name="category" value={editData.category} onChange={handleChange}>{categories.map(c=><option key={c.code_id} value={c.code_id}>{c.code_name}</option>)}</select></div>
              ) : <div className="value">{categoryName}</div>}
            </div>
            <div className="info-row">
              <span className="label">가격</span>
              {isEditing ? <div className="value"><input type="number" name="price" value={editData.price} onChange={handleChange} /></div> : <div className="value">{liquor.price ? `${liquor.price.toLocaleString()}원` : '-'}</div>}
            </div>
          </div>

          <div className="info-row">
            <span className="label">구매처</span>
            {isEditing ? <div className="value"><input name="purchase_place" value={editData.purchase_place} onChange={handleChange} /></div> : <div className="value">{liquor.purchase_place || '-'}</div>}
          </div>

          <div className="info-row">
            <span className="label">🍽️ 함께한 음식</span>
            {isEditing ? (
              <div className="value">
                {editData.pairing_foods.map((food, i) => (
                  <div key={i} className="input-row">
                    <input value={food} onChange={e => handleFoodChange(i, e.target.value)} />
                    <button className="btn btn-danger" style={{padding:'0 10px'}} onClick={() => removeFoodField(i)}>X</button>
                  </div>
                ))}
                <button className="btn" onClick={addFoodField}>+ 추가</button>
              </div>
            ) : (
              <div className="value">
                {liquor.pairing_foods.length > 0 ? liquor.pairing_foods.map((f, i) => <span key={i} className="food-tag">🍽️ {f}</span>) : '-'}
              </div>
            )}
          </div>
          
          <div className="info-row">
             <span className="label">구매/시음 날짜</span>
             {isEditing ? <div className="value"><input type="date" name="visit_date" value={editData.visit_date} onChange={handleChange} /></div> : <div className="value">{liquor.visit_date || '-'}</div>}
          </div>

          <div className="rating-box">
            <div>
              <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px'}}>
                <span>👨 남편</span>
                {isEditing ? <input type="number" name="rating_husband" value={editData.rating_husband} onChange={handleChange} step="0.5" style={{width:'80px'}} /> : <span className="rating-score">{liquor.rating_husband}</span>}
              </div>
              {isEditing ? <textarea name="comment_husband" value={editData.comment_husband} onChange={handleChange} style={{width:'100%'}} /> : <p style={{color:'#555', lineHeight:'1.5'}}>{liquor.comment_husband}</p>}
            </div>
            <div>
              <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px'}}>
                <span>👩 아내</span>
                {isEditing ? <input type="number" name="rating_wife" value={editData.rating_wife} onChange={handleChange} step="0.5" style={{width:'80px'}} /> : <span className="rating-score" style={{color:'#ff6b9d'}}>{liquor.rating_wife}</span>}
              </div>
              {isEditing ? <textarea name="comment_wife" value={editData.comment_wife} onChange={handleChange} style={{width:'100%'}} /> : <p style={{color:'#555', lineHeight:'1.5'}}>{liquor.comment_wife}</p>}
            </div>
          </div>
          
          {isEditing && (
            <div className="info-row" style={{marginTop:'20px'}}>
              <span className="label">이미지 URL 관리</span>
              {editData.image_urls.map((url, i) => (
                <div key={i} className="input-row">
                  <input value={url} onChange={e => handleImageChange(i, e.target.value)} placeholder="URL" />
                  <button className="btn btn-danger" onClick={() => removeImageField(i)}>X</button>
                </div>
              ))}
              <button className="btn" onClick={addImageField}>+ 이미지 추가</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LiquorDetailPage
