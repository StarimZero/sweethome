from beanie import Document, PydanticObjectId
from typing import Optional, List
from pydantic import Field, BaseModel
from datetime import datetime

class Place(Document):
    """여행지 장소 정보 (나중에 Google Places API 연동 예정)"""
    place_id: Optional[str] = None  # Google Place ID
    name: str
    address: Optional[str] = None
    lat: Optional[float] = None  # 위도
    lng: Optional[float] = None  # 경도
    category: Optional[str] = None  # 관광지, 식당, 숙소 등
    memo: Optional[str] = None
    visit_time: Optional[str] = None  # 방문 시간 (예: "10:00")
    
    class Settings:
        name = "places"
    
    class Config:
        populate_by_name = True
        json_encoders = { PydanticObjectId: str }

class DayItinerary(BaseModel):
    """일차별 일정"""
    day: int  # 1일차, 2일차...
    date: str  # 2025-02-20
    places: List[Place] = []
    
class Travel(Document):
    """여행 전체 정보"""
    id: Optional[PydanticObjectId] = Field(None, alias="_id")
    
    title: str  # 여행 제목 (예: "2025 후쿠오카 겨울여행")
    destination: str  # 목적지 (예: "후쿠오카, 일본")
    destination_lat: Optional[float] = None  # 목적지 위도 (지도 기본 위치)
    destination_lng: Optional[float] = None  # 목적지 경도 (지도 기본 위치)
    start_date: str  # 출발일 (YYYY-MM-DD)
    end_date: str  # 종료일 (YYYY-MM-DD)
    days: int  # 여행 일수
    
    thumbnail: Optional[str] = None  # 썸네일 이미지 URL
    description: Optional[str] = None  # 여행 설명
    status: str = "upcoming"  # upcoming, completed, cancelled
    title_color: str = "#ffffff" 
    
    is_featured: bool = False  # 벤토 그리드에서 큰 카드로 표시할지 여부
    
    itinerary: List[dict] = []  # 일차별 일정 (DayItinerary 구조)
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    class Settings:
        name = "travels"
    
    class Config:
        populate_by_name = True
        json_encoders = { 
            PydanticObjectId: str,
            datetime: lambda v: v.isoformat()
        }
