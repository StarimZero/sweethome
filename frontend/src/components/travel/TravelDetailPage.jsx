import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import apiClient from '../../api'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Autocomplete } from '@react-google-maps/api' 

const mapContainerStyle = {
  width: '100%',
  height: '100%'
}

const defaultCenter = { lat: 37.5665, lng: 126.9780 } // 서울 기본값

// 컴포넌트 외부에 정의 (필수!)
const libraries = ['places']

function TravelDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [travel, setTravel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentDay, setCurrentDay] = useState(1)

  const [isEditing, setIsEditing] = useState(false)
  const [editedTravel, setEditedTravel] = useState(null)

  // 일정 추가용 임시 state
  const [newPlace, setNewPlace] = useState({ time: '10:00', name: '', lat: 0, lng: 0, address: '' })

  // 지도 관련 state
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [mapCenter, setMapCenter] = useState(defaultCenter)
  const [map, setMap] = useState(null)
  const [autocomplete, setAutocomplete] = useState(null)
  const [editingPlaceId, setEditingPlaceId] = useState(null) // 위치 수정 중인 장소
  const [locationAutocomplete, setLocationAutocomplete] = useState(null)
  const [destinationAutocomplete, setDestinationAutocomplete] = useState(null) // 목적지 위치 설정용

  // Google Maps API 로드
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries
  })

  const onMapLoad = useCallback((map) => {
    setMap(map)
  }, [])

  // 지도와 travel 데이터가 모두 로드되면 Day1의 2번째 장소로 이동
  useEffect(() => {
    if (map && travel) {
      const day1 = travel.itinerary?.find(it => it.day === 1)
      const places = day1?.places || []
      // 시간순 정렬 후 2번째 장소 (index 1)
      const sortedPlaces = [...places].sort((a, b) => (a.time || '').localeCompare(b.time || ''))
      const secondPlace = sortedPlaces[1] // 2번째 장소

      if (secondPlace && secondPlace.lat && secondPlace.lng && secondPlace.lat !== 0) {
        const timer = setTimeout(() => {
          const center = { lat: secondPlace.lat, lng: secondPlace.lng }
          setMapCenter(center)
          map.panTo(center)
          map.setZoom(14)
        }, 100)
        return () => clearTimeout(timer)
      }
    }
  }, [map, travel])

  const onAutocompleteLoad = (autocompleteInstance) => {
    setAutocomplete(autocompleteInstance)
  }

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace()
      if (place.geometry) {
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()
        setNewPlace({
          ...newPlace,
          name: place.name || place.formatted_address,
          lat: lat,
          lng: lng,
          address: place.formatted_address
        })
      }
    }
  }

  // 기존 장소 위치 수정용
  const onLocationAutocompleteLoad = (autocompleteInstance) => {
    setLocationAutocomplete(autocompleteInstance)
  }

  const onLocationPlaceChanged = () => {
    if (locationAutocomplete !== null && editingPlaceId !== null) {
      const place = locationAutocomplete.getPlace()
      if (place.geometry) {
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()

        // 해당 장소의 위치 업데이트
        const currentItinerary = editedTravel.itinerary.find(it => it.day === currentDay)
        const otherItineraries = editedTravel.itinerary.filter(it => it.day !== currentDay)

        const updatedPlaces = currentItinerary.places.map(p =>
          p.id === editingPlaceId
            ? { ...p, lat, lng, address: place.formatted_address }
            : p
        )

        const updatedItinerary = { ...currentItinerary, places: updatedPlaces }

        setEditedTravel({
          ...editedTravel,
          itinerary: [...otherItineraries, updatedItinerary]
        })

        setEditingPlaceId(null)
        setMapCenter({ lat, lng })
        if (map) {
          map.panTo({ lat, lng })
          map.setZoom(15)
        }
      }
    }
  }

  // 목적지(기본 위치) 설정용
  const onDestinationAutocompleteLoad = (autocompleteInstance) => {
    setDestinationAutocomplete(autocompleteInstance)
  }

  const onDestinationPlaceChanged = () => {
    if (destinationAutocomplete !== null) {
      const place = destinationAutocomplete.getPlace()
      if (place.geometry) {
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()

        setEditedTravel({
          ...editedTravel,
          destination_lat: lat,
          destination_lng: lng
        })

        setMapCenter({ lat, lng })
        if (map) {
          map.panTo({ lat, lng })
          map.setZoom(12)
        }
      }
    }
  }

  // 장소 클릭 시 지도 이동
  const handlePlaceClick = (place) => {
    if (place.lat && place.lng && place.lat !== 0 && place.lng !== 0) {
      setSelectedPlace(place)
      setMapCenter({ lat: place.lat, lng: place.lng })
      if (map) {
        map.panTo({ lat: place.lat, lng: place.lng })
        map.setZoom(15)
      }
    } else {
      setSelectedPlace(place)
    }
  }

  useEffect(() => {
    fetchDetail()
  }, [id])

  const fetchDetail = async () => {
    try {
      const res = await apiClient.get(`/travel/${id}`)
      setTravel(res.data)
      setEditedTravel(res.data)

      // 목적지 좌표가 있으면 지도 중심 설정
      if (res.data.destination_lat && res.data.destination_lng) {
        setMapCenter({ lat: res.data.destination_lat, lng: res.data.destination_lng })
      }

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

    const placeToAdd = {
      id: Date.now(),
      time: newPlace.time,
      name: newPlace.name,
      lat: newPlace.lat || 0,
      lng: newPlace.lng || 0,
      address: newPlace.address || ''
    };
    
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
    setNewPlace({ time: '10:00', name: '', lat: 0, lng: 0, address: '' });
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

  // 시간 변경 (수정 모드)
  const handleTimeChange = (placeId, newTime) => {
    const currentItinerary = editedTravel.itinerary.find(it => it.day === currentDay);
    const otherItineraries = editedTravel.itinerary.filter(it => it.day !== currentDay);

    const updatedPlaces = currentItinerary.places.map(p =>
      p.id === placeId ? { ...p, time: newTime } : p
    );

    const updatedItinerary = { ...currentItinerary, places: updatedPlaces };

    setEditedTravel({
      ...editedTravel,
      itinerary: [...otherItineraries, updatedItinerary]
    });
  }

  const handleSave = async () => {
    try {
      await apiClient.put(`/travel/${id}`, editedTravel)
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
        await apiClient.delete(`/travel/${id}`)
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
        .place-card { flex: 1; background: white; border: 1px solid #eee; border-radius: 16px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); display: flex; justify-content: space-between; align-items: flex-start; transition: all 0.2s; }
        .place-card:hover { border-color: #26DCD6; background: #f8ffff; }
        .place-card.selected { border-color: #26DCD6; background: #e8fffe; box-shadow: 0 0 0 3px rgba(38,220,214,0.2); }
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

              <label style={{fontSize:'12px', color:'#888'}}>
                📍 지도 기본 위치
                {editedTravel.destination_lat ? (
                  <span style={{color:'#26DCD6', marginLeft:'8px'}}>설정됨</span>
                ) : (
                  <span style={{color:'#ff6b6b', marginLeft:'8px'}}>미설정</span>
                )}
              </label>
              {isLoaded && (
                <Autocomplete
                  onLoad={onDestinationAutocompleteLoad}
                  onPlaceChanged={onDestinationPlaceChanged}
                >
                  <input
                    placeholder="목적지 위치 검색..."
                    className="input-edit"
                    style={{marginBottom:'6px'}}
                  />
                </Autocomplete>
              )}

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
            <div key={day} className={`tab ${currentDay === day ? 'active' : ''}`} onClick={() => {
              setCurrentDay(day)
              setSelectedPlace(null)
              // 해당 Day의 2번째 장소로 지도 이동
              const dayItinerary = targetTravel.itinerary?.find(it => it.day === day)
              const dayPlaces = dayItinerary?.places || []
              const sortedPlaces = [...dayPlaces].sort((a, b) => (a.time || '').localeCompare(b.time || ''))
              const secondPlace = sortedPlaces[1] // 2번째 장소
              if (secondPlace && secondPlace.lat && secondPlace.lng && secondPlace.lat !== 0) {
                setMapCenter({ lat: secondPlace.lat, lng: secondPlace.lng })
                if (map) {
                  map.panTo({ lat: secondPlace.lat, lng: secondPlace.lng })
                  map.setZoom(14)
                }
              }
            }}>
              Day {day}
            </div>
          ))}
        </div>

        <div className="timeline-list">
          {isEditing && isLoaded && (
            <div className="edit-add-area">
              <input type="time" value={newPlace.time} onChange={e => setNewPlace({...newPlace, time: e.target.value})} style={{border:'1px solid #ddd', padding:'8px', borderRadius:'4px'}}/>
              <Autocomplete
                onLoad={onAutocompleteLoad}
                onPlaceChanged={onPlaceChanged}
                options={{ types: ['establishment', 'geocode'] }}
              >
                <input
                  placeholder="장소 검색..."
                  value={newPlace.name}
                  onChange={e => setNewPlace({...newPlace, name: e.target.value})}
                  style={{flex:1, border:'1px solid #ddd', padding:'8px', borderRadius:'4px', width:'100%'}}
                />
              </Autocomplete>
              <button className="btn-mini-add" onClick={handleAddPlaceInEdit}>+</button>
            </div>
          )}
          {isEditing && !isLoaded && (
            <div className="edit-add-area">
              <span>지도 로딩중...</span>
            </div>
          )}

          {places.length === 0 ? (
            <div style={{textAlign:'center', color:'#999'}}>일정이 없습니다.</div>
          ) : (
            places.map((place, idx) => (
              <div key={idx} className="timeline-item">
                <div className="time-badge">{idx + 1}</div>
                <div
                  className={`place-card ${selectedPlace?.id === place.id ? 'selected' : ''}`}
                  onClick={() => !isEditing && handlePlaceClick(place)}
                  style={{cursor: isEditing ? 'default' : 'pointer'}}
                >
                  <div style={{flex:1}}>
                    {isEditing ? (
                      <input
                        type="time"
                        value={place.time}
                        onChange={(e) => handleTimeChange(place.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          border: '1px solid #26DCD6',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '13px',
                          color: '#26DCD6',
                          fontWeight: '800',
                          marginBottom: '4px',
                          cursor: 'pointer'
                        }}
                      />
                    ) : (
                      <span className="place-time">{place.time}</span>
                    )}
                    <h3 className="place-name">{place.name}</h3>
                    {place.lat && place.lat !== 0 ? (
                      <span style={{fontSize:'11px', color:'#26DCD6'}}>📍 위치 있음</span>
                    ) : (
                      <span style={{fontSize:'11px', color:'#ff6b6b'}}>📍 위치 없음</span>
                    )}

                    {/* 위치 설정 UI (수정 모드) */}
                    {isEditing && isLoaded && editingPlaceId === place.id && (
                      <div style={{marginTop:'8px'}} onClick={e => e.stopPropagation()}>
                        <Autocomplete
                          onLoad={onLocationAutocompleteLoad}
                          onPlaceChanged={onLocationPlaceChanged}
                        >
                          <input
                            placeholder="위치 검색..."
                            style={{width:'100%', padding:'6px 8px', border:'1px solid #26DCD6', borderRadius:'4px', fontSize:'12px'}}
                            autoFocus
                          />
                        </Autocomplete>
                        <button
                          onClick={() => setEditingPlaceId(null)}
                          style={{marginTop:'4px', fontSize:'11px', color:'#999', background:'none', border:'none', cursor:'pointer'}}
                        >
                          취소
                        </button>
                      </div>
                    )}

                    {/* 위치 설정 버튼 (수정 모드) */}
                    {isEditing && editingPlaceId !== place.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingPlaceId(place.id); }}
                        style={{marginTop:'6px', fontSize:'11px', padding:'4px 8px', background:'#f0f0f0', border:'none', borderRadius:'4px', cursor:'pointer'}}
                      >
                        📍 위치 {place.lat && place.lat !== 0 ? '수정' : '설정'}
                      </button>
                    )}
                  </div>

                  {isEditing && (
                    <button className="btn-mini-del" onClick={(e) => { e.stopPropagation(); handleDeletePlaceInEdit(place.id); }}>❌</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{flex:1, position:'relative'}}>
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={12}
            onLoad={onMapLoad}
            options={{
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false
            }}
          >
            {/* 해당 Day의 모든 장소에 마커 표시 */}
            {places.filter(p => p.lat && p.lng && p.lat !== 0).map((place, idx) => (
              <Marker
                key={idx}
                position={{ lat: place.lat, lng: place.lng }}
                label={{ text: String(idx + 1), color: 'white', fontWeight: 'bold' }}
                onClick={() => handlePlaceClick(place)}
              />
            ))}

            {/* 선택된 장소 InfoWindow */}
            {selectedPlace && selectedPlace.lat && selectedPlace.lng && selectedPlace.lat !== 0 && (
              <InfoWindow
                position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
                onCloseClick={() => setSelectedPlace(null)}
              >
                <div style={{padding:'4px'}}>
                  <strong>{selectedPlace.name}</strong>
                  <div style={{fontSize:'12px', color:'#666', marginTop:'4px'}}>{selectedPlace.time}</div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        ) : (
          <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100%', background:'#e8e8e8'}}>
            <div style={{textAlign:'center', color:'#888'}}>
              <span style={{fontSize:'48px'}}>🗺️</span>
              <h3>지도 로딩중...</h3>
            </div>
          </div>
        )}

        {/* 선택된 장소 정보 오버레이 (좌표가 없는 경우) */}
        {selectedPlace && (!selectedPlace.lat || selectedPlace.lat === 0) && (
          <div style={{
            position:'absolute', bottom:'20px', left:'20px', right:'20px',
            background:'white', padding:'16px', borderRadius:'12px',
            boxShadow:'0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <div style={{fontWeight:'bold', marginBottom:'4px'}}>{selectedPlace.name}</div>
            <div style={{fontSize:'13px', color:'#666'}}>📍 위치 정보가 없습니다. 장소를 검색해서 추가해주세요.</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TravelDetailPage
