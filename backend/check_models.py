import google.generativeai as genai
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ .env 파일에서 GEMINI_API_KEY를 찾을 수 없습니다.")
else:
    genai.configure(api_key=api_key)
    
    print("--------------------------------------------------")
    print(f"🔑 API Key: {api_key[:5]}... 로 조회한 사용 가능한 모델 목록")
    print("--------------------------------------------------")
    
    try:
        count = 0
        # 'generateContent' (텍스트 생성) 기능이 있는 모델만 필터링
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"✅ 사용 가능: {m.name}")
                count += 1
        
        if count == 0:
            print("\n⚠️ 경고: 이 API 키로 사용할 수 있는 텍스트 생성 모델이 하나도 없습니다.")
            print("1. Google Cloud Console에서 'Vertex AI API' 또는 'Generative Language API'가 활성화되었는지 확인하세요.")
            print("2. 새로운 API 키를 발급받아 시도해보세요.")
            
    except Exception as e:
        print(f"❌ 모델 목록 조회 중 에러 발생: {e}")
