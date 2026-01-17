from fastapi import APIRouter, HTTPException
from beanie import PydanticObjectId
from typing import List, Optional
from datetime import datetime
from models.bucket import BucketList, Comment

router = APIRouter(prefix="/api/bucket", tags=["BucketList"])

# 1. 목록 조회 (검색/필터 지원)
@router.get("", response_model=List[BucketList])
async def get_buckets(
    keyword: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,  # all, not_started, active, completed
):
    query = {}

    if keyword:
        query["$or"] = [
            {"title": {"$regex": keyword, "$options": "i"}},
            {"description": {"$regex": keyword, "$options": "i"}}
        ]

    if category:
        query["category"] = category

    if status and status != "all":
        query["status"] = status

    return await BucketList.find(query).sort("-created_at").to_list()

# 2. 통계 조회
@router.get("/stats")
async def get_stats():
    total = await BucketList.count()
    not_started = await BucketList.find(BucketList.status == "not_started").count()
    active = await BucketList.find(BucketList.status == "active").count()
    completed = await BucketList.find(BucketList.status == "completed").count()
    rate = round((completed / total) * 100) if total > 0 else 0
    return {"total": total, "not_started": not_started, "active": active, "completed": completed, "rate": rate}

# 3. 상세 조회
@router.get("/{id}", response_model=BucketList)
async def get_bucket(id: PydanticObjectId):
    bucket = await BucketList.get(id)
    if not bucket:
        raise HTTPException(status_code=404, detail="Not found")
    return bucket

# 4. 등록
@router.post("", response_model=BucketList)
async def create_bucket(bucket: BucketList):
    bucket.created_at = datetime.now()
    bucket.updated_at = datetime.now()
    await bucket.insert()
    return bucket

# 5. 수정
@router.put("/{id}", response_model=BucketList)
async def update_bucket(id: PydanticObjectId, data: BucketList):
    bucket = await BucketList.get(id)
    if not bucket:
        raise HTTPException(status_code=404, detail="Not found")

    data.updated_at = datetime.now()

    # 완료 처리 시 완료일 기록
    if data.status == "completed" and bucket.status != "completed":
        data.completed_at = datetime.now()
        data.progress = 100

    update_data = data.model_dump(exclude_unset=True)
    await bucket.update({"$set": update_data})
    return await BucketList.get(id)

# 6. 삭제
@router.delete("/{id}")
async def delete_bucket(id: PydanticObjectId):
    bucket = await BucketList.get(id)
    if not bucket:
        raise HTTPException(status_code=404, detail="Not found")
    await bucket.delete()
    return {"message": "Deleted"}

# 7. 코멘트 추가
@router.post("/{id}/comments", response_model=BucketList)
async def add_comment(id: PydanticObjectId, comment: Comment):
    bucket = await BucketList.get(id)
    if not bucket:
        raise HTTPException(status_code=404, detail="Not found")
    
    comment.created_at = datetime.now()
    bucket.comments.append(comment)
    bucket.updated_at = datetime.now()
    await bucket.save()
    return bucket

# 8. 코멘트 삭제
@router.delete("/{id}/comments/{comment_id}")
async def delete_comment(id: PydanticObjectId, comment_id: str):
    bucket = await BucketList.get(id)
    if not bucket:
        raise HTTPException(status_code=404, detail="Not found")
    
    bucket.comments = [c for c in bucket.comments if c.id != comment_id]
    bucket.updated_at = datetime.now()
    await bucket.save()
    return bucket
