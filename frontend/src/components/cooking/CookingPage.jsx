import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api';
import './Cooking.scss';

function CookingPage() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);

  const [filters, setFilters] = useState({
    chef: 'all',
    name: '',
    description: '',
    cooking_type: ''
  });

  const [cookingCodes, setCookingCodes] = useState([]);

  useEffect(() => {
    fetchCodes();
    fetchRecipes();
  }, []);

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
    <div className="content-box cooking-page">
      <div className="page-header">
        <h1>👨‍🍳 요리 도감</h1>
        <button onClick={() => navigate('/cooking/new')} className="btn-add">
          + 요리 등록
        </button>
      </div>

      {/* 검색 필터 */}
      <div className="filter-box">
        <div className="filter-top">
          <div className="tab-group">
            {[
              { id: 'all', label: '전체 보기' },
              { id: 'husband', label: '👨‍💼 남편' },
              { id: 'wife', label: '👩‍💼 아내' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilters(prev => ({ ...prev, chef: tab.id }))}
                className={`tab-btn ${filters.chef === tab.id ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            name="cooking_type"
            value={filters.cooking_type}
            onChange={handleFilterChange}
            className="filter-select"
          >
            <option value="">전체 종류</option>
            {cookingCodes.map(code => (
              <option key={code.code_id} value={code.code_name}>{code.code_name}</option>
            ))}
          </select>
        </div>

        <div className="filter-bottom">
          <input
            name="name"
            value={filters.name}
            onChange={handleFilterChange}
            onKeyDown={handleKeyDown}
            placeholder="요리 이름으로 검색"
            className="filter-input"
          />
          <input
            name="description"
            value={filters.description}
            onChange={handleFilterChange}
            onKeyDown={handleKeyDown}
            placeholder="내용(설명)으로 검색"
            className="filter-input"
          />
          <button onClick={fetchRecipes} className="btn-search">
            🔍 검색
          </button>
        </div>
      </div>

      {/* 목록 */}
      <div className="recipe-grid">
        {recipes.map((recipe) => (
          <div
            key={recipe._id}
            onClick={() => navigate(`/cooking/${recipe._id}`)}
            className="recipe-card"
          >
            <div className="card-image">
              {recipe.image_url ? (
                <img src={recipe.image_url} alt={recipe.name} />
              ) : (
                <span className="placeholder">🍳</span>
              )}
              <span className="chef-badge">
                {recipe.chef === 'husband' ? '남편' : '아내'}
              </span>
            </div>

            <div className="card-body">
              <h3>
                {recipe.name}
                {recipe.cooking_type && (
                  <span className="type-badge">{recipe.cooking_type}</span>
                )}
              </h3>
              <p>{recipe.description}</p>
            </div>
          </div>
        ))}
        {recipes.length === 0 && (
          <div className="empty-message">검색 결과가 없습니다.</div>
        )}
      </div>
    </div>
  );
}

export default CookingPage;
