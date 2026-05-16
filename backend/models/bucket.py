from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class Comment(BaseModel):
    """버킷리스트 코멘트 (임베디드 문서)"""
    id: str = Field(default_factory=lambda: str(PydanticObjectId()))
    created_by: Optional[PydanticObjectId] = None  # 작성자 user_id
    content: str
    created_at: datetime = Field(default_factory=datetime.now)

class BucketList(Document):
    """버킷리스트 문서"""
    title: str
    description: Optional[str] = None
    category: str  # travel, hobby, challenge, couple
    target_date: Optional[str] = None
    progress: int = 0  # 0~100
    status: str = "not_started"  # not_started, active, completed
    completed_at: Optional[datetime] = None
    image_url: Optional[str] = None  # 이미지 URL
    comments: List[Comment] = []
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    created_by: Optional[PydanticObjectId] = None  # 작성자 user_id

    class Settings:
        name = "bucketlist"

    class Config:
        json_encoders = {PydanticObjectId: str}
