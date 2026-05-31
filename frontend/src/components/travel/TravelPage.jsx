import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api';
import { useToast } from '../common/Toast'

function TravelPage() {
  const [travels, setTravels] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    fetchTravels()
  }, [])

  const fetchTravels = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/travel/');
      // 날짜순 정렬 (최신순)
      const sortedData = response.data.sort((a, b) =>
        new Date(b.start_date) - new Date(a.start_date)
      )
      setTravels(sortedData)
    } catch (error) {
      console.error('여행 목록 로딩 실패:', error)
      setTravels([])
      toast.error('여행 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // D-Day 계산
  const getDDay = (startDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const diffTime = start - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'D-Day';
    if (diffDays > 0) return `D-${diffDays}`;
    return `D+${Math.abs(diffDays)}`;
  }

  return (
    <div className="travel-container">
      <style>{`
        .travel-container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
        .header-area { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .header-area h1 { font-size: 28px; font-weight: 800; color: #333; margin: 0; }
        
        .btn-create {
          background: #105A88; color: white; padding: 12px 24px; border-radius: 12px;
          border: none; font-weight: 700; cursor: pointer;
          box-shadow: 0 4px 12px rgba(16, 90, 136, 0.3); transition: all 0.2s;
        }
        .btn-create:hover { transform: translateY(-2px); }

        /* 벤토 그리드 */
        .bento-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          grid-auto-rows: 220px; 
          gap: 20px;
          grid-auto-flow: dense; 
        }

        .bento-card {
          position: relative; border-radius: 24px; overflow: hidden;
          cursor: pointer; background: #f0f0f0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          grid-column: span 1; grid-row: span 1;
        }
        .bento-card:hover { 
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.12);
          z-index: 1;
        }

        /* 크기 클래스 */
        .span-col-2 { grid-column: span 2; }
        .span-row-2 { grid-row: span 2; }
        .span-2x2 { grid-column: span 2; grid-row: span 2; }

        .card-bg {
          width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s;
        }
        .bento-card:hover .card-bg { transform: scale(1.05); }

        .card-overlay {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
          padding: 30px 20px 20px; pointer-events: none;
        }
        .card-title { font-size: 22px; font-weight: 700; margin: 0 0 6px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .card-desc { font-size: 14px; opacity: 0.9; margin: 0; display: flex; gap: 8px; align-items: center; color: rgba(255,255,255,0.9); }

        .status-badge {
          position: absolute; top: 20px; right: 20px;
          padding: 6px 12px; border-radius: 20px;
          font-weight: 800; font-size: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          backdrop-filter: blur(4px); z-index: 2;
        }
        .badge-future { background: rgba(16, 90, 136, 0.9); color: white; }
        .badge-past { background: rgba(255, 255, 255, 0.9); color: #555; }

        @media (max-width: 768px) {
          .bento-grid { grid-template-columns: 1fr; grid-auto-rows: 260px; }
          .span-col-2, .span-row-2, .span-2x2 {
            grid-column: span 1 !important; grid-row: span 1 !important;
          }
        }
      `}</style>

      <div className="header-area">
        <h1>✈️ 우리의 여행</h1>
        <button className="btn-create" onClick={() => navigate('/travel/new')}>+ 여행 만들기</button>
      </div>

      {loading && (
        <div style={{textAlign:'center', padding:'60px', color:'#999'}}>불러오는 중...</div>
      )}

      {!loading && (
      <>
      <div className="bento-grid">
        {travels.map((travel, index) => {
          const dDayText = getDDay(travel.start_date);
          const isFuture = dDayText.startsWith('D-') || dDayText === 'D-Day';

          // 벤토 로직: 미래(D-)는 대형(2x2), 과거(D+)는 패턴 적용
          let spanClass = '';
          if (isFuture) {
            spanClass = 'span-2x2';
          } else {
            const pattern = index % 4;
            if (pattern === 1) spanClass = 'span-col-2';
            else if (pattern === 2) spanClass = 'span-row-2';
          }

          return (
            <div 
              key={travel._id} 
              className={`bento-card ${spanClass}`}
              onClick={() => navigate(`/travel/${travel._id}`)}
            >
              {travel.thumbnail ? (
                <img src={travel.thumbnail} alt="" className="card-bg" />
              ) : (
                <div style={{width:'100%', height:'100%', background:'#e0e0e0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'40px'}}>
                  ✈️
                </div>
              )}
              
              <div className={`status-badge ${isFuture ? 'badge-future' : 'badge-past'}`}>
                {dDayText}
              </div>
              
              <div className="card-overlay">
                {/* ★ 제목 색상 적용 (기본값: 흰색) */}
                <h3 
                  className="card-title" 
                  style={{ color: travel.title_color || '#ffffff' }}
                >
                  {travel.title}
                </h3>
                <p className="card-desc">
                  <span>📍 {travel.destination}</span>
                  <span>• {travel.days - 1}박 {travel.days}일</span>
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {travels.length === 0 && (
        <div style={{textAlign:'center', padding:'60px', color:'#999'}}>
          <p>등록된 여행이 없습니다.</p>
        </div>
      )}
      </>
      )}
    </div>
  )
}

export default TravelPage
