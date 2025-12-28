import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api'

function CookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [recipe, setRecipe] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  
  // [추가] 수정 모드에서 사용할 공통 코드 목록
  const [cookingCodes, setCookingCodes] = useState([]);

  // 1. 상세 데이터 가져오기
  useEffect(() => {
    apiClient.get(`/cooking/${id}`)
      .then(res => {
        setRecipe(res.data);
        setEditData(res.data);
      })
      .catch(err => console.error(err));
      
    // [추가] 수정 시 선택할 코드 목록 미리 로드
    apiClient.get('/code/group/COOKING')
      .then(res => setCookingCodes(res.data))
      .catch(err => console.error(err));
  }, [id]);

  const handleDelete = async () => {
    if(window.confirm("정말 삭제하시겠습니까?")) {
      await apiClient.delete(`/cooking/${id}`);
      alert("삭제되었습니다.");
      navigate('/cooking');
    }
  };

  const handleUpdate = async () => {
    await apiClient.put(`/cooking/${id}`, editData);
    setRecipe(editData);
    setIsEditing(false);
    alert("수정되었습니다!");
  };

  const handleChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  if (!recipe) return <div>로딩 중...</div>;

  return (
    <div className="content-box" style={{ maxWidth: '800px', margin: '0 auto' }}>
      
      {isEditing ? (
        /* --- [수정 모드] --- */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h2>✏️ 요리 수정 중</h2>
          <input name="name" value={editData.name} onChange={handleChange} style={inputStyle} />
          <select name="chef" value={editData.chef} onChange={handleChange} style={inputStyle}>
             <option value="husband">남편</option><option value="wife">아내</option>
          </select>
          <textarea name="description" value={editData.description} onChange={handleChange} style={{...inputStyle, minHeight:'100px'}} />
          
          {/* [수정] 난이도 -> 요리 종류 (공통 코드 드롭다운) */}
          <select name="cooking_type" value={editData.cooking_type} onChange={handleChange} style={inputStyle}>
             {cookingCodes.map((code) => (
                <option key={code.code_id} value={code.code_name}>
                  {code.code_name}
                </option>
             ))}
          </select>

          <input name="image_url" value={editData.image_url} onChange={handleChange} style={inputStyle} />
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleUpdate} style={{...btnBase, background:'#4dabf7', color:'white'}}>저장</button>
            <button onClick={() => setIsEditing(false)} style={{...btnBase, background:'#ccc'}}>취소</button>
          </div>
        </div>
      ) : (
        /* --- [조회 모드] --- */
        <div>
          <img src={recipe.image_url} alt="요리" style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '10px' }} />
          
          <h1 style={{ fontSize: '32px', margin: '20px 0 10px' }}>{recipe.name}</h1>
          <div style={{ color: '#888', marginBottom: '20px' }}>
             요리사: {recipe.chef === 'husband' ? '👨‍💼 남편' : '👩‍💼 아내'} | 종류: {recipe.cooking_type}
          </div>
          
          <p style={{ fontSize: '18px', lineHeight: '1.8', background: '#f8f9fa', padding: '20px', borderRadius: '10px', whiteSpace: 'pre-wrap'  }}>
            {recipe.description}
          </p>

          <div style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={() => setIsEditing(true)} style={{...btnBase, background:'#fab005', color:'white'}}>수정</button>
            <button onClick={handleDelete} style={{...btnBase, background:'#ff6b6b', color:'white'}}>삭제</button>
            <button onClick={() => navigate('/cooking')} style={{...btnBase, background:'#f1f3f5'}}>목록으로</button>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' };
const btnBase = { padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };

export default CookingDetailPage;
