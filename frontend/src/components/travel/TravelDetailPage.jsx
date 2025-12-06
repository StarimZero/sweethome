import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

function TravelDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [travel, setTravel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentDay, setCurrentDay] = useState(1)

  const [isEditing, setIsEditing] = useState(false)
  const [editedTravel, setEditedTravel] = useState(null)

  // 일정 추가용 임시 state
  const [newPlace, setNewPlace] = useState({ time: '10:00', name: '' })

  useEffect(() => {
    fetchDetail()
  }, [id])

  const fetchDetail = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/travel/${id}`)
      setTravel(res.data)
      setEditedTravel(res.data)
      setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }
  
  const handleEditChange = (e) => {
    const { name, value } = e.target
    setEditedTravel({ ...editedTravel, [name]: value })
  }

  // 일정 추가 (수정 모드)
  const handleAddPlaceInEdit = () => {
    if (!newPlace.name) return;

    const currentItinerary = editedTravel.itinerary.find(it => it.day === currentDay);
    const otherItineraries = editedTravel.itinerary.filter(it => it.day !== currentDay);
    
    const placeToAdd = { ...newPlace, id: Date.now(), lat:0, lng:0 };
    
    let updatedItinerary;
    if (currentItinerary) {
      updatedItinerary = {
        ...currentItinerary,
        places: [...currentItinerary.places, placeToAdd].sort((a, b) => a.time.localeCompare(b.time))
      };
    } else {
      updatedItinerary = { day: currentDay, date: '', places: [placeToAdd] };
    }

    setEditedTravel({
      ...editedTravel,
      itinerary: [...otherItineraries, updatedItinerary]
    });
    setNewPlace({ time: '10:00', name: '' }); 
  }

  // 일정 삭제 (수정 모드)
  const handleDeletePlaceInEdit = (placeId) => {
    const currentItinerary = editedTravel.itinerary.find(it => it.day === currentDay);
    const otherItineraries = editedTravel.itinerary.filter(it => it.day !== currentDay);

    const updatedItinerary = {
      ...currentItinerary,
      places: currentItinerary.places.filter(p => p.id !== placeId)
    };

    setEditedTravel({
      ...editedTravel,
      itinerary: [...otherItineraries, updatedItinerary]
    });
  }

  const handleSave = async () => {
    try {
      await axios.put(`http://localhost:8000/api/travel/${id}`, editedTravel)
      setTravel(editedTravel)
      setIsEditing(false)
      alert('수정되었습니다.')
    } catch (error) {
      console.error(error)
      alert('오류 발생')
    }
  }

  const handleDelete = async () => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await axios.delete(`http://localhost:8000/api/travel/${id}`)
        navigate('/travel')
      } catch (error) {
        console.error(error)
        alert('삭제 실패')
      }
    }
  }

  if (loading) return <div>로딩중...</div>
  if (!travel) return <div>정보 없음</div>

  const targetTravel = isEditing ? editedTravel : travel;
  const dayItinerary = targetTravel.itinerary.find(it => it.day === currentDay);
  const places = dayItinerary ? dayItinerary.places : [];
  places.sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="detail-container">
      <style>{`
        .detail-container { display: flex; height: calc(100vh - 60px); background: #f5f7f8; }
        .timeline-section { width: 420px; min-width: 420px; overflow-y: auto; border-right: 1px solid #e0e0e0; background: white; display: flex; flex-direction: column; }
        .detail-header { padding: 30px 24px; background: white; border-bottom: 1px solid #eee; position: relative; }
        .header-buttons { position: absolute; top: 20px; right: 20px; display: flex; gap: 8px; }
        .btn-action { padding: 6px 12px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer; font-size: 12px; }
        .btn-save { border-color: #26DCD6; color: #26DCD6; font-weight: bold; }
        .btn-delete { border-color: #ff4d4f; color: #ff4d4f; }
        .input-edit { width: 100%; font-size: 15px; padding: 8px; margin-bottom: 6px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
        .day-tabs { display: flex; padding: 0 24px; gap: 20px; border-bottom: 1px solid #eee; background: white; overflow-x: auto; flex-shrink: 0; }
        .tab { padding: 16px 0; cursor: pointer; color: #999; font-weight: 600; border-bottom: 3px solid transparent; white-space: nowrap; }
        .tab.active { color: #26DCD6; border-bottom-color: #26DCD6; }
        .timeline-list { padding: 24px; flex: 1; overflow-y: auto; }
        .timeline-item { display: flex; gap: 16px; position: relative; padding-bottom: 30px; }
        .timeline-item::before { content: ''; position: absolute; left: 14px; top: 30px; bottom: 0; width: 0; border-left: 2px dashed #ddd; }
        .timeline-item:last-child::before { display: none; }
        .time-badge { width: 28px; height: 28px; background: #26DCD6; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; z-index: 2; flex-shrink: 0; box-shadow: 0 0 0 4px white; }
        .place-card { flex: 1; background: white; border: 1px solid #eee; border-radius: 16px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); display: flex; justify-content: space-between; align-items: flex-start; }
        .place-time { font-size: 13px; color: #26DCD6; font-weight: 800; margin-bottom: 4px; display: block; }
        .place-name { font-size: 16px; font-weight: 700; margin: 0; color: #333; }
        
        .edit-add-area { background: #f9f9f9; padding: 12px; border-radius: 8px; margin-bottom: 20px; display: flex; gap: 8px; }
        .btn-mini-add { background: #26DCD6; color: white; border: none; border-radius: 4px; width: 30px; cursor: pointer; }
        .btn-mini-del { background: none; border: none; cursor: pointer; font-size: 12px; color: #aaa; }
        .btn-mini-del:hover { color: red; }
      `}</style>

      <div className="timeline-section">
        <div className="detail-header">
          <div className="header-buttons">
            {isEditing ? (
              <>
                <button className="btn-action btn-save" onClick={handleSave}>저장</button>
                <button className="btn-action" onClick={() => setIsEditing(false)}>취소</button>
              </>
            ) : (
              <>
                <button className="btn-action" onClick={() => setIsEditing(true)}>수정</button>
                <button className="btn-action btn-delete" onClick={handleDelete}>삭제</button>
              </>
            )}
          </div>
          <button onClick={() => navigate('/travel')} style={{border:'none', background:'none', cursor:'pointer'}}>← 목록</button>
          
          {isEditing ? (
            <div style={{marginTop:'10px'}}>
              <label style={{fontSize:'12px', color:'#888'}}>제목 & 색상</label>
              <div style={{display:'flex', gap:'8px', marginBottom:'6px'}}>
                <input name="title" value={editedTravel.title} onChange={handleEditChange} className="input-edit" style={{flex:1}} />
                {/* ★ 색상 수정용 Color Picker */}
                <input 
                  type="color" 
                  name="title_color" 
                  value={editedTravel.title_color || '#ffffff'} 
                  onChange={handleEditChange}
                  style={{width:'40px', height:'40px', border:'none', background:'none', cursor:'pointer'}}
                />
              </div>

              <label style={{fontSize:'12px', color:'#888'}}>목적지</label>
              <input name="destination" value={editedTravel.destination} onChange={handleEditChange} className="input-edit" />
              
              <label style={{fontSize:'12px', color:'#888'}}>썸네일 URL</label>
              <input name="thumbnail" value={editedTravel.thumbnail} onChange={handleEditChange} className="input-edit" />
            </div>
          ) : (
            <>
              <h2 style={{margin:'0 0 8px'}}>{travel.title}</h2>
              <p style={{margin:0, color:'#666'}}>📍 {travel.destination}</p>
            </>
          )}
        </div>

        <div className="day-tabs">
          {Array.from({ length: targetTravel.days }, (_, i) => i + 1).map(day => (
            <div key={day} className={`tab ${currentDay === day ? 'active' : ''}`} onClick={() => setCurrentDay(day)}>
              Day {day}
            </div>
          ))}
        </div>

        <div className="timeline-list">
          {isEditing && (
            <div className="edit-add-area">
              <input type="time" value={newPlace.time} onChange={e => setNewPlace({...newPlace, time: e.target.value})} style={{border:'1px solid #ddd', padding:'4px', borderRadius:'4px'}}/>
              <input placeholder="장소 추가" value={newPlace.name} onChange={e => setNewPlace({...newPlace, name: e.target.value})} style={{flex:1, border:'1px solid #ddd', padding:'4px', borderRadius:'4px'}} />
              <button className="btn-mini-add" onClick={handleAddPlaceInEdit}>+</button>
            </div>
          )}

          {places.length === 0 ? (
            <div style={{textAlign:'center', color:'#999'}}>일정이 없습니다.</div>
          ) : (
            places.map((place, idx) => (
              <div key={idx} className="timeline-item">
                <div className="time-badge">{idx + 1}</div>
                <div className="place-card">
                  <div>
                    <span className="place-time">{place.time}</span>
                    <h3 className="place-name">{place.name}</h3>
                  </div>
                  {isEditing && (
                    <button className="btn-mini-del" onClick={() => handleDeletePlaceInEdit(place.id)}>❌ 삭제</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{flex:1, background:'#e8e8e8', display:'flex', justifyContent:'center', alignItems:'center'}}>
        <div style={{textAlign:'center', color:'#888'}}>
          <span style={{fontSize:'48px'}}>🗺️</span>
          <h3>Day {currentDay} 지도</h3>
        </div>
      </div>
    </div>
  )
}

export default TravelDetailPage
