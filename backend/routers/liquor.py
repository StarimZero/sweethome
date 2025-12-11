from fastapi import APIRouter, HTTPException, Query
from beanie import PydanticObjectId
from typing import List, Optional
from models.liquor import LiquorReview
from datetime import datetime

# prefix에는 슬래시를 넣지 마세요.
router = APIRouter(prefix="/api/liquor", tags=["Liquor"])

# 1. 목록 조회 (GET /api/liquor) - 슬래시 없음
@router.get("", response_model=List[LiquorReview])
async def get_liquors(
    name: Optional[str] = None,
    category: Optional[str] = None,
    purchase_place: Optional[str] = None,
    pairing_food: Optional[str] = None,
    comment: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_rating_husband: Optional[float] = None,
    max_rating_husband: Optional[float] = None,
    min_rating_wife: Optional[float] = None,
    max_rating_wife: Optional[float] = None,
):
    query = {}
    
    if name: query["name"] = {"$regex": name, "$options": "i"}
    if category: query["category"] = category
    if purchase_place: query["purchase_place"] = {"$regex": purchase_place, "$options": "i"}
    if pairing_food: query["pairing_foods"] = {"$regex": pairing_food, "$options": "i"}

    if comment:
        query["$or"] = [
            {"comment_husband": {"$regex": comment, "$options": "i"}},
            {"comment_wife": {"$regex": comment, "$options": "i"}}
        ]

    # 가격 범위
    if min_price is not None or max_price is not None:
        price_query = {}
        if min_price is not None: price_query["$gte"] = min_price
        if max_price is not None: price_query["$lte"] = max_price
        query["price"] = price_query

    # 날짜 범위
    if start_date or end_date:
        date_query = {}
        if start_date: date_query["$gte"] = start_date
        if end_date: date_query["$lte"] = end_date
        query["visit_date"] = date_query

    # 평점 범위 (남편)
    if min_rating_husband is not None or max_rating_husband is not None:
        rating_h_query = {}
        if min_rating_husband is not None: rating_h_query["$gte"] = min_rating_husband
        if max_rating_husband is not None: rating_h_query["$lte"] = max_rating_husband
        query["rating_husband"] = rating_h_query

    # 평점 범위 (아내)
    if min_rating_wife is not None or max_rating_wife is not None:
        rating_w_query = {}
        if min_rating_wife is not None: rating_w_query["$gte"] = min_rating_wife
        if max_rating_wife is not None: rating_w_query["$lte"] = max_rating_wife
        query["rating_wife"] = rating_w_query

    return await LiquorReview.find(query).sort("-visit_date", "-created_at").to_list()


# 2. 등록 (POST /api/liquor) - 슬래시 없음
@router.post("", response_model=LiquorReview)
async def create_liquor(liquor: LiquorReview):
    liquor.created_at = datetime.now()
    liquor.updated_at = datetime.now()
    await liquor.insert()
    return liquor


# 3. 상세 조회 (GET /api/liquor/{id})
@router.get("/{id}", response_model=LiquorReview)
async def get_liquor(id: PydanticObjectId):
    liquor = await LiquorReview.get(id)
    if not liquor:
        raise HTTPException(status_code=404, detail="Not found")
    return liquor


# 4. 수정 (PUT /api/liquor/{id})
@router.put("/{id}", response_model=LiquorReview)
async def update_liquor(id: PydanticObjectId, liquor_data: LiquorReview):
    liquor = await LiquorReview.get(id)
    if not liquor:
        raise HTTPException(status_code=404, detail="Not found")
    
    update_data = liquor_data.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.now()
    
    await liquor.update({"$set": update_data})
    return await LiquorReview.get(id)


# 5. 삭제 (DELETE /api/liquor/{id})
@router.delete("/{id}")
async def delete_liquor(id: PydanticObjectId):
    liquor = await LiquorReview.get(id)
    if not liquor:
        raise HTTPException(status_code=404, detail="Not found")
    await liquor.delete()
    return {"message": "Deleted"}
