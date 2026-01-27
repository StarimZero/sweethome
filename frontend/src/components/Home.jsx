import { useState, useEffect } from 'react';
import apiClient from '../api';
import { useNavigate } from 'react-router-dom';

// --- [반응형 CSS] ---
const responsiveStyles = `
  .home-container {
    max-width: 100%;
    margin: 0;
    padding: 0;
    font-family: 'Pretendard', sans-serif;
    color: #333;
  }

  .home-hero {
    background: linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.25) 100%),
                url('https://i.ibb.co/9kfV9Tth/KANG7047.jpg');
    background-size: cover;
    background-position: 35% center;
    border-radius: 0;
    padding: 100px 40px 80px;
    text-align: center;
    color: #fff;
    box-shadow: none;
    margin-bottom: 0;
    position: relative;
    overflow: hidden;
    min-height: calc(100vh - 70px);
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
  }

  .home-hero-title {
    font-size: 3.5rem;
    font-weight: 800;
    margin: 0 0 25px 0;
    text-shadow: 3px 3px 6px rgba(0,0,0,0.4);
    position: relative;
    z-index: 1;
    letter-spacing: 2px;
  }

  .home-hero-subtitle {
    font-size: 1.2rem;
    font-weight: 400;
    margin-bottom: 30px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    position: relative;
    z-index: 1;
    opacity: 0.9;
    letter-spacing: 3px;
  }

  .home-dday-box {
    display: inline-flex;
    gap: 30px;
    background: rgba(255,255,255,0.25);
    backdrop-filter: blur(15px);
    padding: 25px 50px;
    border-radius: 50px;
    font-size: 1.3rem;
    font-weight: 600;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.3);
    position: relative;
    z-index: 1;
  }

  .home-dday-box span {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .home-next-trip {
    margin-top: 35px;
    background: rgba(255,255,255,0.95);
    color: #333;
    padding: 18px 35px;
    border-radius: 30px;
    display: inline-block;
    font-weight: bold;
    box-shadow: 0 8px 25px rgba(0,0,0,0.2);
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    z-index: 1;
  }

  .home-next-trip:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 35px rgba(0,0,0,0.25);
  }

  /* 모바일 반응형 (768px 이하) */
  @media (max-width: 768px) {
    .home-container {
      padding: 0;
    }

    .home-hero {
      padding: 60px 20px 40px;
      border-radius: 0;
      margin-bottom: 0;
      min-height: calc(100vh - 60px);
      min-height: calc(100dvh - 60px);
      background-position: 35% top;
    }

    .home-hero-title {
      font-size: 2rem;
    }

    .home-hero-subtitle {
      font-size: 0.85rem;
      letter-spacing: 1.5px;
      margin-bottom: 20px;
    }

    .home-dday-box {
      flex-direction: column;
      gap: 8px;
      padding: 16px 28px;
      font-size: 0.95rem;
      border-radius: 18px;
    }

    .home-next-trip {
      padding: 12px 22px;
      font-size: 0.85rem;
      border-radius: 18px;
      margin-top: 25px;
    }

    .home-next-trip .trip-date {
      display: block;
      margin-top: 4px;
      margin-left: 0 !important;
    }
  }

  /* 작은 모바일 (480px 이하) */
  @media (max-width: 480px) {
    .home-hero {
      min-height: calc(100vh - 56px);
      min-height: calc(100dvh - 56px);
      padding: 50px 15px 35px;
      background-position: 35% top;
    }

    .home-hero-title {
      font-size: 1.6rem;
    }

    .home-hero-subtitle {
      font-size: 0.7rem;
      letter-spacing: 1px;
      margin-bottom: 18px;
    }

    .home-dday-box {
      font-size: 0.85rem;
      padding: 14px 22px;
      gap: 6px;
    }

    .home-next-trip {
      padding: 10px 18px;
      font-size: 0.8rem;
      margin-top: 20px;
    }
  }

  /* 가로 모드 (landscape) */
  @media (max-height: 500px) and (orientation: landscape) {
    .home-hero {
      min-height: 100vh;
      min-height: 100dvh;
      padding: 30px 40px;
      justify-content: center;
    }

    .home-hero-title {
      font-size: 1.8rem;
      margin-bottom: 15px;
    }

    .home-hero-subtitle {
      margin-bottom: 15px;
    }

    .home-next-trip {
      margin-top: 15px;
    }
  }
`;

function Home() {
  const [nextTravel, setNextTravel] = useState(null);
  const [loading, setLoading] = useState(true);
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
        const travelRes = await apiClient.get('/travel');
        const travels = Array.isArray(travelRes.data) ? travelRes.data : [];

        const upcoming = travels
          .filter(t => new Date(t.start_date) >= new Date(new Date().setHours(0,0,0,0)))
          .sort((a, b) => a.start_date.localeCompare(b.start_date))[0] || null;

        setNextTravel(upcoming);
      } catch (e) {
        console.error("데이터 로딩 실패:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleTravelClick = (id) => {
    if (id) navigate(`/travel/${id}`);
  };

  if (loading) return <div style={{textAlign:'center', padding:'100px', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', color:'#888'}}>Sweet Home</div>;

  return (
    <>
      <style>{responsiveStyles}</style>
      <div className="home-container">
        {/* 1. 히어로 배너 */}
        <div className="home-hero">
          <div className="home-hero-title">Sweet Home</div>
          <div className="home-hero-subtitle">OUR BEAUTIFUL JOURNEY TOGETHER</div>
          <div className="home-dday-box">
              <span>+{diffStart}일</span>
              <span>
                  Wedding
                  {diffWedding > 0
                    ? ` D-${diffWedding}`
                    : diffWedding === 0
                      ? ` D-Day`
                      : ` D+${Math.abs(diffWedding)}`}
              </span>
          </div>
          {nextTravel && (
               <div className="home-next-trip"
                    onClick={() => handleTravelClick(nextTravel._id || nextTravel.id)}>
                   Next Trip: {nextTravel.title} <span className="trip-date" style={{marginLeft:'10px', opacity: 0.7}}>({nextTravel.start_date})</span>
               </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Home;
