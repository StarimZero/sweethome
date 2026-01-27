from beanie import Document, PydanticObjectId
from pydantic import Field
from typing import Optional
from datetime import datetime

class CalendarEvent(Document):
    """캘린더 이벤트 문서"""
    title: str
    date: str  # YYYY-MM-DD (시작일)
    end_date: Optional[str] = None  # YYYY-MM-DD (종료일, null이면 미정 또는 단일 이벤트)
    memo: Optional[str] = None
    is_yearly: bool = False  # 매년 반복 여부
    is_lunar: bool = False  # 음력 여부
    is_range: bool = False  # 기간 이벤트 여부
    color: Optional[str] = None  # 색상 (#hex)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "calendar_events"

    class Config:
        json_encoders = {PydanticObjectId: str}
