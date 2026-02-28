from fastapi import APIRouter, HTTPException
from beanie import PydanticObjectId
from typing import List, Optional
from models.culture import CultureReview
from datetime import datetime

router = APIRouter(prefix="/api/culture", tags=["Culture"])


# 1. 목록 조회 (필터 지원)
@router.get("", response_model=List[CultureReview])
async def get_cultures(
    title: Optional[str] = None,
    category: Optional[str] = None,
    location: Optional[str] = None,
    comment: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_rating: Optional[float] = None,
    max_rating: Optional[float] = None,
):
    query = {}

    if title:
        query["title"] = {"$regex": title, "$options": "i"}
    if category:
        query["category"] = category
    if location:
        query["location"] = {"$regex": location, "$options": "i"}

    if comment:
        query["$or"] = [
            {"comment_husband": {"$regex": comment, "$options": "i"}},
            {"comment_wife": {"$regex": comment, "$options": "i"}}
        ]

    # 날짜 범위
    if start_date or end_date:
        date_query = {}
        if start_date:
            date_query["$gte"] = start_date
        if end_date:
            date_query["$lte"] = end_date
        query["visit_date"] = date_query

    # 평점 범위 (통합 평점 기준)
    if min_rating is not None or max_rating is not None:
        rating_query = {}
        if min_rating is not None:
            rating_query["$gte"] = min_rating
        if max_rating is not None:
            rating_query["$lte"] = max_rating
        query["rating"] = rating_query

    return await CultureReview.find(query).sort("-visit_date", "-created_at").to_list()


# 2. 등록
@router.post("", response_model=CultureReview)
async def create_culture(culture: CultureReview):
    culture.created_at = datetime.now()
    culture.updated_at = datetime.now()

    # 통합 평점 계산
    scores = []
    if culture.rating_husband:
        scores.append(culture.rating_husband)
    if culture.rating_wife:
        scores.append(culture.rating_wife)
    culture.rating = round(sum(scores) / len(scores), 1) if scores else 0.0

    await culture.insert()
    return culture


# 3. 상세 조회
@router.get("/{id}", response_model=CultureReview)
async def get_culture(id: PydanticObjectId):
    culture = await CultureReview.get(id)
    if not culture:
        raise HTTPException(status_code=404, detail="Not found")
    return culture


# 4. 수정
@router.put("/{id}", response_model=CultureReview)
async def update_culture(id: PydanticObjectId, culture_data: CultureReview):
    culture = await CultureReview.get(id)
    if not culture:
        raise HTTPException(status_code=404, detail="Not found")

    update_data = culture_data.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.now()

    # 평점 재계산
    r_h = update_data.get("rating_husband", culture.rating_husband)
    r_w = update_data.get("rating_wife", culture.rating_wife)
    scores = []
    if r_h:
        scores.append(float(r_h))
    if r_w:
        scores.append(float(r_w))
    update_data["rating"] = round(sum(scores) / len(scores), 1) if scores else 0.0

    await culture.update({"$set": update_data})
    return await CultureReview.get(id)


# 5. 삭제
@router.delete("/{id}")
async def delete_culture(id: PydanticObjectId):
    culture = await CultureReview.get(id)
    if not culture:
        raise HTTPException(status_code=404, detail="Not found")
    await culture.delete()
    return {"message": "Deleted"}
