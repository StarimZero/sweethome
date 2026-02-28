import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api'
import './Liquor.scss'

function LiquorInsertPage() {
  const navigate = useNavigate()

  const [categories, setCategories] = useState([])
  const [wineTypes, setWineTypes] = useState([])

  const [formData, setFormData] = useState({
    name: '', category: '', wine_type: '',
    purchase_place: '', pairing_foods: [''], image_urls: [''],
    rating_husband: 0, rating_wife: 0,
    comment_husband: '', comment_wife: '',
    visit_date: '', price: 0
  })

  useEffect(() => {
    fetchCategories()
    fetchWineTypes()
  }, [])

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/code/group/SUL')
      setCategories(res.data)
      if (res.data.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: res.data[0].code_id }))
      }
    } catch (err) { console.error(err) }
  }

  const fetchWineTypes = async () => {
    try { const res = await apiClient.get('/code/group/WINE_C'); setWineTypes(res.data) }
    catch (err) { console.error(err) }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleImageChange = (index, value) => {
    const newImages = [...formData.image_urls]; newImages[index] = value; setFormData({ ...formData, image_urls: newImages })
  }
  const addImageField = () => setFormData({ ...formData, image_urls: [...formData.image_urls, ''] })
  const removeImageField = (index) => {
    const newImages = formData.image_urls.filter((_, i) => i !== index); setFormData({ ...formData, image_urls: newImages })
  }

  const handleFoodChange = (index, value) => {
    const newFoods = [...formData.pairing_foods]; newFoods[index] = value; setFormData({ ...formData, pairing_foods: newFoods })
  }
  const addFoodField = () => setFormData({ ...formData, pairing_foods: [...formData.pairing_foods, ''] })
  const removeFoodField = (index) => {
    const newFoods = formData.pairing_foods.filter((_, i) => i !== index); setFormData({ ...formData, pairing_foods: newFoods })
  }

  const isWine = formData.category === 'SUL_W';

  const handleSubmit = async () => {
    const cleanData = {
      ...formData,
      wine_type: isWine ? formData.wine_type : null,
      image_urls: formData.image_urls.filter(s => s.trim() !== ''),
      pairing_foods: formData.pairing_foods.filter(s => s.trim() !== '')
    }

    if (!cleanData.name) { alert('주류명을 입력하세요'); return }

    try {
      await apiClient.post('/liquor', cleanData)
      alert('등록되었습니다!')
      navigate('/liquor')
    } catch (err) {
      console.error(err)
      alert('등록 실패')
    }
  }

  return (
    <div className="content-box liquor-insert-page">
      <div className="form-header">
        <h1>🍷 주류 등록</h1>
        <div className="btn-group">
          <button className="btn primary" onClick={handleSubmit}>저장</button>
          <button className="btn" onClick={() => navigate('/liquor')}>취소</button>
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label>주류명 *</label>
          <input name="name" value={formData.name} onChange={handleChange} placeholder="예: 샤또 마고 2015" />
        </div>

        <div className="form-group">
          <label>종류</label>
          <div className="category-row">
            <select name="category" value={formData.category} onChange={handleChange}>
              {categories.map(cat => (
                <option key={cat.code_id} value={cat.code_id}>{cat.code_name}</option>
              ))}
            </select>
            {isWine && (
              <select name="wine_type" value={formData.wine_type} onChange={handleChange} className="wine-select">
                <option value="">-- 와인 종류 선택 --</option>
                {wineTypes.map(type => (
                  <option key={type.code_id} value={type.code_id}>{type.code_name}</option>
                ))}
              </select>
            )}
          </div>
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
