from fastapi import APIRouter, HTTPException
from typing import List
from beanie import PydanticObjectId
from models import CommonCode

router = APIRouter(
    prefix="/api/code",
    tags=["Common Code"]
)

# 1. 전체 코드 목록 조회 (관리자용)
@router.get("/", response_model=List[CommonCode])
async def get_all_codes():
    return await CommonCode.find_all().sort(+CommonCode.group_code, +CommonCode.sort_order).to_list()

# 2. 특정 그룹의 코드만 조회 (일반 사용자용 - 드롭다운 등에 사용)
@router.get("/group/{group_code}", response_model=List[CommonCode])
async def get_codes_by_group(group_code: str):
    return await CommonCode.find(
        CommonCode.group_code == group_code,
        CommonCode.use_yn == "Y"
    ).sort(+CommonCode.sort_order).to_list()

# 3. 코드 등록
@router.post("/", response_model=CommonCode)
async def add_code(code: CommonCode):
    await code.insert()
    return code

# 4. 코드 수정
@router.put("/{id}", response_model=CommonCode)
async def update_code(id: PydanticObjectId, code_data: CommonCode):
    code = await CommonCode.get(id)
    if not code:
        raise HTTPException(status_code=404, detail="Code not found")
    
    update_query = code_data.dict(exclude_unset=True)
    await code.set(update_query)
    return code

# 5. 코드 삭제
@router.delete("/{id}")
async def delete_code(id: PydanticObjectId):
    code = await CommonCode.get(id)
    if not code:
        raise HTTPException(status_code=404, detail="Code not found")
    
    await code.delete()
    return {"message": "Deleted"}

@router.get("/{id}", response_model=CommonCode)
async def get_code(id: PydanticObjectId):
    code = await CommonCode.get(id)
    if not code:
        raise HTTPException(status_code=404, detail="Code not found")
    return code