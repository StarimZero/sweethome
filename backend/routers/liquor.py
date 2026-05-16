from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from beanie import PydanticObjectId
from typing import List, Optional
from models.liquor import LiquorReview, AINote
from models.user import User
from auth.security import get_current_user, assert_owner_or_admin
from datetime import datetime
import google.generativeai as genai
import os
import json
import re

router = APIRouter(prefix="/api/liquor", tags=["Liquor"])


async def analyze_liquor_background(liquor_id: str, liquor_name: str):
    """
    백그라운드에서 Gemini API를 호출하여 술 정보를 분석하고 DB를 업데이트합니다.
    (Model: gemini-2.5-flash)
    """
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("❌ GEMINI_API_KEY가 설정되지 않아 AI 분석을 건너뜁니다.")
            return

        genai.configure(api_key=api_key)
        
        # 안전 필터 해제
        safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ]

        model = genai.GenerativeModel('gemini-2.5-flash', safety_settings=safety_settings)
        
        prompt = f"""
        당신은 전문 소믈리에입니다. 다음 술에 대한 정보를 분석해주세요.
        술 이름: {liquor_name}
        
        다음 5가지 항목을 JSON 형식으로만 답해주세요. 다른 말은 절대 하지 말고 오직 JSON 객체만 반환하세요.
        키 이름: description, taste, aroma, variety, pairing
        
        {{
            "description": "이 술에 대한 흥미로운 1~2문장 소개 (한국어)",
            "taste": "맛의 특징 (단맛, 쓴맛, 바디감 등)",
            "aroma": "향의 특징 (과일, 오크, 바닐라 등)",
            "variety": "품종 또는 원료 (모르면 '정보 없음'이라 적으세요)",
            "pairing": "잘 어울리는 음식 추천 1~2개"
        }}
        """
        
        response = await model.generate_content_async(prompt)
        
        raw_text = response.text
        
        # [핵심] 정규식으로 JSON 부분({ ... })만 추출
        # re.DOTALL: 줄바꿈이 포함되어 있어도 매칭되도록 함
        json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        
        if json_match:
            json_str = json_match.group()
        else:
            # 매칭 실패 시 수동 정제 시도
            json_str = raw_text.replace("``````", "").strip()
        
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError:
            print(f"⚠️ JSON 파싱 실패. 원본: {raw_text}")
            # 파싱 실패 시 원본 텍스트라도 description에 넣어서 DB 저장
            data = {
                "description": raw_text[:300], # 너무 길면 자름
                "taste": "-", "aroma": "-", "variety": "-", "pairing": "-"
            }

        # DB 업데이트
        liquor = await LiquorReview.get(PydanticObjectId(liquor_id))
        if liquor:
            liquor.ai_note = AINote(
                status="COMPLETED",
                description=data.get("description", ""),
                taste=data.get("taste", ""),
                aroma=data.get("aroma", ""),
                variety=data.get("variety", ""),
                pairing=data.get("pairing", "")
            )
            await liquor.save()
            print(f"✅ AI Analysis Completed for {liquor_name} (Model: gemini-2.5-flash)")
            
    except Exception as e:
        print(f"❌ AI Background Error: {e}")
        liquor = await LiquorReview.get(PydanticObjectId(liquor_id))
        if liquor:
            liquor.ai_note.status = "FAILED"
            await liquor.save()



# 1. 목록 조회
@router.get("", response_model=List[LiquorReview])
async def get_liquors(
    name: Optional[str] = None,
    category: Optional[str] = None,
     wine_type: Optional[str] = None,  # [추가] 와인 종류 필터
    purchase_place: Optional[str] = None,
    pairing_food: Optional[str] = None,
    comment: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_rating_husband: Optional[float] = None,
    max_rating_husband: Optional[float] = None,
    min_rating_wife: Optional[float] = None,
    max_rating_wife: Optional[float] = None,
):
    query = {}
    
    if name: query["name"] = {"$regex": name, "$options": "i"}
    if category: query["category"] = category
    if wine_type: query["wine_type"] = wine_type  # [추가]
    if purchase_place: query["purchase_place"] = {"$regex": purchase_place, "$options": "i"}
    if pairing_food: query["pairing_foods"] = {"$regex": pairing_food, "$options": "i"}

    if comment:
        query["$or"] = [
            {"comment_husband": {"$regex": comment, "$options": "i"}},
            {"comment_wife": {"$regex": comment, "$options": "i"}}
        ]

    # 가격 범위
    if min_price is not None or max_price is not None:
        price_query = {}
        if min_price is not None: price_query["$gte"] = min_price
        if max_price is not None: price_query["$lte"] = max_price
        query["price"] = price_query

    # 날짜 범위
    if start_date or end_date:
        date_query = {}
        if start_date: date_query["$gte"] = start_date
        if end_date: date_query["$lte"] = end_date
        query["visit_date"] = date_query

    # 평점 범위 (남편)
    if min_rating_husband is not None or max_rating_husband is not None:
        rating_h_query = {}
        if min_rating_husband is not None: rating_h_query["$gte"] = min_rating_husband
        if max_rating_husband is not None: rating_h_query["$lte"] = max_rating_husband
        query["rating_husband"] = rating_h_query

    # 평점 범위 (아내)
    if min_rating_wife is not None or max_rating_wife is not None:
        rating_w_query = {}
        if min_rating_wife is not None: rating_w_query["$gte"] = min_rating_wife
        if max_rating_wife is not None: rating_w_query["$lte"] = max_rating_wife
        query["rating_wife"] = rating_w_query

    return await LiquorReview.find(query).sort("-visit_date", "-created_at").to_list()


# 2. 등록 (AI 분석 자동 요청)
@router.post("", response_model=LiquorReview)
async def create_liquor(
    liquor: LiquorReview,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    liquor.created_by = current_user.id
    liquor.created_at = datetime.now()
    liquor.updated_at = datetime.now()
    
    # 통합 평점(rating) 계산 (남편+아내 평균)
    scores = []
    if liquor.rating_husband: scores.append(liquor.rating_husband)
    if liquor.rating_wife: scores.append(liquor.rating_wife)
    if scores:
        liquor.rating = round(sum(scores) / len(scores), 1)
    else:
        liquor.rating = 0.0

    # 초기 AI 상태는 PENDING
    liquor.ai_note.status = "PENDING"
    
    await liquor.insert()

    # 백그라운드에서 AI 분석 시작
    background_tasks.add_task(analyze_liquor_background, str(liquor.id), liquor.name)

    return liquor


# 3. 상세 조회
@router.get("/{id}", response_model=LiquorReview)
async def get_liquor(id: PydanticObjectId):
    liquor = await LiquorReview.get(id)
    if not liquor:
        raise HTTPException(status_code=404, detail="Not found")
    return liquor


# 4. 수정 (이름 변경 시 AI 재분석)
@router.put("/{id}", response_model=LiquorReview)
async def update_liquor(
    id: PydanticObjectId,
    liquor_data: LiquorReview,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    liquor = await LiquorReview.get(id)
    if not liquor:
        raise HTTPException(status_code=404, detail="Not found")
    assert_owner_or_admin(liquor, current_user)

    old_name = liquor.name

    # 업데이트할 데이터 준비
    update_data = liquor_data.dict(exclude_unset=True)
    update_data.pop("created_by", None)
    update_data["updated_at"] = datetime.now()
    
    # 평점 재계산
    r_h = update_data.get("rating_husband", liquor.rating_husband)
    r_w = update_data.get("rating_wife", liquor.rating_wife)
    scores = []
    if r_h: scores.append(float(r_h))
    if r_w: scores.append(float(r_w))
    
    new_rating = round(sum(scores) / len(scores), 1) if scores else 0.0
    update_data["rating"] = new_rating
    
    # DB 업데이트 수행
    await liquor.update({"$set": update_data})
    
    # 새로 업데이트된 객체 가져오기
    updated_liquor = await LiquorReview.get(id)

    # 이름이 바뀌었으면 AI 재분석 요청
    new_name = update_data.get("name", old_name)
    if new_name != old_name:
        print(f"🔄 술 이름 변경됨 ({old_name} -> {new_name}). AI 재분석 요청...")
        updated_liquor.ai_note.status = "PENDING"
        await updated_liquor.save()
        background_tasks.add_task(analyze_liquor_background, str(id), new_name)
        
    return updated_liquor


# 5. 삭제
@router.delete("/{id}")
async def delete_liquor(
    id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    liquor = await LiquorReview.get(id)
    if not liquor:
        raise HTTPException(status_code=404, detail="Not found")
    assert_owner_or_admin(liquor, current_user)
    await liquor.delete()
    return {"message": "Deleted"}
