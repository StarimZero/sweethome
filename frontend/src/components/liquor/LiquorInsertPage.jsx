import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

function LiquorInsertPage() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    purchase_place: '',
    pairing_foods: [''],   // ★ 음식 여러 개
    image_urls: [''],      // ★ 이미지 여러 개
    rating_husband: 0,
    rating_wife: 0,
    comment_husband: '',
    comment_wife: '',
    visit_date: '',
    price: 0
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/code/group/SUL')
      setCategories(res.data)
      if (res.data.length > 0) {
        setFormData(prev => ({ ...prev, category: res.data[0].code_id }))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  // --- 이미지 핸들러 ---
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

  // --- 음식 핸들러 ---
  const handleFoodChange = (index, value) => {
    const newFoods = [...formData.pairing_foods]
    newFoods[index] = value
    setFormData({ ...formData, pairing_foods: newFoods })
  }
  const addFoodField = () => setFormData({ ...formData, pairing_foods: [...formData.pairing_foods, ''] })
  const removeFoodField = (index) => {
    const newFoods = formData.pairing_foods.filter((_, i) => i !== index)
    setFormData({ ...formData, pairing_foods: newFoods })
  }

  const handleSubmit = async () => {
    const cleanData = {
      ...formData,
      image_urls: formData.image_urls.filter(s => s.trim() !== ''),
      pairing_foods: formData.pairing_foods.filter(s => s.trim() !== '')
    }

    if (!cleanData.name) {
      alert('주류명을 입력하세요')
      return
    }

    try {
      await axios.post('http://localhost:8000/api/liquor', cleanData)
      alert('등록되었습니다!')
      navigate('/liquor')
    } catch (err) {
      console.error(err)
      alert('등록 실패')
    }
  }

  return (
    <div className="content-box">
      <style>{`
        .form-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .btn-group { display: flex; gap: 8px; }
        .btn { padding: 8px 16px; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; font-weight: 600; background:white; }
        .btn-primary { background: #26DCD6; color: white; border: none; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-weight: 600; margin-bottom: 8px; color: #333; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
        .form-group textarea { min-height: 100px; resize: vertical; }
        
        .input-row { display: flex; gap: 8px; margin-bottom: 8px; }
        .btn-add-sub { background: #f9f9f9; border: 1px dashed #aaa; width: 100%; padding: 10px; border-radius: 6px; cursor: pointer; color: #666; font-size: 13px; }
        .btn-del { background: #ff4d4f; color: white; border: none; padding: 0 12px; border-radius: 6px; cursor: pointer; }
        
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr; } }
      `}</style>

      <div className="form-header">
        <h1>🍷 주류 등록</h1>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={handleSubmit}>저장</button>
          <button className="btn" onClick={() => navigate('/liquor')}>취소</button>
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label>주류명 *</label>
          <input name="name" value={formData.name} onChange={handleChange} placeholder="예: 샤또 마고 2015" />
        </div>
        <div className="form-group">
          <label>종류 *</label>
          <select name="category" value={formData.category} onChange={handleChange}>
            {categories.map(cat => (
              <option key={cat.code_id} value={cat.code_id}>{cat.code_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label>구매처</label>
          <input name="purchase_place" value={formData.purchase_place} onChange={handleChange} placeholder="예: 이마트, 코스트코" />
        </div>
        <div className="form-group">
          <label>🍽️ 함께한 음식</label>
          {formData.pairing_foods.map((food, index) => (
            <div key={index} className="input-row">
              <input value={food} onChange={(e) => handleFoodChange(index, e.target.value)} placeholder={`음식 #${index+1}`} />
              {formData.pairing_foods.length > 1 && <button className="btn-del" onClick={() => removeFoodField(index)}>X</button>}
            </div>
          ))}
          <button className="btn-add-sub" onClick={addFoodField}>+ 음식 추가</button>
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label>가격</label>
          <input type="number" name="price" value={formData.price} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>구매/시음 날짜</label>
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
            <textarea name="comment_husband" value={formData.comment_husband} onChange={handleChange}></textarea>
          </div>
        </div>
        <div>
          <div className="form-group">
            <label>👩 아내 평점</label>
            <input type="number" name="rating_wife" value={formData.rating_wife} onChange={handleChange} step="0.5" min="0" max="5" />
          </div>
          <div className="form-group">
            <label>👩 아내 코멘트</label>
            <textarea name="comment_wife" value={formData.comment_wife} onChange={handleChange}></textarea>
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

export default LiquorInsertPage
