import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '../../api'
import './Liquor.scss'

function LiquorDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [liquor, setLiquor] = useState(null)
  const [categories, setCategories] = useState([])
  const [wineTypes, setWineTypes] = useState([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({})

  useEffect(() => {
    fetchCategories()
    fetchWineTypes()
    fetchLiquor()

    const interval = setInterval(() => {
      setLiquor(prev => {
        if (prev && prev.ai_note && prev.ai_note.status === 'PENDING') {
          fetchLiquor(true)
        }
        return prev
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [id])

  const fetchCategories = async () => { try { const res = await apiClient.get('/code/group/SUL'); setCategories(res.data) } catch (err) { console.error(err) } }
  const fetchWineTypes = async () => { try { const res = await apiClient.get('/code/group/WINE_C'); setWineTypes(res.data) } catch (err) { console.error(err) } }

  const fetchLiquor = async (silent = false) => {
    try {
      const res = await apiClient.get(`/liquor/${id}`)
      let data = res.data
      if (!data.image_urls) data.image_urls = []
      if (data.image_urls.length === 0 && data.image_url) data.image_urls = [data.image_url]
      if (!data.pairing_foods) data.pairing_foods = []
      if (data.pairing_foods.length === 0 && data.pairing_food) data.pairing_foods = [data.pairing_food]
      if (!data.wine_type) data.wine_type = ''
      setLiquor(data)
      if (!silent) setEditData(data)
    } catch (err) { console.error(err) }
  }

  const handleEdit = () => setIsEditing(true)
  const handleCancel = () => { setEditData(liquor); setIsEditing(false) }
  const handleChange = (e) => { setEditData({ ...editData, [e.target.name]: e.target.value }) }
  const handleImageChange = (index, value) => { const newImages = [...editData.image_urls]; newImages[index] = value; setEditData({ ...editData, image_urls: newImages }) }
  const addImageField = () => setEditData({ ...editData, image_urls: [...editData.image_urls, ''] })
  const removeImageField = (index) => { const newImages = editData.image_urls.filter((_, i) => i !== index); setEditData({ ...editData, image_urls: newImages }) }
  const handleFoodChange = (index, value) => { const newFoods = [...editData.pairing_foods]; newFoods[index] = value; setEditData({ ...editData, pairing_foods: newFoods }) }
  const addFoodField = () => setEditData({ ...editData, pairing_foods: [...editData.pairing_foods, ''] })
  const removeFoodField = (index) => { const newFoods = editData.pairing_foods.filter((_, i) => i !== index); setEditData({ ...editData, pairing_foods: newFoods }) }

  const isEditingWine = editData.category === 'SUL_W';

  const handleSave = async () => {
    const cleanData = {
      ...editData,
      wine_type: isEditingWine ? editData.wine_type : null,
      image_urls: editData.image_urls.filter(s => s.trim() !== ''),
      pairing_foods: editData.pairing_foods.filter(s => s.trim() !== '')
    }
    try {
      const res = await apiClient.put(`/liquor/${id}`, cleanData)
      alert('수정되었습니다')
      let data = res.data
      if (!data.image_urls) data.image_urls = []
      if (!data.pairing_foods) data.pairing_foods = []
      if (!data.wine_type) data.wine_type = ''
      setLiquor(data); setEditData(data); setIsEditing(false); setCurrentImageIndex(0)
    } catch (err) { console.error(err) }
  }

  const handleDelete = async () => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try { await apiClient.delete(`/liquor/${id}`); navigate('/liquor') }
      catch (err) { console.error(err) }
    }
  }

  const nextImage = () => { if (liquor.image_urls.length > 1) setCurrentImageIndex((prev) => (prev + 1) % liquor.image_urls.length) }
  const prevImage = () => { if (liquor.image_urls.length > 1) setCurrentImageIndex((prev) => (prev - 1 + liquor.image_urls.length) % liquor.image_urls.length) }

  if (!liquor) return <div>Loading...</div>

  const categoryName = categories.find(c => c.code_id === liquor.category)?.code_name || liquor.category
  const wineTypeName = wineTypes.find(c => c.code_id === liquor.wine_type)?.code_name || liquor.wine_type
  const aiNote = liquor.ai_note || { status: 'PENDING' }

  return (
    <div className="content-box liquor-detail-page">
      <div className="detail-header">
        <button className="btn" onClick={() => navigate('/liquor')}>← 목록</button>
        <div>
          {isEditing ? (
            <>
              <button className="btn primary" onClick={handleSave}>저장</button>
              <button className="btn" onClick={handleCancel}>취소</button>
            </>
          ) : (
            <>
              <button className="btn" onClick={handleEdit}>수정</button>
              <button className="btn danger" onClick={handleDelete}>삭제</button>
            </>
          )}
        </div>
      </div>

      <div className="layout">
        <div className="left-col">
          {liquor.image_urls.length > 0 ? (
            <div>
              <div className="slider-container">
                <img src={liquor.image_urls[currentImageIndex]} className="main-image" alt="상세 이미지" />
                {liquor.image_urls.length > 1 && (
                  <>
                    <button className="slider-btn prev" onClick={prevImage}>❮</button>
                    <button className="slider-btn next" onClick={nextImage}>❯</button>
                  </>
                )}
              </div>
              {liquor.image_urls.length > 1 && (
                <div className="thumbnail-list">
                  {liquor.image_urls.map((url, idx) => (
                    <img key={idx} src={url} className={`thumb ${idx === currentImageIndex ? 'active' : ''}`} onClick={() => setCurrentImageIndex(idx)} alt="" />
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
            {isEditing ? (
              <div className="value"><input name="name" value={editData.name} onChange={handleChange} style={{fontSize:'20px', fontWeight:'bold'}} /></div>
            ) : (
              <h1 style={{margin:0, fontSize:'28px', color:'#2d3436'}}>{liquor.name}</h1>
            )}
          </div>

          <div className="info-grid">
            <div className="info-row">
              <span className="label">종류</span>
              {isEditing ? (
                <div className="value category-edit-row">
                  <select name="category" value={editData.category} onChange={handleChange}>
                    {categories.map(c=><option key={c.code_id} value={c.code_id}>{c.code_name}</option>)}
                  </select>
                  {isEditingWine && (
                    <select name="wine_type" value={editData.wine_type} onChange={handleChange} className="wine-select">
                      <option value="">-- 와인 종류 선택 --</option>
                      {wineTypes.map(c=><option key={c.code_id} value={c.code_id}>{c.code_name}</option>)}
                    </select>
                  )}
                </div>
              ) : (
                <div className="value" style={{fontSize:'18px'}}>
                  {categoryName}
                  {liquor.category === 'SUL_W' && wineTypeName && (
                    <span className="wine-badge">{wineTypeName}</span>
                  )}
                </div>
              )}
            </div>

            <div className="info-row">
              <span className="label">가격</span>
              {isEditing ? (
                <div className="value"><input type="number" name="price" value={editData.price} onChange={handleChange} /></div>
              ) : (
                <div className="price-value">{liquor.price ? `${liquor.price.toLocaleString()}원` : '-'}</div>
              )}
            </div>
          </div>

          <div className="info-row">
            <span className="label">구매처</span>
            {isEditing ? <div className="value"><input name="purchase_place" value={editData.purchase_place} onChange={handleChange} /></div> : <div className="value">{liquor.purchase_place || '-'}</div>}
          </div>
          <div className="info-row">
            <span className="label">구매/시음 날짜</span>
            {isEditing ? <div className="value"><input type="date" name="visit_date" value={editData.visit_date} onChange={handleChange} /></div> : <div className="value">{liquor.visit_date || '-'}</div>}
          </div>
          <div className="info-row">
            <span className="label">🍽️ 함께한 음식</span>
            {isEditing ? (
              <div className="value">
                {editData.pairing_foods.map((food, i) => (
                  <div key={i} className="input-row">
                    <input value={food} onChange={e => handleFoodChange(i, e.target.value)} />
                    <button className="btn danger" style={{padding:'0 10px'}} onClick={() => removeFoodField(i)}>X</button>
                  </div>
                ))}
                <button className="btn" onClick={addFoodField}>+ 추가</button>
              </div>
            ) : (
              <div className="value">
                {liquor.pairing_foods.length > 0
                  ? liquor.pairing_foods.map((f, i) => <span key={i} className="food-tag">🍽️ {f}</span>)
                  : <span style={{color:'#ccc'}}>정보 없음</span>
                }
              </div>
            )}
          </div>

          <div className="rating-box">
            <div>
              <div className="rating-header">
                <span style={{fontWeight:'bold'}}>👨 남편</span>
                {isEditing
                  ? <input type="number" name="rating_husband" value={editData.rating_husband} onChange={handleChange} step="0.5" style={{width:'80px'}} />
                  : <span className="rating-score">{liquor.rating_husband}</span>
                }
              </div>
              {isEditing
                ? <textarea name="comment_husband" value={editData.comment_husband} onChange={handleChange} rows={3} style={{width:'100%'}} />
                : <p style={{color:'#555', lineHeight:'1.6', margin:0}}>{liquor.comment_husband || <span style={{color:'#ccc'}}>코멘트 없음</span>}</p>
              }
            </div>
            <div>
              <div className="rating-header">
                <span style={{fontWeight:'bold'}}>👩 아내</span>
                {isEditing
                  ? <input type="number" name="rating_wife" value={editData.rating_wife} onChange={handleChange} step="0.5" style={{width:'80px'}} />
                  : <span className="rating-score wife">{liquor.rating_wife}</span>
                }
              </div>
              {isEditing
                ? <textarea name="comment_wife" value={editData.comment_wife} onChange={handleChange} rows={3} style={{width:'100%'}} />
                : <p style={{color:'#555', lineHeight:'1.6', margin:0}}>{liquor.comment_wife || <span style={{color:'#ccc'}}>코멘트 없음</span>}</p>
              }
            </div>
          </div>

          {isEditing && (
            <div className="info-row" style={{marginTop:'20px'}}>
              <span className="label">이미지 URL 관리</span>
              {editData.image_urls.map((url, i) => (
                <div key={i} className="input-row">
                  <input value={url} onChange={e => handleImageChange(i, e.target.value)} placeholder="URL" />
                  <button className="btn danger" onClick={() => removeImageField(i)}>X</button>
                </div>
              ))}
              <button className="btn" onClick={addImageField}>+ 이미지 추가</button>
            </div>
          )}
        </div>
      </div>

      <div className="ai-section">
        <div className="ai-title">
          <span>🤖 AI 소믈리에 리포트</span>
          {aiNote.status === 'PENDING' && <div className="spinner"></div>}
        </div>

        {aiNote.status === 'PENDING' && (
          <div className="ai-pending">
            <p>🔍 <b>{liquor.name}</b>에 대한 정보를 분석하고 있습니다...</p>
            <small>잠시만 기다려주세요. 자동으로 업데이트됩니다.</small>
          </div>
        )}

        {aiNote.status === 'COMPLETED' && (
          <div className="ai-card">
            <div className="ai-description">
              <div className="ai-label">📖 소개</div>
              <div className="ai-text">{aiNote.description}</div>
            </div>
            <div className="ai-grid">
              <div className="ai-item">
                <div className="ai-label" style={{color:'#e74c3c'}}>👅 Taste</div>
                <div className="ai-text">{aiNote.taste}</div>
              </div>
              <div className="ai-item">
                <div className="ai-label" style={{color:'#3498db'}}>👃 Aroma</div>
                <div className="ai-text">{aiNote.aroma}</div>
              </div>
              <div className="ai-item">
                <div className="ai-label" style={{color:'#f1c40f'}}>🍇 Variety</div>
                <div className="ai-text">{aiNote.variety}</div>
              </div>
              <div className="ai-item">
                <div className="ai-label" style={{color:'#27ae60'}}>🧀 Pairing</div>
                <div className="ai-text">{aiNote.pairing}</div>
              </div>
            </div>
          </div>
        )}

        {aiNote.status === 'FAILED' && (
          <div className="ai-failed">
            😵 분석에 실패했습니다. 술 이름을 확인하고 다시 저장해보세요.
          </div>
        )}
      </div>
    </div>
  )
}

export default LiquorDetailPage
