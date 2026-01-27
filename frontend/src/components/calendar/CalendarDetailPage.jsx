import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../api';
import './Calendar.scss';

const CalendarDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    title: '',
    date: '',
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

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await apiClient.get(`/calendar/${id}`);
        setEvent(res.data);
        setForm({
          title: res.data.title,
          date: res.data.date,
          end_date: res.data.end_date || '',
          memo: res.data.memo || '',
          is_yearly: res.data.is_yearly,
          is_lunar: res.data.is_lunar || false,
          is_range: res.data.is_range || false,
          color: res.data.color || '#6c5ce7'
        });
      } catch (err) {
        console.error(err);
        alert('이벤트를 찾을 수 없습니다.');
        navigate('/calendar');
      }
    };
    fetchEvent();
  }, [id, navigate]);

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

  const handleSave = async () => {
    if (!form.title.trim()) {
      alert('제목을 입력하세요.');
      return;
    }

    const submitData = {
      ...form,
      end_date: form.is_range ? (form.end_date || null) : null
    };

    try {
      await apiClient.put(`/calendar/${id}`, submitData);
      setEvent({ ...event, ...submitData });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('수정 실패');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await apiClient.delete(`/calendar/${id}`);
      navigate('/calendar');
    } catch (err) {
      console.error(err);
      alert('삭제 실패');
    }
  };

  const formatDateDisplay = () => {
    if (!event) return '';
    if (event.is_range) {
      const endStr = event.end_date ? event.end_date : '미정';
      return `${event.date} ~ ${endStr}`;
    }
    return event.date;
  };

  if (!event) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="calendar-detail-page">
      {isEditing ? (
        <>
          <h1>이벤트 수정</h1>
          <form className="calendar-form">
            <div className="form-group">
              <label>제목 *</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
              />
            </div>

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
            </div>

            <div className="form-group">
              <label>{form.is_range ? '시작일 *' : '날짜 *'}</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
              />
            </div>

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
                rows={4}
              />
            </div>

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
              <button type="button" className="cancel-btn" onClick={() => setIsEditing(false)}>
                취소
              </button>
              <button type="button" className="submit-btn" onClick={handleSave}>
                저장
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <div className="detail-header">
            <div
              className="color-indicator"
              style={{ backgroundColor: event.color || '#6c5ce7' }}
            />
            <h1>{event.title}</h1>
            <div className="badges">
              {event.is_yearly && <span className="badge yearly">매년 반복</span>}
              {event.is_lunar && <span className="badge lunar">음력</span>}
              {event.is_range && <span className="badge range">기간</span>}
            </div>
          </div>

          <div className="detail-content">
            <div className="detail-row">
              <span className="label">날짜</span>
              <span className="value">{formatDateDisplay()}</span>
            </div>

            {event.memo && (
              <div className="detail-row">
                <span className="label">메모</span>
                <p className="value memo">{event.memo}</p>
              </div>
            )}
          </div>

          <div className="detail-actions">
            <button className="back-btn" onClick={() => navigate('/calendar')}>
              목록으로
            </button>
            <button className="edit-btn" onClick={() => setIsEditing(true)}>
              수정
            </button>
            <button className="delete-btn" onClick={handleDelete}>
              삭제
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CalendarDetailPage;
