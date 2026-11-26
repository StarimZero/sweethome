from datetime import datetime
from typing import List, Optional

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field


class BuzzwordAudioRef(BaseModel):
    """유행어에 딸린 녹음 1개의 요약. 소리 데이터는 buzzword_audios 에 따로 있음."""
    audio_id: PydanticObjectId
    label: str = ""                # 예: 보구치 버전
    duration_sec: float = 0
    size_bytes: int = 0
    created_by: Optional[PydanticObjectId] = None
    created_at: datetime = Field(default_factory=datetime.now)


class Buzzword(Document):
    """우리집 유행어. 1건 = 유행어 1개"""
    phrase: str                              # 유행어
    meaning: str = ""                        # 뜻 / 쓰는 상황
    origin_story: str = ""                   # 어떻게 생겼나
    example: str = ""                        # 예문
    started_at: str = ""                     # 생긴 때 'YYYY-MM'
    started_by: str = ""                     # husband / wife / both
    status: str = "ACTIVE"                   # ACTIVE(요즘 씀) / SOMETIMES(가끔 씀) / RETIRED(이제 안 씀)
    retired_at: str = ""                     # 안 쓰게 된 때 'YYYY-MM'
    comment_husband: str = ""
    comment_wife: str = ""
    audios: List[BuzzwordAudioRef] = []

    created_by: Optional[PydanticObjectId] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "buzzwords"


class BuzzwordAudio(Document):
    """녹음 파일 자체 (모노 AAC .m4a 로 바꿔서 저장). 목록 조회가 무거워지지 않게 유행어와 따로 둠"""
    buzzword_id: PydanticObjectId
    data: bytes
    mime_type: str = "audio/mp4"
    size_bytes: int = 0
    original_bytes: int = 0                  # 바꾸기 전 크기 (얼마나 줄었는지)
    original_name: str = ""
    duration_sec: float = 0
    created_by: Optional[PydanticObjectId] = None
    created_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "buzzword_audios"
