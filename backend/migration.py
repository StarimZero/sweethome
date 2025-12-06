import asyncio
import pandas as pd
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from models.review import Review
from models.system.common_code import CommonCode 
import os
from dotenv import load_dotenv

async def insert_data():
    # 1. 환경 설정
    load_dotenv()
    db_url = os.getenv("DATABASE_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(db_url)
    
    # Review와 CommonCode 모델 모두 초기화
    await init_beanie(database=client.sweethome, document_models=[Review, CommonCode])
    
    print("🚀 마이그레이션 시작...")

    # 2. 엑셀 파일 읽기
    file_path = "gijonpyeongjeom.xlsx"
    try:
        df = pd.read_excel(file_path)
    except FileNotFoundError:
        print(f"❌ 오류: '{file_path}' 파일을 찾을 수 없습니다. backend 폴더에 넣어주세요.")
        return

    # [핵심 1] 컬럼 이름 강제 지정 (엑셀 헤더가 이상해도 순서만 맞으면 됨)
    # 엑셀의 A, B, C, D, E, F 열 순서대로 매핑
    # 데이터가 있는 컬럼 수만큼만 이름을 할당
    needed_columns = ['분류', '업장명', '남편평점', '아내평점', '남편코멘트', '아내코멘트']
    if len(df.columns) >= 6:
        df.columns.values[:6] = needed_columns
    else:
        print("⚠️ 경고: 엑셀 컬럼 개수가 부족합니다. 코멘트가 없을 수 있습니다.")
        # 가능한 만큼만 매핑
        df.columns.values[:len(df.columns)] = needed_columns[:len(df.columns)]

    # 3. 데이터 전처리
    df['분류'] = df['분류'].fillna(method='ffill') # 분류 빈칸 채우기
    df = df.dropna(subset=['업장명'])             # 업장명 없는 행 삭제
    
    # 코멘트가 없는 경우(NaN) 처리
    if '남편코멘트' in df.columns:
        df['남편코멘트'] = df['남편코멘트'].fillna("코멘트 없음")
    else:
        df['남편코멘트'] = "코멘트 없음"
        
    if '아내코멘트' in df.columns:
        df['아내코멘트'] = df['아내코멘트'].fillna("코멘트 없음")
    else:
        df['아내코멘트'] = "코멘트 없음"

    # 평점 처리
    df['남편평점'] = df['남편평점'].fillna(0.0)
    df['아내평점'] = df['아내평점'].fillna(0.0)

    reviews_data = df.to_dict('records')
    
    # 4. 코드 매핑 준비
    # DB에 있는 모든 FOOD 그룹 코드 가져오기
    existing_codes = await CommonCode.find(CommonCode.group_code == "FOOD").to_list()
    
    # 이름 -> ID 매핑 테이블 (예: '한식' -> 'FOOD_K')
    code_map_name_to_id = {code.code_name: code.code_id for code in existing_codes}
    
    # 엑셀 분류명 -> 코드ID 수동 매핑 (필요시 여기에 추가)
    manual_map = {
        '스시야': 'FOOD_Sushi',
        '이자카야': 'FOOD_JaP',
        '한우오마카세': 'FOOD_K', # 한식으로 통합
        '평양냉면': 'FOOD_P',
        '라멘': 'FOOD_R',
        '돈카츠': 'FOOD_DON',
        '한식': 'FOOD_K',
        '중식': 'FOOD_C',
        '일식': 'FOOD_J',
        '양식': 'FOOD_Eu',
        '배달': 'FOOD_B'
    }
    
    # 수동 매핑을 우선순위로 병합
    code_map_name_to_id.update(manual_map)

    # 5. 데이터 저장 루프
    count_review = 0
    count_code = 0
    
    for item in reviews_data:
        # (1) 카테고리 코드 결정
        excel_cat = str(item['분류']).strip()
        
        # 매핑 테이블에 있으면 그거 쓰고, 없으면 'FOOD_ETC'로
        # 하지만 'FOOD_Sushi' 같은 코드가 DB에 아예 없을 수도 있음 -> 자동 생성 로직
        final_code_id = code_map_name_to_id.get(excel_cat, 'FOOD_ETC')
        
        # [핵심 2] DB에 없는 코드라면 CommonCode에 자동 등록!
        # 이미 있는지 확인
        code_exists = await CommonCode.find_one(CommonCode.code_id == final_code_id)
        if not code_exists:
            new_code = CommonCode(
                group_code="FOOD",
                group_name="음식 카테고리",
                code_id=final_code_id,
                code_name=excel_cat, # 엑셀에 적힌 이름 그대로 (예: 스시야)
                sort_order=99,
                use_yn="Y"
            )
            await new_code.insert()
            print(f"🆕 새 코드 자동 등록: {excel_cat} ({final_code_id})")
            count_code += 1
            
        # (2) 리뷰 저장
        # 이미 존재하는 식당이면 스킵
        exists = await Review.find_one(Review.restaurant_name == str(item['업장명']))
        if exists:
            # print(f"[스킵] {item['업장명']}")
            continue
            
        review = Review(
            restaurant_name=str(item['업장명']),
            location="위치 미상",
            category=final_code_id, # 코드 ID 저장
            husband_rating=float(item['남편평점']),
            wife_rating=float(item['아내평점']),
            visit_date="2024-01-01",
            husbandcomment=str(item['남편코멘트']),
            wifecomment=str(item['아내코멘트']),
            image_urls=[]
        )
        await review.insert()
        count_review += 1
        print(f"✅ 리뷰 등록: {item['업장명']}")

    print("------------------------------------------------")
    print(f"🎉 작업 완료!")
    print(f"- 신규 리뷰: {count_review}건")
    print(f"- 신규 코드: {count_code}건")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(insert_data())
