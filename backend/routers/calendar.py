from fastapi import APIRouter, HTTPException
from beanie import PydanticObjectId
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel
from models.calendar import CalendarEvent

router = APIRouter(prefix="/api/calendar", tags=["Calendar"])

# 음력→양력 변환 함수
def lunar_to_solar(year: int, month: int, day: int) -> Optional[date]:
    """음력 날짜를 양력으로 변환"""
    try:
        from korean_lunar_calendar import KoreanLunarCalendar
        calendar = KoreanLunarCalendar()
        calendar.setLunarDate(year, month, day, False)
        return date(calendar.solarYear, calendar.solarMonth, calendar.solarDay)
    except Exception:
        return None

# 양력→음력 변환 함수
def solar_to_lunar(year: int, month: int, day: int) -> Optional[tuple]:
    """양력 날짜를 음력으로 변환. (year, month, day) 튜플 반환"""
    try:
        from korean_lunar_calendar import KoreanLunarCalendar
        calendar = KoreanLunarCalendar()
        calendar.setSolarDate(year, month, day)
        return (calendar.lunarYear, calendar.lunarMonth, calendar.lunarDay)
    except Exception:
        return None

# 응답용 모델 (양력 변환 날짜 포함)
class CalendarEventResponse(BaseModel):
    id: Optional[str] = None
    title: str
    date: str
    end_date: Optional[str] = None
    memo: Optional[str] = None
    is_yearly: bool = False
    is_lunar: bool = False
    is_range: bool = False
    color: Optional[str] = None
    # 양력 변환된 날짜 (음력인 경우)
    solar_date: Optional[str] = None
    solar_end_date: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

def event_to_response(event: CalendarEvent, target_year: int) -> CalendarEventResponse:
    """이벤트를 응답 모델로 변환 (음력 변환 포함)"""
    response = CalendarEventResponse(
        id=str(event.id) if event.id else None,
        title=event.title,
        date=event.date,
        end_date=event.end_date,
        memo=event.memo,
        is_yearly=event.is_yearly,
        is_lunar=event.is_lunar,
        is_range=event.is_range,
        color=event.color,
        created_at=event.created_at,
        updated_at=event.updated_at
    )

    # 음력인 경우 양력으로 변환
    if event.is_lunar:
        try:
            parts = event.date.split('-')
            lunar_month = int(parts[1])
            lunar_day = int(parts[2])
            solar = lunar_to_solar(target_year, lunar_month, lunar_day)
            if solar:
                response.solar_date = solar.strftime('%Y-%m-%d')
        except Exception:
            pass

        # 종료일도 변환
        if event.end_date:
            try:
                parts = event.end_date.split('-')
                lunar_month = int(parts[1])
                lunar_day = int(parts[2])
                solar = lunar_to_solar(target_year, lunar_month, lunar_day)
                if solar:
                    response.solar_end_date = solar.strftime('%Y-%m-%d')
            except Exception:
                pass

    return response

# 1. 월별 이벤트 조회 (반복 이벤트, 음력, 기간 이벤트 포함)
@router.get("", response_model=List[CalendarEventResponse])
async def get_events(year: int, month: int):
    """
    해당 월의 이벤트 조회
    - 일반 이벤트: date가 해당 월에 속하는 것
    - 반복 이벤트: is_yearly=True이고 월/일이 일치하는 것
    - 음력 이벤트: 양력으로 변환하여 표시
    - 기간 이벤트: 시작일~종료일 범위가 해당 월과 겹치는 것
    """
    month_start = f"{year}-{month:02d}-01"
    month_end = f"{year}-{month:02d}-31"

    result = []

    # 모든 이벤트 조회
    all_events = await CalendarEvent.find_all().to_list()

    for event in all_events:
        # 매년 반복 이벤트
        if event.is_yearly:
            if event.is_lunar:
                # 음력 반복: 해당 연도와 전년도 모두 확인
                # (음력 12월은 양력으로 다음 해 1~2월이 되므로)
                try:
                    parts = event.date.split('-')
                    lunar_month = int(parts[1])
                    lunar_day = int(parts[2])

                    # 현재 연도와 전년도 모두 확인
                    for check_year in [year, year - 1]:
                        solar = lunar_to_solar(check_year, lunar_month, lunar_day)
                        if solar and solar.year == year and solar.month == month:
                            resp = event_to_response(event, check_year)
                            resp.solar_date = solar.strftime('%Y-%m-%d')
                            result.append(resp)
                            break
                except Exception:
                    pass
            else:
                # 양력 반복: 월만 비교
                try:
                    parts = event.date.split('-')
                    event_month = int(parts[1])
                    if event_month == month:
                        resp = event_to_response(event, year)
                        # 연도를 현재로 변경
                        resp.date = f"{year}{event.date[4:]}"
                        if event.end_date:
                            resp.end_date = f"{year}{event.end_date[4:]}"
                        result.append(resp)
                except Exception:
                    pass
        else:
            # 일반 이벤트 (반복 아님)
            if event.is_lunar:
                # 음력 일반 이벤트
                try:
                    parts = event.date.split('-')
                    event_year = int(parts[0])
                    lunar_month = int(parts[1])
                    lunar_day = int(parts[2])
                    solar = lunar_to_solar(event_year, lunar_month, lunar_day)
                    if solar and solar.year == year and solar.month == month:
                        resp = event_to_response(event, event_year)
                        result.append(resp)
                except Exception:
                    pass
            elif event.is_range:
                # 기간 이벤트: 범위가 해당 월과 겹치는지 확인
                event_start = event.date
                event_end = event.end_date or "9999-12-31"  # 미정이면 무한대로 처리

                # 범위가 겹치는지 확인
                if event_start <= month_end and event_end >= month_start:
                    result.append(event_to_response(event, year))
            else:
                # 일반 단일 이벤트
                if month_start <= event.date <= month_end:
                    result.append(event_to_response(event, year))

    return result

# 2. 한국 공휴일 조회 (/{id} 보다 먼저 정의해야 함)
class Holiday(BaseModel):
    date: str
    name: str
    is_lunar: bool = False

@router.get("/holidays/{year}", response_model=List[Holiday])
async def get_holidays(year: int):
    """해당 연도의 한국 공휴일 반환"""
    holidays = []

    # 고정 공휴일 (양력)
    fixed_holidays = [
        (1, 1, "신정"),
        (3, 1, "삼일절"),
        (5, 5, "어린이날"),
        (6, 6, "현충일"),
        (8, 15, "광복절"),
        (10, 3, "개천절"),
        (10, 9, "한글날"),
        (12, 25, "크리스마스"),
    ]

    for month, day, name in fixed_holidays:
        holidays.append(Holiday(
            date=f"{year}-{month:02d}-{day:02d}",
            name=name,
            is_lunar=False
        ))

    # 음력 공휴일
    lunar_holidays = [
        (1, 1, "설날"),
        (4, 8, "석가탄신일"),
        (8, 15, "추석"),
    ]

    for lunar_month, lunar_day, name in lunar_holidays:
        solar = lunar_to_solar(year, lunar_month, lunar_day)
        if solar:
            holidays.append(Holiday(
                date=solar.strftime('%Y-%m-%d'),
                name=name,
                is_lunar=True
            ))

            # 설날, 추석은 전날/다음날도 공휴일
            if name in ["설날", "추석"]:
                # 전날
                prev_day = lunar_to_solar(year, lunar_month, lunar_day - 1) if lunar_day > 1 else None
                if prev_day:
                    holidays.append(Holiday(
                        date=prev_day.strftime('%Y-%m-%d'),
                        name=f"{name} 연휴",
                        is_lunar=True
                    ))
                # 다음날
                next_day = lunar_to_solar(year, lunar_month, lunar_day + 1)
                if next_day:
                    holidays.append(Holiday(
                        date=next_day.strftime('%Y-%m-%d'),
                        name=f"{name} 연휴",
                        is_lunar=True
                    ))

    # 날짜순 정렬
    holidays.sort(key=lambda h: h.date)
    return holidays

# 3. 상세 조회
@router.get("/{id}", response_model=CalendarEventResponse)
async def get_event(id: PydanticObjectId):
    event = await CalendarEvent.get(id)
    if not event:
        raise HTTPException(status_code=404, detail="Not found")
    # 음력 이벤트인 경우 저장된 날짜의 연도로 양력 변환
    target_year = int(event.date.split('-')[0]) if event.date else datetime.now().year
    return event_to_response(event, target_year)

# 양력 날짜를 음력으로 변환하여 저장용 문자열로 반환
def convert_solar_date_to_lunar_str(date_str: str) -> Optional[str]:
    """양력 날짜 문자열(YYYY-MM-DD)을 음력으로 변환하여 YYYY-MM-DD 문자열로 반환"""
    try:
        parts = date_str.split('-')
        y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
        result = solar_to_lunar(y, m, d)
        if result:
            ly, lm, ld = result
            return f"{ly}-{lm:02d}-{ld:02d}"
    except Exception:
        pass
    return None

# 3. 등록
@router.post("", response_model=CalendarEvent)
async def create_event(event: CalendarEvent):
    # 음력 체크 시: 입력된 양력 날짜를 음력으로 변환하여 저장
    if event.is_lunar:
        lunar_date = convert_solar_date_to_lunar_str(event.date)
        if lunar_date:
            event.date = lunar_date
        if event.end_date:
            lunar_end = convert_solar_date_to_lunar_str(event.end_date)
            if lunar_end:
                event.end_date = lunar_end

    event.created_at = datetime.now()
    event.updated_at = datetime.now()
    await event.insert()
    return event

# 4. 수정
@router.put("/{id}", response_model=CalendarEvent)
async def update_event(id: PydanticObjectId, data: CalendarEvent):
    event = await CalendarEvent.get(id)
    if not event:
        raise HTTPException(status_code=404, detail="Not found")

    # 음력 체크 시: 입력된 양력 날짜를 음력으로 변환하여 저장
    if data.is_lunar:
        lunar_date = convert_solar_date_to_lunar_str(data.date)
        if lunar_date:
            data.date = lunar_date
        if data.end_date:
            lunar_end = convert_solar_date_to_lunar_str(data.end_date)
            if lunar_end:
                data.end_date = lunar_end

    data.updated_at = datetime.now()
    update_data = data.model_dump(exclude_unset=True)
    await event.update({"$set": update_data})
    return await CalendarEvent.get(id)

# 5. 삭제
@router.delete("/{id}")
async def delete_event(id: PydanticObjectId):
    event = await CalendarEvent.get(id)
    if not event:
        raise HTTPException(status_code=404, detail="Not found")
    await event.delete()
    return {"message": "Deleted"}
