import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '../../api'
import './Culture.scss'

function CultureDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [culture, setCulture] = useState(null)
  const [categories, setCategories] = useState([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({})

  useEffect(() => {
    fetchCategories()
    fetchCulture()
  }, [id])

  const fetchCategories = async () => {
    try { const res = await apiClient.get('/code/group/CULTURE'); setCategories(res.data) }
    catch (err) { console.error(err) }
  }

  const fetchCulture = async () => {
    try {
      const res = await apiClient.get(`/culture/${id}`)
      let data = res.data
      if (!data.image_urls) data.image_urls = []
      setCulture(data)
      setEditData(data)
    } catch (err) { console.error(err) }
  }

  const handleEdit = () => setIsEditing(true)
  const handleCancel = () => { setEditData(culture); setIsEditing(false) }
  const handleChange = (e) => { setEditData({ ...editData, [e.target.name]: e.target.value }) }

  const handleImageChange = (index, value) => { const newImages = [...editData.image_urls]; newImages[index] = value; setEditData({ ...editData, image_urls: newImages }) }
  const addImageField = () => setEditData({ ...editData, image_urls: [...editData.image_urls, ''] })
  const removeImageField = (index) => { const newImages = editData.image_urls.filter((_, i) => i !== index); setEditData({ ...editData, image_urls: newImages }) }

  const handleSave = async () => {
    const cleanData = {
      ...editData,
      image_urls: editData.image_urls.filter(s => s.trim() !== '')
    }
    try {
      const res = await apiClient.put(`/culture/${id}`, cleanData)
      alert('수정되었습니다')
      let data = res.data
      if (!data.image_urls) data.image_urls = []
      setCulture(data); setEditData(data); setIsEditing(false); setCurrentImageIndex(0)
    } catch (err) { console.error(err) }
  }

  const handleDelete = async () => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try { await apiClient.delete(`/culture/${id}`); navigate('/culture') }
      catch (err) { console.error(err) }
    }
  }

  const nextImage = () => { if (culture.image_urls.length > 1) setCurrentImageIndex((prev) => (prev + 1) % culture.image_urls.length) }
  const prevImage = () => { if (culture.image_urls.length > 1) setCurrentImageIndex((prev) => (prev - 1 + culture.image_urls.length) % culture.image_urls.length) }

  if (!culture) return <div>Loading...</div>

  const categoryName = categories.find(c => c.code_id === culture.category)?.code_name || culture.category

  const categoryIcon = (cat) => {
    const icons = { MOVIE: '🎬', THEATER: '🎭', MUSICAL: '🎵', EXHIBITION: '🖼️' }
    return icons[cat] || '🎨'
  }

  return (
    <div className="content-box culture-detail-page">
      <div className="detail-header">
        <button className="btn" onClick={() => navigate('/culture')}>← 목록</button>
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
          {culture.image_urls.length > 0 ? (
            <div>
              <div className="slider-container">
                <img src={culture.image_urls[currentImageIndex]} className="main-image" alt="상세 이미지" />
                {culture.image_urls.length > 1 && (
                  <>
                    <button className="slider-btn prev" onClick={prevImage}>❮</button>
                    <button className="slider-btn next" onClick={nextImage}>❯</button>
                  </>
                )}
              </div>
              {culture.image_urls.length > 1 && (
                <div className="thumbnail-list">
                  {culture.image_urls.map((url, idx) => (
                    <img key={idx} src={url} className={`thumb ${idx === currentImageIndex ? 'active' : ''}`} onClick={() => setCurrentImageIndex(idx)} alt="" />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="slider-container" style={{background:'#eee', color:'#ccc', fontSize:'60px'}}>{categoryIcon(culture.category)}</div>
          )}
        </div>

        <div className="right-col">
          <div className="info-row">
            <span className="label">제목</span>
            {isEditing ? (
              <div className="value"><input name="title" value={editData.title} onChange={handleChange} style={{fontSize:'20px', fontWeight:'bold'}} /></div>
            ) : (
              <h1 style={{margin:0, fontSize:'28px', color:'#2d3436'}}>{culture.title}</h1>
            )}
          </div>

          <div className="info-grid">
            <div className="info-row">
              <span className="label">카테고리</span>
              {isEditing ? (
                <div className="value">
                  <select name="category" value={editData.category} onChange={handleChange}>
                    {categories.map(c => <option key={c.code_id} value={c.code_id}>{c.code_name}</option>)}
                  </select>
                </div>
              ) : (
                <div className="value" style={{fontSize:'18px'}}>{categoryIcon(culture.category)} {categoryName}</div>
              )}
            </div>
            <div className="info-row">
              <span className="label">관람일</span>
              {isEditing ? (
                <div className="value"><input type="date" name="visit_date" value={editData.visit_date} onChange={handleChange} /></div>
              ) : (
                <div className="value">{culture.visit_date || '-'}</div>
              )}
            </div>
          </div>

          <div className="info-row">
            <span className="label">장소</span>
            {isEditing ? (
              <div className="value"><input name="location" value={editData.location} onChange={handleChange} /></div>
            ) : (
              <div className="value">{culture.location || '-'}</div>
            )}
          </div>

          <div className="rating-box">
            <div>
              <div className="rating-header">
                <span style={{fontWeight:'bold'}}>👨 남편</span>
                {isEditing
                  ? <input type="number" name="rating_husband" value={editData.rating_husband} onChange={handleChange} step="0.5" style={{width:'80px'}} />
                  : <span className="rating-score">{culture.rating_husband}</span>
                }
              </div>
              {isEditing
                ? <textarea name="comment_husband" value={editData.comment_husband} onChange={handleChange} rows={3} style={{width:'100%'}} />
                : <p style={{color:'#555', lineHeight:'1.6', margin:0}}>{culture.comment_husband || <span style={{color:'#ccc'}}>코멘트 없음</span>}</p>
              }
            </div>
            <div>
              <div className="rating-header">
                <span style={{fontWeight:'bold'}}>👩 아내</span>
                {isEditing
                  ? <input type="number" name="rating_wife" value={editData.rating_wife} onChange={handleChange} step="0.5" style={{width:'80px'}} />
                  : <span className="rating-score wife">{culture.rating_wife}</span>
                }
              </div>
              {isEditing
                ? <textarea name="comment_wife" value={editData.comment_wife} onChange={handleChange} rows={3} style={{width:'100%'}} />
                : <p style={{color:'#555', lineHeight:'1.6', margin:0}}>{culture.comment_wife || <span style={{color:'#ccc'}}>코멘트 없음</span>}</p>
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
    </div>
  )
}

export default CultureDetailPage
