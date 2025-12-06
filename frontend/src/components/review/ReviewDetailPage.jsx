import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

function ReviewDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [review, setReview] = useState(null);
  const [editData, setEditData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [categories, setCategories] = useState([]); 

  useEffect(() => {
    axios.get(`http://localhost:8000/api/review/${id}`)
      .then(res => {
        setReview(res.data);
        setEditData(res.data);
      })
      .catch(err => console.error(err));

    axios.get('http://localhost:8000/api/code/group/FOOD')
      .then(res => setCategories(res.data))
      .catch(err => console.error(err));
  }, [id]);

  const getCategoryName = (codeId) => {
      const found = categories.find(c => c.code_id === codeId);
      return found ? found.code_name : codeId;
  };

  const handleChange = (e) => setEditData({...editData, [e.target.name]: e.target.value});

  const handleImageChange = (index, value) => {
    const newImages = [...(editData.image_urls || [])];
    newImages[index] = value;
    setEditData({ ...editData, image_urls: newImages });
  };
  
  const addImageField = () => setEditData({ ...editData, image_urls: [...(editData.image_urls || []), ''] });

  const handleUpdate = async () => {
      const cleanData = {
          ...editData,
          image_urls: (editData.image_urls || []).filter(url => url.trim() !== "")
      };
      await axios.put(`http://localhost:8000/api/review/${id}`, cleanData);
      setReview(cleanData);
      setIsEditing(false);
      alert("수정되었습니다.");
  };

  const handleDelete = async () => {
    if (window.confirm("정말 삭제하시겠습니까? 🗑️")) {
      await axios.delete(`http://localhost:8000/api/review/${id}`);
      alert("삭제되었습니다.");
      navigate('/review');
    }
  };

  if (!review) return <div>Loading...</div>;

  return (
    <div className="content-box" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {isEditing ? (
        /* --- [수정 모드] --- */
        <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
            <h2>✏️ 리뷰 수정</h2>
            
            <div style={{display:'flex', gap:'10px'}}>
                <div style={{flex:1}}>
                     <label style={labelStyle}>음식 종류</label>
                     <select name="category" value={editData.category || ''} onChange={handleChange} style={inputStyle}>
                        <option value="">선택하세요</option>
                        {categories.map(code => (
                            <option key={code.code_id} value={code.code_id}>{code.code_name}</option>
                        ))}
                    </select>
                </div>
                <div style={{flex:2}}>
                     <label style={labelStyle}>식당 이름</label>
                     <input name="restaurant_name" value={editData.restaurant_name} onChange={handleChange} style={inputStyle} />
                </div>
            </div>

            <div style={{display:'flex', gap:'10px'}}>
                <input name="location" value={editData.location} onChange={handleChange} placeholder="위치" style={inputStyle} />
                <input type="date" name="visit_date" value={editData.visit_date} onChange={handleChange} style={inputStyle} />
            </div>
            <input name="naver_url" value={editData.naver_url} onChange={handleChange} placeholder="네이버 지도 URL" style={inputStyle} />
            
            {/* 별점 수정 */}
            <div style={{background:'#f1f3f5', padding:'15px', borderRadius:'8px', display:'flex', gap:'20px'}}>
                <label style={{flex:1}}>👨‍💼 남편 점수 <input type="number" name="husband_rating" step="0.1" value={editData.husband_rating} onChange={handleChange} style={{...inputStyle, marginTop:'5px'}} /></label>
                <label style={{flex:1}}>👩‍💼 아내 점수 <input type="number" name="wife_rating" step="0.1" value={editData.wife_rating} onChange={handleChange} style={{...inputStyle, marginTop:'5px'}} /></label>
            </div>

            <textarea name="husbandcomment" value={editData.husbandcomment} onChange={handleChange} placeholder="남편 코멘트" style={textareaStyle} />
            <textarea name="wifecomment" value={editData.wifecomment} onChange={handleChange} placeholder="아내 코멘트" style={textareaStyle} />

            <label style={labelStyle}>사진 편집</label>
            {(editData.image_urls || []).map((url, index) => (
                <input key={index} value={url} onChange={(e)=>handleImageChange(index, e.target.value)} style={{...inputStyle, marginBottom:'5px'}} />
            ))}
            <button onClick={addImageField} style={{...btnBase, background:'#eee', color:'#333', fontSize:'12px'}}>+ 사진 추가</button>

            <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                <button onClick={handleUpdate} style={{...btnBase, background:'#4dabf7', color:'white'}}>저장</button>
                <button onClick={()=>setIsEditing(false)} style={{...btnBase, background:'#ccc'}}>취소</button>
            </div>
        </div>
      ) : (
        /* --- [조회 모드] --- */
        <div>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
             <div>
                {review.category && (
                    <span style={{background:'#e7f5ff', color:'#1971c2', padding:'4px 8px', borderRadius:'4px', fontSize:'13px', fontWeight:'bold', marginRight:'8px'}}>
                        {getCategoryName(review.category)}
                    </span>
                )}
                <h1 style={{margin:'5px 0 10px', display:'inline-block'}}>{review.restaurant_name}</h1>
                
                <div style={{color:'#888', fontSize:'15px'}}>
                    📍 {review.location} | 📅 {review.visit_date}
                </div>
             </div>
             {review.naver_url && (
                 <a href={review.naver_url} target="_blank" rel="noreferrer" style={{padding:'8px 15px', background:'#03C75A', color:'white', borderRadius:'20px', fontSize:'14px', fontWeight:'bold', textDecoration:'none'}}>N 네이버 지도</a>
             )}
          </div>

          <hr style={{margin:'20px 0', border:'0', borderTop:'1px solid #eee'}} />

          <div style={{display:'flex', gap:'20px', marginBottom:'30px'}}>
              <div style={{flex:1, background:'#f8f9fa', padding:'20px', borderRadius:'15px', border:'1px solid #e9ecef'}}>
                  <h3 style={{margin:'0 0 10px', fontSize:'16px', color:'#495057', display:'flex', justifyContent:'space-between'}}>
                      👨‍💼 남편의 한마디
                      <span style={{color:'#fcc419'}}>★ {review.husband_rating}</span>
                  </h3>
                  <p style={{margin:0, lineHeight:'1.6'}}>{review.husbandcomment || "코멘트가 없습니다."}</p>
              </div>
              <div style={{flex:1, background:'#fff0f6', padding:'20px', borderRadius:'15px', border:'1px solid #ffdeeb'}}>
                  <h3 style={{margin:'0 0 10px', fontSize:'16px', color:'#c2255c', display:'flex', justifyContent:'space-between'}}>
                      👩‍💼 아내의 한마디
                      <span style={{color:'#fcc419'}}>★ {review.wife_rating}</span>
                  </h3>
                  <p style={{margin:0, lineHeight:'1.6'}}>{review.wifecomment || "코멘트가 없습니다."}</p>
              </div>
          </div>

          <h3>📸 사진 갤러리</h3>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'10px'}}>
              {(review.image_urls || []).map((url, index) => (
                  <img key={index} src={url} alt="음식" style={{width:'100%', height:'200px', objectFit:'cover', borderRadius:'10px', border:'1px solid #eee'}} />
              ))}
          </div>

          <div style={{ marginTop: '40px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={() => setIsEditing(true)} style={{...btnBase, background:'#fab005', color:'white'}}>수정</button>
            <button onClick={handleDelete} style={{...btnBase, background:'#ff6b6b', color:'white'}}>삭제</button>
            <button onClick={() => navigate('/review')} style={{...btnBase, background:'#f1f3f5', color:'#333'}}>목록으로</button>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display:'block', marginBottom:'5px', fontWeight:'bold', fontSize:'14px', color:'#343a40' };
const inputStyle = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', boxSizing:'border-box' };
const textareaStyle = { ...inputStyle, minHeight:'80px' };
const btnBase = { padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };

export default ReviewDetailPage;
