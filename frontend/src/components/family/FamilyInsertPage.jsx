import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api';

function FamilyInsertPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    gender: 'male',
    birth_date: '',
    side: 'husband',
    relation_type: '본인',
    parent_id: '',
    spouse_id: '',
    generation: 0,
    memo: ''
  });

  const [existingMembers, setExistingMembers] = useState([]);

  // 관계 타입 목록
  const relationTypes = [
    '본인', '배우자',
    '부', '모',
    '조부', '조모', '외조부', '외조모',
    '형', '오빠', '누나', '언니', '남동생', '여동생',
    '아들', '딸',
    '삼촌', '이모', '고모', '외삼촌',
    '사촌', '조카',
    '시아버지', '시어머니', '장인', '장모',
    '기타'
  ];

  // 세대 옵션
  const generationOptions = [
    { value: 3, label: '증조부모 (3세대)' },
    { value: 2, label: '조부모 (2세대)' },
    { value: 1, label: '부모 (1세대)' },
    { value: 0, label: '본인 (0세대)' },
    { value: -1, label: '자녀 (-1세대)' },
    { value: -2, label: '손자녀 (-2세대)' }
  ];

  useEffect(() => {
    // 기존 구성원 목록 로드 (부모/배우자 선택용)
    apiClient.get('/family')
      .then(res => setExistingMembers(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // generation은 숫자로 변환
    if (name === 'generation') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value, 10) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 빈 문자열을 null로 변환
    const submitData = {
      ...formData,
      parent_id: formData.parent_id || null,
      spouse_id: formData.spouse_id || null,
      birth_date: formData.birth_date || null,
      memo: formData.memo || null
    };

    try {
      await apiClient.post('/family', submitData);
      alert("등록 완료!");
      navigate('/family');
    } catch (err) {
      alert("오류가 발생했습니다.");
      console.error(err);
    }
  };

  return (
    <div className="content-box" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1>👨‍👩‍👧‍👦 가족 구성원 등록</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

        {/* 이름 */}
        <label>
          이름 <span style={{ color: 'red' }}>*</span>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="이름을 입력하세요"
            style={inputStyle}
          />
        </label>

        {/* 성별 */}
        <label>
          성별 <span style={{ color: 'red' }}>*</span>
          <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="gender"
                value="male"
                checked={formData.gender === 'male'}
                onChange={handleChange}
              />
              👨 남성
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="gender"
                value="female"
                checked={formData.gender === 'female'}
                onChange={handleChange}
              />
              👩 여성
            </label>
          </div>
        </label>

        {/* 생년월일 */}
        <label>
          생년월일
          <input
            type="date"
            name="birth_date"
            value={formData.birth_date}
            onChange={handleChange}
            style={inputStyle}
          />
        </label>

        {/* 소속 (친가/외가) */}
        <label>
          소속 <span style={{ color: 'red' }}>*</span>
          <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="side"
                value="husband"
                checked={formData.side === 'husband'}
                onChange={handleChange}
              />
              👨 친가 (남편측)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="side"
                value="wife"
                checked={formData.side === 'wife'}
                onChange={handleChange}
              />
              👩 외가 (아내측)
            </label>
          </div>
        </label>

        {/* 관계 */}
        <label>
          관계 <span style={{ color: 'red' }}>*</span>
          <select
            name="relation_type"
            value={formData.relation_type}
            onChange={handleChange}
            style={inputStyle}
          >
            {relationTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        {/* 세대 */}
        <label>
          세대 <span style={{ color: 'red' }}>*</span>
          <select
            name="generation"
            value={formData.generation}
            onChange={handleChange}
            style={inputStyle}
          >
            {generationOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>

        {/* 부모 선택 */}
        <label>
          부모 (트리 연결용)
          <select
            name="parent_id"
            value={formData.parent_id}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="">선택 안함</option>
            {existingMembers
              .filter(m => m.generation > formData.generation) // 윗세대만
              .map(member => (
                <option key={member._id} value={member._id}>
                  {member.name} ({member.relation_type}, {member.side === 'husband' ? '친가' : '외가'})
                </option>
              ))}
          </select>
        </label>

        {/* 배우자 선택 */}
        <label>
          배우자
          <select
            name="spouse_id"
            value={formData.spouse_id}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="">선택 안함</option>
            {existingMembers
              .filter(m => m.generation === formData.generation && m.gender !== formData.gender)
              .map(member => (
                <option key={member._id} value={member._id}>
                  {member.name} ({member.relation_type})
                </option>
              ))}
          </select>
        </label>

        {/* 메모 */}
        <label>
          메모
          <textarea
            name="memo"
            value={formData.memo}
            onChange={handleChange}
            placeholder="추가 정보를 입력하세요"
            style={textareaStyle}
          />
        </label>

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button type="submit" style={btnStyle}>등록</button>
          <button
            type="button"
            onClick={() => navigate('/family')}
            style={{ ...btnStyle, background: '#868e96' }}
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px',
  marginTop: '5px',
  border: '1px solid #ddd',
  borderRadius: '5px',
  fontSize: '14px'
};

const textareaStyle = {
  ...inputStyle,
  minHeight: '80px',
  resize: 'vertical'
};

const btnStyle = {
  flex: 1,
  padding: '15px',
  background: '#20c997',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: 'bold'
};

export default FamilyInsertPage;
