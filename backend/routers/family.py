from fastapi import APIRouter, HTTPException
from typing import List, Optional
from beanie import PydanticObjectId
from pydantic import BaseModel
from models.family import FamilyMember

# 부분 업데이트용 모델
class FamilyMemberUpdate(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = None
    birth_date: Optional[str] = None
    side: Optional[str] = None
    relation_type: Optional[str] = None
    parent_id: Optional[str] = None
    spouse_id: Optional[str] = None
    sibling_of: Optional[str] = None
    generation: Optional[int] = None
    memo: Optional[str] = None

router = APIRouter(
    prefix="/api/family",
    tags=["Family"]
)

@router.get("", response_model=List[FamilyMember])
async def get_all_members(side: Optional[str] = None):
    """전체 가족 구성원 목록 조회 (side 필터 지원)"""
    if side:
        return await FamilyMember.find(FamilyMember.side == side).to_list()
    return await FamilyMember.find_all().to_list()

@router.get("/tree")
async def get_family_tree(side: Optional[str] = None):
    """트리 구조로 가족 구성원 반환"""
    if side:
        members = await FamilyMember.find(FamilyMember.side == side).to_list()
    else:
        members = await FamilyMember.find_all().to_list()

    # 세대별로 그룹화
    generations = {}
    for member in members:
        gen = member.generation
        if gen not in generations:
            generations[gen] = []
        generations[gen].append(member)

    # 세대 순으로 정렬 (높은 세대 = 조상부터)
    sorted_generations = dict(sorted(generations.items(), key=lambda x: -x[0]))

    return {
        "members": members,
        "generations": sorted_generations
    }

@router.post("", response_model=FamilyMember)
async def add_member(member: FamilyMember):
    """가족 구성원 등록"""
    await member.insert()

    # 배우자 연결이 있으면 상대방도 업데이트
    if member.spouse_id:
        spouse = await FamilyMember.get(PydanticObjectId(member.spouse_id))
        if spouse and not spouse.spouse_id:
            await spouse.set({"spouse_id": str(member.id)})

    return member

@router.get("/{id}", response_model=FamilyMember)
async def get_member(id: PydanticObjectId):
    """가족 구성원 상세 조회"""
    member = await FamilyMember.get(id)
    if not member:
        raise HTTPException(status_code=404, detail="Family member not found")
    return member

@router.put("/{id}", response_model=FamilyMember)
async def update_member(id: PydanticObjectId, member_data: FamilyMember):
    """가족 구성원 수정 (전체)"""
    member = await FamilyMember.get(id)
    if not member:
        raise HTTPException(status_code=404, detail="Family member not found")

    update_query = member_data.dict(exclude_unset=True)
    await member.set(update_query)
    return member

@router.patch("/{id}", response_model=FamilyMember)
async def partial_update_member(id: PydanticObjectId, member_data: FamilyMemberUpdate):
    """가족 구성원 부분 수정"""
    member = await FamilyMember.get(id)
    if not member:
        raise HTTPException(status_code=404, detail="Family member not found")

    update_data = member_data.dict(exclude_unset=True, exclude_none=True)
    if update_data:
        await member.set(update_data)
    return member

@router.delete("/{id}")
async def delete_member(id: PydanticObjectId):
    """가족 구성원 삭제"""
    member = await FamilyMember.get(id)
    if not member:
        raise HTTPException(status_code=404, detail="Family member not found")

    # 배우자 연결 해제
    if member.spouse_id:
        spouse = await FamilyMember.get(PydanticObjectId(member.spouse_id))
        if spouse and spouse.spouse_id == str(member.id):
            await spouse.set({"spouse_id": None})

    # 자녀의 parent_id 연결 해제
    children = await FamilyMember.find(FamilyMember.parent_id == str(member.id)).to_list()
    for child in children:
        await child.set({"parent_id": None})

    await member.delete()
    return {"message": "Successfully deleted"}
