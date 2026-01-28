import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api';

function FamilyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [member, setMember] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
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
    // 상세 정보 로드
    apiClient.get(`/family/${id}`)
      .then(res => {
        setMember(res.data);
        setEditData(res.data);
      })
      .catch(err => console.error(err));

    // 기존 구성원 목록 로드
    apiClient.get('/family')
      .then(res => setExistingMembers(res.data))
      .catch(err => console.error(err));
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      await apiClient.delete(`/family/${id}`);
      alert("삭제되었습니다.");
      navigate('/family');
    }
  };

  const handleUpdate = async () => {
    const submitData = {
      ...editData,
      parent_id: editData.parent_id || null,
      spouse_id: editData.spouse_id || null,
      birth_date: editData.birth_date || null,
      memo: editData.memo || null
    };

    await apiClient.put(`/family/${id}`, submitData);
    setMember(editData);
    setIsEditing(false);
    alert("수정되었습니다!");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'generation') {
      setEditData({ ...editData, [name]: parseInt(value, 10) });
    } else {
      setEditData({ ...editData, [name]: value });
    }
  };

  // 배우자 정보 가져오기
  const getSpouseInfo = () => {
    if (!member?.spouse_id) return null;
    return existingMembers.find(m => m._id === member.spouse_id);
  };

  // 부모 정보 가져오기
  const getParentInfo = () => {
    if (!member?.parent_id) return null;
    return existingMembers.find(m => m._id === member.parent_id);
  };

  if (!member) return <div>로딩 중...</div>;

  const spouse = getSpouseInfo();
  const parent = getParentInfo();

  return (
    <div className="content-box" style={{ maxWidth: '700px', margin: '0 auto' }}>

      {isEditing ? (
        /* --- [수정 모드] --- */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h2>✏️ 가족 구성원 수정</h2>

          <label>
            이름
            <input name="name" value={editData.name || ''} onChange={handleChange} style={inputStyle} />
          </label>

          <label>
            성별
            <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={editData.gender === 'male'}
                  onChange={handleChange}
                />
                👨 남성
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={editData.gender === 'female'}
                  onChange={handleChange}
                />
                👩 여성
              </label>
            </div>
          </label>

          <label>
            생년월일
            <input type="date" name="birth_date" value={editData.birth_date || ''} onChange={handleChange} style={inputStyle} />
          </label>

          <label>
            소속
            <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="radio"
                  name="side"
                  value="husband"
                  checked={editData.side === 'husband'}
                  onChange={handleChange}
                />
                👨 친가
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="radio"
                  name="side"
                  value="wife"
                  checked={editData.side === 'wife'}
                  onChange={handleChange}
                />
                👩 외가
              </label>
            </div>
          </label>

          <label>
            관계
            <select name="relation_type" value={editData.relation_type || ''} onChange={handleChange} style={inputStyle}>
              {relationTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>

          <label>
            세대
            <select name="generation" value={editData.generation} onChange={handleChange} style={inputStyle}>
              {generationOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>

          <label>
            부모
            <select name="parent_id" value={editData.parent_id || ''} onChange={handleChange} style={inputStyle}>
              <option value="">선택 안함</option>
              {existingMembers
                .filter(m => m._id !== id && m.generation > editData.generation)
                .map(m => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.relation_type})
                  </option>
                ))}
            </select>
          </label>

          <label>
            배우자
            <select name="spouse_id" value={editData.spouse_id || ''} onChange={handleChange} style={inputStyle}>
              <option value="">선택 안함</option>
              {existingMembers
                .filter(m => m._id !== id && m.generation === editData.generation && m.gender !== editData.gender)
                .map(m => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.relation_type})
                  </option>
                ))}
            </select>
          </label>

          <label>
            메모
            <textarea name="memo" value={editData.memo || ''} onChange={handleChange} style={{ ...inputStyle, minHeight: '80px' }} />
          </label>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleUpdate} style={{ ...btnBase, background: '#4dabf7', color: 'white' }}>저장</button>
            <button onClick={() => setIsEditing(false)} style={{ ...btnBase, background: '#ccc' }}>취소</button>
          </div>
        </div>
      ) : (
        /* --- [조회 모드] --- */
        <div>
          {/* 헤더 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '30px',
            padding: '30px',
            background: member.gender === 'male' ? '#e7f5ff' : '#fff0f6',
            borderRadius: '16px'
          }}>
            <div style={{ fontSize: '64px' }}>
              {member.gender === 'male' ? '👨' : '👩'}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '28px' }}>{member.name}</h1>
              <div style={{ color: '#868e96', marginTop: '5px' }}>
                {member.relation_type} · {member.side === 'husband' ? '친가' : '외가'}
              </div>
            </div>
          </div>

          {/* 상세 정보 */}
          <div style={{
            background: '#f8f9fa',
            padding: '25px',
            borderRadius: '12px',
            marginBottom: '20px'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#495057' }}>기본 정보</h3>

            <div style={{ display: 'grid', gap: '15px' }}>
              <InfoRow label="생년월일" value={member.birth_date || '-'} />
              <InfoRow label="성별" value={member.gender === 'male' ? '남성' : '여성'} />
              <InfoRow label="소속" value={member.side === 'husband' ? '친가 (남편측)' : '외가 (아내측)'} />
              <InfoRow label="관계" value={member.relation_type} />
              <InfoRow label="세대" value={`${member.generation}세대`} />

              {parent && (
                <InfoRow
                  label="부모"
                  value={
                    <span
                      onClick={() => navigate(`/family/${parent._id}`)}
                      style={{ color: '#4dabf7', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {parent.name} ({parent.relation_type})
                    </span>
                  }
                />
              )}

              {spouse && (
                <InfoRow
                  label="배우자"
                  value={
                    <span
                      onClick={() => navigate(`/family/${spouse._id}`)}
                      style={{ color: '#e91e63', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      ♥ {spouse.name} ({spouse.relation_type})
                    </span>
                  }
                />
              )}

              {member.memo && (
                <InfoRow label="메모" value={member.memo} />
              )}
            </div>
          </div>

          {/* 버튼 영역 */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={() => setIsEditing(true)} style={{ ...btnBase, background: '#fab005', color: 'white' }}>수정</button>
            <button onClick={handleDelete} style={{ ...btnBase, background: '#ff6b6b', color: 'white' }}>삭제</button>
            <button onClick={() => navigate('/family')} style={{ ...btnBase, background: '#f1f3f5' }}>목록으로</button>
          </div>
        </div>
      )}
    </div>
  );
}

// 정보 행 컴포넌트
const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', borderBottom: '1px solid #e9ecef', paddingBottom: '10px' }}>
    <div style={{ width: '100px', fontWeight: 'bold', color: '#495057' }}>{label}</div>
    <div style={{ flex: 1 }}>{value}</div>
  </div>
);

const inputStyle = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', marginTop: '5px' };
const btnBase = { padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };

export default FamilyDetailPage;
