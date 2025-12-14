import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// --- [스타일 정의] ---
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: "'Pretendard', sans-serif",
    color: '#333',
  },
  hero: {
    background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
    borderRadius: '24px',
    padding: '60px 40px',
    textAlign: 'center',
    color: '#fff',
    boxShadow: '0 10px 30px rgba(255, 105, 135, 0.3)',
    marginBottom: '50px',
    position: 'relative',
    overflow: 'hidden',
  },
  heroTitle: {
    fontSize: '3.5rem',
    fontWeight: '800',
    margin: '0 0 20px 0',
    textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
  },
  dDayBox: {
    display: 'inline-flex',
    gap: '30px',
    background: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(10px)',
    padding: '20px 40px',
    borderRadius: '50px',
    fontSize: '1.2rem',
    fontWeight: '600',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#2c3e50',
    borderLeft: '5px solid #ff9a9e',
    paddingLeft: '15px',
  },
  scrollContainer: {
    display: 'flex',
    gap: '20px',
    overflowX: 'auto',
    padding: '10px 5px 30px 5px',
    scrollBehavior: 'smooth',
  },
  card: {
    minWidth: '280px',
    height: '350px',
    borderRadius: '20px',
    background: '#fff',
    boxShadow: '0 10px 20px rgba(0,0,0,0.05)',
    transition: 'transform 0.3s, box-shadow 0.3s',
    cursor: 'pointer',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  cardImage: {
    flex: '2',
    backgroundColor: '#f8f9fa',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '4rem',
  },
  cardContent: {
    flex: '1',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    background: '#fff',
  },
  badge: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    background: 'rgba(0,0,0,0.7)',
    color: '#fff',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
  },
  rating: {
    color: '#f1c40f',
    fontSize: '1.2rem',
    fontWeight: 'bold',
  }
};

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

        // 데이터 가공
        setData({
          liquors: liquorRes.data.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5),
          reviews: reviewRes.data.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5),
          recipes: cookingRes.data.reverse().slice(0, 6), // 최신 6개
          travel: travelRes.data
                  .filter(t => new Date(t.start_date) >= new Date(new Date().setHours(0,0,0,0)))
                  .sort((a, b) => a.start_date.localeCompare(b.start_date))[0]
        });
      } catch (e) { 
          console.error("데이터 로딩 실패 (백엔드 Depends 문제일 수 있음)", e); 
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
    <div style={styles.container}>
      {/* 1. 히어로 배너 */}
      <div style={styles.hero}>
        <div style={styles.heroTitle}>Sweet Home 🏡</div>
        <div style={styles.dDayBox}>
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
             <div style={{marginTop:'30px', background:'#fff', color:'#333', padding:'15px 30px', borderRadius:'30px', display:'inline-block', fontWeight:'bold', boxShadow:'0 5px 15px rgba(0,0,0,0.1)', cursor:'pointer'}}
                  onClick={() => handleCardClick('/travel', data.travel._id || data.travel.id)}>
                 ✈️ Next Trip: {data.travel.title} <span style={{color:'#888', marginLeft:'10px'}}>({data.travel.start_date})</span>
             </div>
        )}
      </div>

      {/* 2. 명예의 전당 (술) - 가로 스크롤 */}
      <section style={{marginBottom: '60px'}}>
          <div style={styles.sectionTitle}>🍷 Hall of Fame <span style={{fontSize:'1rem', color:'#888', fontWeight:'normal', marginLeft:'10px'}}>최고의 술</span></div>
          <div style={styles.scrollContainer} className="hide-scrollbar">
              {data.liquors.map((item, idx) => (
                  <div key={item._id || item.id} style={styles.card} 
                       onClick={() => handleCardClick('/liquor', item._id || item.id)}>
                      
                      <div style={{...styles.cardImage, ...getBgStyle()}}>
                          🍷
                          <span style={styles.badge}>Top {idx+1}</span>
                      </div>
                      <div style={styles.cardContent}>
                          <h3 style={{margin:'0 0 10px 0', fontSize:'1.1rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                              {item.name_korean || item.name}
                          </h3>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                              <span style={styles.rating}>★ {item.rating}</span>
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
          <div style={styles.sectionTitle}>🍳 Our Kitchen <span style={{fontSize:'1rem', color:'#888', fontWeight:'normal', marginLeft:'10px'}}>최근 요리</span></div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'25px'}}>
              {data.recipes.map(item => (
                  <div key={item._id || item.id} style={{...styles.card, height:'320px'}} 
                       onClick={() => handleCardClick('/cooking', item._id || item.id)}>
                       
                       <div style={{...styles.cardImage, ...getBgStyle()}}>🥘</div>
                       <div style={styles.cardContent}>
                           <h3 style={{margin:'0 0 10px 0', fontSize:'1.2rem'}}>{item.title}</h3>
                           <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                               <span style={{background:'#eee', padding:'3px 8px', borderRadius:'10px', fontSize:'0.8rem'}}>👨‍🍳 {item.chef}</span>
                               <span style={{color:'#aaa', fontSize:'0.8rem'}}>
                                   {/* 날짜가 있으면 표시, 없으면 생략 */}
                                   {item.date ? item.date.substring(0,10) : ''}
                               </span>
                           </div>
                       </div>
                  </div>
              ))}
          </div>
      </section>

    </div>
  );
}

export default Home;
