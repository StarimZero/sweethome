import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { useConfirm } from '../common/ConfirmDialog';
import './Cooking.scss';

function CookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAuthorName } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [recipe, setRecipe] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [cookingCodes, setCookingCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError(false);

    apiClient.get(`/cooking/${id}`)
      .then(res => { if (!alive) return; setRecipe(res.data); setEditData(res.data); })
      .catch(err => { console.error(err); if (alive) setLoadError(true); })
      .finally(() => { if (alive) setLoading(false); });

    apiClient.get('/code/group/COOKING')
      .then(res => { if (alive) setCookingCodes(res.data); })
      .catch(err => console.error(err));

    return () => { alive = false; };
  }, [id]);

  const handleDelete = async () => {
    const ok = await confirm({
      title: '요리 삭제',
      message: '이 요리를 정말 삭제할까요?\n삭제하면 되돌릴 수 없습니다.',
      confirmText: '삭제',
      danger: true,
    });
    if (!ok || submitting) return;

    setSubmitting(true);
    try {
      await apiClient.delete(`/cooking/${id}`);
      toast.success('삭제되었습니다.');
      navigate('/cooking');
    } catch (err) {
      console.error(err);
      toast.error('삭제에 실패했습니다.');
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editData.name?.trim()) { toast.error('이름을 입력해주세요.'); return; }
    if (submitting) return;

    setSubmitting(true);
    try {
      await apiClient.put(`/cooking/${id}`, editData);
      setRecipe(editData);
      setIsEditing(false);
      toast.success('수정되었습니다!');
    } catch (err) {
      console.error(err);
      toast.error('수정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  if (loading) {
    return (
      <div className="content-box cooking-detail-page">
        <div className="detail-loading">
          <span className="spinner" />
          <span>불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (loadError || !recipe) {
    return (
      <div className="content-box cooking-detail-page">
        <div className="detail-error">
          <p>요리 정보를 불러오지 못했습니다.</p>
          <button className="btn back" onClick={() => navigate('/cooking')}>목록으로</button>
        </div>
      </div>
    );
  }

  return (
    <div className="content-box cooking-detail-page">
      {isEditing ? (
        <div className="edit-form">
          <div className="form-head">
            <h1>✏️ 요리 수정</h1>
          </div>

          <div className="form-section">
            <label>이름 <span className="req">*</span>
              <input name="name" value={editData.name || ''} onChange={handleChange} className="form-input" placeholder="예: 김치찌개" />
            </label>

            <label>요리 종류
              <select name="cooking_type" value={editData.cooking_type || ''} onChange={handleChange} className="form-select">
                <option value="">선택</option>
                {cookingCodes.map((code) => (
                  <option key={code.code_id} value={code.code_name}>{code.code_name}</option>
                ))}
              </select>
            </label>

            <label>설명
              <textarea name="description" value={editData.description || ''} onChange={handleChange} className="form-textarea" placeholder="레시피, 재료, 메모 등을 자유롭게 적어주세요." />
            </label>

            <label>이미지 URL
              <input name="image_url" value={editData.image_url || ''} onChange={handleChange} className="form-input" placeholder="https://..." />
            </label>

            {editData.image_url && (
              <div className="image-preview">
                <img src={editData.image_url} alt="미리보기" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => { setEditData(recipe); setIsEditing(false); }} className="btn-cancel" disabled={submitting}>취소</button>
            <button type="button" onClick={handleUpdate} className="btn-submit" disabled={submitting}>
              {submitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          {recipe.image_url ? (
            <img src={recipe.image_url} alt={recipe.name} className="detail-image" />
          ) : (
            <div className="detail-image placeholder">🍳</div>
          )}

          <h1 className="detail-title">{recipe.name}</h1>
          <div className="detail-meta">
            작성자: 👤 {getAuthorName(recipe.created_by)}
            {recipe.cooking_type && <> | 종류: {recipe.cooking_type}</>}
          </div>

          <p className="detail-description">{recipe.description}</p>

          <div className="detail-actions">
            <button onClick={() => setIsEditing(true)} className="btn edit">수정</button>
            <button onClick={handleDelete} className="btn delete" disabled={submitting}>삭제</button>
            <button onClick={() => navigate('/cooking')} className="btn back">목록으로</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CookingDetailPage;
