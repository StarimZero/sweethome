import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '../../api'; 

function LiquorDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  // 상태 관리
  const [liquor, setLiquor] = useState(null)
  const [categories, setCategories] = useState([])
  const [wineTypes, setWineTypes] = useState([]) // [추가] 와인 상세 코드
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // 수정 모드 상태
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({})

  // 데이터 불러오기
  useEffect(() => {
    fetchCategories()
    fetchWineTypes() // [추가]
    fetchLiquor()
    
    // 5초마다 데이터 갱신 (AI 분석 대기중일 때)
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

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/code/group/SUL')
      setCategories(res.data)
    } catch (err) { console.error(err) }
  }

  // [추가] 와인 상세 코드 로드
  const fetchWineTypes = async () => {
    try {
      const res = await apiClient.get('/code/group/WINE_C')
      setWineTypes(res.data)
    } catch (err) { console.error(err) }
  }

  const fetchLiquor = async (silent = false) => {
    try {
      const res = await apiClient.get(`/liquor/${id}`)
      let data = res.data
      
      // 데이터 정제
      if (!data.image_urls) data.image_urls = []
      if (data.image_urls.length === 0 && data.image_url) data.image_urls = [data.image_url]
      if (!data.pairing_foods) data.pairing_foods = []
      if (data.pairing_foods.length === 0 && data.pairing_food) data.pairing_foods = [data.pairing_food]
      
      // [추가] wine_type이 없으면 빈 문자열로 초기화 (수정 폼 핸들링 용이)
      if (!data.wine_type) data.wine_type = ''

      setLiquor(data)
      if (!silent) setEditData(data)
    } catch (err) { console.error(err) }
  }

  // --- 버튼 및 입력 핸들러 ---
  const handleEdit = () => setIsEditing(true)
  const handleCancel = () => { setEditData(liquor); setIsEditing(false); }
  const handleChange = (e) => { setEditData({ ...editData, [e.target.name]: e.target.value }) }

  const handleImageChange = (index, value) => {
    const newImages = [...editData.image_urls]; newImages[index] = value; setEditData({ ...editData, image_urls: newImages })
  }
  const addImageField = () => setEditData({ ...editData, image_urls: [...editData.image_urls, ''] })
  const removeImageField = (index) => {
    const newImages = editData.image_urls.filter((_, i) => i !== index); setEditData({ ...editData, image_urls: newImages })
  }

  const handleFoodChange = (index, value) => {
    const newFoods = [...editData.pairing_foods]; newFoods[index] = value; setEditData({ ...editData, pairing_foods: newFoods })
  }
  const addFoodField = () => setEditData({ ...editData, pairing_foods: [...editData.pairing_foods, ''] })
  const removeFoodField = (index) => {
    const newFoods = editData.pairing_foods.filter((_, i) => i !== index); setEditData({ ...editData, pairing_foods: newFoods })
  }

  const handleSave = async () => {
    const cleanData = { 
      ...editData, 
      // 와인이 아니면 wine_type 제거 혹은 null
      wine_type: editData.category === 'WINE' ? editData.wine_type : null,
      image_urls: editData.image_urls.filter(s => s.trim() !== ''), 
      pairing_foods: editData.pairing_foods.filter(s => s.trim() !== '') 
    }
    
    try {
      await apiClient.put(`/liquor/${id}`, cleanData)
      alert('수정되었습니다')
      setLiquor(cleanData); setEditData(cleanData); setIsEditing(false); setCurrentImageIndex(0); fetchLiquor()
    } catch (err) { console.error(err) }
  }

  const handleDelete = async () => {
    if (window.confirm('정말 삭제하시겠습니까?')) { try { await apiClient.delete(`/liquor/${id}`); navigate('/liquor') } catch (err) { console.error(err) } }
  }

  const nextImage = () => { if (liquor.image_urls.length > 1) setCurrentImageIndex((prev) => (prev + 1) % liquor.image_urls.length) }
  const prevImage = () => { if (liquor.image_urls.length > 1) setCurrentImageIndex((prev) => (prev - 1 + liquor.image_urls.length) % liquor.image_urls.length) }

  if (!liquor) return <div>Loading...</div>

  // [표시용] 코드값 -> 이름 변환
  const categoryName = categories.find(c => c.code_id === liquor.category)?.code_name || liquor.category
  const wineTypeName = wineTypes.find(c => c.code_id === liquor.wine_type)?.code_name || liquor.wine_type
  
  const aiNote = liquor.ai_note || { status: 'PENDING' };
  
  // [수정 모드용] 현재 카테고리가 와인인지 확인
  const isEditingWine = editData.category === 'WINE';

  return (
    <div className="content-box">
      <style>{`
        .detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .btn { padding: 8px 16px; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; background:white; font-weight: 600; margin-left: 8px; }
        .btn-primary { background: #26DCD6; color: white; border: none; }
        .btn-danger { background: #ff4d4f; color: white; border: none; }
        
        .layout { display: flex; gap: 40px; flex-wrap: wrap; margin-bottom: 50px; }
        .left-col { flex: 1; min-width: 320px; max-width: 500px; }
        .right-col { flex: 1.5; min-width: 320px; }
        
        .slider-container { position: relative; width: 100%; aspect-ratio: 1; background: #000; border-radius: 12px; overflow: hidden; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .main-image { width: 100%; height: 100%; object-fit: contain; }
        .slider-btn { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.4); color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 20px; transition: background 0.2s; user-select: none; }
        .slider-btn:hover { background: rgba(0,0,0,0.7); }
        .prev-btn { left: 10px; } .next-btn { right: 10px; }
        .thumbnail-list { display: flex; gap: 8px; margin-top: 10px; overflow-x: auto; padding-bottom: 5px; }
        .thumb { width: 60px; height: 60px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 2px solid transparent; opacity: 0.5; transition: all 0.2s; }
        .thumb.active { border-color: #26DCD6; opacity: 1; transform: scale(1.05); }
        
        .info-row { margin-bottom: 16px; }
        .label { display: block; font-size: 13px; color: #888; font-weight: 600; margin-bottom: 6px; }
        .value { font-size: 16px; color: #333; }
        .value input, .value select, .value textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
        .rating-box { background: #f9f9f9; padding: 25px; border-radius: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px; border: 1px solid #eee; }
        .rating-score { font-size: 28px; font-weight: 800; color: #26DCD6; }
        .input-row { display: flex; gap: 8px; margin-bottom: 6px; }
        .food-tag { display: inline-block; background: #fff0f0; color: #d6336c; padding: 6px 12px; border-radius: 20px; margin-right: 8px; margin-bottom: 8px; font-weight: 600; }
        
        .wine-badge { background: #6c5ce7; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px; vertical-align: middle; }

        .ai-section { margin-top: 40px; border-top: 3px dashed #eee; padding-top: 40px; animation: fadeIn 0.8s; }
        .ai-card { background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%); border-radius: 16px; padding: 30px; margin-top: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #fff; }
        .ai-title { font-size: 22px; font-weight: 800; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; color: #2d3436; }
        
        .ai-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 25px; }
        @media (max-width: 768px) { .ai-grid { grid-template-columns: 1fr; } }
        
        .ai-item { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); border: 1px solid #eee; transition: transform 0.2s; height: 100%; }
        .ai-item:hover { transform: translateY(-3px); box-shadow: 0 8px 15px rgba(0,0,0,0.05); }
        .ai-label { font-size: 14px; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .spinner { display: inline-block; width: 30px; height: 30px; border: 3px solid rgba(0,0,0,0.1); border-radius: 50%; border-top-color: #6c5ce7; animation: spin 1s ease-in-out infinite; }
      `}</style>

      <div className="detail-header">
        <button className="btn" onClick={() => navigate('/liquor')}>← 목록</button>
        <div>
          {isEditing ? (
            <> <button className="btn btn-primary" onClick={handleSave}>저장</button> <button className="btn" onClick={handleCancel}>취소</button> </>
          ) : (
            <> <button className="btn" onClick={handleEdit}>수정</button> <button className="btn btn-danger" onClick={handleDelete}>삭제</button> </>
          )}
        </div>
      </div>

      <div className="layout">
        <div className="left-col">
          {liquor.image_urls.length > 0 ? (
            <div>
              <div className="slider-container">
                <img src={liquor.image_urls[currentImageIndex]} className="main-image" alt="상세 이미지" />
                {liquor.image_urls.length > 1 && ( <> <button className="slider-btn prev-btn" onClick={prevImage}>❮</button> <button className="slider-btn next-btn" onClick={nextImage}>❯</button> </> )}
              </div>
              {liquor.image_urls.length > 1 && (
                <div className="thumbnail-list">
                  {liquor.image_urls.map((url, idx) => ( <img key={idx} src={url} className={`thumb ${idx === currentImageIndex ? 'active' : ''}`} onClick={() => setCurrentImageIndex(idx)} /> ))}
                </div>
              )}
            </div>
          ) : ( <div className="slider-container" style={{background:'#eee', color:'#ccc', fontSize:'60px'}}>🍷</div> )}
        </div>

        <div className="right-col">
          <div className="info-row">
            <span className="label">주류명</span>
            {isEditing ? <div className="value"><input name="name" value={editData.name} onChange={handleChange} style={{fontSize:'20px', fontWeight:'bold'}} /></div> : <h1 style={{margin:0, fontSize:'28px', color:'#2d3436'}}>{liquor.name}</h1>}
          </div>
          
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
            <div className="info-row">
              <span className="label">종류</span>
              {isEditing ? ( 
                <div className="value" style={{display:'flex', gap:'5px'}}>
                    <select name="category" value={editData.category} onChange={handleChange} style={{flex:1}}>
                        {categories.map(c=><option key={c.code_id} value={c.code_id}>{c.code_name}</option>)}
                    </select>
                    
                    {/* [수정모드] 와인일 경우 상세 선택 박스 표시 */}
                    {isEditingWine && (
                        <select name="wine_type" value={editData.wine_type} onChange={handleChange} style={{flex:1}}>
                            <option value="">-- 타입 --</option>
                            {wineTypes.map(c=><option key={c.code_id} value={c.code_id}>{c.code_name}</option>)}
                        </select>
                    )}
                </div> 
              ) : ( 
                  <div className="value" style={{fontSize:'18px'}}>
                      {categoryName}
                      {/* [조회모드] 와인 상세 정보가 있으면 뱃지로 표시 */}
                      {liquor.category === 'WINE' && wineTypeName && (
                          <span className="wine-badge">{wineTypeName}</span>
                      )}
                  </div>
              )}
            </div>
            
            <div className="info-row">
              <span className="label">가격</span>
              {isEditing ? <div className="value"><input type="number" name="price" value={editData.price} onChange={handleChange} /></div> : <div className="value" style={{fontSize:'18px', fontWeight:'bold', color:'#0984e3'}}>{liquor.price ? `${liquor.price.toLocaleString()}원` : '-'}</div>}
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
                {editData.pairing_foods.map((food, i) => ( <div key={i} className="input-row"> <input value={food} onChange={e => handleFoodChange(i, e.target.value)} /> <button className="btn btn-danger" style={{padding:'0 10px'}} onClick={() => removeFoodField(i)}>X</button> </div> ))}
                <button className="btn" onClick={addFoodField}>+ 추가</button>
              </div>
            ) : ( <div className="value"> {liquor.pairing_foods.length > 0 ? liquor.pairing_foods.map((f, i) => <span key={i} className="food-tag">🍽️ {f}</span>) : <span style={{color:'#ccc'}}>정보 없음</span>} </div> )}
          </div>
          
          <div className="rating-box">
            <div>
              <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px'}}> <span style={{fontWeight:'bold'}}>👨 남편</span> {isEditing ? <input type="number" name="rating_husband" value={editData.rating_husband} onChange={handleChange} step="0.5" style={{width:'80px'}} /> : <span className="rating-score">{liquor.rating_husband}</span>} </div>
              {isEditing ? <textarea name="comment_husband" value={editData.comment_husband} onChange={handleChange} rows={3} style={{width:'100%'}} /> : <p style={{color:'#555', lineHeight:'1.6', margin:0}}>{liquor.comment_husband || <span style={{color:'#ccc'}}>코멘트 없음</span>}</p>}
            </div>
            <div>
              <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px'}}> <span style={{fontWeight:'bold'}}>👩 아내</span> {isEditing ? <input type="number" name="rating_wife" value={editData.rating_wife} onChange={handleChange} step="0.5" style={{width:'80px'}} /> : <span className="rating-score" style={{color:'#ff6b9d'}}>{liquor.rating_wife}</span>} </div>
              {isEditing ? <textarea name="comment_wife" value={editData.comment_wife} onChange={handleChange} rows={3} style={{width:'100%'}} /> : <p style={{color:'#555', lineHeight:'1.6', margin:0}}>{liquor.comment_wife || <span style={{color:'#ccc'}}>코멘트 없음</span>}</p>}
            </div>
          </div>
          
          {isEditing && (
            <div className="info-row" style={{marginTop:'20px'}}> <span className="label">이미지 URL 관리</span> {editData.image_urls.map((url, i) => ( <div key={i} className="input-row"> <input value={url} onChange={e => handleImageChange(i, e.target.value)} placeholder="URL" /> <button className="btn btn-danger" onClick={() => removeImageField(i)}>X</button> </div> ))} <button className="btn" onClick={addImageField}>+ 이미지 추가</button> </div>
          )}
        </div>
      </div>

      <div className="ai-section">
          <div className="ai-title"> <span>🤖 AI 소믈리에 리포트</span> {aiNote.status === 'PENDING' && <div className="spinner"></div>} </div>
          {aiNote.status === 'PENDING' && ( <div style={{background:'#f8f9fa', padding:'40px', borderRadius:'16px', textAlign:'center', color:'#666', border:'1px solid #eee'}}> <p style={{marginBottom:'10px', fontSize:'18px'}}>🔍 <b>{liquor.name}</b>에 대한 정보를 분석하고 있습니다...</p> <small style={{color:'#999'}}>잠시만 기다려주세요. 자동으로 업데이트됩니다.</small> </div> )}
          {aiNote.status === 'COMPLETED' && (
              <div className="ai-card">
                  <div style={{marginBottom:'30px'}}>
                      <div className="ai-label">📖 소개</div>
                      <div style={{lineHeight:'1.8', fontSize:'16px', color:'#444'}}>{aiNote.description}</div>
                  </div>
                  <div className="ai-grid">
                      <div className="ai-item"> <div className="ai-label" style={{color:'#e74c3c'}}>👅 Taste</div> <div style={{color:'#555', lineHeight:'1.5'}}>{aiNote.taste}</div> </div>
                      <div className="ai-item"> <div className="ai-label" style={{color:'#3498db'}}>👃 Aroma</div> <div style={{color:'#555', lineHeight:'1.5'}}>{aiNote.aroma}</div> </div>
                      <div className="ai-item"> <div className="ai-label" style={{color:'#f1c40f'}}>🍇 Variety</div> <div style={{color:'#555', lineHeight:'1.5'}}>{aiNote.variety}</div> </div>
                      <div className="ai-item"> <div className="ai-label" style={{color:'#27ae60'}}>🧀 Pairing</div> <div style={{color:'#555', lineHeight:'1.5'}}>{aiNote.pairing}</div> </div>
                  </div>
              </div>
          )}
          {aiNote.status === 'FAILED' && ( <div style={{background:'#fff0f0', padding:'20px', borderRadius:'12px', color:'#c0392b', textAlign:'center', border:'1px solid #ffcccc'}}> 😵 분석에 실패했습니다. 술 이름을 확인하고 다시 저장해보세요. </div> )}
      </div>
    </div>
  )
}

export default LiquorDetailPage
