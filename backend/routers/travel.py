from fastapi import APIRouter, HTTPException
from typing import List
from beanie import PydanticObjectId
from models import Travel
from datetime import datetime

router = APIRouter(
    prefix="/api/travel",
    tags=["Travel"]
)

# 1. 여행 목록 조회 (벤토 그리드용)
@router.get("/", response_model=List[Travel])
async def get_all_travels():
    """모든 여행 목록을 최신순으로 조회"""
    return await Travel.find_all().sort(-Travel.created_at).to_list()

# 2. 여행 상세 조회
@router.get("/{id}", response_model=Travel)
async def get_travel(id: PydanticObjectId):
    travel = await Travel.get(id)
    if not travel:
        raise HTTPException(status_code=404, detail="Travel not found")
    return travel

# 3. 여행 등록
@router.post("/", response_model=Travel)
async def create_travel(travel: Travel):
    """새 여행 등록"""
    await travel.insert()
    return travel

# 4. 여행 수정
@router.put("/{id}", response_model=Travel)
async def update_travel(id: PydanticObjectId, travel_data: Travel):
    travel = await Travel.get(id)
    if not travel:
        raise HTTPException(status_code=404, detail="Travel not found")
    
    travel_data.updated_at = datetime.now()
    update_query = travel_data.dict(exclude_unset=True)
    await travel.set(update_query)
    return travel

# 5. 여행 삭제
@router.delete("/{id}")
async def delete_travel(id: PydanticObjectId):
    travel = await Travel.get(id)
    if not travel:
        raise HTTPException(status_code=404, detail="Travel not found")
    
    await travel.delete()
    return {"message": "Travel deleted successfully"}

# 6. 일정에 장소 추가
@router.post("/{id}/itinerary/day/{day}/place")
async def add_place_to_day(id: PydanticObjectId, day: int, place: dict):
    """특정 일차에 장소 추가"""
    travel = await Travel.get(id)
    if not travel:
        raise HTTPException(status_code=404, detail="Travel not found")
    
    # 해당 일차의 일정 찾기
    day_itinerary = next((item for item in travel.itinerary if item['day'] == day), None)
    
    if day_itinerary:
        day_itinerary['places'].append(place)
    else:
        # 해당 일차가 없으면 새로 생성
        travel.itinerary.append({
            'day': day,
            'date': '',  # 프론트엔드에서 계산
            'places': [place]
        })
    
    travel.updated_at = datetime.now()
    await travel.save()
    return travel
