from fastapi import APIRouter, HTTPException
from typing import List
from beanie import PydanticObjectId
from models import Review # 모델 import

router = APIRouter(
    prefix="/api/review",
    tags=["Review"]
)

# 1. 목록 조회
@router.get("/", response_model=List[Review])
async def get_all_reviews():
    return await Review.find_all().to_list()

# 2. 등록
@router.post("/", response_model=Review)
async def add_review(review: Review):
    await review.insert()
    return review

# 3. 상세 조회
@router.get("/{id}", response_model=Review)
async def get_review(id: PydanticObjectId):
    review = await Review.get(id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review

# 4. 수정
@router.put("/{id}", response_model=Review)
async def update_review(id: PydanticObjectId, review_data: Review):
    review = await Review.get(id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    update_query = review_data.dict(exclude_unset=True)
    await review.set(update_query)
    return review

# 5. 삭제
@router.delete("/{id}")
async def delete_review(id: PydanticObjectId):
    review = await Review.get(id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    await review.delete()
    return {"message": "Deleted"}
