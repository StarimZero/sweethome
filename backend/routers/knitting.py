from datetime import datetime
from typing import List, Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException

from models.knitting import KnittingRecord
from models.user import User
from auth.security import get_current_user, assert_owner_or_admin


router = APIRouter(
    prefix="/api/knitting",
    tags=["Knitting"],
)


@router.get("", response_model=List[KnittingRecord])
async def get_all_records(
    q: Optional[str] = None,             # 작품 이름 / 실 / 태그 통합 검색
    status: Optional[str] = None,        # WAIT / CO / WIP / FO
    category: Optional[str] = None,      # KNITTING_CATEGORY 코드값
    sort: Optional[str] = "recent",      # recent / oldest / name
):
    # raw mongo 쿼리로 작성 (배열/중첩 필드 검색 안전성 확보)
    mongo_query: dict = {}

    if q:
        rx = {"$regex": q, "$options": "i"}
        mongo_query["$or"] = [
            {"name": rx},
            {"yarns.name": rx},
            {"tags": rx},
        ]
    if status and status != "all":
        mongo_query["status"] = status
    if category and category != "all":
        mongo_query["category"] = category

    query = KnittingRecord.find(mongo_query) if mongo_query else KnittingRecord.find_all()

    if sort == "oldest":
        query = query.sort("+start_date")
    elif sort == "name":
        query = query.sort("+name")
    else:  # recent
        query = query.sort("-created_at")

    return await query.to_list()


@router.post("", response_model=KnittingRecord)
async def add_record(record: KnittingRecord, current_user: User = Depends(get_current_user)):
    now = datetime.now()
    record.created_by = current_user.id
    record.created_at = now
    record.updated_at = now
    await record.insert()
    return record


@router.get("/{id}", response_model=KnittingRecord)
async def get_record(id: PydanticObjectId):
    record = await KnittingRecord.get(id)
    if not record:
        raise HTTPException(status_code=404, detail="Knitting record not found")
    return record


@router.put("/{id}", response_model=KnittingRecord)
async def update_record(
    id: PydanticObjectId,
    record_data: KnittingRecord,
    current_user: User = Depends(get_current_user),
):
    record = await KnittingRecord.get(id)
    if not record:
        raise HTTPException(status_code=404, detail="Knitting record not found")
    assert_owner_or_admin(record, current_user)

    update_query = record_data.dict(exclude_unset=True)
    update_query.pop("created_by", None)
    update_query["updated_at"] = datetime.now()
    await record.set(update_query)
    return record


@router.delete("/{id}")
async def delete_record(
    id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    record = await KnittingRecord.get(id)
    if not record:
        raise HTTPException(status_code=404, detail="Knitting record not found")
    assert_owner_or_admin(record, current_user)
    await record.delete()
    return {"message": "Successfully deleted"}
