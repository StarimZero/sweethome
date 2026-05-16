from beanie import Document, PydanticObjectId
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class Gauge(BaseModel):
    """10cm × 10cm 게이지"""
    stitches: Optional[int] = None  # 코
    rows: Optional[int] = None      # 단


class Yarn(BaseModel):
    """사용한 실 한 종류"""
    name: str = ""
    lot: str = ""
    amount: Optional[float] = None
    unit: str = "볼"  # YARN_UNIT 코드값


class Cost(BaseModel):
    """비용 + 통화"""
    amount: Optional[float] = None
    currency: str = "KRW"  # CURRENCY 코드값


class Pattern(BaseModel):
    """도안 정보"""
    name: str = ""
    designer: str = ""
    source: str = ""


class WorkLog(BaseModel):
    """작업 일지 한 줄"""
    date: str = ""   # YYYY-MM-DD
    memo: str = ""


class KnittingRecord(Document):
    # === 기본 정보 ===
    name: str                                # 작품 이름 (필수)
    category: Optional[str] = None           # KNITTING_CATEGORY 코드값
    status: str = "WAIT"                     # KNITTING_STATUS 코드값
    size: Optional[str] = None
    start_date: Optional[str] = None         # YYYY-MM-DD
    end_date: Optional[str] = None
    difficulty: Optional[float] = None       # 0.0 ~ 5.0

    # === 도안 정보 ===
    pattern: Pattern = Pattern()

    # === 바늘 & 게이지 ===
    orig_needles: List[str] = []
    my_needles: List[str] = []
    orig_gauge: Gauge = Gauge()
    my_gauge_before: Gauge = Gauge()
    my_gauge_after: Gauge = Gauge()
    current_row: Optional[str] = None
    frog_count: Optional[int] = None         # 풀고 다시 뜬 횟수

    # === 실 정보 ===
    yarns: List[Yarn] = []
    size_before_wash: Optional[str] = None
    size_after_wash: Optional[str] = None
    wash_method: Optional[str] = None

    # === 기법 / 태그 ===
    techniques: List[str] = []               # KNITTING_TECHNIQUE 코드값 배열
    tags: List[str] = []                     # 자유 태그

    # === 작업 일지 ===
    work_logs: List[WorkLog] = []

    # === URL ===
    ref_urls: List[str] = []
    image_urls: List[str] = []               # image_urls[0] = 썸네일

    # === 추가 정보 ===
    purpose: Optional[str] = None            # KNITTING_PURPOSE 코드값
    wear_freq: Optional[str] = None          # KNITTING_WEAR_FREQ 코드값
    pattern_cost: Cost = Cost()
    yarn_cost: Cost = Cost()

    # === 코멘트 & 평점 ===
    wife_comment: Optional[str] = None
    husband_comment: Optional[str] = None
    wife_rating: Optional[float] = None      # 0.0 ~ 5.0
    husband_rating: Optional[float] = None
    redo_note: Optional[str] = None          # 다시 만든다면

    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

    created_by: Optional[PydanticObjectId] = None  # 작성자 user_id

    class Settings:
        name = "knitting_records"
