import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function CookingPage() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [activeTab, setActiveTab] = useState('husband');

  useEffect(() => {
    axios.get('http://localhost:8000/api/cooking').then(res => setRecipes(res.data));
  }, []);

  const filteredRecipes = recipes.filter(item => item.chef === activeTab);

  return (
    <div className="content-box">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>👨‍🍳 요리 도감</h1>
        <button onClick={() => navigate('/cooking/new')} style={{ padding: '10px', background: '#20c997', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>+ 등록</button>
      </div>

      <div style={{ display: 'flex', gap: '10px', margin: '20px 0' }}>
        {['husband', 'wife'].map(role => (
           <button key={role} onClick={() => setActiveTab(role)} style={{ flex: 1, padding: '10px', background: activeTab === role ? '#4dabf7' : '#eee', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>{role}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
        {filteredRecipes.map((recipe) => (
          <div 
            key={recipe.id} 
            // [중요] 클릭 시 상세 페이지로 이동 (ID 포함)
            onClick={() => navigate(`/cooking/${recipe._id}`)}
            style={{ border: '1px solid #eee', borderRadius: '10px', cursor: 'pointer', overflow: 'hidden' }}
          >
            <img src={recipe.image_url || "https://via.placeholder.com/150"} style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
            <div style={{ padding: '10px' }}>
              <h3>{recipe.name}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default CookingPage;
