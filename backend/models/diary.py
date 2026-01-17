from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class DiaryComment(BaseModel):
    """일기 코멘트 (임베디드 문서)"""
    id: str = Field(default_factory=lambda: str(PydanticObjectId()))
    author: str  # 남편/아내
    content: str
    created_at: datetime = Field(default_factory=datetime.now)

class Diary(Document):
    """일기 문서"""
    title: str
    content: str
    author: str  # husband, wife
    date: Optional[str] = None  # 사용자가 지정하는 날짜 (YYYY-MM-DD)
    mood: Optional[str] = None  # happy, sad, angry, tired, excited 등
    weather: Optional[str] = None  # sunny, cloudy, rainy, snowy
    image_url: Optional[str] = None
    comments: List[DiaryComment] = []
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "diaries"

    class Config:
        json_encoders = {PydanticObjectId: str}
