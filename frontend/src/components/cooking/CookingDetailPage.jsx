import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api';
import './Cooking.scss';

function CookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [recipe, setRecipe] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [cookingCodes, setCookingCodes] = useState([]);

  useEffect(() => {
    apiClient.get(`/cooking/${id}`)
      .then(res => {
        setRecipe(res.data);
        setEditData(res.data);
      })
      .catch(err => console.error(err));

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
    <div className="content-box cooking-detail-page">
      {isEditing ? (
        <div className="edit-form">
          <h2>✏️ 요리 수정 중</h2>
          <input name="name" value={editData.name} onChange={handleChange} className="form-input" />
          <select name="chef" value={editData.chef} onChange={handleChange} className="form-select">
            <option value="husband">남편</option>
            <option value="wife">아내</option>
          </select>
          <textarea name="description" value={editData.description} onChange={handleChange} className="form-textarea" />

          <select name="cooking_type" value={editData.cooking_type} onChange={handleChange} className="form-select">
            {cookingCodes.map((code) => (
              <option key={code.code_id} value={code.code_name}>{code.code_name}</option>
            ))}
          </select>

          <input name="image_url" value={editData.image_url} onChange={handleChange} className="form-input" />

          <div className="edit-actions">
            <button onClick={handleUpdate} className="btn save">저장</button>
            <button onClick={() => setIsEditing(false)} className="btn cancel">취소</button>
          </div>
        </div>
      ) : (
        <div>
          <img src={recipe.image_url} alt="요리" className="detail-image" />

          <h1 className="detail-title">{recipe.name}</h1>
          <div className="detail-meta">
            요리사: {recipe.chef === 'husband' ? '👨‍💼 남편' : '👩‍💼 아내'} | 종류: {recipe.cooking_type}
          </div>

          <p className="detail-description">{recipe.description}</p>

          <div className="detail-actions">
            <button onClick={() => setIsEditing(true)} className="btn edit">수정</button>
            <button onClick={handleDelete} className="btn delete">삭제</button>
            <button onClick={() => navigate('/cooking')} className="btn back">목록으로</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CookingDetailPage;
