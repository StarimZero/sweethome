import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api'; 

function ReviewInsertPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    restaurant_name: '', location: '', 
    husband_rating: 0.0, // 남편 점수
    wife_rating: 0.0,    // 아내 점수
    husbandcomment: '', wifecomment: '',
    visit_date: '', naver_url: '',
    category: '', 
    image_urls: ['']
  });

  useEffect(() => {
    apiClient.get('/code/group/FOOD') 
      .then(res => setCategories(res.data))
      .catch(err => console.error("코드 로딩 실패", err));
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addImageField = () => {
    setFormData({ ...formData, image_urls: [...formData.image_urls, ''] });
  };

  const handleImageChange = (index, value) => {
    const newImages = [...formData.image_urls];
    newImages[index] = value;
    setFormData({ ...formData, image_urls: newImages });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanData = {
      ...formData,
      image_urls: formData.image_urls.filter(url => url.trim() !== "")
    };

    try {
      await apiClient.post('/review', cleanData);
      alert("리뷰 등록 완료!");
      navigate('/review');
    } catch (err) {
      console.error(err);
      alert("오류 발생");
    }
  };

  return (
    <div className="content-box" style={{ maxWidth: '700px', margin: '0 auto' }}>
      <h1>📝 맛집 리뷰 작성</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* 기본 정보 섹션 */}
        <div style={{display:'flex', gap:'15px'}}>
            <div style={{flex:1}}>
                <label style={labelStyle}>음식 종류</label>
                <select name="category" value={formData.category} onChange={handleChange} style={inputStyle}>
                    <option value="">선택하세요</option>
                    {categories.map(code => (
                        <option key={code.code_id} value={code.code_id}>{code.code_name}</option>
                    ))}
                </select>
            </div>
            <div style={{flex:2}}>
                <label style={labelStyle}>식당 이름 *</label>
                <input name="restaurant_name" value={formData.restaurant_name} onChange={handleChange} required style={inputStyle} />
            </div>
        </div>

        <div style={{display:'flex', gap:'15px'}}>
            <div style={{flex:1}}>
                <label style={labelStyle}>위치 *</label>
                <input name="location" value={formData.location} onChange={handleChange} placeholder="예: 홍대" required style={inputStyle} />
            </div>
            <div style={{flex:1}}>
                <label style={labelStyle}>방문 날짜</label>
                <input type="date" name="visit_date" value={formData.visit_date} onChange={handleChange} style={inputStyle} />
            </div>
        </div>

        <div style={{marginBottom:'10px'}}>
            <label style={labelStyle}>네이버 지도 링크</label>
            <input name="naver_url" value={formData.naver_url} onChange={handleChange} placeholder="https://map.naver.com/..." style={inputStyle} />
        </div>

        {/* 부부 평가 섹션 (핵심 변경 부분) */}
        <div style={{background:'#f8f9fa', padding:'25px', borderRadius:'12px', border:'1px solid #e9ecef'}}>
            <h3 style={{marginTop:0, marginBottom:'20px', textAlign:'center'}}>💑 부부의 맛 평가</h3>
            
            {/* 남편 */}
            <div style={{marginBottom:'25px'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
                    <label style={{fontWeight:'bold', color:'#1971c2'}}>👨‍💼 남편의 생각</label>
                    <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                        <span style={{fontSize:'14px'}}>별점:</span>
                        <input type="number" name="husband_rating" step="0.1" min="0" max="5" value={formData.husband_rating} onChange={handleChange} style={{width:'60px', padding:'5px', textAlign:'center', borderRadius:'5px', border:'1px solid #ddd'}} />
                    </div>
                </div>
                <textarea name="husbandcomment" value={formData.husbandcomment} onChange={handleChange} style={textareaStyle} placeholder="남편의 한줄평을 적어주세요" />
            </div>

            {/* 아내 */}
            <div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
                    <label style={{fontWeight:'bold', color:'#c2255c'}}>👩‍💼 아내의 생각</label>
                    <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                        <span style={{fontSize:'14px'}}>별점:</span>
                        <input type="number" name="wife_rating" step="0.1" min="0" max="5" value={formData.wife_rating} onChange={handleChange} style={{width:'60px', padding:'5px', textAlign:'center', borderRadius:'5px', border:'1px solid #ddd'}} />
                    </div>
                </div>
                <textarea name="wifecomment" value={formData.wifecomment} onChange={handleChange} style={textareaStyle} placeholder="아내의 한줄평을 적어주세요" />
            </div>
        </div>

        <div>
            <label style={labelStyle}>📸 음식 사진 URL (여러 장 가능)</label>
            {formData.image_urls.map((url, index) => (
                <div key={index} style={{marginBottom:'8px'}}>
                    <input 
                        value={url} 
                        onChange={(e) => handleImageChange(index, e.target.value)} 
                        placeholder="https://..." 
                        style={inputStyle} 
                    />
                </div>
            ))}
            <button type="button" onClick={addImageField} style={{...btnBase, background:'#e9ecef', color:'#495057', fontSize:'13px', width:'100%', marginTop:'5px'}}>+ 사진 추가하기</button>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', borderTop:'1px solid #eee', paddingTop:'20px' }}>
            <button type="button" onClick={() => navigate('/review')} style={{...btnBase, background: '#f1f3f5', color:'#495057', flex:1}}>취소</button>
            <button type="submit" style={{...btnBase, background: '#20c997', color:'white', flex:2}}>등록하기</button>
        </div>
      </form>
    </div>
  );
}

const labelStyle = { display:'block', marginBottom:'5px', fontWeight:'bold', fontSize:'14px', color:'#343a40' };
const inputStyle = { width: '100%', padding: '12px', border: '1px solid #ced4da', borderRadius: '6px', boxSizing:'border-box', fontSize:'15px' };
const textareaStyle = { ...inputStyle, minHeight:'80px', resize:'vertical' };
const btnBase = { padding: '14px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize:'16px' };

export default ReviewInsertPage;
