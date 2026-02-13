from beanie import Document, PydanticObjectId
from pydantic import Field
from typing import Optional

class FamilyMember(Document):
    id: Optional[PydanticObjectId] = Field(None, alias="_id")
    name: str                          # 이름
    gender: str                        # male / female
    birth_date: Optional[str] = None   # YYYY-MM-DD
    side: str                          # husband(친가) / wife(외가)
    relation_type: str                 # 본인, 부, 모, 조부, 조모, 형제, 자매, 자녀 등
    parent_id: Optional[str] = None    # 부모 ID (트리 연결용)
    spouse_id: Optional[str] = None    # 배우자 ID
    sibling_of: Optional[str] = None   # 누구의 형제인지 (형제 추가 시 기준 멤버 ID)
    generation: int = 0                # 세대 (0=본인, 1=부모, 2=조부모, -1=자녀)
    memo: Optional[str] = None         # 메모

    class Settings:
        name = "family_members"

    class Config:
        populate_by_name = True
        json_encoders = {PydanticObjectId: str}
