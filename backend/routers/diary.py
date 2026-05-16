from fastapi import APIRouter, Depends, HTTPException
from beanie import PydanticObjectId
from typing import List, Optional
from datetime import datetime
from models.diary import Diary, DiaryComment
from models.user import User
from auth.security import get_current_user, assert_owner_or_admin

router = APIRouter(prefix="/api/diary", tags=["Diary"])

# 1. 목록 조회 (검색/필터 지원)
@router.get("", response_model=List[Diary])
async def get_diaries(
    keyword: Optional[str] = None,
    created_by: Optional[str] = None,
    mood: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    query = {}

    if keyword:
        query["$or"] = [
            {"title": {"$regex": keyword, "$options": "i"}},
            {"content": {"$regex": keyword, "$options": "i"}}
        ]

    if created_by:
        try:
            query["created_by"] = PydanticObjectId(created_by)
        except Exception:
            pass

    if mood:
        query["mood"] = mood

    if date_from or date_to:
        query["date"] = {}
        if date_from:
            query["date"]["$gte"] = date_from
        if date_to:
            query["date"]["$lte"] = date_to

    return await Diary.find(query).sort("-date", "-created_at").to_list()

# 2. 상세 조회
@router.get("/{id}", response_model=Diary)
async def get_diary(id: PydanticObjectId):
    diary = await Diary.get(id)
    if not diary:
        raise HTTPException(status_code=404, detail="Not found")
    return diary

# 3. 등록
@router.post("", response_model=Diary)
async def create_diary(diary: Diary, current_user: User = Depends(get_current_user)):
    diary.created_by = current_user.id
    diary.created_at = datetime.now()
    diary.updated_at = datetime.now()
    await diary.insert()
    return diary

# 4. 수정
@router.put("/{id}", response_model=Diary)
async def update_diary(
    id: PydanticObjectId,
    data: Diary,
    current_user: User = Depends(get_current_user),
):
    diary = await Diary.get(id)
    if not diary:
        raise HTTPException(status_code=404, detail="Not found")
    assert_owner_or_admin(diary, current_user)

    data.updated_at = datetime.now()
    update_data = data.model_dump(exclude_unset=True)
    update_data.pop("created_by", None)
    await diary.update({"$set": update_data})
    return await Diary.get(id)

# 5. 삭제
@router.delete("/{id}")
async def delete_diary(
    id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    diary = await Diary.get(id)
    if not diary:
        raise HTTPException(status_code=404, detail="Not found")
    assert_owner_or_admin(diary, current_user)
    await diary.delete()
    return {"message": "Deleted"}

# 6. 코멘트 추가
@router.post("/{id}/comments", response_model=Diary)
async def add_comment(
    id: PydanticObjectId,
    comment: DiaryComment,
    current_user: User = Depends(get_current_user),
):
    diary = await Diary.get(id)
    if not diary:
        raise HTTPException(status_code=404, detail="Not found")

    comment.created_by = current_user.id
    comment.created_at = datetime.now()
    diary.comments.append(comment)
    diary.updated_at = datetime.now()
    await diary.save()
    return diary

# 7. 코멘트 삭제 (본인 코멘트 또는 admin만)
@router.delete("/{id}/comments/{comment_id}")
async def delete_comment(
    id: PydanticObjectId,
    comment_id: str,
    current_user: User = Depends(get_current_user),
):
    diary = await Diary.get(id)
    if not diary:
        raise HTTPException(status_code=404, detail="Not found")

    role = getattr(current_user, "role", "member")
    target = next((c for c in diary.comments if c.id == comment_id), None)
    if target and role != "admin" and str(getattr(target, "created_by", "")) != str(current_user.id):
        raise HTTPException(status_code=403, detail="본인 코멘트만 삭제할 수 있습니다.")

    diary.comments = [c for c in diary.comments if c.id != comment_id]
    diary.updated_at = datetime.now()
    await diary.save()
    return diary
