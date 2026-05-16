from fastapi import APIRouter, Depends, HTTPException
from typing import List
from beanie import PydanticObjectId
from models.review import Review
from models.user import User
from auth.security import get_current_user, assert_owner_or_admin

router = APIRouter(
    prefix="/api/review",
    tags=["Review"]
)


@router.get("", response_model=List[Review])
async def get_all_reviews():
    return await Review.find_all().to_list()


@router.post("", response_model=Review)
async def add_review(review: Review, current_user: User = Depends(get_current_user)):
    review.created_by = current_user.id
    await review.insert()
    return review


@router.get("/{id}", response_model=Review)
async def get_review(id: PydanticObjectId):
    review = await Review.get(id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review


@router.put("/{id}", response_model=Review)
async def update_review(
    id: PydanticObjectId,
    review_data: Review,
    current_user: User = Depends(get_current_user),
):
    review = await Review.get(id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    assert_owner_or_admin(review, current_user)

    update_query = review_data.dict(exclude_unset=True)
    update_query.pop("created_by", None)
    await review.set(update_query)
    return review


@router.delete("/{id}")
async def delete_review(
    id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    review = await Review.get(id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    assert_owner_or_admin(review, current_user)
    await review.delete()
    return {"message": "Deleted"}
