import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api'
import './Culture.scss'

function CultureInsertPage() {
  const navigate = useNavigate()

  const [categories, setCategories] = useState([])

  const [formData, setFormData] = useState({
    title: '', category: '', visit_date: '', location: '',
    rating_husband: 0, rating_wife: 0,
    comment_husband: '', comment_wife: '',
    image_urls: ['']
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/code/group/CULTURE')
      setCategories(res.data)
      if (res.data.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: res.data[0].code_id }))
      }
    } catch (err) { console.error(err) }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleImageChange = (index, value) => {
    const newImages = [...formData.image_urls]
    newImages[index] = value
    setFormData({ ...formData, image_urls: newImages })
  }
  const addImageField = () => setFormData({ ...formData, image_urls: [...formData.image_urls, ''] })
  const removeImageField = (index) => {
    const newImages = formData.image_urls.filter((_, i) => i !== index)
    setFormData({ ...formData, image_urls: newImages })
  }

  const handleSubmit = async () => {
    const cleanData = {
      ...formData,
      image_urls: formData.image_urls.filter(s => s.trim() !== '')
    }

    if (!cleanData.title) { alert('제목을 입력하세요'); return }

    try {
      await apiClient.post('/culture', cleanData)
      alert('등록되었습니다!')
      navigate('/culture')
    } catch (err) {
      console.error(err)
      alert('등록 실패')
    }
  }

  return (
    <div className="content-box culture-insert-page">
      <div className="form-header">
        <h1>🎨 문화생활 등록</h1>
        <div className="btn-group">
          <button className="btn primary" onClick={handleSubmit}>저장</button>
          <button className="btn" onClick={() => navigate('/culture')}>취소</button>
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label>제목 *</label>
          <input name="title" value={formData.title} onChange={handleChange} placeholder="영화명, 공연명 등" />
        </div>
        <div className="form-group">
          <label>카테고리</label>
          <select name="category" value={formData.category} onChange={handleChange}>
            {categories.map(cat => (
              <option key={cat.code_id} value={cat.code_id}>{cat.code_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label>장소</label>
          <input name="location" value={formData.location} onChange={handleChange} placeholder="극장, 갤러리 등" />
        </div>
        <div className="form-group">
          <label>관람일</label>
          <input type="date" name="visit_date" value={formData.visit_date} onChange={handleChange} />
        </div>
      </div>

      <div className="grid-2">
        <div>
          <div className="form-group">
            <label>👨 남편 평점</label>
            <input type="number" name="rating_husband" value={formData.rating_husband} onChange={handleChange} step="0.5" min="0" max="5" />
          </div>
          <div className="form-group">
            <label>👨 남편 코멘트</label>
            <textarea name="comment_husband" value={formData.comment_husband} onChange={handleChange} rows={3}></textarea>
          </div>
        </div>
        <div>
          <div className="form-group">
            <label>👩 아내 평점</label>
            <input type="number" name="rating_wife" value={formData.rating_wife} onChange={handleChange} step="0.5" min="0" max="5" />
          </div>
          <div className="form-group">
            <label>👩 아내 코멘트</label>
            <textarea name="comment_wife" value={formData.comment_wife} onChange={handleChange} rows={3}></textarea>
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>이미지 URL</label>
        {formData.image_urls.map((url, index) => (
          <div key={index} className="input-row">
            <input value={url} onChange={(e) => handleImageChange(index, e.target.value)} placeholder={`이미지 URL #${index+1}`} />
            {formData.image_urls.length > 1 && <button className="btn-del" onClick={() => removeImageField(index)}>X</button>}
          </div>
        ))}
        <button className="btn-add-sub" onClick={addImageField}>+ 이미지 추가</button>
      </div>
    </div>
  )
}

export default CultureInsertPage
