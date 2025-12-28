import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api'; 

function CookingPage() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  
  // 검색 필터 상태 (keyword -> name, description 분리)
  const [filters, setFilters] = useState({
    chef: 'all',
    name: '',          // 이름 검색어
    description: '',   // 내용 검색어
    cooking_type: ''
  });

  const [cookingCodes, setCookingCodes] = useState([]);

  useEffect(() => {
    fetchCodes();
    fetchRecipes();
  }, []);

  // 탭(chef)이나 종류(cooking_type) 변경 시에는 즉시 재검색
  useEffect(() => {
    fetchRecipes();
  }, [filters.chef, filters.cooking_type]);

  const fetchCodes = async () => {
    try {
      const res = await apiClient.get('/code/group/COOKING');
      setCookingCodes(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchRecipes = async () => {
    try {
      const params = {};
      
      if (filters.chef && filters.chef !== 'all') params.chef = filters.chef;
      if (filters.cooking_type && filters.cooking_type !== '전체') params.cooking_type = filters.cooking_type;
      
      // [수정] 분리된 파라미터 전송
      if (filters.name) params.name = filters.name;
      if (filters.description) params.description = filters.description;

      const res = await apiClient.get('/cooking', { params });
      setRecipes(res.data);
    } catch (err) { console.error(err); }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') fetchRecipes();
  };

  return (
    <div className="content-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>👨‍🍳 요리 도감</h1>
        <button 
          onClick={() => navigate('/cooking/new')} 
          style={{ padding: '10px 20px', background: '#20c997', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          + 요리 등록
        </button>
      </div>

      {/* --- 검색 필터 영역 --- */}
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #eee' }}>
        
        {/* 상단: 탭 & 드롭다운 */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '5px' }}>
            {[
              { id: 'all', label: '전체 보기' },
              { id: 'husband', label: '👨‍💼 남편' },
              { id: 'wife', label: '👩‍💼 아내' }
            ].map(tab => (
               <button 
                 key={tab.id} 
                 onClick={() => setFilters(prev => ({ ...prev, chef: tab.id }))} 
                 style={{ 
                   padding: '8px 15px', 
                   background: filters.chef === tab.id ? '#4dabf7' : '#fff', 
                   color: filters.chef === tab.id ? 'white' : '#495057',
                   border: filters.chef === tab.id ? 'none' : '1px solid #ced4da', 
                   borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s'
                 }}
               >
                 {tab.label}
               </button>
            ))}
          </div>

          <select 
            name="cooking_type" 
            value={filters.cooking_type} 
            onChange={handleFilterChange} 
            style={{ ...inputStyle, minWidth: '120px' }}
          >
            <option value="">전체 종류</option>
            {cookingCodes.map(code => (
              <option key={code.code_id} value={code.code_name}>{code.code_name}</option>
            ))}
          </select>
        </div>

        {/* 하단: 검색 입력창들 */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input 
            name="name" 
            value={filters.name} 
            onChange={handleFilterChange} 
            onKeyDown={handleKeyDown}
            placeholder="요리 이름으로 검색" 
            style={{ ...inputStyle, flex: 1 }} 
          />
          <input 
            name="description" 
            value={filters.description} 
            onChange={handleFilterChange} 
            onKeyDown={handleKeyDown}
            placeholder="내용(설명)으로 검색" 
            style={{ ...inputStyle, flex: 1.5 }} 
          />
          <button onClick={fetchRecipes} style={{ padding: '10px 20px', background: '#343a40', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            🔍 검색
          </button>
        </div>
      </div>

      {/* --- 목록 영역 --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
        {recipes.map((recipe) => (
          <div 
            key={recipe._id} 
            onClick={() => navigate(`/cooking/${recipe._id}`)}
            style={{ 
              border: '1px solid #eee', borderRadius: '12px', cursor: 'pointer', overflow: 'hidden', 
              background: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', transition: 'transform 0.2s' 
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ height: '160px', overflow: 'hidden', background: '#f1f3f5', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
               {recipe.image_url ? (
                 <img src={recipe.image_url} alt={recipe.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
               ) : (
                 <span style={{ fontSize: '40px' }}>🍳</span>
               )}
               <span style={{ 
                 position: 'absolute', top: '10px', right: '10px', 
                 background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '12px' 
               }}>
                 {recipe.chef === 'husband' ? '남편' : '아내'}
               </span>
            </div>
            
            <div style={{ padding: '15px' }}>
              <h3 style={{ margin: '0 0 5px', fontSize: '18px' }}>
                {recipe.name} 
                {recipe.cooking_type && (
                  <span style={{ 
                    fontSize: '12px', marginLeft: '8px', padding: '2px 6px', 
                    background: '#e7f5ff', color: '#1c7ed6', borderRadius: '4px', verticalAlign: 'middle', fontWeight: 'normal' 
                  }}>
                    {recipe.cooking_type}
                  </span>
                )}
              </h3>
              <p style={{ margin: 0, color: '#868e96', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {recipe.description}
              </p>
            </div>
          </div>
        ))}
        {recipes.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#adb5bd' }}>
            검색 결과가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = { padding: '10px', border: '1px solid #ced4da', borderRadius: '5px' };

export default CookingPage;
