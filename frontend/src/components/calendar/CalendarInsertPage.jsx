import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../../api';
import './Calendar.scss';

const CalendarInsertPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateFromUrl = searchParams.get('date');
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    title: '',
    date: dateFromUrl || today,
    end_date: '',
    memo: '',
    is_yearly: false,
    is_lunar: false,
    is_range: false,
    color: '#6c5ce7'
  });

  const colors = [
    '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3',
    '#54a0ff', '#5f27cd', '#00d2d3', '#1dd1a1'
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleRangeToggle = (e) => {
    const checked = e.target.checked;
    setForm({
      ...form,
      is_range: checked,
      end_date: checked ? form.end_date : ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('제목을 입력하세요.');
      return;
    }

    const submitData = {
      ...form,
      end_date: form.is_range ? (form.end_date || null) : null
    };

    try {
      await apiClient.post('/calendar', submitData);
      navigate('/calendar');
    } catch (err) {
      console.error(err);
      alert('등록 실패');
    }
  };

  return (
    <div className="calendar-insert-page">
      <h1>이벤트 등록</h1>

      <form onSubmit={handleSubmit} className="calendar-form">
        <div className="form-group">
          <label>제목 *</label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="예: 엄마 생신, 결혼기념일, 유행어"
          />
        </div>

        {/* 기간 이벤트 토글 */}
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="is_range"
              checked={form.is_range}
              onChange={handleRangeToggle}
            />
            <span>기간 이벤트</span>
          </label>
          <p className="hint">시작일~종료일이 있는 이벤트 (예: 유행어 기간)</p>
        </div>

        {/* 날짜 입력 */}
        <div className="form-group">
          <label>{form.is_range ? '시작일 *' : '날짜 *'}</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
          />
        </div>

        {/* 종료일 (기간 이벤트인 경우만) */}
        {form.is_range && (
          <div className="form-group">
            <label>종료일</label>
            <input
              type="date"
              name="end_date"
              value={form.end_date}
              onChange={handleChange}
            />
            <p className="hint">비워두면 "미정"으로 표시됩니다</p>
          </div>
        )}

        <div className="form-group">
          <label>메모</label>
          <textarea
            name="memo"
            value={form.memo}
            onChange={handleChange}
            placeholder="추가 메모를 입력하세요"
            rows={4}
          />
        </div>

        {/* 체크박스 옵션들 */}
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="is_lunar"
              checked={form.is_lunar}
              onChange={handleChange}
            />
            <span>음력</span>
          </label>
          <p className="hint">음력 날짜인 경우 체크 (자동으로 양력 변환 표시)</p>
        </div>

        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="is_yearly"
              checked={form.is_yearly}
              onChange={handleChange}
              disabled={form.is_range}
            />
            <span>매년 반복</span>
          </label>
          <p className="hint">생일, 기념일 등 매년 반복되는 이벤트에 체크</p>
        </div>

        <div className="form-group">
          <label>색상</label>
          <div className="color-selector">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                className={`color-btn ${form.color === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setForm({ ...form, color })}
              />
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={() => navigate('/calendar')}>
            취소
          </button>
          <button type="submit" className="submit-btn">저장</button>
        </div>
      </form>
    </div>
  );
};

export default CalendarInsertPage;
