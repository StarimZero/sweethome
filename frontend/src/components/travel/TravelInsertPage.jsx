import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

function TravelInsertPage() {
  const navigate = useNavigate()
  
  const [info, setInfo] = useState({ 
    title: '', destination: '', startDate: '', days: 1, thumbnail: '', titleColor: '#ffffff'
  })
  
  const [itinerary, setItinerary] = useState({ 1: [] })
  const [currentDay, setCurrentDay] = useState(1)
  // 태그 제거됨
  const [inputPlace, setInputPlace] = useState({ name: '', time: '10:00' })

  const handleDaysChange = (e) => {
    const newDays = parseInt(e.target.value) || 1
    setInfo({ ...info, days: newDays })
    const newItinerary = { ...itinerary }
    for (let i = 1; i <= newDays; i++) {
      if (!newItinerary[i]) newItinerary[i] = []
    }
    setItinerary(newItinerary)
  }

  const handleAddPlace = () => {
    if (!inputPlace.name) return
    
    const newPlace = {
      ...inputPlace,
      id: Date.now(), // 임시 ID
      lat: 33.450701, lng: 126.570667
    }

    const sortedPlaces = [...(itinerary[currentDay] || []), newPlace]
      .sort((a, b) => a.time.localeCompare(b.time))

    setItinerary({
      ...itinerary,
      [currentDay]: sortedPlaces
    })
    setInputPlace({ ...inputPlace, name: '' })
  }

  // ★ 일정 삭제 핸들러 추가
  const handleDeletePlace = (placeId) => {
    const filteredPlaces = itinerary[currentDay].filter(p => p.id !== placeId)
    setItinerary({
      ...itinerary,
      [currentDay]: filteredPlaces
    })
  }

  const handleSubmit = async () => {
    if (!info.title || !info.startDate) {
      alert('여행 제목과 출발일은 필수입니다!')
      return
    }
    // 데이터 전송 로직 (이전과 동일)
    const travelData = {
      title: info.title,
      destination: info.destination,
      start_date: info.startDate,
      end_date: calculateEndDate(info.startDate, info.days), 
      days: info.days,
      thumbnail: info.thumbnail,
      title_color: info.titleColor,
      itinerary: Object.entries(itinerary).map(([day, places]) => ({
        day: parseInt(day),
        date: getDateByDay(info.startDate, parseInt(day)),
        places: places
      }))
    }

    try {
      await axios.post('http://localhost:8000/api/travel/', travelData)
      alert('여행이 성공적으로 등록되었습니다! ✈️')
      navigate('/travel')
    } catch (error) {
      console.error(error)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  const calculateEndDate = (startDate, days) => {
    const date = new Date(startDate)
    date.setDate(date.getDate() + (days - 1))
    return date.toISOString().split('T')[0]
  }
  const getDateByDay = (startDate, day) => {
    const date = new Date(startDate)
    date.setDate(date.getDate() + (day - 1))
    return date.toISOString().split('T')[0]
  }

  return (
    <div className="layout-split">
      <style>{`
        .layout-split { display: flex; height: calc(100vh - 60px); overflow: hidden; }
        .panel-left { 
          width: 400px; min-width: 400px; background: white; 
          border-right: 1px solid #eee; display: flex; flex-direction: column;
          box-shadow: 4px 0 15px rgba(0,0,0,0.05); z-index: 10;
        }
        .form-header { padding: 24px; border-bottom: 1px solid #eee; background: #fff; }
        .input-box { 
          width: 100%; padding: 12px; border: 1px solid #ddd; 
          border-radius: 8px; font-size: 14px; margin-bottom: 10px; box-sizing: border-box;
        }
        .day-tabs-scroll { 
          display: flex; gap: 8px; overflow-x: auto; padding: 12px 20px; 
          background: #f8f9fa; border-bottom: 1px solid #eee; 
        }
        .day-tab { 
          padding: 6px 14px; border-radius: 20px; font-size: 13px; cursor: pointer; 
          white-space: nowrap; border: 1px solid #ddd; background: white; 
        }
        .day-tab.active { background: #26DCD6; color: white; border-color: #26DCD6; font-weight: bold; }

        .input-place-area { 
          padding: 15px 20px; background: #fff; border-bottom: 1px solid #eee; 
          display: flex; gap: 8px; align-items: center; 
        }
        .time-input { width: 90px; padding: 10px; border-radius: 8px; border: 1px solid #ddd; }
        .btn-add { 
          width: 40px; height: 40px; border: none; background: #26DCD6; 
          color: white; border-radius: 8px; font-size: 20px; cursor: pointer;
        }

        .places-list { flex: 1; overflow-y: auto; padding: 20px; background: #fcfcfc; }
        .place-item { 
          display: flex; align-items: center; margin-bottom: 12px; 
          background: white; padding: 16px; border-radius: 12px; 
          border: 1px solid #eee; box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .place-time { font-size: 13px; font-weight: bold; color: #26DCD6; margin-right: 12px; width: 45px; text-align: center; }
        
        /* ★ 삭제 버튼 스타일 */
        .btn-del-item {
          border: none; background: none; color: #ddd; cursor: pointer; font-size: 14px; padding: 4px;
        }
        .btn-del-item:hover { color: #ff4d4f; }

        .btn-submit { width: 100%; padding: 18px; background: #333; color: white; border: none; font-size: 16px; font-weight: bold; cursor: pointer; }
      `}</style>

      <div className="panel-left">
        <div className="form-header">
          <h2>새 여행 만들기</h2>
          <input className="input-box" placeholder="여행 제목" value={info.title} onChange={(e) => setInfo({...info, title: e.target.value})} />
          <input type="color" value={info.titleColor} onChange={(e) => setInfo({...info, titleColor: e.target.value})} style={{width:'40px', height:'40px', border:'none', background:'none', cursor:'pointer'}} title="제목 색상 선택"/>
          <input className="input-box" placeholder="목적지" value={info.destination} onChange={(e) => setInfo({...info, destination: e.target.value})} />
          <input className="input-box" placeholder="썸네일 URL" value={info.thumbnail} onChange={(e) => setInfo({...info, thumbnail: e.target.value})} />
          <div style={{display:'flex', gap:'10px'}}>
            <input type="date" className="input-box" value={info.startDate} onChange={(e) => setInfo({...info, startDate: e.target.value})} />
            <input type="number" className="input-box" style={{width:'80px'}} value={info.days} onChange={handleDaysChange} min="1" />
          </div>
        </div>

        <div className="day-tabs-scroll">
          {Array.from({ length: info.days }, (_, i) => i + 1).map(day => (
            <div key={day} className={`day-tab ${currentDay === day ? 'active' : ''}`} onClick={() => setCurrentDay(day)}>
              Day {day}
            </div>
          ))}
        </div>

        <div className="input-place-area">
          <input type="time" className="time-input" value={inputPlace.time} onChange={(e) => setInputPlace({...inputPlace, time: e.target.value})} />
          <input className="input-box" style={{margin:0, flex:1}} placeholder="장소명 입력" value={inputPlace.name} onChange={(e) => setInputPlace({...inputPlace, name: e.target.value})} onKeyPress={(e) => e.key === 'Enter' && handleAddPlace()} />
          <button className="btn-add" onClick={handleAddPlace}>+</button>
        </div>

        <div className="places-list">
          {(!itinerary[currentDay] || itinerary[currentDay].length === 0) ? (
            <div style={{textAlign:'center', color:'#999', padding:'40px 0'}}>Day {currentDay} 일정이 비어있습니다.</div>
          ) : (
            itinerary[currentDay].map((place, idx) => (
              <div key={idx} className="place-item">
                <span className="place-time">{place.time}</span>
                <div style={{flex:1, fontWeight:'bold', fontSize:'15px'}}>{place.name}</div>
                {/* ★ 삭제 버튼 */}
                <button className="btn-del-item" onClick={() => handleDeletePlace(place.id)}>❌</button>
              </div>
            ))
          )}
        </div>

        <button className="btn-submit" onClick={handleSubmit}>일정 저장하기</button>
      </div>

      <div style={{flex:1, background:'#e8e8e8', display:'flex', alignItems:'center', justifyContent:'center'}}>
        <div style={{textAlign:'center', color:'#888'}}>
          <span style={{fontSize:'64px'}}>🗺️</span>
          <h2>지도 영역</h2>
        </div>
      </div>
    </div>
  )
}

export default TravelInsertPage
