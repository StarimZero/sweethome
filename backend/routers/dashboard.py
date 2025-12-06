from fastapi import APIRouter
from datetime import date

router = APIRouter(
    prefix="/api/couple",  # 주소도 couple로 변경
    tags=["Couple"]
)

@router.get("/home")
def get_couple_home():
    # 예시 데이터 (나중에는 DB에서 진짜 데이터를 가져옵니다)
    start_date = date(2022, 11, 10)
    wedding_day = date(2025, 10, 18)
    today = date.today()
    d_day = (today - start_date).days + 1
    w_day = (today - wedding_day).days + 1
    
    return {
        "couple_name": "호랭이연고부부",
        "d_day": d_day,
        "Wedding" : w_day
    }
