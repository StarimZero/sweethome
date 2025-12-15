import os
import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json

router = APIRouter(prefix="/api/ai", tags=["AI"])

API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

class LiquorRequest(BaseModel):
    name: str

@router.post("/analyze-liquor")
async def analyze_liquor(request: LiquorRequest):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="AI API Key Missing")

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # [수정] 5가지 항목 요청
        prompt = f"""
        술 이름: {request.name}
        
        이 술에 대한 정보를 다음 5가지 항목으로 JSON 형식으로만 답해주세요.
        키(key) 이름은 반드시 아래 영어 단어를 사용하세요.
        
        {{
            "description": "이 술에 대한 1~2문장 소개 (한국어)",
            "taste": "맛의 특징 (단맛, 쓴맛, 바디감 등)",
            "aroma": "향의 특징 (과일, 오크, 바닐라 등)",
            "variety": "품종 또는 원료 (예: 피노 누아, 보리, 쌀)",
            "pairing": "잘 어울리는 음식 추천"
        }}
        """
        
        response = model.generate_content(prompt)
        text = response.text.replace("``````", "").strip()
        
        # JSON 유효성 검사 겸 파싱 확인
        try:
            json.loads(text) # 파싱이 되는지 테스트
            return {"result": text}
        except:
            # AI가 가끔 JSON 형식을 깨뜨릴 때 대비
            return {"result": json.dumps({
                "description": "정보를 불러오는 데 실패했습니다.",
                "taste": "-", "aroma": "-", "variety": "-", "pairing": "-"
            })}
        
    except Exception as e:
        print(f"AI Error: {e}")
        raise HTTPException(status_code=500, detail="AI Error")
