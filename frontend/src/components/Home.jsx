import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// --- [반응형 CSS] ---
const responsiveStyles = `
  .home-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 20px;
    font-family: 'Pretendard', sans-serif;
    color: #333;
  }

  .home-hero {
    background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%);
    border-radius: 24px;
    padding: 60px 40px;
    text-align: center;
    color: #fff;
    box-shadow: 0 10px 30px rgba(255, 105, 135, 0.3);
    margin-bottom: 50px;
    position: relative;
    overflow: hidden;
  }

  .home-hero-title {
    font-size: 3.5rem;
    font-weight: 800;
    margin: 0 0 20px 0;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
  }

  .home-dday-box {
    display: inline-flex;
    gap: 30px;
    background: rgba(255,255,255,0.2);
    backdrop-filter: blur(10px);
    padding: 20px 40px;
    border-radius: 50px;
    font-size: 1.2rem;
    font-weight: 600;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  }

  .home-next-trip {
    margin-top: 30px;
    background: #fff;
    color: #333;
    padding: 15px 30px;
    border-radius: 30px;
    display: inline-block;
    font-weight: bold;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    cursor: pointer;
  }

  .home-section-title {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: #2c3e50;
    border-left: 5px solid #ff9a9e;
    padding-left: 15px;
  }

  .home-scroll-container {
    display: flex;
    gap: 20px;
    overflow-x: auto;
    padding: 10px 5px 30px 5px;
    scroll-behavior: smooth;
  }

  .home-card {
    min-width: 280px;
    height: 350px;
    border-radius: 20px;
    background: #fff;
    box-shadow: 0 10px 20px rgba(0,0,0,0.05);
    transition: transform 0.3s, box-shadow 0.3s;
    cursor: pointer;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .home-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 30px rgba(0,0,0,0.1);
  }

  .home-card-image {
    flex: 2;
    background-color: #f8f9fa;
    background-size: cover;
    background-position: center;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 4rem;
  }

  .home-card-content {
    flex: 1;
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: #fff;
  }

  .home-badge {
    position: absolute;
    top: 15px;
    right: 15px;
    background: rgba(0,0,0,0.7);
    color: #fff;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: bold;
  }

  .home-rating {
    color: #f1c40f;
    font-size: 1.2rem;
    font-weight: bold;
  }

  .home-recipe-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 25px;
  }

  /* 모바일 반응형 (768px 이하) */
  @media (max-width: 768px) {
    .home-container {
      padding: 20px 15px;
    }

    .home-hero {
      padding: 40px 20px;
      border-radius: 16px;
      margin-bottom: 30px;
    }

    .home-hero-title {
      font-size: 2rem;
    }

    .home-dday-box {
      flex-direction: column;
      gap: 10px;
      padding: 15px 25px;
      font-size: 1rem;
      border-radius: 20px;
    }

    .home-next-trip {
      padding: 12px 20px;
      font-size: 0.9rem;
      border-radius: 20px;
    }

    .home-next-trip .trip-date {
      display: block;
      margin-top: 5px;
      margin-left: 0 !important;
    }

    .home-section-title {
      font-size: 1.4rem;
      margin-bottom: 15px;
    }

    .home-section-title .subtitle {
      display: none;
    }

    .home-scroll-container {
      gap: 12px;
      padding: 10px 0 20px 0;
    }

    .home-card {
      min-width: 200px;
      height: 280px;
    }

    .home-card-image {
      font-size: 3rem;
    }

    .home-card-content {
      padding: 15px;
    }

    .home-card-content h3 {
      font-size: 1rem !important;
    }

    .home-badge {
      top: 10px;
      right: 10px;
      padding: 4px 10px;
      font-size: 0.7rem;
    }

    .home-recipe-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .home-recipe-grid .home-card {
      min-width: unset;
      height: 220px;
    }
  }

  /* 작은 모바일 (480px 이하) */
  @media (max-width: 480px) {
    .home-hero-title {
      font-size: 1.7rem;
    }

    .home-dday-box {
      font-size: 0.9rem;
      padding: 12px 20px;
    }

    .home-section-title {
      font-size: 1.2rem;
    }

    .home-card {
      min-width: 160px;
      height: 240px;
    }

    .home-recipe-grid {
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .home-recipe-grid .home-card {
      height: 200px;
    }
  }
`;

function Home() {
  const [data, setData] = useState({ liquors: [], reviews: [], recipes: [], travel: null });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  // 날짜 계산 (2022-11-30 / 2025-10-18)
  const calculateDDay = () => {
    const start = new Date('2022-11-30');
    const wedding = new Date('2025-10-18');
    const today = new Date();
    
    start.setHours(0,0,0,0);
    wedding.setHours(0,0,0,0);
    today.setHours(0,0,0,0);

    const diffStart = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
    const diffWedding = Math.floor((wedding - today) / (1000 * 60 * 60 * 24));
    
    return { diffStart, diffWedding };
  };
  const { diffStart, diffWedding } = calculateDDay();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [liquorRes, reviewRes, cookingRes, travelRes] = await Promise.all([
          apiClient.get('/liquor'),
          apiClient.get('/review'),
          apiClient.get('/cooking'),
          apiClient.get('/travel')
        ]);

        // 데이터 가공 (배열 여부 확인 후 처리)
        const liquors = Array.isArray(liquorRes.data) ? liquorRes.data : [];
        const reviews = Array.isArray(reviewRes.data) ? reviewRes.data : [];
        const recipes = Array.isArray(cookingRes.data) ? cookingRes.data : [];
        const travels = Array.isArray(travelRes.data) ? travelRes.data : [];

        setData({
          liquors: liquors.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5),
          reviews: reviews.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5),
          recipes: recipes.reverse().slice(0, 6), // 최신 6개
          travel: travels
                  .filter(t => new Date(t.start_date) >= new Date(new Date().setHours(0,0,0,0)))
                  .sort((a, b) => a.start_date.localeCompare(b.start_date))[0] || null
        });
      } catch (e) {
          console.error("데이터 로딩 실패:", e);
      } finally {
          setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 카드 클릭 핸들러 (수정됨: ID 안전하게 추출)
  const handleCardClick = (path, id) => {
    if (!id) {
        console.error("이동할 ID가 없습니다.");
        return;
    }
    
    // 로그인 체크 (필요하면 활성화)
    // if (!user) {
    //   if(confirm("로그인이 필요한 페이지입니다. 이동하시겠습니까?")) navigate('/login');
    //   return;
    // }
    
    navigate(`${path}/${id}`);
  };

  // 배경 그라디언트 랜덤 생성
  const getBgStyle = () => {
    const colors = [
        'linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)',
        'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)',
        'linear-gradient(120deg, #fccb90 0%, #d57eeb 100%)',
        'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)'
    ];
    return { background: colors[Math.floor(Math.random() * colors.length)] };
  };

  if (loading) return <div style={{textAlign:'center', padding:'100px'}}>🏡 Sweet Home 로딩 중...</div>;

  return (
    <>
      <style>{responsiveStyles}</style>
      <div className="home-container">
        {/* 1. 히어로 배너 */}
        <div className="home-hero">
          <div className="home-hero-title">Sweet Home 🏡</div>
          <div className="home-dday-box">
              <span>❤️ +{diffStart}일</span>
              <span>
                  💍 Wedding
                  {diffWedding > 0
                    ? ` D-${diffWedding}`
                    : diffWedding === 0
                      ? ` D-Day`
                      : ` D+${Math.abs(diffWedding)}`}
              </span>
          </div>
          {data.travel && (
               <div className="home-next-trip"
                    onClick={() => handleCardClick('/travel', data.travel._id || data.travel.id)}>
                   ✈️ Next Trip: {data.travel.title} <span className="trip-date" style={{color:'#888', marginLeft:'10px'}}>({data.travel.start_date})</span>
               </div>
          )}
        </div>

        {/* 2. 명예의 전당 (술) - 가로 스크롤 */}
        <section style={{marginBottom: '60px'}}>
            <div className="home-section-title">🍷 Hall of Fame <span className="subtitle" style={{fontSize:'1rem', color:'#888', fontWeight:'normal', marginLeft:'10px'}}>최고의 술</span></div>
            <div className="home-scroll-container hide-scrollbar">
                {data.liquors.map((item, idx) => (
                    <div key={item._id || item.id} className="home-card"
                         onClick={() => handleCardClick('/liquor', item._id || item.id)}>

                        <div className="home-card-image" style={getBgStyle()}>
                            🍷
                            <span className="home-badge">Top {idx+1}</span>
                        </div>
                        <div className="home-card-content">
                            <h3 style={{margin:'0 0 10px 0', fontSize:'1.1rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                {item.name_korean || item.name}
                            </h3>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <span className="home-rating">★ {item.rating}</span>
                                <span style={{color:'#888', fontSize:'0.9rem'}}>{item.type || 'Alcohol'}</span>
                            </div>
                        </div>
                    </div>
                ))}
                {data.liquors.length === 0 && <div style={{padding:'20px'}}>등록된 술이 없습니다.</div>}
            </div>
        </section>

        {/* 3. 요리 갤러리 - 그리드 레이아웃 */}
        <section style={{marginBottom: '60px'}}>
            <div className="home-section-title">🍳 Our Kitchen <span className="subtitle" style={{fontSize:'1rem', color:'#888', fontWeight:'normal', marginLeft:'10px'}}>최근 요리</span></div>
            <div className="home-recipe-grid">
                {data.recipes.map(item => (
                    <div key={item._id || item.id} className="home-card"
                         onClick={() => handleCardClick('/cooking', item._id || item.id)}>

                         <div className="home-card-image" style={getBgStyle()}>🥘</div>
                         <div className="home-card-content">
                             <h3 style={{margin:'0 0 10px 0', fontSize:'1.2rem'}}>{item.title}</h3>
                             <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
                                 <span style={{background:'#eee', padding:'3px 8px', borderRadius:'10px', fontSize:'0.8rem'}}>👨‍🍳 {item.chef}</span>
                                 <span style={{color:'#aaa', fontSize:'0.8rem'}}>
                                     {item.date ? item.date.substring(0,10) : ''}
                                 </span>
                             </div>
                         </div>
                    </div>
                ))}
            </div>
        </section>

      </div>
    </>
  );
}

export default Home;
