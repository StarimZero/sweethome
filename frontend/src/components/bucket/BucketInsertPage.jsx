import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api';
import useBucketCodes from '../../hooks/useBucketCodes';
import { useToast } from '../common/Toast';
import './Bucket.scss';

const BucketInsertPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { categories, statuses, loading } = useBucketCodes();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    target_date: '',
    progress: 0,
    status: '',
    image_url: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('제목을 입력하세요.');
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      await apiClient.post('/bucket', form);
      toast.success('버킷리스트가 추가되었습니다!');
      navigate('/bucket');
    } catch (err) {
      console.error(err);
      toast.error('등록에 실패했습니다.');
      setSubmitting(false);
    }
  };

  if (loading) return <div>로딩중...</div>;

  return (
    <div className="bucket-insert-page">
      <h1>🎯 새 버킷 추가</h1>

      <form onSubmit={handleSubmit} className="bucket-form">
        <div className="form-group">
          <label>제목 *</label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="이루고 싶은 꿈을 적어주세요"
          />
        </div>

        <div className="form-group">
          <label>설명</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="자세한 내용을 적어주세요"
            rows={4}
          />
        </div>

        <div className="form-group">
          <label>이미지 URL</label>
          <input
            type="text"
            name="image_url"
            value={form.image_url}
            onChange={handleChange}
            placeholder="https://example.com/image.jpg"
          />
          {form.image_url && (
            <div className="image-preview">
              <img src={form.image_url} alt="미리보기" />
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>카테고리</label>
            <select name="category" value={form.category} onChange={handleChange}>
              <option value="">선택하세요</option>
              {categories.map(c => (
                <option key={c.code_id} value={c.code_id}>{c.code_name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>상태</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="">선택하세요</option>
              {statuses.map(c => (
                <option key={c.code_id} value={c.code_id}>{c.code_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>목표 날짜</label>
            <input
              type="date"
              name="target_date"
              value={form.target_date}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>진행률 ({form.progress}%)</label>
            <input
              type="range"
              name="progress"
              min="0"
              max="100"
              value={form.progress}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={() => navigate('/bucket')} disabled={submitting}>
            취소
          </button>
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? '등록 중...' : '등록'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BucketInsertPage;
